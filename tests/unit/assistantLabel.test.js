const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/assistantLabel.js")];
  return require("../../extension/content/assistantLabel.js");
}

test("cgptNormalizeAssistantDisplayLabel normalizes GPT slugs consistently", () => {
  const { cgptNormalizeAssistantDisplayLabel } = loadModule();
  assert.equal(cgptNormalizeAssistantDisplayLabel("gpt-5-2-thinking"), "GPT 5.2 Thinking");
});

test("cgptNormalizeAssistantDisplayLabel removes chat chrome labels before resolving", () => {
  const { cgptNormalizeAssistantDisplayLabel } = loadModule();
  assert.equal(cgptNormalizeAssistantDisplayLabel("ChatGPT GPT-4.1 Temporary Chat"), "GPT 4.1");
});

test("cgptNormalizeAssistantDisplayLabel preserves o-series labels", () => {
  const { cgptNormalizeAssistantDisplayLabel } = loadModule();
  assert.equal(cgptNormalizeAssistantDisplayLabel("o3-mini"), "o3-mini");
});

test("cgptGetChatEntryDisplayLabel falls back to AI when assistant metadata is missing", () => {
  const { cgptGetChatEntryDisplayLabel } = loadModule();
  assert.equal(cgptGetChatEntryDisplayLabel({ role: "assistant" }), "AI");
});

test("cgptGetChatEntryDisplayLabel resolves user and assistant labels from entry metadata", () => {
  const { cgptGetChatEntryDisplayLabel } = loadModule();

  assert.equal(cgptGetChatEntryDisplayLabel({ role: "user" }), "User");
  assert.equal(
    cgptGetChatEntryDisplayLabel({
      role: "assistant",
      displayLabel: "GPT 5.5 Thinking",
    }),
    "GPT 5.5 Thinking"
  );
  assert.equal(
    cgptGetChatEntryDisplayLabel({
      role: "assistant",
      displayLabel: "AI",
      element: {
        getAttribute(name) {
          return name === "data-message-model-slug" ? "gpt-5-5-thinking" : "";
        },
        dataset: {},
      },
    }),
    "GPT 5.5 Thinking"
  );
  assert.equal(
    cgptGetChatEntryDisplayLabel({
      role: "assistant",
      element: {
        getAttribute(name) {
          return name === "data-message-model-slug" ? "gpt-5-2-thinking" : "";
        },
        dataset: {},
      },
    }),
    "GPT 5.2 Thinking"
  );
});
