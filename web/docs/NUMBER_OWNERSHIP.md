# Phone number ownership — what the dashboard must do

The voice backend now treats **owning** a phone number as its own thing, separate from **attaching** it to
a flow. This doc says what changed there and what the dashboard has to match, so a user can't do in the
dashboard what the API refuses.

## The rule

- **Owning** a number = `owned_numbers.assigned_user_id` is that user. One user can own many numbers.
- **Only the Voxio team (an admin) can make someone the owner.** Users can't claim, buy or add a number
  themselves — there is no user-facing "add number".
- **A user can do anything with a number they own, and nothing with one they don't.** That covers
  attaching it to a flow, moving it, detaching it, reading its details, placing a call from it and
  scheduling a call from it.
- **Admins skip every check, everywhere.** They can attach, move, read, detach and call from any number
  (owned or not, attached or not) on any flow. That applies in the database service, in callbot when
  the admin's `user_api_key` is sent with the call, and in the dashboard via `isAdmin(me)`.
- `numbers` rows are no longer ownership. They only record *which flow a number is attached to*.

| Table | Means | Written by |
|---|---|---|
| `owned_numbers` (`phone_number`, `assigned_user_id`, `provider`) | Voxio rents this number; this user owns it (null = nobody yet) | Admins: `POST /number/own`, `DELETE /number/own`, or `database/scripts/sync_owned_numbers_.py` |
| `numbers` (`phone_number`, `user_api_key`, `flow_api_key`) | This number is attached to this flow | The owner, via `POST/PUT/DELETE /number` or the dashboard |

When ownership moves to another user, or is taken back, the number's `numbers` row is deleted, so the old
owner's flow stops answering it.

Prisma model: `OwnedNumber` (`prisma/schema.prisma`), migration `20261027090000_owned_numbers`.

