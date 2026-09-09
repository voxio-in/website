#!/usr/bin/env bash
#
# Start voxio-web — the site and its server are one process, so this is the
# only thing to run.
#
# Dev is the default. --prod builds first and then serves the build; nothing
# else changes between them, because TanStack Start is the backend either way.
#
# The database is reported, never required: with no DATABASE_URL every page
# still renders. That is why a missing .env is a warning here and not a stop.
#
#   ./start.sh                      dev on :3000
#   ./start.sh --prod --port 8080   build, then serve the build on :8080
#   ./start.sh --install --migrate  install, generate the client, migrate, run dev

set -euo pipefail

# Every path here is relative to the project, not to wherever this was invoked.
cd "$(dirname "${BASH_SOURCE[0]}")"

PROD=0
BUILD=0
PORT=3000
INSTALL=0
MIGRATE=0
TYPECHECK=0
CLEAN=0
ROUTES=0
DRY_RUN=0

if [ -t 1 ] ; then
  CYAN=$'\033[36m' ; YELLOW=$'\033[33m' ; GREEN=$'\033[32m' ; GREY=$'\033[90m' ; OFF=$'\033[0m'
else
  CYAN='' ; YELLOW='' ; GREEN='' ; GREY='' ; OFF=''
fi

step() { printf '%s→ %s%s\n' "$CYAN"   "$1" "$OFF" ; }
warn() { printf '%s! %s%s\n' "$YELLOW" "$1" "$OFF" ; }

usage() {
  cat <<'EOF'
Usage: ./start.sh [options]

  --prod            Build, then serve the build. Without it, the dev server runs.
  --build           Build and exit. Does not serve.
  --port <n>        Port to listen on (default 3000).
  --install         npm install before anything else.
  --migrate         Generate the Prisma client and apply migrations.
                    Dev uses `migrate dev`; --prod uses `migrate deploy`.
  --typecheck       Run tsc --noEmit and stop if it fails.
  --clean           Delete dist/ before building.
  --routes          Regenerate src/routeTree.gen.ts from src/routes/.
  --dry-run         Print what would run, and run nothing.
  -h, --help        This.
EOF
}

while [ $# -gt 0 ] ; do
  case "$1" in
    --prod)      PROD=1 ;;
    --build)     BUILD=1 ;;
    --port)      PORT="${2:?--port needs a number}" ; shift ;;
    --port=*)    PORT="${1#*=}" ;;
    --install)   INSTALL=1 ;;
    --migrate)   MIGRATE=1 ;;
    --typecheck) TYPECHECK=1 ;;
    --clean)     CLEAN=1 ;;
    --routes)    ROUTES=1 ;;
    --dry-run)   DRY_RUN=1 ;;
    -h|--help)   usage ; exit 0 ;;
    *)           printf 'Unknown option: %s\n\n' "$1" >&2 ; usage >&2 ; exit 2 ;;
  esac
  shift
done

run() {
  local label="$1" ; shift
  step "$label"

  if [ "$DRY_RUN" -eq 1 ] ; then
    printf '%s  %s%s\n' "$GREY" "$*" "$OFF"
    return 0
  fi

  "$@"
}

[ -f package.json ] || { echo "No package.json here — run this from the web/ directory." >&2 ; exit 1 ; }

if [ ! -f .env ] ; then
  warn "No .env — the database will report 'unconfigured' and the"
  warn "  calling and room demos will decline rather than fail."
  warn "  Copy .env.example to .env to wire them up."
fi

if [ "$INSTALL" -eq 1 ] ; then
  run 'Installing dependencies' npm install
elif [ ! -d node_modules ] ; then
  warn 'node_modules is missing — installing.'
  run 'Installing dependencies' npm install
fi

if [ "$MIGRATE" -eq 1 ] ; then
  run 'Generating the Prisma client' npx prisma generate

  # migrate dev writes new migrations from schema drift and needs a TTY;
  # migrate deploy only applies what is already committed, which is the only
  # safe thing to do against a production database.
  if [ "$PROD" -eq 1 ] || [ "$BUILD" -eq 1 ] ; then
    run 'Applying migrations' npx prisma migrate deploy
  else
    run 'Applying migrations' npx prisma migrate dev
  fi
fi

# Written out rather than `[ ] && run ...` : under `set -e` a one-liner whose
# test fails makes the whole list return 1, which is a trap waiting for whoever
# adds the next flag.
if [ "$ROUTES" -eq 1 ] ; then
  run 'Regenerating the route tree' npx tsr generate
fi

if [ "$TYPECHECK" -eq 1 ] ; then
  run 'Typechecking' npx tsc --noEmit
fi

if [ "$CLEAN" -eq 1 ] ; then
  step 'Cleaning dist/'
  [ "$DRY_RUN" -eq 1 ] || rm -rf dist
fi

if [ "$BUILD" -eq 1 ] ; then
  run 'Building' npm run build
  printf '\n%sBuilt into dist/. Serve it with: ./start.sh --prod --port %s%s\n' "$GREEN" "$PORT" "$OFF"
  exit 0
fi

if [ "$PROD" -eq 1 ] ; then
  run 'Building' npm run build
  printf '\n%sServing the build on http://localhost:%s%s\n' "$GREEN" "$PORT" "$OFF"
  printf '%sHealth: http://localhost:%s/api/health%s\n\n' "$GREY" "$PORT" "$OFF"
  run 'Starting' npx vite preview --port "$PORT"
else
  printf '\n%sDev server on http://localhost:%s%s\n' "$GREEN" "$PORT" "$OFF"
  printf '%sHealth: http://localhost:%s/api/health%s\n' "$GREY" "$PORT" "$OFF"

  # The gateway posts a call's transcript back to PUBLIC_URL. In dev that is a
  # tunnel, and its host has to be in vite.config.ts's allowedHosts or the
  # posts are 403'd before they arrive.
  if [ "$DRY_RUN" -eq 0 ] && [ -f .env ] && ! grep -qE '^[[:space:]]*PUBLIC_URL[[:space:]]*=' .env ; then
    warn 'PUBLIC_URL is not set — webhooks have nowhere to post,'
    warn '  so transcripts and scene beats will not arrive.'
  fi

  printf '\n'
  run 'Starting' npx vite dev --port "$PORT"
fi
