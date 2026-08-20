# Evals

Every skill in this repo is graded by scenarios that put a coding agent, with
that skill installed, in front of a real Jinaga.NET (later: Jinaga JS) task
and check what it produces. The suite runs on [promptfoo](https://www.promptfoo.dev),
chosen over a bespoke runner because scenario authoring, LLM-rubric grading,
and result comparison across runs are already solved problems there — we
only need to supply the provider (how a scenario reaches a coding agent) and
the judges (how a result is scored).

## Status

The harness shape below is settled; the pieces that need a real Jinaga.NET
fixture project to run against are not yet fully wired up. The fixture now
exists — [`fixtures/dotnet-starter/`](fixtures/dotnet-starter/) is a real,
verified-building two-project .NET solution the `task-rename` scenario seeds
from. What's still open is the hand-off from the provider run to the
build/test judge (where the modified project ends up on disk), plus
confirming the exact non-interactive `claude` CLI flags. See the TODOs in
[`providers/claude-code-dotnet.sh`](providers/claude-code-dotnet.sh) and
[`judges/dotnet-build-and-test.js`](judges/dotnet-build-and-test.js).

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

Scenarios run against a coding agent with the skill under test installed via
`openskills` into a disposable copy of a fixture project — see
`providers/claude-code-dotnet.sh`, a promptfoo
[custom script provider](https://www.promptfoo.dev/docs/providers/custom-script/)
that shells out to the Claude Code CLI non-interactively. Point a scenario's
provider at a fixture directory with a `fixture` var if the default
(`evals/fixtures/dotnet-starter`) doesn't apply.

## Running the suite

```bash
cd evals
npm install
npx promptfoo eval -c promptfooconfig.yaml
```

To check whether a skill is actually earning its place, run the same
scenarios once with the skill installed and once without (comment it out of
the fixture's `.claude/skills`, or point `openskills` at an empty set) and
compare pass rates. A skill that doesn't move the outcome on scenarios it
wasn't written against isn't ready to ship.
