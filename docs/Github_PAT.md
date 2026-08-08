# Creating a GitHub Personal Access Token (PAT) for this app

To sync course content with GitHub repositories, this app needs permission to
read and write files in those repositories *as you*. You grant that permission
by creating a **classic personal access token** on GitHub and pasting it into
the app once.

> **Use a *classic* token — a fine-grained token will NOT work.**
> When you create the token, GitHub will steer you toward its newer
> "fine-grained" tokens (`github_pat_...`). Those tokens **cannot access the
> repositories this app syncs**, and the app will not accept one. Make sure
> you are on the **Tokens (classic)** page and your token starts with
> `ghp_`.

## Before you start: treat this token like a password

A classic token is not limited to specific repositories — it can access
**everything your GitHub account can access**. The app protects it carefully
(see below), but you should too:

- paste it only into this app — never into email, chat, or another site;
- always give it an **expiration date**;
- if you ever suspect it leaked, revoke it on GitHub immediately (Settings →
  Developer settings → Tokens (classic) → Delete) and create a new one.

## What the app does (and doesn't do) with your token

- The token is **encrypted before it is stored**; the database never contains
  the plain token.
- The token is **write-only**: no page or API in this app will ever display it
  back, even to you. The app shows only the last four characters and the
  expiration date so you can recognize which token you entered.
- If you lose the token, nothing is wrong — just create a new one on GitHub
  and paste it into the app again. Entering a new token replaces the old one.

## Step-by-step: creating the token

1. Sign in to GitHub, and go to **Settings** (click your profile photo in the
   upper right corner, then *Settings*).
2. In the left sidebar, scroll to the bottom and click **Developer settings**.
3. Click **Personal access tokens → Tokens (classic)** — *not* "Fine-grained
   tokens".
4. Click **Generate new token → Generate new token (classic)**.
5. Fill in the form:
   - **Note**: something you'll recognize later, e.g. `scaffold-app-sync`.
   - **Expiration**: pick a date — do **not** choose "No expiration". Shorter
     is safer; you'll paste in a new token when it expires, and the app will
     show you the date so you know when a replacement is due.
   - **Select scopes**: check the **`repo`** checkbox (the whole `repo`
     group). That is the only scope the app needs — leave everything else
     unchecked.
6. Click **Generate token**, and copy the token. It starts with `ghp_`.
   **This is the only time GitHub will show it to you.**

## Entering the token in the app

Paste the token into the app right away (you can't view it on GitHub again
later). Enter it together with the expiration date you chose, so the app can
warn you before it lapses.

Currently the token is entered via the API endpoint `POST /api/pat` (for
example, through the Swagger UI at `/swagger-ui/index.html`, under
**PatCredential**), with:

- `token` — the `ghp_...` value you copied;
- `expiresAt` — the expiration date you picked, in `YYYY-MM-DD` format
  (optional but recommended).

You can check what the app has on file for you with `GET /api/pat` — it
returns only the last four characters and the expiration date.

## Replacing a token

Whenever your token expires, is revoked, or is lost, create a new one using
the same steps and enter it again. The new token replaces the old one; there
is nothing to delete first.
