# Evals

Every skill in this repo is graded by scenarios that put a coding agent, with
that skill installed, in front of a real Jinaga.NET (later: Jinaga JS) task
and check what it produces. The suite runs on [promptfoo](https://www.promptfoo.dev),
chosen over a bespoke runner because scenario authoring, LLM-rubric grading,
and result comparison across runs are already solved problems there — we
only need to supply the provider (how a scenario reaches a coding agent) and
the judges (how a result is scored).

## Status

The full pipeline — provider copies the fixture, installs this repo's
skills into the copy via `openskills`, runs the coding agent, and hands both
judges a real path on disk to inspect — is wired and dry-run verified (a
stub CLI standing in for `claude`, so the plumbing is exercised without
spending real API calls): JSON escaping through the shell, the
`resultProjectDir` hand-off via promptfoo's `metadata` channel, both judges
reading real files and running real `dotnet build`/`dotnet test`. That dry
run caught and fixed two real bugs along the way — worth knowing about if
you're editing `claude-code-dotnet.sh` again: a `${3:-{}}` bash default that
silently corrupted JSON (bash's `:-` isn't brace-matching-aware), and a
`prior` idiom-check regex that had the C# positional-record parameter order
backwards. Both are called out in comments at the fix site.

**Not yet done: an actual run against a live model.** Nothing above proves
the exact `claude -p ... --dangerously-skip-permissions` invocation
produces a usable transcript from a real coding session, only that it's the
documented flag set. Run one scenario for real
(`cd evals && npm install && npm run eval`) and read the result in
`evals/.runs/<run-id>/` before trusting this in CI.

## Scenario schema

A scenario is one promptfoo test-case file under
`evals/scenarios/<skill-name>/<scenario-name>.yaml`:

```yaml
description: >
  Analyst-facing rationale for why this scenario exists and what real
  pattern it's drawn from. Never sent to the model — promptfoo keeps this
  as a label only.
vars:
  prompt: >
    The task exactly as a developer would phrase it. Deliberately avoid
    naming the fact types or the pattern to use, where realistic — the
    point is to check whether the skill supplies that, not to hand it to
    the model in the prompt.
assert:
  - type: javascript
    value: file://../../judges/<judge>.js
  - type: llm-rubric
    value: >
      A rubric an LLM judge grades the transcript against, for anything a
      program can't verify.
```

`description` and `prompt` are kept separate deliberately — the description
can spoil the answer (it often names the exact pattern to use), so it must
never appear anywhere the model under test can see it.

## Judges, in order of preference

1. **Real compiler/test-runner output.** A `javascript` assertion that shells
   out to `dotnet build` and `dotnet test` (or `tsc --noEmit` / `vitest run`
   for the TypeScript track) against the resulting project and checks the
   exit code. This is ground truth — it can't be talked out of a wrong
   answer — so reach for it whenever the scenario's success criteria include
   "the code works."
2. **Hand-coded programmatic checks.** A `javascript` assertion that reads
   the generated source and checks for a specific idiom mechanically — e.g.
   "a fact type with a `prior` array parameter exists" or "no fact type uses
   `class` instead of `record`". These live in `evals/judges/` and should be
   simple enough that a contributor can read the check and immediately see
   what it does and doesn't catch. They're not a replacement for the compiler
   check above — a model can satisfy a regex-shaped idiom check while still
   producing code that doesn't compile.
3. **`llm-rubric`.** promptfoo's built-in LLM-as-judge assertion, for
   anything the first two can't see — did the agent choose the right pattern
   for the right reason, not just produce syntax that happens to match it.
   Write rubrics as a fixed checklist ("passes only if all of the following
   are true: ...") rather than an open-ended quality judgment, so two runs of
   the same rubric against the same transcript agree.

## Provider

Scenarios run against a coding agent with every skill in this repo installed
via `openskills` (`npx openskills install <path-to-this-repo> -y` — a plain
local path, no GitHub remote needed) into a copy of a fixture project under
`evals/.runs/<run-id>/` — see `providers/claude-code-dotnet.sh`, a promptfoo
[custom script provider](https://www.promptfoo.dev/docs/providers/custom-script/)
that shells out to the Claude Code CLI non-interactively. That copy is left
in place after the script exits, not deleted — a judge runs as a separate
step afterward and needs somewhere on disk to point `dotnet build`/`dotnet test`
at. `evals/.runs/` is gitignored and cleared at the start of every
`npm run eval`, so a stale run never leaks into the next one; inspect one
after a run for debugging, before the next `npm run eval` clears it.

Point a scenario at a different fixture directory with a `fixture` var if
the default (`evals/fixtures/dotnet-starter`) doesn't apply.

The provider reports where the modified project ended up via the
`metadata` field of its response — promptfoo surfaces that to every
assertion as `context.metadata`. Both `.NET`-track judges read
`context.metadata.resultProjectDir` from there; that's the mechanism to
reuse if a future judge also needs to look at the result on disk.

## Running the suite

```bash
cd evals
npm install
npm run eval
```

To check whether a skill is actually earning its place, run the same
scenarios once with the skill installed and once without (comment it out of
the fixture's `.claude/skills`, or point `openskills` at an empty set) and
compare pass rates. A skill that doesn't move the outcome on scenarios it
wasn't written against isn't ready to ship.
