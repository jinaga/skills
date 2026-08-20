# Fixtures

Each scenario's `fixture` var names a directory here — a minimal, real
Jinaga project the provider copies and hands to the agent under test, so a
scenario is grading real code changes to a real project, not a snippet in
isolation.

## TODO: `dotnet-starter`

Referenced by `evals/scenarios/authoring-jinaga-facts-dotnet/task-rename.yaml`
and not yet built. Needs to be a minimal .NET solution with:

- A `TaskTracker.Core` project referencing `Jinaga` (and `Jinaga.UnitTest`
  for the test project) via NuGet.
- The `Project` and `Task` fact types from the skill examples already
  declared (see `skills/authoring-jinaga-facts-dotnet/SKILL.md`), with
  `Task` deliberately missing a title — that's what each scenario adds.
- A `TaskTracker.Core.Test` project wired to run with `dotnet test`, with
  at least one passing test already in place so a scenario failing to add
  tests still leaves the suite green (and the build/test judge is checking
  the *new* behavior, not just "nothing is broken").

Once this exists, `providers/claude-code-dotnet.sh` and
`judges/dotnet-build-and-test.js` need their TODOs resolved to actually
point at it — see the comments in each.
