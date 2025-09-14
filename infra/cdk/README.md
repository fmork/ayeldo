# infra/cdk

AWS CDK app for deploying the HTTP API and Lambda handler.

Commands
- Build: `pnpm --filter @ayeldo/infra-cdk run build`
- Synthesize: `pnpm --filter @ayeldo/infra-cdk run synth`
- Deploy: `pnpm --filter @ayeldo/infra-cdk run deploy`

Environment
- Set `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` or configure a profile.
- Optionally set `OIDC_AUTHORITY` and `PORT` env vars for the Lambda. `PORT` is not required for Lambda but used locally.

Entrypoints
- Lambda handler: `packages/api/src/functions/http-handler/handler.ts` (export `main`).
- Routes are defined via controllers in `packages/api/src/controllers/*`.
