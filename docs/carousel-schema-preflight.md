# Carousel generation schema preflight

Status: **prepared, not executed against Supabase**. This document is not a live
schema receipt and does not claim DEV-01 or DEV-02 is complete.

September 26 update: the preliminary REST probe and column metadata discovery
succeeded using existing deployment configuration. See
`carousel-live-access-receipt.md`. The SQL catalog script below remains unexecuted;
existing generation tables and extensions were found and must not be duplicated.

## Preliminary API access probe

With the existing server environment loaded securely, Node 22+ can run:

```sh
node --experimental-strip-types --input-type=module -e 'import {probeGenerationAccess} from "./src/server/carousel/schema-access.ts"; console.log(JSON.stringify(await probeGenerationAccess(), null, 2));'
```

This checks five existing relations using GET with `limit=0`. It returns only
relation/access/status summaries, not content rows or credentials. `reachable`
does not validate columns, constraints, RLS or service-role grants. `unverified`
does not mean the relation is absent. `schemaVerified` is always false: the
catalog preflight below is still required. Missing configuration sends no request.

Run `scripts/carousel-generator/schema-preflight.sql` in the intended Supabase
project's SQL editor using an administrator connection. The script is a read-only
transaction, with a 30-second statement timeout, and inspects PostgreSQL catalogs.
It does not read application rows, run application functions, apply migrations or
change grants. No credentials belong in this file or in the saved output.

Save every result set with the project/environment name and execution timestamp.
If a statement fails, roll back the transaction, record that failure and do not
interpret absent subsequent output as an absent object. Catalog visibility under
a restricted role is not evidence that an object does not exist. After the ledger
shape is confirmed, the optional final SELECT can list migration identifiers;
the default script does not query a ledger relation that might not exist.

## Required evidence before DEV-01 can safely be authored/applied

1. **Reuse rather than duplicate.** Confirm `carousel_briefs`, `carousel_drafts`
   and `carousel_draft_slides` exist. Confirm whether templates, Writing, libraries
   or similarly named carousel objects have already been provisioned outside Git.
   Existing-object differences require an explicit adaptation, not an `IF NOT
   EXISTS` declaration that silently accepts the wrong shape.
2. **Draft identity.** Confirm the name/definition of existing uniqueness on
   `(brief_id, version)` and whether draft `position` exists. Multi-deck batches
   need `(brief_id, position, version)` instead. Adding a new unique constraint
   without removing the old one still rejects the second version-1 deck.
3. **Backfill safety.** Catalog results cannot establish whether tables are empty
   or existing rows can be assigned positions safely. A separate authorized
   aggregate-only integrity check is required before adding NOT NULL columns or
   replacement uniqueness. Do not assume the September 10 “empty” observation
   remains true. Never guess positions from row order.
4. **Registry and batch links.** Verify registry key type and uniqueness, existing
   `content_batches` primary key/required columns, and incoming foreign keys.
   The type identity is the registry's text `content_type`, not an invented UUID.
   Batch/legacy-batch/slot creation must be one transaction.
5. **Statuses and lane occupancy.** Capture actual check constraint names and
   preserve supported legacy statuses. The running unique index applies to
   generating/rendering. A stale runner must retain the lane until Continue or
   Finish here; awaiting human approval must not consume the running slot.
6. **Libraries and templates.** Verify both image banks' identifier types and
   columns before defining the `v_image_assets` union. It must retain bank rows
   in place and expose `set_name` and `subset_name`, with stable library/image
   identities. Confirm template/library FKs and one active version per slug;
   Writing similarly needs one active version per content type.
7. **Lane safety.** Inspect current lane columns, statuses and trigger functions
   before materialisation/claim SQL. Use `glowup_decks` and
   `covered_eye_carousel`, not replacement posting tables. Rendering materialises
   the row; only final human approval releases scheduling. Existing historical
   seed JSON contains `gatekeep_status = pending`; it cannot be used unchanged
   as a new-generation readiness contract.
8. **Security.** Record RLS, policies, table ACLs, function signatures, ownership,
   SECURITY DEFINER/search_path settings and default privileges. New generator
   tables have RLS and no browser policies. New privileged functions explicitly
   revoke PUBLIC, anon and authenticated, grant service_role, and require ACL
   readback. Do not alter unrelated existing function grants.
9. **Deployment history.** Compare ledger version/name output with tracked
   migrations. Matching names alone do not prove matching definitions; catalog
   structure remains the check. The reconstructed intelligence-engine migration
   may be absent from the ledger because its original objects were created by hand.

## Decisions and checks not resolved by the preflight

- DEV ticket open item 10 still asks whether to delete template `image_direction`
  and fold caption instructions into Writing. Do not silently resolve this by a
  destructive migration. Writing can remain versioned independently while nullable
  legacy direction compatibility is retained pending a decision.
- Historical Glow Up templates describe 3:4. New generation needs the approved
  4:5 refit before it is marked generation-ready.
- Function metadata does not prove behavior. DEV-02 still requires concurrent
  materialisation and one-winner claim tests on a safe database branch, plus
  readbacks of approval/scheduling safety and grants.
- DEV-11 still requires a three-deck batch through real writing, checks,
  materialisation and rendering, followed by human approval verification.
- This preflight must not be used to label forms, mocks or local unit tests as
  live database integration.