## Backend endpoints (database service, `:7860`)

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/number/own` | admin (`user_api_key`) | Body `{phone_number, user_id}`. Makes that user the owner |
| DELETE | `/number/own?phone_number=` | admin | Takes the number back (stays a Voxio number, unowned) |
| GET | `/number/own` | any user | Numbers the caller owns, with `flow_api_key` if attached. Admin: every company number |
| GET | `/number/access?phone_number=` | `flow_api_key`, optional `user_api_key` | 200 if the flow's owner owns the number, or the `user_api_key` is an admin's; else 403. Used by callbot before dialling |
| POST / PUT / GET / DELETE | `/number` | owner | Attach, move, read, detach — 403 `This number is not on your account.` if not owned |

callbot refuses `/plivo/outbound` and `/plivo/outbound/schedule` with **403** when the from-number isn't
owned by the calling flow's owner. Scheduled calls are checked again when they fire. If the request also
carries an **admin** `user_api_key` header, callbot skips the check (that header is optional). The
dashboard's `placeCall` already sends `user_api_key`, so admins pass.

## Dashboard: what is already done

These are changed in this repo and type-check, but haven't been run:

| Where | Change |
|---|---|
| `store.server.ts` → `toStore` / `userInclude` | `account.numbers` now comes from **`ownedNumbers`**, not the `numbers` rows. So "your numbers" everywhere in the dashboard means owned numbers |
| `api.ts` → `setFlowNumber` | Attaching **and** detaching need the number to be in `account.numbers` (owned); admins skip |
| `api.ts` → `startTestCall` | The from-number must be attached to the flow **and** owned; admins skip both checks |
| `api.ts` → `getNumbers` | Unchanged code, but it now lists owned numbers (each with its flow, or none) |

`save()` writes `numbers` rows only for numbers that changed, and every change goes through
`setFlowNumber`. So nothing is wiped on load. A legacy row for a number nobody owns stays until
someone cleans it up.

## Dashboard: done on 2026-10-27 (type-checks and builds, not run yet)

| Where | Change |
|---|---|
| `/dashboard/numbers` (`routes/dashboard.numbers.tsx`, `server/dashboard/numbers.ts`) | Admin-only Numbers screen, in the sidebar for admins. Lists every `owned_numbers` row with its owner and the flow answering it; add a number (optionally owned straight away); change or clear the owner; remove a number. Changing the owner or removing deletes the `numbers` row in the same Prisma transaction. Also lists legacy `numbers` rows for unlisted numbers, to add or detach. |
| `api.ts` → `placeCall` | Now/scheduled calls go through SDK 2.1.0 `calls.place` / `calls.schedule`. The from-number must be attached to the flow and owned; `VOXIO_FROM_NUMBER` is only a fallback for admins. The service's message is shown as-is. The mock "not dialled" path is gone. |
| `api.ts` → `setFlowNumber` | Attach / move / detach go through SDK `numbers.attach` / `move` / `delete`, so the data service applies its own checks. Admins can attach to any user's flow. |
| Numbers & calls tab | From lists only the flow's attached numbers (no "Default number"); empty state and "numbers are provided by Voxio" copy. |

Items 1, 3 and 4 below are covered by this. 2, 5 and 6 still stand.

## Dashboard: still to do

1. **`api.ts` → `placeCall`** (Calls page, now and scheduled):
   - It defaults `from` to the `FROM_NUMBER` env var when the user doesn't pick one. callbot will now
     refuse that with 403, unless the flow's owner owns `FROM_NUMBER`.
   - Fix: make the user pick one of their owned numbers that's attached to the flow (same check as
     `startTestCall`), and drop the `FROM_NUMBER` fallback for non-admins.
   - Show callbot's 403 message (`This from number is not on your account.`) as-is, instead of
     `Callbot returned 403: …`.
2. **`server/calling.ts`** (public "call me" demo):
   - It dials from `FROM_NUMBER` with its own `flowKey`.
   - Before deploying callbot, have an admin own `FROM_NUMBER` for that flow's owner (or own the flow
     with an admin account). Otherwise every demo call gets a 403.
3. **Admin screen for ownership** — the Voxio team needs a UI to:
   - list every company number and its owner (`GET /number/own` as admin, or `db.ownedNumber.findMany`),
   - assign a number to a user (`POST /number/own`),
   - take a number back (`DELETE /number/own`).
   - If it writes through Prisma instead of the API, it must also delete the number's `numbers` row when
     ownership changes. The API does this in one transaction (`assign_owned_number` /
     `release_owned_number` in `database/src/database/database/number_.py`).
4. **Numbers page copy.** There's no "add number" for users. Say that numbers are provided by Voxio
   (contact us), and show an empty state when the account owns none.
5. **Lists that read `flow.numbers` directly** — the assistant (`server/assistant/tools.server.ts`), the
   overview summaries (`api.ts` ~L92/L124), `flowStatus.ts` and `PhoneTest.tsx`:
   - These show what is *attached*, which is fine.
   - After the cleanup below, attached will always mean owned. Until then they may still show a legacy
     number the user doesn't own.
6. **Admin test calls through the SDK.**
   - `startTestCall` places the call through `@voxio/server` (`VOXIO_API_URL` /v1/calls). That path
     sends no `user_api_key`, so callbot can't tell the caller is an admin.
   - An admin test call from a number the flow's owner doesn't own still gets 403 there. The SDK's calls
     API would need to forward an admin key, or the dashboard could use `placeCall`'s direct callbot path
     for admins.
   - Also: `sdkErrorText` shows a `forbidden` from callbot as "didn't accept our key", which is misleading
     for an ownership 403.
7. **Any new code path** that attaches a number, calls from one, or shows its details must check
   ownership the same way: the number is in `account.numbers`, or `isAdmin(me)`.

## Rollout order

1. Deploy the Prisma migration (`owned_numbers`). Until it exists, every non-admin `POST /number` returns
   a 500.
2. Fill it:
   - `cd database && uv run python scripts/sync_owned_numbers_.py` (dry run), then `--apply`.
   - Assign each number to its customer with `POST /number/own` or `--assign <number> <user id>`.
   - Include `FROM_NUMBER` (see to-do item 2).
3. Deploy the database service and the dashboard changes.
4. Run `--report-unowned`. These are `numbers` rows for numbers nobody owns, attached before this
   existed. Review them, then remove the ones that should go with `--delete <numbers…>`.
5. Fix `placeCall` (to-do item 1), then deploy callbot. From this point a call from an unowned number
   is refused.

## Checks (`benchmarking/databasebenchmarking` → `uv run databasecontract`)

- Unknown number → 403.
- A user can't give themselves a number → 403.
- Admin owns it to the user → 200, and it shows in `GET /number/own`.
- Owner attaches it → 200.
- `/number/access`: owner's flow → 200; unowned number → 403.
- Another user can't attach, move, read, delete or call from it → 403.
- Admin takes it back → the old owner gets 403.
