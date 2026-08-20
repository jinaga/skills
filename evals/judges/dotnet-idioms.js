// Hand-coded programmatic judge for the .NET track.
//
// Mechanical, regex-based checks over generated C# source for the idioms
// covered in skills/authoring-jinaga-facts-dotnet and
// skills/authoring-jinaga-specifications-dotnet. Intentionally simple: this
// catches syntax-shaped violations of an idiom, not whether the idiom was
// applied for the right reason — pair it with an llm-rubric assertion for
// that, and with dotnet-build-and-test.js for whether the result actually
// compiles and passes.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// STATUS: checks are written against the idioms documented in the .NET
// skills, but this hasn't yet been run against a real model transcript —
// treat findings from it as a starting point to refine, not as settled.

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
        if (!/prior\s*:?\s*\w*\[\]/.test(params)) return false;
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
  const failures = CHECKS.filter((check) => !check.test(output)).map((check) => check.message);

  return {
    pass: failures.length === 0,
    score: failures.length === 0 ? 1 : 1 - failures.length / CHECKS.length,
    reason: failures.length === 0
      ? "No idiom violations found by the hand-coded .NET checks."
      : failures.join(" "),
  };
};
