# DynamoDB GSI Naming Conventions

## Index identifiers
- Primary indexes follow the pattern `GSI<n>` (e.g., `GSI1`, `GSI2`).
- Attribute names mirror the index: `GSI<n>PK` for the partition key and `GSI<n>SK` for the sort key.
- Comments in `infra/cdk/src/core-stack.ts` describe the intent of each index to keep CDK and runtime code aligned.

## Current indexes
- **GSI1** — hierarchical relationships. The partition key is always the parent entity key (e.g., `ALBUM#<parentId>`). Sort keys reuse entity-specific prefixes (`ALBUM#<childId>`, `IMAGE#<imageId>`), allowing albums and images to share the same index while filtering on the base table key for tenancy.
- **GSI2** — shared lookup index for identities and memberships. Partition keys follow `LOOKUP#<scope>#...` and sort keys encode the target entity (e.g., `USER#<userId>`). Existing scopes include user identifiers (`LOOKUP#USER#OIDC_SUB#…`, `LOOKUP#USER#EMAIL#…`) and membership views (`LOOKUP#MEMBERSHIP#TENANT#…`, `LOOKUP#MEMBERSHIP#USER#…`).

## Helper functions
Key builders live in `packages/infra-aws/src/keys.ts` to ensure a single source of truth:
- `gsi1AlbumChild` and `gsi1ImageByAlbum` emit `GSI1PK`/`GSI1SK` pairs for album tree and image listings.
- `gsi2UserByOidcSub` and `gsi2UserByEmail` call shared helpers `userLookupPartition` and `userLookupSort`, enforcing the `LOOKUP#USER#<scope>#<value>` pattern for `GSI2`.
- `gsi2MembershipByTenant` and `gsi2MembershipByUser` provide tenant/user-centric membership lookups while reusing `GSI2`.
- Table keys such as `pkTenant`, `pkUser`, and `skUserMetadata` centralize the `PK`/`SK` format so GSI partition and sort keys always align with their base items.

## Usage guidelines
- Reuse existing GSIs by picking distinct prefixes in partition/sort keys instead of adding indexes per entity.
- When a new lookup is needed, add a helper alongside existing ones that returns the appropriate `GSI<n>PK`/`GSI<n>SK` structure.
- Keep lookup scope names (`LOOKUP#USER#...`) concise and uppercase. Collisions should be prevented with conditional writes when adding new lookup items.
- Update this document whenever a new GSI or lookup scope is introduced so Terraform/CDK definitions and runtime helpers stay synchronized.
