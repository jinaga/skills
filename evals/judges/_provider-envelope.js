// Shared parsing helper for every language track's judges.
//
// promptfoo's `exec:` custom script provider (../providers/claude-code.sh
// is one) NEVER parses a script's stdout as structured JSON — it always
// wraps the raw stdout verbatim as `{ output: rawStdout }`
// (github.com/promptfoo/promptfoo, src/providers/scriptCompletion.ts).
// There is no separate `metadata` channel for this provider type — an
// earlier version of these judges assumed `context.metadata` would carry
// resultProjectDir the way it would for a custom JS/Python provider, and
// that assumption was wrong; confirmed by a live run where the provider's
// own JSON envelope clearly had `metadata.resultProjectDir` set, but
// `context.metadata` was still empty.
//
// The fix: the provider still prints a `{ output, metadata }` JSON
// envelope to stdout (see claude-code.sh) — but `output`, the raw
// string every assertion receives as its first argument, *is* that JSON
// text. So judges parse it themselves instead of reading context.metadata.

function parseProviderEnvelope(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    return {
      resultProjectDir: undefined,
      providerError: undefined,
      parseError: `Provider output was not the expected JSON envelope (${err.message}). Raw output: ${String(output).slice(0, 300)}`,
    };
  }
  return {
    resultProjectDir: parsed?.metadata?.resultProjectDir,
    providerError: parsed?.error,
    parseError: undefined,
  };
}

module.exports = { parseProviderEnvelope };
