#!/usr/bin/env bash
# promptfoo custom script provider for the .NET track.
# https://www.promptfoo.dev/docs/providers/custom-script/
#
# promptfoo invokes this with the rendered prompt as $1 and a JSON context
# (vars, scenario metadata) as $2, and expects the model's output on stdout.
#
# STATUS: scaffolded, not yet verified end to end — there is no fixture
# project checked in yet for it to run against (see ../fixtures/, still
# TODO), and the exact non-interactive flags for `claude` below should be
# confirmed against the installed CLI version before relying on this in CI.
# Treat this file as the intended shape, not a working implementation yet.
set -euo pipefail

PROMPT="$1"
CONTEXT_JSON="${2:-{}}"

FIXTURE_NAME="$(echo "$CONTEXT_JSON" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).vars?.fixture || "dotnet-starter"' 2>/dev/null || echo "dotnet-starter")"
FIXTURE_SRC="$(cd "$(dirname "$0")/.." && pwd)/fixtures/$FIXTURE_NAME"

if [ ! -d "$FIXTURE_SRC" ]; then
  echo "Fixture '$FIXTURE_NAME' not found at $FIXTURE_SRC — see evals/README.md TODO." >&2
  exit 1
fi

# Run in a disposable copy so scenarios never mutate the checked-in fixture,
# and so parallel promptfoo runs don't collide with each other.
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cp -R "$FIXTURE_SRC/." "$WORKDIR/"

# Install this repo's skills into the fixture, the same way a real consumer
# would, so the eval measures the actual install path rather than a
# hand-wired context injection.
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
(cd "$WORKDIR" && npx --yes openskills install "$REPO_ROOT" >/dev/null)

# Non-interactive Claude Code invocation. Flags may need adjusting for the
# CLI version in use — see `claude --help`.
cd "$WORKDIR"
claude -p "$PROMPT" --dangerously-skip-permissions

# Judges (see ../judges/) run their own dotnet build/test against $WORKDIR
# by reading it back out of the context the provider records — until that
# wiring exists, judges that need the resulting project on disk are also
# TODO. See evals/README.md.
