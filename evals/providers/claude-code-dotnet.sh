#!/usr/bin/env bash
# promptfoo custom script (exec:) provider for the .NET track.
# https://www.promptfoo.dev/docs/providers/custom-script/
#
# Contract (verified against promptfoo's own source,
# src/providers/scriptCompletion.ts): promptfoo calls this with
# (prompt, options_json, context_json) and takes this script's ENTIRE
# stdout, verbatim, as the ProviderResponse's `output` string — nothing
# more. It does NOT parse stdout as JSON and this provider type has no
# separate `metadata` channel, unlike a custom JS/Python provider — an
# earlier version of this script assumed otherwise and it took a live run
# to catch. So: this script still prints a `{ output, metadata }` JSON
# envelope below, but the only thing that reaches a judge is that whole
# string as `output` — judges parse it themselves
# (../judges/_provider-envelope.js) to get resultProjectDir back out.
#
# Verified pieces: `npx openskills install <local-path>` (installs every
# skill in this repo without needing a GitHub remote — confirmed against the
# openskills CLI actually installed here), `claude -p ... --dangerously-skip-permissions`
# (confirmed against `claude --help` and a live run), and a live run
# producing a real, correct rename feature end to end (see
# evals/README.md's Status section).
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
