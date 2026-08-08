# Creating a PrairieLearn Personal Access Token (PAT) for this app

To look up course instance and assessment information in PrairieLearn (for
example, the numeric ids that student-facing links are built from), this app
needs to call the PrairieLearn API *as you*. You grant that permission by
creating a **personal access token** on PrairieLearn and pasting it into the
app once.

## How to create the token

To generate a personal access token, click on your name in the nav bar and
click "Settings". Under the section entitled "Personal Access Tokens", you can
generate tokens for yourself. These tokens give you all the permissions that
your normal user account has.

(Source: [PrairieLearn API documentation](https://docs.prairielearn.com/api/))

## Treat this token like a password

The token carries **all the permissions of your PrairieLearn account**. The
app protects it carefully (see below), but you should too:

- paste it only into this app — never into email, chat, or another site;
- if you ever suspect it leaked, delete it on PrairieLearn immediately
  (Settings → Personal Access Tokens) and create a new one.

## What the app does (and doesn't do) with your token

- The token is **encrypted before it is stored**; the database never contains
  the plain token.
- The token is **write-only**: no page or API in this app will ever display it
  back, only its last four characters so you can tell which token is on file.
- To replace it, just enter a new one on your profile page — the old one is
  overwritten.

## Entering the token in the app

1. Log in and open your **profile page** (click your name in the navbar).
2. In the **PrairieLearn PAT** section, paste the token and submit.

See also [Github_PAT.md](Github_PAT.md) for the GitHub token this app uses
alongside the PrairieLearn one.
