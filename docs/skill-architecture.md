# Skill architecture

Why the skills are split the way they are, what each one covers, and how the
eval suite grades them. This is a living document — when the shape of the
skill set changes, update this file in the same commit.

## Shape

One shared, language-agnostic spine for modeling; one skill track per target
language for everything downstream of the model.

**Spine** — historical modeling in the Factual pattern language doesn't
depend on whether the resulting facts end up as C# records or TypeScript
classes. Model it once.

**Tracks** — translating a fact model into code, testing it, and wiring it
into a UI diverges sharply between Jinaga.NET and Jinaga JS/TypeScript: the
fact-declaration syntax, the specification query syntax, the test harness,
and the UI-binding layer (reactive view models vs. React hooks) are all
different mechanics solving the same modeling problems. Blurring them into
one skill teaches the wrong syntax for the wrong language.

The .NET track ships first, as the reference implementation of this pattern.
TypeScript follows once the .NET track and the eval harness have proven out
end to end — see [Rollout](#rollout).

## The skills

### Spine (language-agnostic)

| Skill | Fires on | Core content |
|---|---|---|
| `designing-historical-models` | "Model X as facts", "how should I represent Y over time" | Decisions-not-state modeling stance; the historical-modeling pattern catalog (Entity, Delete/Restore, Mutable Property, Membership, Period, Transaction, Queue…); naming idioms; a data-first authoring loop |
| `diagramming-historical-models` | "Diagram this model", "draw the fact graph" | Fact-type graph notation (entities, predecessor arrows, cardinality), specification overlays, fact-instance graphs |
| `reviewing-model-idioms` | "Review this model", "why is this query returning stale or duplicate rows" | A checklist of the most common historical-modeling defects: forgetting to filter a superseded or tombstoned fact out of a read, encoding lifecycle state as a mutable field instead of a fact, vague names that hide what a group-by or sub-specification actually represents |

These three assume nothing beyond a coding agent and the ability to read and
write plain text — no MCP server, no external service. They're the first
thing a developer reaches for before any code exists.

### .NET track

| Skill | Fires on | Core content |
|---|---|---|
| `authoring-jinaga-facts-dotnet` | "Define this fact type in C#", "add a property to this record" | `record`, never `class`; `[FactType]` dotted naming; predecessors as constructor parameters; the mutable-value-via-successor-fact (`prior`) pattern; disambiguating anchor facts; encapsulating relations on framework types via `Relation<T>` extension members |
| `authoring-jinaga-specifications-dotnet` | "Write a query in C#", "project this data" | `Given<T>.Match(...)` syntax; `Successors().OfType<T>(...)`; `WhereCurrent(next => next.prior)`; the hard limit that specifications only project and filter by relationship — sorting, counting, and grouping happen after materialization |
| `testing-jinaga-dotnet` | "Write a test for this fact or spec" | `JinagaTest.Create()`; a `GivenXxx` test-data-builder convention; testing concurrent edits and their resolution; waiting for a watch to settle deterministically instead of `Task.Delay` |
| `integrating-jinaga-reactive-viewmodels-dotnet` | "Build a view model for this spec", "bind this to XAML" | Reactive collections populated from `j.Watch()`; marshaling background-thread callbacks to the UI thread; disposal; a design-first workflow (sketch the model, visualize it, then implement) |

### TypeScript track (planned)

Same shape, once started: `authoring-jinaga-facts-typescript`,
`authoring-jinaga-specifications-typescript`,
`authoring-authorization-distribution-typescript`, `testing-jinaga-typescript`,
`integrating-jinaga-react`. TypeScript gets a fifth skill the .NET track
doesn't have yet — authorization and distribution rules are a sharper edge in
a networked, multi-tenant Jinaga JS app than in a single-user desktop app,
and deserve their own trigger.

Not planned yet: a top-level router skill. Add one only once real usage shows
which routing questions actually need answering — guessing at that now would
just be another rule nobody asked for.

## Principles

**Say the same rule at most two ways, and make them agree.** A rule belongs
in the skill's prose, and it should be checkable by an eval judge. If a rule
can't be checked — not by a compiler, not by a regex, not by a rubric a
different reviewer would apply the same way — it's not specific enough yet.

**Start thin; let scenarios earn each rule.** Seed a skill with the two or
three idioms you already have real evidence for. Add a rule only when a
scenario fails without it. An exhaustive skill written in one sitting is a
guess at what will matter; a skill grown from failing scenarios is a record
of what actually did.

**Ground every eval in a real commit, not a synthetic toy.** A scenario like
"add a mutable property to an existing fact" or "add an authorization rule
restricting who can create a fact" should be traceable to something that
actually shipped, because those carry real consequences (a forked hash, a
403 from an authorization check, a stale read) that an invented example
usually doesn't reproduce.

**Prefer a judge that can't be talked out of a wrong answer.** A real
compiler run or test-runner exit code beats a hand-written static check;
a hand-written static check beats an LLM rubric. Reach for a rubric only for
things neither of the others can see.

## Evals

See [`evals/README.md`](../evals/README.md) for the full scenario schema and
how to run the suite. In short: scenarios are hand-authored YAML files under
`evals/scenarios/<skill-name>/`, run through [promptfoo](https://www.promptfoo.dev)
against a coding-agent provider with the skill installed, and graded by a mix
of hand-coded programmatic judges (including real `dotnet build`/`dotnet test`
or `tsc`/`vitest` runs) and promptfoo's `llm-rubric` assertions for anything
a program can't verify.

Before a skill is considered done, run its scenarios both with and without
the skill loaded. A skill only earns its place once it measurably changes the
outcome on scenarios it wasn't tuned against — if it doesn't, either the
skill isn't adding anything a capable agent didn't already know, or the
scenario isn't actually exercising the rule.

## Rollout

1. **Spine + harness.** Build the three shared skills and stand up the eval
   harness (promptfoo config, one hand-coded judge, one fully worked
   scenario) together, so the harness is proven before it needs to scale.
2. **.NET track.** Build the four .NET skills against scenarios mined from
   real Jinaga.NET application history. Run every scenario with and without
   its skill before calling the track done.
3. **TypeScript track.** Same process, second language. If the spine or the
   harness need to change to accommodate it, that's a sign the spine wasn't
   as language-agnostic as assumed — fix the spine, don't special-case the
   track.
4. **Consolidate.** Run the full set through its scenarios together, retire
   or merge any skill that isn't earning its keep, and only then consider a
   router skill.
