# Contributing

## Private API route guard requirement

Any new App Router API route that mutates state or triggers privileged work must fail closed and must call the appropriate guard before doing work:

- `POST`, `PUT`, `PATCH`, `DELETE` routes intended for browser/client use must call `guardPrivateApi(req)` from `src/lib/originGuard.ts`.
- Cron/admin routes must call `guardCronApi(req)` from `src/lib/cronAuth.ts`.
- QStash worker routes must verify the `Upstash-Signature` header with `@upstash/qstash`.

Do not add unauthenticated state-changing endpoints.

Required validation before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```
