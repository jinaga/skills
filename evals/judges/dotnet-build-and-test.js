// Ground-truth judge for the .NET track: does the project the agent
// produced actually build, and do its tests actually pass. Preferred over
// any static check per evals/README.md's judge ordering — a real compiler
// and test runner can't be talked out of a wrong answer.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// The hand-off this depends on: ../providers/claude-code-dotnet.sh prints a
// `{ output, metadata: { resultProjectDir } }` JSON envelope to stdout, and
// `output` — the first argument every assertion receives — *is* that raw
// JSON text (see _provider-envelope.js for why: promptfoo's exec provider
// type doesn't have a separate metadata channel, unlike a custom JS/Python
// provider).

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
  const build = run("dotnet", ["build", "--nologo"], projectDir);
  if (!build.ok) {
    return { pass: false, score: 0, reason: `${prefix}dotnet build failed:\n${build.output}` };
  }

  const test = run("dotnet", ["test", "--nologo"], projectDir);
  if (!test.ok) {
    return { pass: false, score: 0.5, reason: `${prefix}Build succeeded but dotnet test failed:\n${test.output}` };
  }

  return { pass: true, score: 1, reason: `${prefix}dotnet build and dotnet test both succeeded.` };
}
