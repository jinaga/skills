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

`providers/claude-code-dotnet.sh` now has a real fixture to copy from. Its
remaining TODO — and `judges/dotnet-build-and-test.js`'s — is the hand-off
of *where the modified project ended up* from the provider run to the judge;
see the comments in each.
