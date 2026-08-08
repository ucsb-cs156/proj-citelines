#!/usr/bin/env bash
#
# Create or rotate the PAT encryption key used by the app to encrypt users'
# GitHub personal access tokens before storing them in the database.
#
# The key value has the form "<version>:<base64 of 32 random bytes>", e.g.
#   1:q3o0uu4iGnfDVL9161FSToJXMDRCUJH0FhOJs5C7Rr0=
# This script is the only place version numbers are minted: on first run it
# installs version 1; on later runs it moves the current key to
# PREVIOUS_PAT_ENCRYPTION_KEY and installs version N+1 as PAT_ENCRYPTION_KEY.
# It never regenerates an existing key in place.
#
# Usage:
#   scripts/set-pat-encryption-key.sh dokku <app-name>   # run on the dokku host
#   scripts/set-pat-encryption-key.sh env-file [path]    # localhost dev; default path .env
#
# See docs/PAT_ENCRYPTION_KEY_instructions.md for the full runbook, including
# how to finish a rotation (restart, run the rotatePatKeys job, then remove
# PREVIOUS_PAT_ENCRYPTION_KEY).

set -euo pipefail

usage() {
  echo "Usage:" >&2
  echo "  $0 dokku <app-name>              # run on the dokku host" >&2
  echo "  $0 env-file [path-to-env-file]   # localhost dev (default: .env)" >&2
  exit 1
}

new_key() {
  openssl rand -base64 32
}

version_of() {
  # Prints the numeric version prefix of a "<version>:<key>" value, or fails.
  local value="$1"
  local version="${value%%:*}"
  if [[ ! "$version" =~ ^[0-9]+$ ]]; then
    echo "error: existing PAT_ENCRYPTION_KEY does not start with a '<version>:' prefix" >&2
    exit 1
  fi
  echo "$version"
}

rotation_next_steps() {
  cat <<'EOF'
To finish the rotation:
  1. Make sure the app has restarted with the new configuration.
  2. As an admin, launch the rotatePatKeys job (POST /api/jobs/launch/rotatePatKeys)
     and check its log to confirm every credential was re-encrypted.
  3. Remove PREVIOUS_PAT_ENCRYPTION_KEY from the configuration.
EOF
}

case "${1:-}" in
  dokku)
    app="${2:-}"
    [ -n "$app" ] || usage
    current="$(dokku config:get "$app" PAT_ENCRYPTION_KEY 2>/dev/null || true)"
    if [ -z "$current" ]; then
      dokku config:set "$app" PAT_ENCRYPTION_KEY="1:$(new_key)"
      echo "Created the initial PAT encryption key (version 1) for app '$app'."
      echo "Back this key up somewhere separate from your database backups."
    else
      version="$(version_of "$current")"
      next=$((version + 1))
      dokku config:set "$app" \
        PREVIOUS_PAT_ENCRYPTION_KEY="$current" \
        PAT_ENCRYPTION_KEY="${next}:$(new_key)"
      echo "Rotated the PAT encryption key for app '$app' from version $version to $next."
      rotation_next_steps
    fi
    ;;
  env-file)
    file="${2:-.env}"
    touch "$file"
    current="$(grep -E '^PAT_ENCRYPTION_KEY=' "$file" | head -1 | cut -d= -f2- || true)"
    if [ -z "$current" ]; then
      echo "PAT_ENCRYPTION_KEY=1:$(new_key)" >>"$file"
      echo "Added the initial PAT encryption key (version 1) to $file."
    else
      version="$(version_of "$current")"
      next=$((version + 1))
      tmp="$(mktemp)"
      grep -vE '^(PAT_ENCRYPTION_KEY|PREVIOUS_PAT_ENCRYPTION_KEY)=' "$file" >"$tmp" || true
      {
        echo "PREVIOUS_PAT_ENCRYPTION_KEY=$current"
        echo "PAT_ENCRYPTION_KEY=${next}:$(new_key)"
      } >>"$tmp"
      mv "$tmp" "$file"
      echo "Rotated the PAT encryption key in $file from version $version to $next."
      rotation_next_steps
    fi
    ;;
  *)
    usage
    ;;
esac
