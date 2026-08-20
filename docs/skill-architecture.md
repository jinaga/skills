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

The .NET track shipped first, as the reference implementation of this
pattern; TypeScript followed the same shape once the .NET track and the
eval harness had proven out end to end — see [Rollout](#rollout).

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

### TypeScript track

| Skill | Fires on | Core content |
|---|---|---|
| `authoring-jinaga-facts-typescript` | "Define this fact type in TS", "add a field to this fact class" | Class + static `Type` + `ModelBuilder` registration; predecessors as constructor parameters; the static-query-helper-per-need convention (`.of`/`.by`/`.current`); the `prior`-chain mutable-value pattern; delete/restore; reconstructable key facts; schema evolution via `undefined`-skipping hashing |
| `authoring-jinaga-specifications-typescript` | "Write a specification", "query/project this data" | `model.given(T).match(...)`; `.successors()`/`.predecessor()`; `.notExists()`/`.exists()`; the "predecessors must go through `.predecessor()`" rule (a runtime throw at spec-build time, not a compile error); combining reads into one round trip |
| `authoring-authorization-distribution-typescript` | "Who can create/read this", "the replicator rejected this write" | `AuthorizationRules.type()` (and the easy-to-miss requirement that even the built-in `User` fact needs its own rule); `DistributionRules.share().with()`; the distinction between a rejected write (throws) and a denied read (quieter — offline-first); keeping the generated replicator policy artifact in sync |
| `testing-jinaga-typescript` | "Write a test for this fact / spec / rule" | `JinagaTest.create(...)`; proving authorization and distribution rejections directly rather than through a reactive hook; comparing facts by `Jinaga.hash()`, never by reference; reconstruction tests that rebuild the key rather than reuse the seed instance |
| `integrating-jinaga-react` | "Wire this into a component", "build a hook for this spec" | `useSpecification`'s full result shape (`loading`/`data`/`error`/`distributionPending`/`distributionDiagnostic`); why `data !== null`, not `!loading`, is the real settled signal (a cached read never sets `loading` true at all); writes via `j.fact()` |

TypeScript gets a fifth skill the .NET track doesn't have — authorization
and distribution rules are a sharper edge in a networked, multi-tenant
Jinaga JS app than in a single-user desktop app, and deserve their own
trigger.

Not planned yet: a top-level router skill. Add one only once real usage shows
which routing questions actually need answering — guessing at that now would
just be another rule nobody asked for.

### Adjacent: `assisticant-view-models`

One deliberate exception to "every skill here is Jinaga-specific":
`assisticant-view-models` covers [Assisticant](https://github.com/michaellperry/Assisticant),
a general-purpose reactive data-binding library with nothing Jinaga-specific
in it — `Observable<T>`, `ObservableList<T>`, computed properties without
`INotifyPropertyChanged`, `ViewModelLocatorBase`, WPF validation. It's here
because `integrating-jinaga-reactive-viewmodels-dotnet` assumes it as the
binding layer underneath a Jinaga.NET reactive view model, and a developer
following that skill needs Assisticant's own patterns to finish the job.
Content is carried over as-is; it doesn't get the same "verified against
the real package" treatment the Jinaga-specific skills do, since it isn't
graded by this repo's eval harness and isn't the thing this repo is about —
treat it as a convenience for readers already committed to Assisticant, not
as an endorsement to reach for over some other binding layer.

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
3. **TypeScript track — done.** Built against scenarios verified line by
   line against the real `jinaga`/`jinaga-react` packages (their actual
   `.d.ts` files and compiled behavior, not assumed from older example
   code — which turned up real API drift worth knowing about: `Jinaga.hash`
   is a static method, not an instance one; `jinaga-react`'s current
   `useSpecification` already solves the exact "distribution denial is
   invisible to a reactive read" problem with `distributionPending`/
   `distributionDiagnostic`). The harness did need to change, and per the
   principle above that's exactly what should have happened rather than
   special-casing the track: the provider was renamed from
   `claude-code-dotnet.sh` to a shared `claude-code.sh` (fixture choice was
   already driven entirely by each scenario's `fixture` var, so this was a
   rename, not a rewrite), gained an `npm install` step for fixtures with a
   `package.json`, and — found by a live run, not anticipated — had to stop
   pointing `openskills install` at the live working tree and instead
   install from a clean `git archive` snapshot, because a dev machine's
   gitignored `evals/node_modules` could itself contain packages shipping
   unrelated `SKILL.md` files that openskills would otherwise pick up
   alongside this repo's real ones.
4. **Consolidate.** Run the full set through its scenarios together, retire
   or merge any skill that isn't earning its keep, and only then consider a
   router skill.
