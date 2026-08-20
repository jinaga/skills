// Ground-truth judge for the .NET track: does the project the agent
// produced actually build, and do its tests actually pass. Preferred over
// any static check per evals/README.md's judge ordering — a real compiler
// and test runner can't be talked out of a wrong answer.
//
// promptfoo custom JS assertion contract:
// https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
//
// STATUS: TODO — this depends on the provider (../providers/claude-code-dotnet.sh)
// recording where the resulting project lives on disk so this judge can
// `dotnet build`/`dotnet test` it. That hand-off isn't wired up yet; see
// evals/README.md. The shape below is what it should do once it is.

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
  const projectDir = context?.vars?.resultProjectDir;

  if (!projectDir) {
    return {
      pass: false,
      score: 0,
      reason:
        "No resultProjectDir in context — the provider needs to report where " +
        "the modified project lives before this judge can run `dotnet build`/`dotnet test`. See TODO at top of this file.",
    };
  }

  const build = run("dotnet", ["build", "--nologo"], projectDir);
  if (!build.ok) {
    return { pass: false, score: 0, reason: `dotnet build failed:\n${build.output}` };
  }

  const test = run("dotnet", ["test", "--nologo"], projectDir);
  if (!test.ok) {
    return { pass: false, score: 0.5, reason: `Build succeeded but dotnet test failed:\n${test.output}` };
  }

  return { pass: true, score: 1, reason: "dotnet build and dotnet test both succeeded." };
};
