# Tenant Membership Model Proposal

## Context
Existing user records carry an optional `tenantId`, and tenants reference an `ownerEmail`. This creates only a loose association between users and tenants and prevents accurately modelling scenarios such as:
- A user belonging to multiple tenants.
- Tenants with multiple admins or contributors.
- Managing tenant invitations separately from active memberships.

## Goals
- Represent a many-to-many relationship between users and tenants.
- Capture role, status, and lifecycle metadata for each membership.
- Align with our single-table DynamoDB strategy and existing key prefixes.
- Enable onboarding, access control, and invitations to rely on a shared abstraction.

## Core Entities
### TenantMembership
Represents an active or pending link between a user and a tenant.
- `membershipId`: UUID for idempotency/event references.
- `userId`: Foreign key to the user.
- `tenantId`: Foreign key to the tenant.
- `role`: `'owner' | 'admin' | 'member'`.
- `status`: `'active' | 'invited' | 'revoked'`.
- `createdAt` / `updatedAt`: ISO timestamps.

Optional lifecycle metadata (e.g. invitation expiry) can live on a separate `TenantInvitation` entity if needed.

### TenantAccessService
Domain service responsible for membership lifecycle:
- `inviteUser`, `acceptInvite`, `revokeMembership`, `changeRole`.
- Emits domain events (`TenantMembershipGranted`, `TenantMembershipRevoked`).
- Provides queries for BFF/API (`membershipsForUser`, `membershipsForTenant`, `getMembership`).

### ITenantMembershipRepo (Port)
- `createMembership`, `updateMembership`, `deleteMembership`.
- `findByUser(userId)`, `findByTenant(tenantId)`, `find(userId, tenantId)`.

## DynamoDB Layout
Membership items live alongside existing entities:
- Table item: `PK = USER#<userId>`, `SK = TENANT#<tenantId>`.
- Attributes: role, status, timestamps, membershipId.
- Secondary index for tenant-centric lookups: introduce `GSI4` with `GSI4PK = TENANT#<tenantId>` and `GSI4SK = USER#<userId>`.

Invitation items (if implemented) would use `PK = TENANT#<tenantId>`, `SK = INVITE#<token>` with `GSI5PK = EMAIL#<invitee>` to enforce uniqueness.

## Onboarding & Auth Adjustments
- On tenant creation, write both `Tenant` and `TenantMembership` (role `owner`, status `active`) in one transaction and emit corresponding events.
- Post-login session establishment should query memberships. If a single active membership exists, issue a tenant-scoped session. Otherwise prompt the client to select a tenant.
- Replace direct `tenantId` checks with membership role checks across BFF/API layers.

## Migration Considerations
1. Backfill memberships for existing tenants by assigning the `ownerEmail` user as `owner`.
2. Remove `tenantId` fields from `UserDto` and persistence once memberships are authoritative.
3. Update API contracts and zod schemas to match the new DTO shapes.
4. Verify authorization logic with new membership roles via unit/integration tests.

## Next Steps
1. Define DTOs and zod schemas for `TenantMembership` (and `TenantInvitation` if required) in `packages/types`.
2. Add port/service abstractions in `@ayeldo/core` with unit tests.
3. Extend Dynamo key helpers and implement `ITenantMembershipRepo` in `packages/infra-aws`.
4. Adapt onboarding/auth flows and emit new domain events.
5. Document progress in `docs/todo.md` and update the C4 model if relationships change.
