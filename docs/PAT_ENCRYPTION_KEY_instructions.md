# PAT_ENCRYPTION_KEY — instructions for deployers

Users' GitHub personal access tokens (PATs) are encrypted with AES-256-GCM
before they are stored in the database. The encryption key lives **only** in
the app's environment configuration — never in the database — and is supplied
via the `PAT_ENCRYPTION_KEY` environment variable.

The value has the form `<version>:<base64 of 32 random bytes>`, e.g.

```
1:q3o0uu4iGnfDVL9161FSToJXMDRCUJH0FhOJs5C7Rr0=
```

The numeric prefix is the **key version**. Each stored credential records
which key version encrypted it, which is what makes safe key rotation
possible. Use the provided script to generate keys — it mints the version
numbers automatically (version 1 the first time, N+1 on rotation), so you
never have to manage them by hand.

> **CRITICAL:** the key that encrypted a token is the only thing that can
> decrypt it. Generate the key **once** and keep it. If the key is lost or
> overwritten, every stored PAT becomes unreadable and every user must
> re-enter theirs (annoying, but recoverable). **Back up the key somewhere
> separate from your database backups** — a database backup alone is useless
> without the key.

If `PAT_ENCRYPTION_KEY` is not set at all, the app still starts; the PAT
feature just responds with an error until a key is configured. A *malformed*
key value, however, stops the app at startup on purpose, so that a
configuration typo can't silently disable decryption.

## Initial setup — production (Dokku)

On the dokku host, run:

```bash
scripts/set-pat-encryption-key.sh dokku <app-name>
```

The script only creates a key if none exists; it will never silently replace
a live key. Equivalently, by hand:

```bash
dokku config:set <app-name> PAT_ENCRYPTION_KEY="1:$(openssl rand -base64 32)"
```

`dokku config:set` restarts the app, and the config value survives future
restarts and redeploys. Copy the value (`dokku config:get <app-name>
PAT_ENCRYPTION_KEY`) into your secure backup location (e.g. a password
manager) now.

## Initial setup — localhost (dev)

For local development the key goes in your `.env` file (which is gitignored).
From the repo root, run:

```bash
scripts/set-pat-encryption-key.sh env-file
```

which appends a line like `PAT_ENCRYPTION_KEY=1:...` to `.env`. Or add the
line by hand:

```bash
echo "PAT_ENCRYPTION_KEY=1:$(openssl rand -base64 32)" >> .env
```

A dev key encrypts only your local H2 database, so there is nothing to back
up; if you lose it, delete the local database and start over.

## Rotating the key

Rotation means re-encrypting every stored credential under a new key. It is a
deliberate, three-step operation — never just swap the env var and hope:

1. **Install the new key.** Run the same script again:

   ```bash
   scripts/set-pat-encryption-key.sh dokku <app-name>    # or: env-file
   ```

   Because a key already exists, the script moves the current key to
   `PREVIOUS_PAT_ENCRYPTION_KEY` and installs a freshly generated key with
   the next version number as `PAT_ENCRYPTION_KEY`. With both variables set,
   the app can decrypt old rows and encrypts everything new under the new
   key, so a partially-rotated state is safe to run in.

2. **Re-encrypt the stored credentials.** After the app has restarted with
   the new configuration, sign in as an admin and launch the
   **rotatePatKeys** job (`POST /api/jobs/launch/rotatePatKeys`, available in
   the Swagger UI under **Jobs**). The job re-encrypts every credential still
   on the old key version and logs what it did; credentials already on the
   current version are skipped, so re-running it after a partial failure is
   safe. Check the job log to confirm every credential was rotated.

3. **Retire the old key.** Once the job log shows nothing left on the old
   version:

   ```bash
   dokku config:unset <app-name> PREVIOUS_PAT_ENCRYPTION_KEY
   ```

   (or delete the `PREVIOUS_PAT_ENCRYPTION_KEY` line from `.env`). Update
   your key backup to the new value.

**Do not remove `PREVIOUS_PAT_ENCRYPTION_KEY` before the job has finished.**
If that happens anyway, the app keeps running: credentials stuck on the old
version simply can't be decrypted, and those users re-enter their PATs.
