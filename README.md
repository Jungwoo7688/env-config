# env-config

Reads environment variables into typed configuration values. Parses integers, floats, booleans, lists, and strings, applying defaults when a variable is absent and throwing a typed error when one is present but malformed.

## Usage

```js
import { EnvConfig, EnvError } from "env-config";

const config = new EnvConfig({ FOO: "42", FLAG: "true", TAGS: "a,b,c" });

const port = config.int("PORT", 8080);       // 8080 (absent -> default)
const foo  = config.int("FOO");               // 42
const flag = config.bool("FLAG", false);     // true
const tags = config.list("TAGS", []);         // ["a", "b", "c"]
const name = config.string("NAME", "app");    // "app"

try {
  config.int("FOO"); // throws if FOO had been "abc"
} catch (err) {
  if (err instanceof EnvError) {
    console.error(err.message); // "FOO: expected integer, got 'abc'"
  }
}
```

`EnvConfig` accepts any record of `string -> string` as its environment. Pass `process.env` at runtime, or a plain object in tests. No third-party dependencies; Node ESM.

## Why

`process.env` is a bag of strings. Every program that reads it re-implements parsing and validation inline, which is where silent bugs start: `"true"` is truthy, `"0"` parses to `0`, and an unset variable is the empty string rather than `undefined`. This library forces a decision at the read site — a default for absence, an exception for presence-and-malformed — so a misconfigured value fails loudly instead of becoming `NaN` downstream.

The trade-off is strictness. We deliberately treat an empty string `""` as a present-but-invalid value for `int`, `float`, and `bool`, rather than falling back to the default. This catches the common Docker/`.env` mistake of `PORT=` (no value) before it reaches your code. If you want empty to mean absent, strip it before constructing.

## Edge you will hit

Only ASCII comma separates `list()` values. Trailing empty segments are preserved (`"a,b,"` yields `["a", "b", ""]`) so you can detect malformed input; a single empty string yields `[]`. Boolean accepts `"true"`/`"1"`/`"yes"` (case-insensitive) and `"false"`/`"0"`/`"no"` — anything else, including `""`, is invalid.
