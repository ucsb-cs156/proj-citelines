# OAuth Setup

This Spring Boot application uses Google OAuth for authentication.

Setting this up on localhost requires the first two steps below; getting it to work on Dokku requires an additional third step.

1. Obtaining a Google *client id* and *client secret* at the [Google Developer Console](https://console.cloud.google.com/).
2. Configuring the `.env` file with these values.
3. Copying the `.env` values to the Dokku app's configuration.

## Step-by-step

If this is your first time setting up a Google OAuth application in this course, you may need all three sub-steps. Later, you'll typically only need the last one.

1. **One time only**: Set up a project in the Google Developer Console:
   - <https://ucsb-cs156.github.io/topics/oauth/google_create_developer_project.html>
2. **One time only**: Set up an OAuth Consent Screen for your project:
   - <https://ucsb-cs156.github.io/topics/oauth/google_oauth_consent_screen.html>
3. **Once per application**: Create OAuth credentials (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`):
   - <https://ucsb-cs156.github.io/topics/oauth/oauth_google_setup.html>

## Step 1: Configure `.env` for localhost

Copy `.env.SAMPLE` to `.env`:

```
cp .env.SAMPLE .env
```

Then fill in your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values.

For `ADMIN_EMAILS`, add your own email and any teammates. Use commas with **no spaces**:

```
ADMIN_EMAILS=phtcon@ucsb.edu,cgaucho@ucsb.edu
```

Without valid OAuth credentials you will see an error like:

> Authorization Error — Error 401: invalid_client — The OAuth client was not found.

## Step 2: Copy `.env` values to Dokku

For each variable in `.env`, run on the Dokku server:

```
dokku config:set --no-restart <app-name> VARIABLE=VALUE
```

Also set:

```
dokku config:set --no-restart <app-name> PRODUCTION=true
```

For troubleshooting see:
- <https://ucsb-cs156.github.io/topics/oauth/oauth_troubleshooting.html>
