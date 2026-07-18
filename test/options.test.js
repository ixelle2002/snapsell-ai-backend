import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrompt,
  parsePreservationRules,
  validateOptions,
} from "../lib/options.js";

test("validates and normalizes supported options", () => {
  assert.deepEqual(
    validateOptions({
      presentationMode: [" MODEL "],
      modelType: ["Plus-Size Woman"],
      preservationRules: ['["Keep the torn cuff visible"]'],
    }),
    {
      presentationMode: "model",
      modelType: "plus-size woman",
      preservationRules: ["Keep the torn cuff visible"],
    }
  );
});

test("rejects unsupported choices", () => {
  assert.throws(
    () => validateOptions({ presentationMode: "beach", modelType: "man" }),
    /presentationMode must be one of/
  );
});

test("parses comma-separated rules", () => {
  assert.deepEqual(parsePreservationRules("keep scuffs, keep exact logo"), [
    "keep scuffs",
    "keep exact logo",
  ]);
});

test("model prompt contains model type and truth-preservation language", () => {
  const prompt = buildPrompt({
    presentationMode: "model",
    modelType: "senior",
    preservationRules: ["Keep the faded collar"],
  });
  assert.match(prompt, /photorealistic senior/);
  assert.match(prompt, /Keep the faded collar/);
  assert.match(prompt, /sole source of truth/);
});
