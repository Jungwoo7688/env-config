import { test } from "node:test";
import assert from "node:assert/strict";

import { EnvConfig, EnvError } from "../src/index.js";

// ---------- string ----------

test("string returns the raw value when present", () => {
  const c = new EnvConfig({ NAME: "app" });
  assert.equal(c.string("NAME"), "app");
});

test("string falls back to default when absent", () => {
  const c = new EnvConfig({});
  assert.equal(c.string("NAME", "fallback"), "fallback");
});

test("string treats empty string as a valid value", () => {
  const c = new EnvConfig({ NAME: "" });
  assert.equal(c.string("NAME", "x"), "");
});

test("string with no default and absent throws EnvError", () => {
  const c = new EnvConfig({});
  assert.throws(() => c.string("MISSING"), (err) => {
    assert.ok(err instanceof EnvError);
    assert.equal(err.key, "MISSING");
    return true;
  });
});

// ---------- int ----------

test("int parses a positive integer", () => {
  assert.equal(new EnvConfig({ PORT: "8080" }).int("PORT"), 8080);
});

test("int parses a negative integer", () => {
  assert.equal(new EnvConfig({ N: "-5" }).int("N"), -5);
});

test("int falls back to default when absent", () => {
  assert.equal(new EnvConfig({}).int("PORT", 3000), 3000);
});

test("int rejects floats", () => {
  assert.throws(
    () => new EnvConfig({ X: "3.14" }).int("X"),
    (err) => err instanceof EnvError && err.key === "X"
  );
});

test("int rejects trailing garbage that parseInt would accept", () => {
  assert.throws(() => new EnvConfig({ X: "12abc" }).int("X"), EnvError);
});

test("int rejects empty string even when default is given", () => {
  assert.throws(
    () => new EnvConfig({ X: "" }).int("X", 10),
    (err) => err instanceof EnvError && err.key === "X"
  );
});

test("int rejects whitespace-only", () => {
  assert.throws(() => new EnvConfig({ X: "   " }).int("X"), EnvError);
});

test("int with no default and absent throws EnvError", () => {
  assert.throws(
    () => new EnvConfig({}).int("MISSING"),
    (err) => err instanceof EnvError && err.key === "MISSING"
  );
});

// ---------- float ----------

test("float parses a decimal", () => {
  assert.equal(new EnvConfig({ R: "3.14" }).float("R"), 3.14);
});

test("float parses an integer string", () => {
  assert.equal(new EnvConfig({ R: "42" }).float("R"), 42);
});

test("float falls back to default when absent", () => {
  assert.equal(new EnvConfig({}).float("R", 1.5), 1.5);
});

test("float rejects empty string", () => {
  assert.throws(() => new EnvConfig({ R: "" }).float("R"), EnvError);
});

test("float rejects non-numeric text", () => {
  assert.throws(() => new EnvConfig({ R: "abc" }).float("R"), EnvError);
});

// ---------- bool ----------

test("bool accepts true/1/yes case-insensitively", () => {
  for (const v of ["true", "TRUE", "1", "yes", "Yes"]) {
    assert.equal(new EnvConfig({ B: v }).bool("B"), true, `value '${v}'`);
  }
});

test("bool accepts false/0/no case-insensitively", () => {
  for (const v of ["false", "FALSE", "0", "no", "No"]) {
    assert.equal(new EnvConfig({ B: v }).bool("B"), false, `value '${v}'`);
  }
});

test("bool falls back to default when absent", () => {
  assert.equal(new EnvConfig({}).bool("B", true), true);
});

test("bool rejects empty string", () => {
  assert.throws(() => new EnvConfig({ B: "" }).bool("B"), EnvError);
});

test("bool rejects arbitrary text", () => {
  assert.throws(() => new EnvConfig({ B: "maybe" }).bool("B"), EnvError);
});

// ---------- list ----------

test("list splits on commas", () => {
  assert.deepEqual(new EnvConfig({ T: "a,b,c" }).list("T"), ["a", "b", "c"]);
});

test("list falls back to default when absent", () => {
  assert.deepEqual(new EnvConfig({}).list("T", ["x"]), ["x"]);
});

test("list with empty string yields empty array", () => {
  assert.deepEqual(new EnvConfig({ T: "" }).list("T"), []);
});

test("list preserves trailing empty segment", () => {
  assert.deepEqual(new EnvConfig({ T: "a,b," }).list("T"), ["a", "b", ""]);
});

test("list preserves internal whitespace (no trimming)", () => {
  assert.deepEqual(new EnvConfig({ T: "a, b" }).list("T"), ["a", " b"]);
});

// ---------- _raw / hasOwnProperty guard ----------

test("undefined value for a declared key is treated as absent", () => {
  const env = { X: undefined };
  assert.equal(new EnvConfig(env).int("X", 7), 7);
});

test("does not read inherited prototype properties", () => {
  class Sneaky {}
  Sneaky.prototype.toString = "poison"; // would be truthy via `in`
  const env = new Sneaky();
  assert.equal(new EnvConfig(env).string("toString", "safe"), "safe");
});

// ---------- EnvError shape ----------

test("EnvError message includes the key and carries it as a property", () => {
  try {
    new EnvConfig({ X: "abc" }).int("X");
  } catch (err) {
    assert.ok(err instanceof EnvError);
    assert.equal(err.key, "X");
    assert.match(err.message, /^X: expected integer/);
  }
});
