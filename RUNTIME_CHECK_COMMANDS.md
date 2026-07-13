# Runtime Check — Is the "static" shell real PPR or a stale per-user bug?

## What this proves

The `prerender-manifest.json` lists authenticated, per-user routes
(`/`, `/control-room`, `/access-control`) as static with
`initialRevalidateSeconds: false`. This is either:

- **(A) Correct PPR** — a static shell is served, the per-user data (keyed by
  `auth:${userId}` via `"use cache: private"`) streams in per request. Each
  logged-in user sees THEIR own data.
- **(B) Stale per-user bug** — the page is frozen at build time and every
  visitor is served the same snapshot (wrong user's data, or the build-time
  "no session" view). Because `initialRevalidateSeconds: false`, there is no
  ISR refresh.

This script hits the routes as **two distinct authenticated users** and diffs
their responses. If the user-specific content differs → (A). If it's identical
→ (B).

> No files are modified by running this. It is read-only against a running
> instance.

---

## 0. Set your base URL

```bash
export BASE_URL="https://staging.example.com"   # <-- substitute real dev/staging URL
# Local example: export BASE_URL="http://localhost:3000"
```

## 1. Authenticate the two users and capture their session cookies

Supabase SSR stores the session in cookies named
`sb-<project-ref>-auth-token` (and a `-code-verifier` pair). The robust,
non-guessy way is to exchange each user's email/password for a session via the
Supabase Auth REST endpoint, then save the returned `access_token`/`refresh_token`
into the cookie the app reads.

