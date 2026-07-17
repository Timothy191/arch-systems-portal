# Login Form Redesign — Tasks

1. Enlarge and recenter the login card wrapper/body in `login/page.tsx`.
2. Replace portal `LoginForm` re-export with a full form: remember me, forgot password, OAuth row.
3. Add `/auth/callback` route for OAuth code exchange.
4. Update LoginForm tests; document OAuth enablement in `.env.example`.
5. Verify `/login` renders new controls and existing password login still posts to `/api/auth/login`.
