// Hand-coded programmatic judge for skills/integrating-jinaga-react.
//
// Mechanical checks over the generated .tsx source for how a component
// renders the result of jinaga-react's useSpecification. Intentionally
// simple — see judges/dotnet-idioms.js's header for the rationale. Reads real
// files from resultProjectDir via judges/_provider-envelope.js.
//
// What it catches, all three drawn from jinaga/jinaga-react#27:
//   - 5.x result fields (error, clearError, distributionPending,
//     distributionDiagnostic), which jinaga-react 6 removed.
//   - An early return of JSX or null gated on a result field. The three
//     fields render independently; `if (data === null) return <Spinner />`
//     flashes a spinner before cached data, and `if (failure) return ...`
//     hides saved rows behind a failure.
//   - A spinner or loading text in the `data === null` branch of a ternary,
//     the same TanStack habit written as an expression.
//
// What it misses: a result object that isn't destructured and is passed
// around before being read, and conditions spread across helper functions.
// It doesn't flag `if (...) return;` with no value, which is how effects
// bail out.

const fs = require("fs");
const path = require("path");
const { parseProviderEnvelope } = require("./_provider-envelope.js");

const REMOVED_FIELDS = ["error", "clearError", "distributionPending", "distributionDiagnostic"];
const RESULT_FIELDS = ["data", "loading", "failure"];
const INDICATOR = /spin|loading|progress|skeleton/i;

function findSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

// The local names a file binds to useSpecification's result. A destructure
// like `const { data: tasks, loading } = useSpecification(...)` binds `tasks`
// for `data` and `loading` for `loading`. `const result = useSpecification(...)`
// binds `result.data`, `result.loading` and `result.failure`.
function resultBindings(src) {
  const bindings = { fields: [], removed: [] };
  const destructure = /\{([^{}]*)\}\s*=\s*useSpecification\s*\(/g;
  let m;
  while ((m = destructure.exec(src))) {
    for (const part of m[1].split(",")) {
      const [prop, alias] = part.split(":").map(s => s.trim());
      if (!prop) continue;
      if (REMOVED_FIELDS.includes(prop)) bindings.removed.push(prop);
      if (RESULT_FIELDS.includes(prop)) bindings.fields.push({ prop, local: alias || prop });
    }
  }
  const whole = /\b(?:const|let)\s+(\w+)\s*=\s*useSpecification\s*\(/g;
  while ((m = whole.exec(src))) {
    for (const prop of RESULT_FIELDS) bindings.fields.push({ prop, local: `${m[1]}.${prop}` });
    for (const prop of REMOVED_FIELDS) {
      if (new RegExp(`\\b${m[1]}\\.${prop}\\b`).test(src)) bindings.removed.push(prop);
    }
  }
  return bindings;
}

function mentions(text, local) {
  const escaped = local.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.])${escaped}\\b`).test(text);
}

// Each `if (condition) return <value>` (with or without braces) whose
// returned value is JSX, null, or a parenthesized expression.
function earlyReturns(src) {
  const found = [];
  const ifKeyword = /\bif\s*\(/g;
  let m;
  while ((m = ifKeyword.exec(src))) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
      i++;
    }
    const condition = src.slice(m.index + m[0].length, i - 1);
    const rest = src.slice(i);
    if (/^\s*\{?\s*return\s*(<|null\b|\()/.test(rest)) found.push(condition);
  }
  return found;
}

function spinnerOnNullData(src, dataLocal) {
  const escaped = dataLocal.replace(/\./g, "\\.");
  const nullBranch = new RegExp(`(?:${escaped}\\s*===?\\s*null|!\\s*${escaped})\\s*\\?`, "g");
  let m;
  while ((m = nullBranch.exec(src))) {
    const branch = src.slice(m.index + m[0].length).split(/\s:\s|\n\s*:/)[0].slice(0, 200);
    if (INDICATOR.test(branch)) return true;
  }
  return false;
}

function checkFile(src) {
  const problems = [];
  if (!/useSpecification\s*\(/.test(src)) return problems;

  const bindings = resultBindings(src);
  if (bindings.removed.length > 0) {
    problems.push(`Reads jinaga-react 5.x result field(s) ${[...new Set(bindings.removed)].join(", ")}, removed in 6.`);
  }

  for (const condition of earlyReturns(src)) {
    const hit = bindings.fields.find(f => mentions(condition, f.local));
    if (hit) {
      problems.push(`Early return gated on \`${hit.prop}\` (\`if (${condition.trim()})\`); render data, loading and failure independently.`);
    }
  }

  for (const f of bindings.fields.filter(f => f.prop === "data")) {
    if (spinnerOnNullData(src, f.local)) {
      problems.push("Renders a spinner or loading text when data is null; null means show nothing, and only `loading` shows an indicator.");
    }
  }
  return problems;
}

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
    files = findSourceFiles(projectDir);
  } catch (err) {
    return { pass: false, score: 0, reason: `Could not read ${projectDir}: ${err.message}` };
  }

  const using = files.filter(f => /useSpecification\s*\(/.test(fs.readFileSync(f, "utf8")));
  if (using.length === 0) {
    return { pass: false, score: 0, reason: `No source file under ${projectDir} calls useSpecification.` };
  }

  const problems = using.flatMap(f =>
    checkFile(fs.readFileSync(f, "utf8")).map(p => `${path.relative(projectDir, f)}: ${p}`)
  );

  return {
    pass: problems.length === 0,
    score: problems.length === 0 ? 1 : 0,
    reason: problems.length === 0
      ? `Rendering idioms hold across ${using.length} file(s) that call useSpecification.`
      : problems.join(" "),
  };
};

module.exports.checkFile = checkFile;
