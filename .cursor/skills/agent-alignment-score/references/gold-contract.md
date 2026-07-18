# Gold Standard Contract

## Required output

```
Alignment: <score>/100 [<PASS|FAIL>]
- Spec: <n>/20 — <one-line evidence>
- Stack: <n>/15 — <one-line evidence>
- Boundaries: <n>/15 — <one-line evidence>
- Security: <n>/20 — <one-line evidence>
- Quality: <n>/15 — <one-line evidence>
- Verify: <n>/15 — <one-line evidence>
Hard fails: <none | list>
Next owner: parent | user — <one line if FAIL>
```

## Evidence rule

Every dimension line must cite a file path, command output, or test name. Guessing = 0 on Verify (and likely other dimensions).

## Fluff ban

No narrative beyond the template. No "should pass" without command output.
