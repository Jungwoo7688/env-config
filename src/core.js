/**
 * Typed access to a string-keyed environment.
 *
 * Every method takes the env var name and a default. When the variable is
 * ABSENT (undefined, or not a key on the source object) the default is used.
 * When the variable is PRESENT, it is parsed strictly; a malformed value
 * throws EnvError rather than silently coercing to NaN or false.
 *
 * Note on empty strings: we treat "" as present-but-invalid for int, float,
 * and bool. This catches the common shell/Docker mistake of `PORT=` (declared
 * with no value) at config time rather than letting NaN propagate. Pass a
 * sanitized environment if you want empties to fall back to defaults.
 */
export class EnvConfig {
  /**
   * @param {Record<string, string>} [env] The environment to read from.
   *   Defaults to an empty object so callers can construct without args and
   *   populate via a passed record. We do NOT read process.env here so the
   *   class is deterministic and testable with no global state.
   */
  constructor(env = {}) {
    this._env = env;
  }

  /**
   * Raw string value. Empty string is a valid string, so "" is returned as-is.
   * @param {string} key
   * @param {string} [def]
   * @returns {string}
   */
  string(key, def) {
    const raw = this._raw(key);
    if (raw === undefined) {
      if (def === undefined) {
        throw new EnvError(key, "expected string, variable is unset and no default given");
      }
      return def;
    }
    return raw;
  }

  /**
   * Integer parsed via Number.parseInt with radix 10.
   * Rejects "", "  " (parseInt trims but leaves nothing), floats, and hex.
   * @param {string} key
   * @param {number} [def]
   * @returns {number}
   */
  int(key, def) {
    const raw = this._raw(key);
    if (raw === undefined) {
      if (def === undefined) {
        throw new EnvError(key, "expected integer, variable is unset and no default given");
      }
      return def;
    }
    if (raw.trim() === "") {
      throw new EnvError(key, `expected integer, got '${raw}'`);
    }
    // parseInt("12abc") returns 12; we require the WHOLE string to be digits.
    if (!/^[+-]?\d+$/.test(raw.trim())) {
      throw new EnvError(key, `expected integer, got '${raw}'`);
    }
    return Number.parseInt(raw, 10);
  }

  /**
   * Floating-point parsed via Number.parseFloat. Rejects "" and whitespace
   * only. Accepts "Infinity" and "NaN" as parseFloat does, because rejecting
   * them here would be inventing a rule the brief does not state.
   * @param {string} key
   * @param {number} [def]
   * @returns {number}
   */
  float(key, def) {
    const raw = this._raw(key);
    if (raw === undefined) {
      if (def === undefined) {
        throw new EnvError(key, "expected float, variable is unset and no default given");
      }
      return def;
    }
    if (raw.trim() === "") {
      throw new EnvError(key, `expected float, got '${raw}'`);
    }
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n)) {
      throw new EnvError(key, `expected float, got '${raw}'`);
    }
    return n;
  }

  /**
   * Boolean from a small, explicit set of strings (case-insensitive):
   *   true:  "true", "1", "yes"
   *   false: "false", "0", "no"
   * Anything else — including "" — throws. We use an allowlist rather than
   * Boolean(raw) because every non-empty string is truthy in JS, which would
   * make "false" parse as true.
   * @param {string} key
   * @param {boolean} [def]
   * @returns {boolean}
   */
  bool(key, def) {
    const raw = this._raw(key);
    if (raw === undefined) {
      if (def === undefined) {
        throw new EnvError(key, "expected boolean, variable is unset and no default given");
      }
      return def;
    }
    const lower = raw.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
    throw new EnvError(key, `expected boolean, got '${raw}'`);
  }

  /**
   * Comma-separated list. Split on "," with no trimming of elements so
n   * whitespace is visible to the caller ("a, b" -> ["a", " b"]).
   * A single empty string yields [] — this is the one place empty is
   * normalized, because an empty env var almost always means "no items".
   * Trailing empties are otherwise preserved ("a,b," -> ["a","b",""])
   * so malformed input is detectable rather than silently dropped.
   * @param {string} key
   * @param {string[]} [def]
   * @returns {string[]}
   */
  list(key, def) {
    const raw = this._raw(key);
    if (raw === undefined) {
      if (def === undefined) {
        throw new EnvError(key, "expected list, variable is unset and no default given");
      }
      return def;
    }
    if (raw === "") return [];
    return raw.split(",");
  }

  /**
   * Returns undefined when the key is genuinely absent. We use hasOwnProperty
   * rather than `key in env` so we don't inherit prototype keys from whatever
   * object the caller passed (process.env has surprising inherited props).
   * @param {string} key
   * @returns {string|undefined}
   */
  _raw(key) {
    if (Object.prototype.hasOwnProperty.call(this._env, key)) {
      const v = this._env[key];
      // process.env coerces values to strings, but a plain object might hold
      // undefined for a declared-but-unset key. Treat that as absent so
      // callers don't have to delete keys to get the default.
      if (v === undefined) return undefined;
      return String(v);
    }
    return undefined;
  }
}

/**
 * Thrown when a present env var cannot be parsed as the requested type,
 * or when a required var (no default) is absent. Carries the key so callers
 * can surface which variable is at fault.
 */
export class EnvError extends Error {
  /**
   * @param {string} key
   * @param {string} message
   */
  constructor(key, message) {
    super(`${key}: ${message}`);
    this.name = "EnvError";
    this.key = key;
  }
}
