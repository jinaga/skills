// Hand-coded programmatic judge for the TypeScript track.
//
// Mechanical, regex-based checks over the generated TypeScript source for
// the idioms covered in skills/authoring-jinaga-facts-typescript and
// skills/authoring-jinaga-specifications-typescript. Intentionally simple —
// see judges/dotnet-idioms.js's header for the full rationale (same
// approach, different language). Reads real .ts files from
// resultProjectDir via judges/_provider-envelope.js, not the `output`
// transcript text.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// STATUS: checks are written against the idioms documented in the
// TypeScript skills and verified against hand-written examples matching
// (and deliberately violating) each one before being trusted — see the
// comment on the prior-array check below for a mistake that verification
// caught: TypeScript constructor parameters are `name: Type`, the reverse
// of C#'s `Type name`, and an early draft of this regex used the C# order.

const fs = require("fs");
const path = require("path");
const { parseProviderEnvelope } = require("./_provider-envelope.js");

function findTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findTsFiles(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

const CHECKS = [
  {
    id: "static-type-field-mirrored-on-instance",
    // A class with `static Type = "..."` (a fact class) should also carry
    // an instance `type = ClassName.Type` field — the idiom that lets
    // Jinaga read a fact's type off an instance.
    test: (src) => {
      const factClass = /class\s+(\w+)\s*\{[^}]*?static\s+Type\s*=\s*["'][^"']+["']/g;
      let match;
      while ((match = factClass.exec(src))) {
        const name = match[1];
        const classBody = src.slice(match.index, src.indexOf("\n}", match.index));
        const hasInstanceType = new RegExp(`\\btype\\s*=\\s*${name}\\.Type\\b`).test(classBody);
        if (!hasInstanceType) return false;
      }
      return true;
    },
    message: "A fact class declares `static Type` but no instance `type = ClassName.Type` field.",
  },
  {
    id: "prior-array-for-mutable-property",
    // If a fact class's name suggests a mutable property (Title/Name/
    // Description/Priority), its constructor should carry a `prior` array
    // parameter. TypeScript constructor params are `name: Type`, name
    // first — the reverse of C#'s `Type name` order this same check takes
    // in dotnet-idioms.js; verified against a hand-written example before
    // trusting it, after an earlier draft got this backwards.
    test: (src) => {
      const mutablePropertyLike = /class\s+(\w*(?:Title|Name|Description|Priority))\b[\s\S]*?constructor\s*\(([^)]*)\)/g;
      let match;
      while ((match = mutablePropertyLike.exec(src))) {
        const params = match[2];
        if (!/\bprior\s*:\s*\w+\[\]/.test(params)) return false;
      }
      return true;
    },
    message: "A fact class that looks like a mutable property (Title/Name/Description/Priority) has no `prior: T[]` constructor parameter.",
  },
  {
    id: "notExists-on-mutable-read",
    // If a mutable-property-shaped class is walked anywhere via
    // `.successors(ClassName, ...)`, the file should contain at least one
    // `.notExists(` call. Deliberately coarse (presence, not proximity) —
    // a proximity check flagged the .successors() call *inside* a
    // .notExists() callback itself (the walk that IS the filter), a false
    // positive on textbook-correct code caught while verifying this judge
    // against a hand-written correct example. A missed real violation
    // elsewhere in a large file is a more acceptable failure mode for a
    // hand-coded check than failing code that's actually right.
    test: (src) => {
      const mutableClasses = new Set();
      const classDecl = /class\s+(\w*(?:Title|Name|Description|Priority))\b/g;
      let m;
      while ((m = classDecl.exec(src))) mutableClasses.add(m[1]);

      for (const name of mutableClasses) {
        const walksViaSuccessors = new RegExp(`\\.successors\\(\\s*${name}\\s*,`).test(src);
        if (walksViaSuccessors && !/\.notExists\(/.test(src)) return false;
      }
      return true;
    },
    message: "A mutable-property-shaped fact type is read via .successors(...) but the file has no .notExists(...) filter anywhere — see reviewing-model-idioms.",
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
    files = findTsFiles(projectDir);
  } catch (err) {
    return { pass: false, score: 0, reason: `Could not read ${projectDir}: ${err.message}` };
  }

  if (files.length === 0) {
    return { pass: false, score: 0, reason: `No .ts source files found under ${projectDir}.` };
  }

  const src = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const failures = CHECKS.filter((check) => !check.test(src)).map((check) => check.message);

  return {
    pass: failures.length === 0,
    score: failures.length === 0 ? 1 : 1 - failures.length / CHECKS.length,
    reason: failures.length === 0
      ? `No idiom violations found across ${files.length} .ts file(s).`
      : failures.join(" "),
  };
};
