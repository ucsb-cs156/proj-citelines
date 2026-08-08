# GitHub Repo ↔ App State Sync — Design Notes

> Handoff doc for implementing bidirectional state sync between the app backend
> and private GitHub repos. Captures decisions made, their rationale, and the
> questions still open pending the tables PR.

## Problem

State must stay in sync in **both directions** between the app backend and
several private GitHub repos:

- **App → Repo:** when app state changes, the repo must be updated.
- **Repo → App:** when the repo changes, the app must be updated.

## Hard constraints (these shaped every decision below)

- **No repo admin.** The repos are owned/controlled by another organization.
  We have push/write access and access to Actions secrets & variables — nothing
  more. This rules out **webhooks** and **installing a GitHub App** (both need
  admin). Asking the other org to set these up per-repo doesn't scale and would
  wear out goodwill. (They plan a "bring your own repo" option later, which
  would grant full admin — revisit then.)
- **Multiple repos**, one DB row per repo.
- **Different users have access to different repos.** The app admin does *not*
  necessarily have access to every repo via their own GitHub account. So a
  single app-owned credential cannot reach all repos.
- State changes are **infrequent**, and the app user is **almost always the same
  person** who edits the repo. → latency tolerance is high; sub-second not needed.

## Architecture — decisions made

### Direction: App → Repo
- App writes directly via the **GitHub REST API** (Contents API for simple file
  writes; Git Data API if building trees/commits). Immediate. Needs only write
  access, not admin.

### Direction: Repo → App — **polling, not webhooks/Actions**
- Because webhooks and GitHub Apps need admin, and per-repo Action workflow files
  mean N files to maintain across N repos we don't own, we **poll from our own
  backend** instead.
- Backend periodically asks the GitHub API for the current head commit SHA on
  each tracked branch and reconciles when it changes.
- **Why polling wins here:** zero cooperation from the other org, zero footprint
  in their repos, scales as N config rows on our side, full observability in our
  own backend. The cost — latency bounded by poll interval — is acceptable
  because state changes are infrequent.
- Use **conditional requests (ETags / If-None-Match)** so unchanged repos cost
  almost nothing against rate limits.

### Auth model — **per-user fine-grained PATs**, not a GitHub App or app-owned token
- A single app-owned token can only reach repos *that account* can reach. Since
  different users hold access to different repos, **each user supplies their own
  fine-grained PAT**, scoped to Contents read/write on their repo(s).
- A fine-grained PAT can cover **multiple repos** at once → one user with several
  repos typically supplies **one** token for all of them.
- GitHub App was rejected: installation requires repo admin (users may lack it
  too), and the OAuth-style flow it would enable isn't available to us.
- Org PAT policy caveat: org-owned repos may require a **one-time approval** of a
  fine-grained PAT by an org owner. That's a single approval covering all repos
  the token targets — far smaller than per-repo webhook asks. Test with one repo.
- Classic PAT is the fallback only if fine-grained PATs are policy-blocked; it's
  coarse (broad scope, wide blast radius) so avoid unless forced.
- **UPDATE (2026-07-10): we are forced — classic PATs are the only option.**
  Fine-grained PATs can only be scoped to repos owned by the user's own account
  or an org the user is a *member* of. Our users are outside collaborators on
  repos owned by another org, so **no user of this app can create a
  fine-grained PAT that reaches those repos at all** — the "Resource owner"
  dropdown never offers the owning org. Org membership and a dedicated
  machine-user account were both considered and ruled out. Decisions:
  - The app accepts **only** classic PATs (`ghp_...`) and rejects fine-grained
    tokens (`github_pat_...`) with an error explaining they can't reach the
    repos — accepting one would just produce confusing 404s at sync time.
  - User-facing docs (docs/Github_PAT.md) mention fine-grained only as a
    "this will NOT work" warning, since GitHub's UI steers users toward it.
  - Revisit if the "bring your own repo" option lands (users would then own
    their repos and fine-grained would work as originally designed).

## Loop-breaking & conflict handling (bidirectional sync essentials)

- **Echo loop risk:** app writes to repo → poll sees the change → app must NOT
  react as if it were an external change and write back again.