> You need the anon key and project ref (from `NEXT_PUBLIC_SUPABASE_URL` /
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The `<ref>` is the host subdomain of the
> Supabase URL: `https://<ref>.supabase.co`.

```bash
export SB_URL="http://127.0.0.1:54321"          # <-- your Supabase URL (no trailing slash)
export SB_ANON="your_anon_key"                   # <-- NEXT_PUBLIC_SUPABASE_ANON_KEY
export REF="$(printenv SB_URL | sed -E 's#https?://([^.]+)\..*#\1#')"

# --- User 1 ---
USER1_EMAIL="alice@plantcor.example"
USER1_PASS="<<REDACTED>>"                         # <-- set real creds when running (do NOT commit)
curl -s -X POST "$SB_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER1_EMAIL\",\"password\":\"$USER1_PASS\"}" \
  > /tmp/u1.json
echo "u1 error check:"; grep -o '"error":"[^"]*"' /tmp/u1.json || true

# --- User 2 ---
USER2_EMAIL="bob@plantcor.example"
USER2_PASS="<<REDACTED>>"
curl -s -X POST "$SB_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER2_EMAIL\",\"password\":\"$USER2_PASS\"}" \
  > /tmp/u2.json
echo "u2 error check:"; grep -o '"error":"[^"]*"' /tmp/u2.json || true
```

### Build the cookie jar for each user

This extracts `access_token` + `refresh_token` and writes them into the
`sb-<ref>-auth-token` cookie the app reads. The cookie value is a JSON blob of
the form `{"access_token":"...","refresh_token":"...","expires_at":...}`.

```bash
make_jar () {
  local json="$1" jar="$2"
  local at rt exp
  at="$(node -e "process.stdout.write(require('$json').access_token||'')")"
  rt="$(node -e "process.stdout.write(require('$json').refresh_token||'')")"
  exp="$(node -e "const d=require('$json');process.stdout.write(String((d.expires_in?Date.now()+d.expires_in*1000:Date.now()+3600*1000)))")"
  local blob="{\"access_token\":\"$at\",\"refresh_token\":\"$rt\",\"expires_at\":$exp}"
  # cookie jar format: domain flag path secure name value
  printf "%s\tTRUE\t/\tTRUE\t0\tsb-%s-auth-token\t%s\n" "$BASE_URL" "$REF" "$blob" > "$jar"
}
make_jar /tmp/u1.json /tmp/u1.cookies
make_jar /tmp/u2.json /tmp/u2.cookies
```

> If you cannot use the password grant (SSO/MFA), instead log in manually in a
> browser as each user, open DevTools → Application → Cookies, copy the
> `sb-<ref>-auth-token` value, and write two jars manually:
> `printf '%s\tTRUE\t/\tTRUE\t0\tsb-<ref>-auth-token\t<PASTED_VALUE>\n' "$BASE_URL" > /tmp/u1.cookies`

---

## 2. Probe the three paths as each user (headers + body)

```bash
for path in "/" "/control-room" "/access-control"; do
  echo "==================== $path ===================="
  echo "--- User 1 ---"
  curl -s -D /tmp/u1.hdr -b /tmp/u1.cookies "$BASE_URL$path" -o /tmp/u1.body
  echo "--- User 2 ---"
  curl -s -D /tmp/u2.hdr -b /tmp/u2.cookies "$BASE_URL$path" -o /tmp/u2.body
done
```

---

## 3. What to diff — and how to read it

### 3a. Response headers (proves PPR vs frozen)

Print the cache-related headers for both users on each path:

```bash
for path in "/" "/control-room" "/access-control"; do
  echo "==== $path headers ===="
  echo "[u1]"; curl -s -D - -o /dev/null -b /tmp/u1.cookies "$BASE_URL$path" | grep -iE 'cache-control|x-nextjs-(stale-times|cache|prerender|router-state|revalidate)|set-cookie'
  echo "[u2]"; curl -s -D - -o /dev/null -b /tmp/u2.cookies "$BASE_URL$path" | grep -iE 'cache-control|x-nextjs-(stale-times|cache|prerender|router-state|revalidate)|set-cookie'
done
```

- **(A) signal**: `Cache-Control: private, no-cache` (or `must-revalidate`)
  and/or `x-nextjs-prerender: ...dynamic` / `x-nextjs-stale-times` present,
  and `set-cookie` is NOT issuing a fresh session — i.e. the page is served
  per-request, not from a frozen build artifact.
- **(B) signal**: `Cache-Control: public, s-maxage=...` (or `max-age` with no
  `private`/`no-cache`) on an authed route → the response is cached across
  users. That is the stale-data bug.

### 3b. Body diff — the decisive test

The per-user content that should differ between Alice and Bob:

- The logged-in user's name / employee code / department in the top bar.
- Department-scoped data on `/control-room` and `/access-control`
  (machine lists, access logs, the user's own shift/role).
- Any `"userId":"..."`, `auth:...`, or the Supabase user id embedded in the
  RSC payload / `__NEXT_DATA__` / inline `<script>` chunks.

```bash
for path in "/" "/control-room" "/access-control"; do
  echo "==== diff for $path (u1 vs u2) ===="
  # normalize volatile bits, then show a unified diff
  diff <(sed -E 's/[0-9]{10,13}/TS/g; s/"access_token":"[^"]*"/"access_token":"X"/g' /tmp/u1.body) \
       <(sed -E 's/[0-9]{10,13}/TS/g; s/"access_token":"[^"]*"/"access_token":"X"/g' /tmp/u2.body) \
    | head -40
  echo "  (empty diff = IDENTICAL bodies => suspect B; non-empty = differs => A)"
done
```

**Decisive rule:**

- Bodies **differ** in user-specific fields (name/id/department) → **(A) PPR works**.
- Bodies are **identical** (after stripping tokens/timestamps) → **(B) stale bug**.

### 3c. Quick automated verdict

```bash
echo "=== VERDICT ==="
for path in "/" "/control-room" "/access-control"; do
  if diff -q /tmp/u1.body /tmp/u2.body >/dev/null 2>&1; then
    echo "$path: IDENTICAL bodies -> (B) STALE PER-USER BUG"
  else
    echo "$path: bodies differ -> (A) PPR per-user works"
  fi
done
```

---

## 4. Notes / pitfalls

- **Unauthenticated baseline**: also curl the paths with NO cookie jar. If an
  authed page returns the same body as the unauthenticated one (or a redirect
  to `/login`), confirm the redirect is happening — a frozen authed shell that
  doesn't redirect anonymous users is itself a (B) symptom.
- **Token freshness**: Supabase access tokens expire (~1h). Re-run step 1 if
  you see `401`/redirects mid-test.
- **Cookie name**: if your project uses a custom `cookieOptions.name`, replace
  `sb-<ref>-auth-token` accordingly. The ref is the Supabase host subdomain.
- **Never commit credentials**: keep `/tmp/u1.json`, `/tmp/u2.json`, and the
  cookie jars out of git. The `<<REDACTED>>` placeholders above are intentional.

---

## 5. Outcome → next decision

- **If (A)**: the PPR static-shell is legitimate. Safe to (B) run the optimizer
  render-loop to grow the static shell, and to plan the 16.3 upgrade (budget
  for `cacheLife` object-shape + `ppr`/`cacheComponents` flag changes).
- **If (B)**: fix on 16.2.10 FIRST — ensure the session read marks the route
  dynamic (`export const dynamic = "force-dynamic"` on authed pages, or rely on
  the `getUserSafely` cookie read which should already do so). Re-run this check
  to confirm (A) before any upgrade.
