// Ground-truth judge for the TypeScript track: does the project the agent
// produced actually type-check, and do its tests actually pass. Preferred
// over any static check per evals/README.md's judge ordering — a real
// compiler and test runner can't be talked out of a wrong answer.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// Hand-off: see judges/_provider-envelope.js and
// judges/dotnet-build-and-test.js's header comment for why this parses
// `output` as JSON itself rather than reading context.metadata.

const { execFileSync } = require("child_process");
const { parseProviderEnvelope } = require("./_provider-envelope.js");

function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 90_000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: (err.stdout || err.message || "").toString() };
  }
}

module.exports = (output) => {
  const { resultProjectDir, providerError, parseError } = parseProviderEnvelope(output);

  if (parseError) {
    return { pass: false, score: 0, reason: parseError };
  }

  if (!resultProjectDir) {
    return {
      pass: false,
      score: 0,
      reason: providerError
        ? `Provider did not produce a project to test: ${providerError}`
        : "No metadata.resultProjectDir in the provider's output envelope.",
    };
  }

  const prefix = providerError ? `Note: provider reported "${providerError}".\n` : "";
  return runBuildAndTest(resultProjectDir, prefix);
};

function runBuildAndTest(projectDir, prefix) {
  // npm install already ran once in the provider (claude-code.sh) before
  // the agent started — not repeated here, since the agent may have added
  // a dependency that install already picked up, and re-running it here
  // would just cost time without changing the outcome.
  const build = run("npx", ["tsc", "--noEmit"], projectDir);
  if (!build.ok) {
    return { pass: false, score: 0, reason: `${prefix}tsc --noEmit failed:\n${build.output}` };
  }

  const test = run("npx", ["vitest", "run"], projectDir);
  if (!test.ok) {
    return { pass: false, score: 0.5, reason: `${prefix}Type-check succeeded but vitest failed:\n${test.output}` };
  }

  return { pass: true, score: 1, reason: `${prefix}tsc --noEmit and vitest run both succeeded.` };
}
