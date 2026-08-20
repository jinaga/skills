# Jinaga Skills

Agent skills for building [Jinaga](https://jinaga.com) applications — historical
modeling in the Factual pattern language, and translating that modeling into
working Jinaga.NET or Jinaga JS/TypeScript code, tests, and UI.

This repository is standalone. It has no dependency on any MCP server or other
private tooling — every skill here works with nothing more than a coding agent
and a Jinaga project checked out locally.

## Install

Skills are installed with [openskills](https://github.com/numman-ali/openskills):

```bash
npx openskills install jinaga/skills
```

That installs every skill in [`skills/`](skills/) into `./.claude/skills` (or
`./.agent/skills` with `--universal`) in your own project. Add `-y` to skip
the interactive picker and install all thirteen in one step; without it,
openskills prompts you to choose specific skills instead of the whole set.

To install a single skill without the interactive picker, point at its
directory on disk after cloning this repo locally:

```bash
npx openskills install path/to/jinaga-skills/skills/authoring-jinaga-facts-dotnet
```

## What's here

Skills are organized as one shared spine plus one track per language:

| Group | Skills | Covers |
|---|---|---|
| **Spine** (language-agnostic) | `designing-historical-models`, `diagramming-historical-models`, `reviewing-model-idioms` | Modeling a domain as immutable facts in the Factual pattern language, before any code is written |
| **.NET track** | `authoring-jinaga-facts-dotnet`, `authoring-jinaga-specifications-dotnet`, `testing-jinaga-dotnet`, `integrating-jinaga-reactive-viewmodels-dotnet` | Translating a fact model into Jinaga.NET records and specifications, testing them, and wiring them into a reactive view-model layer |
| **TypeScript track** | `authoring-jinaga-facts-typescript`, `authoring-jinaga-specifications-typescript`, `authoring-authorization-distribution-typescript`, `testing-jinaga-typescript`, `integrating-jinaga-react` | The same, for Jinaga JS/TypeScript and React |
| **Adjacent** (not Jinaga-specific) | `assisticant-view-models` | General-purpose MVVM patterns for [Assisticant](https://github.com/michaellperry/Assisticant), the reactive data-binding library `integrating-jinaga-reactive-viewmodels-dotnet` pairs with in a .NET UI — observable properties, computed values, collections, validation |

The .NET track shipped first, as the reference implementation of this
pattern; the TypeScript track followed the same shape. See
[`docs/skill-architecture.md`](docs/skill-architecture.md) for the full
rationale and rollout history.

## Evals

Every skill is graded by scenarios sourced from real Jinaga application code,
not invented toy examples. See [`evals/README.md`](evals/README.md) for the
scenario format, the judge types (hand-coded programmatic checks, real
compiler/test-runner output, and [promptfoo](https://www.promptfoo.dev)
LLM-rubric judges), and how to run the suite.

## Contributing

New skills, new eval scenarios, and corrections to existing idioms are all
welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE).
