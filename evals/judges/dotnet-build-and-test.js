// Ground-truth judge for the .NET track: does the project the agent
// produced actually build, and do its tests actually pass. Preferred over
// any static check per evals/README.md's judge ordering — a real compiler
// and test runner can't be talked out of a wrong answer.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// The hand-off this depends on: ../providers/claude-code-dotnet.sh returns
// a ProviderResponse shaped `{ output, metadata: { resultProjectDir } }`.
// promptfoo exposes that `metadata` object here as `context.metadata` (its
// documented shortcut for `context.providerResponse.metadata`) — that's
// where resultProjectDir comes from, not a test-authored var.

const { execFileSync } = require("child_process");

function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 90_000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: (err.stdout || err.message || "").toString() };
  }
}

module.exports = (output, context) => {
  const providerError = context?.providerResponse?.error;
  const projectDir = context?.metadata?.resultProjectDir;

  if (!projectDir) {
    return {
      pass: false,
      score: 0,
      reason: providerError
        ? `Provider did not produce a project to test: ${providerError}`
        : "No metadata.resultProjectDir on the provider response — see the hand-off note at the top of this file.",
    };
  }

  if (providerError) {
    // The provider recorded a workdir but flagged a problem (e.g. a
    // non-zero claude exit code) — still worth trying the build, since a
    // partial run can produce a working project, but surface the warning.
    return runBuildAndTest(projectDir, `Note: provider reported "${providerError}".\n`);
  }

  return runBuildAndTest(projectDir, "");
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
