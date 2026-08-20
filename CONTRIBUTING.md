# Contributing

This repository holds two things that evolve together: the skills themselves
(`skills/`), and the evals that ground them (`evals/`). A skill change without
an eval change is a claim nobody checked; an eval change without a skill
change usually means a skill is missing a rule it needs.

## Ground rules

- **Every idiom in a skill traces back to a real defect or a real working
  pattern**, ideally one you can point at in a shipped Jinaga application.
  Don't add a rule because it sounds right in the abstract — add it because
  something broke, or would have broken, without it.
- **Keep skills thin.** A skill that tries to say everything ends up saying
  nothing memorably. If you're adding a fourth or fifth "always/never" rule to
  a skill, check whether it's really a new skill instead. See
  [`docs/skill-architecture.md`](docs/skill-architecture.md) for the
  reasoning behind the current split.
- **No dependency on private tooling.** Nothing in this repo may assume an
  MCP server, an internal API, or any tool a consumer wouldn't already have
  after `npx openskills install jinaga/skills` and a normal .NET or Node
  toolchain.

## Adding or editing a skill

1. Skills live at `skills/<skill-name>/SKILL.md`, one directory per skill,
   matching the [Agent Skills spec](https://github.com/anthropics/skills/tree/main/spec)
   openskills installs against. Start from
   [`template/SKILL.md.template`](template/SKILL.md.template), and name the
   copy `SKILL.md` — the `.template` suffix here is deliberate: openskills
   discovers installable skills by finding files literally named `SKILL.md`
   anywhere in the repo, and this file living under `template/` would
   otherwise ship to every consumer as a bogus eighth skill.
2. Frontmatter needs `name` and `description`. The description is what a
   coding agent uses to decide *whether* to load the skill — write it as a
   trigger condition ("use when authoring or editing a Jinaga.NET fact
   record"), not a summary of the contents.
3. Prefer a handful of concrete, code-backed rules over an exhaustive
   reference. Real code examples beat prose descriptions of syntax.
4. Add or update an eval scenario alongside the skill (see below) — a skill
   change should never land without something that would have failed before
   the change and passes after it.

## Adding an eval scenario

1. Pick (or create) a scenario file under `evals/scenarios/<skill-name>/`.
   The schema is documented in [`evals/README.md`](evals/README.md).
2. Base the `prompt` on a real feature, bug, or refactor — pull the shape
   from an actual Jinaga.NET or Jinaga JS application if you have one handy,
   not an invented example.
3. Write the strictest judge you can that's still *true*: a programmatic
   check or a real `dotnet build`/`dotnet test` (or `tsc`/`vitest`) run beats
   an LLM rubric, because it can't be talked out of a wrong answer. Reach for
   an LLM-rubric judge only for things a compiler or a regex genuinely can't
   see (did the agent explain the tradeoff, not just produce code).
4. Run the scenario against the skill and, if practical, without it, so you
   know the skill actually moves the outcome. See `evals/README.md` for how
   to run the suite with promptfoo.

## Adding a language track

The .NET track shipped first as the reference implementation of the pattern;
TypeScript follows the same shape. If you're porting a .NET-track skill to
TypeScript (or vice versa), keep the *triggers* and the *shape* of the rules
parallel across the two skills, but never copy the code idioms across — the
two libraries solve the same modeling problems with genuinely different
mechanics (e.g. `record` + `[FactType]` + `WhereCurrent` vs. a `static Type`
class + `ModelBuilder` + `notExists`), and a skill that blurs them will teach
the wrong syntax for the wrong language.

## Style

- SKILL.md files are Markdown, no build step. Keep code snippets short and
  runnable-looking — trimmed to the idiom being taught, not full files.
- Use a neutral example domain (this repo uses a small task-tracker: Project,
  Task, TaskAssignment) rather than any specific commercial application, so
  the skills stay general-purpose.
