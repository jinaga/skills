# Evals

Every skill in this repo is graded by scenarios that put a coding agent, with
that skill installed, in front of a real Jinaga.NET (later: Jinaga JS) task
and check what it produces. The suite runs on [promptfoo](https://www.promptfoo.dev),
chosen over a bespoke runner because scenario authoring, LLM-rubric grading,
and result comparison across runs are already solved problems there — we
only need to supply the provider (how a scenario reaches a coding agent) and
the judges (how a result is scored).

## Status

**The `task-rename` scenario passes end to end against a live model** —
provider copies the fixture, installs this repo's skills into the copy via
`openskills`, runs Claude Code non-interactively, and both judges read the
result back off disk. All three assertions pass independently on a fresh
(cache genuinely bypassed) run: the idiom judge finds no violations across
the 5 `.cs` files produced, `dotnet build`/`dotnet test` both succeed for
real, and the `llm-rubric` scores 0.9 — Claude added `TaskTitle` as its own
fact type with a `prior` array, a `CurrentTitle` specification using
`WhereCurrent`, and two tests covering rename-then-read and
rename-twice-leaves-one-current.

Getting there took four live runs. The first three each found a real bug
that a dry run (a stub CLI standing in for `claude`, exercising the
shell/JSON plumbing without spending API calls) had not and could not have
caught, because each one only shows up once promptfoo itself is actually
driving the provider:

1. **Wrong `file://` base path.** Assertion paths in a scenario resolve
   relative to `promptfooconfig.yaml`'s directory (`evals/`), not the
   scenario file's own directory — `scenarios/<skill>/task-rename.yaml` had
   `file://../../judges/...` on the assumption promptfoo resolves relative
   to itself; the correct path from `evals/` is just `file://judges/...`.
2. **promptfoo caches provider responses by default**, keyed on
   (provider, rendered prompt). Fine for a deterministic API call; wrong
   here, where the provider's real output is a side effect on disk that
   `npm run eval` deliberately clears between runs — a cache hit replayed a
   transcript pointing at an already-deleted directory, and worse, would
   have silently skipped re-running the agent on every subsequent run.
   Fixed with `evaluateOptions.cache: false` in `promptfooconfig.yaml`.
3. **`exec:` providers have no `metadata` channel.** The original design
   had the provider script return a `{ output, metadata }` JSON envelope on
   the (correct, for a custom JS/Python provider) assumption that promptfoo
   would surface `metadata` to judges as `context.metadata`. It doesn't,
   for this provider type — confirmed against promptfoo's own source
   (`scriptCompletion.ts`): the *entire* stdout, unparsed, becomes the
   `output` string, full stop. Fixed by having judges parse that JSON
   envelope back out of `output` themselves
   (`judges/_provider-envelope.js`), rather than reading a `context.metadata`
   that was silently always empty.

A live run also surfaced a real gap in `authoring-jinaga-specifications-dotnet`
itself, independent of harness plumbing: the skill's example imported
`WhereCurrent` from `Jinaga.Extensions`, but in the pinned `Jinaga 1.1.39`
package it's actually in `Jinaga.Patterns` — verified independently by
disassembling the NuGet package (not just trusting the model's self-report)
and by compiling and running a scratch test against both `WhereCurrent` and
the real `WhereNotDeletedOrRestored` delete/restore helper the skill hadn't
been documenting at all (it hand-rolled a nested existential using a
`WhereNotExists` method that doesn't exist in the real API). Both are now
fixed in the skill with verified-correct code.

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
  # file:// paths in an assertion resolve relative to promptfooconfig.yaml's
  # directory (evals/), not the scenario file's own directory — even though
  # this file lives under scenarios/<skill-name>/.
  - type: javascript
    value: file://judges/<judge>.js
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

The provider prints a `{ output, metadata: { resultProjectDir } }` JSON
envelope to stdout. Because this is an `exec:` provider, promptfoo does not
parse that — the whole string becomes the `output` every assertion
receives as its first argument, unparsed. Judges recover
`resultProjectDir` by parsing `output` as JSON themselves — see
`judges/_provider-envelope.js`, shared by both `.NET`-track judges. Reuse
that helper for any future judge that also needs to look at the result on
disk; don't reach for `context.metadata`, which is always empty for this
provider type.

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