- **Cannot rely on commit author identity** to break the loop here, because the
  app commits *as the user* (using the user's PAT), and that same user also makes
  manual commits — both look identical by author.
- **Break the loop with SHA tracking instead:** per repo, store the
  last-observed SHA and the last-authored SHA. On each poll:
  - compare head SHA vs **last-observed** → "did anything change?"
  - compare head SHA vs **last-authored** → "was this our own write?" (skip if so)
  - SHA comparison is identity-agnostic, so it survives the same-person case.
- **Conflict policy:** decide explicitly who wins if both sides change the same
  state concurrently (one side authoritative / last-write-wins / reject & surface).
  Pick one deliberately. (Given "usually the same person," conflicts are rare, but
  still choose a policy rather than discovering one in prod.)
- **Backstop sweep:** a periodic full reconcile catches anything a poll missed.
  With backend polling this is just the poll loop; no separate mechanism needed.

## Credential storage — decisions made

### Table layout
- **Separate credentials table**, NOT a column on the repo table. Secrets have a
  different lifecycle (rotate/expire/revoke) than repo metadata; keeping them
  separate allows tighter access control, separate auditing, and keeps tokens out
  of ordinary `SELECT * FROM repos` result sets.
- Because one token often covers many repos, the **FK points from the repo row to
  the credential** (repo → credential), not credential → repo. One credential row,
  many repo rows referencing it.

### Encryption at rest — **application-level**, AES-256-GCM
- Encrypt in the app *before* writing; the DB only ever sees ciphertext. This
  protects against the realistic threat (DB read access via leaked creds / SQLi /
  over-broad query), which disk-level DB encryption does **not**.
- Use an authenticated symmetric scheme — **AES-256-GCM** (tamper detection free)
  — via a vetted library (libsodium/secretbox, Fernet, Tink). **Do not** assemble
  AES-GCM from primitives by hand (nonce-reuse footguns).

### Display — **write-only**
- Never show the full token back, even masked. UI shows "Connected ✓ · ending
  ••••3f2a · expires <date>" with a **Replace** button.
- Store **last-four as its own plaintext column** so rendering settings never
  touches ciphertext. Lost token → user creates a new one and replaces; no
  read-back path needed.

### Key custody (self-hosted Dokku deployment)
- Encryption key lives in **Dokku config vars** (prod) / **`.env`** (localhost),
  **never in the database**. Different key per environment. `.env` is gitignored.
- Key is **generated once** with a crypto RNG (`openssl rand -base64 32` = 32
  bytes / 256-bit) and then **persisted unchanged**. Dokku config survives
  restarts/redeploys.
- Bootstrap script must be **idempotent** — only generate if the key is absent:
  ```bash
  if ! dokku config:get myapp PAT_ENCRYPTION_KEY >/dev/null 2>&1; then
    dokku config:set myapp PAT_ENCRYPTION_KEY="$(openssl rand -base64 32)"
  fi
  ```
- **Encoding discipline:** if stored as base64, decode to 32 raw bytes before use;
  be consistent on set and read sides.
- **CRITICAL invariant:** the key that encrypted a token is the ONLY thing that
  can decrypt it. If the key changes (or is regenerated), all stored PATs become
  undecryptable and every user must re-enter theirs. GitHub doesn't invalidate
  them — we just lose our local ability to read our copy.
- **Back up the key separately from the DB.** A DB backup alone is useless without
  the key; a key loss forces mass re-onboarding (annoying but recoverable, since
  PATs are re-suppliable).

## Key rotation — design

- Rotation = decrypt-all-with-old-key, re-encrypt-all-with-new-key, as a
  **deliberate migration**, never an env-var swap-and-hope.
- **`key_version` column per credential row** makes rotation safe and resumable:
  - Each row is self-describing — it records which key encrypted it.
  - App holds a **label → key material** map built from env at startup, e.g.
    `{1: <PREVIOUS_PAT_ENCRYPTION_KEY bytes>, 2: <PAT_ENCRYPTION_KEY bytes>}`.
  - Decrypt a row by looking up its `key_version` in that map. Rows under
    different versions coexist safely → partial rotation is a valid state.
- **Trigger rotation as an explicit one-off command**, NOT on startup:
  - `dokku run myapp rotate-keys` (or framework equivalent).
  - Avoids the startup-path problems: concurrent instances during zero-downtime
    deploys racing the same rows; non-resumable partial failures; boot time
    scaling with row count; silent triggering by a stray env var.
  - Set `PREVIOUS_PAT_ENCRYPTION_KEY` (old) + `PAT_ENCRYPTION_KEY` (new), run the
    command; it re-encrypts rows still on the old version in **batches with a
    transaction per batch**, bumping `key_version`. Resumable after a crash
    because already-rotated rows are skipped by version.
  - When done, remove `PREVIOUS_PAT_ENCRYPTION_KEY`.
- **How version↔key association is supplied** (pick one when schema lands):
  - explicit `CURRENT_KEY_VERSION` env var, or
  - version baked into the key value, e.g. `2:aGVsbG8...` (parse out the tag).
- **Missing-key-for-version behavior:** if a row's `key_version` has no matching
  key (e.g. `PREVIOUS_` removed too early), mark that single credential broken and
  prompt re-entry — do NOT crash the app. Degrade to "some users re-enter PATs."

## Token lifecycle (per-user PATs)

- Fine-grained PATs **must expire** → store an **expiry column**; warn users
  before lapse; detect 401s and prompt re-entry rather than silently failing.
- Users can revoke a token anytime on GitHub → "token stopped working" is a
  normal handled state, not an exception.
- Onboarding UX is a real surface: guide users through creating a fine-grained
  PAT (scope to Contents R/W, select repos, set expiry, paste once). Prefer/force
  fine-grained over classic to keep blast radius small.

## Open decisions — resolve when the tables PR lands

1. **Token → repo cardinality in practice:** confirm one-token-covers-many-repos
   (→ repo FK to credential) vs. one-token-per-repo. Sets the table relationships.
2. **Version↔key representation:** `CURRENT_KEY_VERSION` env var vs. version tag
   baked into the key value.
3. **Conflict policy:** who wins on concurrent both-sides change.
4. **Poll interval** + confirm ETag/conditional-request handling against the
   provider's rate limits.
5. Fit the credential table, `key_version`, `expiry`, `last_four`,
   `last_observed_sha`, `last_authored_sha` columns to existing schema conventions
   from the PR.
6. Concrete `rotate-keys` batching / transaction-boundary logic.

## Immediate next step

Wait for the tables PR, then make the schema concrete: credentials table +
repo table with the FK and the SHA-tracking / key-version / expiry columns.
