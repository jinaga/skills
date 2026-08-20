#!/usr/bin/env bash
# promptfoo custom script provider for the .NET track.
# https://www.promptfoo.dev/docs/providers/custom-script/
#
# Contract (verified against promptfoo's docs): promptfoo calls this with
# (prompt, options_json, context_json) and expects a single JSON object on
# stdout shaped like a ProviderResponse: { "output": "...", "metadata": {...} }.
# `metadata` becomes `context.metadata` inside every assertion that grades
# this test — that's the channel ../judges/dotnet-build-and-test.js uses to
# find the project this run produced (`context.metadata.resultProjectDir`).
#
# Verified pieces: `npx openskills install <local-path>` (installs every
# skill in this repo without needing a GitHub remote — confirmed against the
# openskills CLI actually installed here), and `claude -p ... --dangerously-skip-permissions`
# (confirmed against `claude --help`).
#
# Not yet verified: an actual live run against a real model — this has been
# checked for correct wiring and correct flags, not run end to end, since
# that costs real API time/tokens. Run one scenario by hand
# (`npx promptfoo eval -c promptfooconfig.yaml --filter-pattern task-rename`,
# from evals/) and read evals/.runs/<run-id>/ before trusting this in CI.
set -euo pipefail

PROMPT="$1"
# Not `${3:-{}}` — bash's ${var:-default} isn't brace-matching-aware, so a
# literal `{}` default there gets mis-parsed and a stray `}` leaks onto the
# end of $3, corrupting the JSON before node ever sees it. Verified the hard
# way; keep this as two statements.
CONTEXT_JSON="${3:-}"
if [ -z "$CONTEXT_JSON" ]; then
  CONTEXT_JSON="{}"
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

FIXTURE_NAME="$(node -e '
  const ctx = JSON.parse(process.argv[1] || "{}");
  process.stdout.write(ctx.vars && ctx.vars.fixture ? ctx.vars.fixture : "dotnet-starter");
' "$CONTEXT_JSON")"

FIXTURE_SRC="$REPO_ROOT/evals/fixtures/$FIXTURE_NAME"
if [ ! -d "$FIXTURE_SRC" ]; then
  node -e '
    const [msg] = process.argv.slice(1);
    process.stdout.write(JSON.stringify({ output: "", error: msg }));
  ' "Fixture '$FIXTURE_NAME' not found at $FIXTURE_SRC — see evals/fixtures/README.md."
  exit 0
fi

# Each run gets its own directory under evals/.runs/, left in place after
# this script exits (unlike a mktemp+trap-delete workdir) so the judge —
# which runs as a separate promptfoo step, after this script has already
# returned — can still find and build it. `npm run eval` clears .runs/ at
# the start of a suite; nothing in this script deletes it.
RUNS_DIR="$REPO_ROOT/evals/.runs"
mkdir -p "$RUNS_DIR"
RUN_ID="$(node -e 'process.stdout.write(require("crypto").randomUUID())')"
WORKDIR="$RUNS_DIR/$RUN_ID"
mkdir -p "$WORKDIR"
# rsync, not cp -R: a local checkout's fixture directory can have stale
# bin/obj from a prior manual `dotnet build` (gitignored, so a fresh clone
# never has them, but a working copy might) — exclude them explicitly
# rather than copying — and possibly running — stale build output.
rsync -a --exclude=bin --exclude=obj "$FIXTURE_SRC/" "$WORKDIR/"

# Install this repo's skills into the copy the same way a real consumer
# would — from a checkout on disk, not a hand-wired context injection —
# so the eval measures the actual install path.
INSTALL_LOG="$WORKDIR/.openskills-install.log"
if ! (cd "$WORKDIR" && npx --yes openskills install "$REPO_ROOT" -y >"$INSTALL_LOG" 2>&1); then
  node -e '
    const [workdir, log] = process.argv.slice(1);
    process.stdout.write(JSON.stringify({
      output: "",
      error: "openskills install failed — see " + log,
      metadata: { resultProjectDir: workdir },
    }));
  ' "$WORKDIR" "$INSTALL_LOG"
  exit 0
fi

set +e
CLAUDE_OUTPUT="$(cd "$WORKDIR" && claude -p "$PROMPT" --dangerously-skip-permissions 2>&1)"
CLAUDE_EXIT=$?
set -e

node -e '
  const [output, resultProjectDir, exitCodeStr] = process.argv.slice(1);
  const exitCode = parseInt(exitCodeStr, 10);
  const response = { output, metadata: { resultProjectDir, claudeExitCode: exitCode } };
  if (exitCode !== 0) response.error = "claude exited with code " + exitCode;
  process.stdout.write(JSON.stringify(response));
' "$CLAUDE_OUTPUT" "$WORKDIR" "$CLAUDE_EXIT"
