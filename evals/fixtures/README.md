# Fixtures

Each scenario's `fixture` var names a directory here — a minimal, real
Jinaga project the provider copies and hands to the agent under test, so a
scenario is grading real code changes to a real project, not a snippet in
isolation.

## `dotnet-starter`

Referenced by `evals/scenarios/authoring-jinaga-facts-dotnet/task-rename.yaml`.
A minimal two-project .NET solution:

- `TaskTracker.Core` — references `Jinaga` via NuGet, and declares the
  `Project` and `Task` fact types from `skills/authoring-jinaga-facts-dotnet/SKILL.md`,
  plus one `TaskSpecifications.TasksInProject` specification. `Task`
  deliberately has no title yet — that's what each scenario adds.
- `TaskTracker.Core.Test` — references `Jinaga.UnitTest` and xUnit, with one
  passing test (`CanSaveAndQueryATaskInAProject`) already in place, so a
  scenario that fails to add tests of its own still leaves the suite green
  and the build/test judge is checking the *new* behavior, not just
  "nothing is broken."

Verified to build and test clean with `dotnet build` / `dotnet test` from
this directory, against the pinned package versions in each `.csproj`
(.NET SDK 10, targeting `net8.0`). Bump those versions deliberately, not by
floating to `*` — re-verify with `dotnet build && dotnet test` after any
bump.

Note the naming collision this fixture works around: a fact type named
`Task` sits alongside `System.Threading.Tasks.Task` throughout .NET async
code. `TaskTracker.Core.Test/ModelTests.cs` handles it by fully-qualifying
`TaskTracker.Task`/`TaskTracker.Project` rather than `using TaskTracker;`,
and by keeping its own namespace (`TaskTrackerCoreTests`) un-nested under
`TaskTracker` — a nested namespace would pull the fact type back into
unqualified scope and reintroduce the ambiguity. Any new fixture code (or
code an eval scenario asks an agent to add) should follow the same
convention.

## `typescript-starter`

Referenced by `evals/scenarios/authoring-jinaga-facts-typescript/task-rename.yaml`.
A minimal TypeScript project mirroring `dotnet-starter`'s scope exactly, so
the two tracks' scenarios are comparable:

- `src/model.ts` — depends on `jinaga` via npm, and declares the `Project`
  and `Task` fact classes from `skills/authoring-jinaga-facts-typescript/SKILL.md`
  (with a `ModelBuilder` registration), plus one `tasksInProject`
  specification. `Task` deliberately has no title yet.
- `src/model.test.ts` — one passing vitest test (`saves and queries a task
  in a project`) against `JinagaTest`, so a scenario that fails to add
  tests of its own still leaves the suite green.

Verified to type-check and test clean with `npx tsc --noEmit` / `npx vitest
run` from this directory, against pinned versions in `package.json`
(`jinaga` 6.11.3, `typescript` 5.9.3, `vitest` 4.1.11 — all pinned to what
actually resolved, same discipline as `dotnet-starter`). Bump deliberately,
re-verify with both commands after any bump.

Two API details worth knowing if you're editing this fixture (both
confirmed against the actual installed package's type declarations and a
real test run, not assumed from older example code): identity comparison
is `Jinaga.hash(fact)`, a **static** method imported from `jinaga` — not an
instance method on the client (`j.hash(...)` doesn't exist) — and it only
works on a real, materialized fact returned from a query, never on the
`LabelOf<T>` proxy a specification's `match`/`select` callback receives
while the specification is being built.

## Shared provider

`providers/claude-code.sh` is shared across every track — copies whichever
fixture a scenario's `fixture` var names, running `npm install` first if
the copy has a `package.json` (a TypeScript fixture needs that before
`tsc`/`vitest` can run against it; a .NET one doesn't, since `dotnet
build`/`dotnet test` restore packages implicitly) — and hands every judge a
real path to it on disk. See `evals/README.md`'s Provider section for how
that hand-off works, and its Status section for what's verified versus
still open per track.
