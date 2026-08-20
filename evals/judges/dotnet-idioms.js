// Hand-coded programmatic judge for the .NET track.
//
// Mechanical, regex-based checks over the generated C# source for the
// idioms covered in skills/authoring-jinaga-facts-dotnet and
// skills/authoring-jinaga-specifications-dotnet. Intentionally simple: this
// catches syntax-shaped violations of an idiom, not whether the idiom was
// applied for the right reason — pair it with an llm-rubric assertion for
// that, and with dotnet-build-and-test.js for whether the result actually
// compiles and passes.
//
// Reads real .cs files from resultProjectDir, found by parsing the
// provider's JSON envelope out of `output` itself — see
// _provider-envelope.js for why (promptfoo's exec provider type has no
// separate metadata channel; this was wired wrong in an earlier version
// and fixed after a live run made the failure obvious). Deliberately does
// NOT check the `output` transcript text for these idioms — the transcript
// is Claude's own account of what it did; the source on disk is what it
// actually did, and a live run turned up a case where those differed (the
// transcript mentioned an import fix that turned out to matter for
// compilation, not for these idiom checks).
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// STATUS: checks are written against the idioms documented in the .NET
// skills and verified against real generated output from a live run.
// Treat findings as a starting point to refine as more scenarios exercise
// more idioms, not as an exhaustive or final set.

const fs = require("fs");
const path = require("path");
const { parseProviderEnvelope } = require("./_provider-envelope.js");

function findCsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "bin" || entry.name === "obj" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findCsFiles(full));
    else if (entry.name.endsWith(".cs")) results.push(full);
  }
  return results;
}

const CHECKS = [
  {
    id: "record-not-class",
    // A fact type declared as a mutable class instead of an immutable
    // record. Matches `class Foo` following a `[FactType(...)]` attribute
    // on the preceding non-blank line.
    test: (src) => !/\[FactType\([^)]*\)\]\s*\r?\n\s*public\s+class\s+\w+/m.test(src),
    message: "A [FactType(...)] fact is declared as `class` instead of `record` — facts must be immutable.",
  },
  {
    id: "prior-array-for-mutable-property",
    // If a fact type's name suggests a mutable property (ends in a noun
    // that reads like a value: Title, Name, Status, Description...) it
    // should carry a `prior` array parameter.
    test: (src) => {
      const mutablePropertyLike = /public\s+record\s+(\w*(?:Title|Name|Description|Priority))\s*\(([^)]*)\)/g;
      let match;
      while ((match = mutablePropertyLike.exec(src))) {
        const params = match[2];
        // C# positional-record params are `Type name`, type first — so a
        // `prior` parameter reads `TaskTitle[] prior`, not `prior: TaskTitle[]`.
        if (!/\w+\[\]\s*prior\b/.test(params)) return false;
      }
      return true;
    },
    message: "A fact type that looks like a mutable property (Title/Name/Description/Priority) has no `prior` array parameter.",
  },
  {
    id: "where-current-on-mutable-read",
    // Any specification that walks to a fact type ending in one of the
    // mutable-property-like suffixes should filter with WhereCurrent.
    test: (src) => {
      const walksToMutable = /OfType<\w*(?:Title|Name|Description|Priority)>\([^)]*\)(?!\s*\.\s*WhereCurrent)/g;
      return !walksToMutable.test(src);
    },
    message: "A specification reads a mutable-property-shaped fact type without a following `.WhereCurrent(...)` filter — see reviewing-model-idioms.",
  },
];

module.exports = (output) => {
  const { resultProjectDir: projectDir, providerError, parseError } = parseProviderEnvelope(output);

  if (parseError) {
    return { pass: false, score: 0, reason: parseError };
  }

  if (!projectDir) {
    return {
      pass: false,
      score: 0,
      reason: providerError
        ? `Provider did not produce a project to check: ${providerError}`
        : "No metadata.resultProjectDir in the provider's output envelope.",
    };
  }

  let files;
  try {
    files = findCsFiles(projectDir);
  } catch (err) {
    return { pass: false, score: 0, reason: `Could not read ${projectDir}: ${err.message}` };
  }

  if (files.length === 0) {
    return { pass: false, score: 0, reason: `No .cs files found under ${projectDir}.` };
  }

  const src = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const failures = CHECKS.filter((check) => !check.test(src)).map((check) => check.message);

  return {
    pass: failures.length === 0,
    score: failures.length === 0 ? 1 : 1 - failures.length / CHECKS.length,
    reason: failures.length === 0
      ? `No idiom violations found across ${files.length} .cs file(s).`
      : failures.join(" "),
  };
};
