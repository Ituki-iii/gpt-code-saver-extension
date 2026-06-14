const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogTracker.js")];
  return require("../../extension/content/chatLogTracker.js");
}

function resetGlobals() {
  delete global.getConversationKey;
  delete global.Node;
  delete global.document;
  delete global.cgptGetChatEntryDisplayLabel;
}

test("cgptBuildResponseFilePath stores chat text under chat-logs with a sanitized conversation key", () => {
  global.getConversationKey = () => "Project: Alpha/Review";
  const { cgptBuildResponseFilePath } = loadModule();

  const filePath = cgptBuildResponseFilePath({
    role: "assistant",
    timestamp: "2026-03-03T10:20:30.456Z",
  });

  assert.equal(
    filePath,
    "chat-logs/Project-Alpha-Review/assistant-2026-03-03T10-20-30-456Z.txt"
  );
  resetGlobals();
});

test("cgptSanitizeChatLogPathSegment falls back for empty values", () => {
  const { cgptSanitizeChatLogPathSegment } = loadModule();
  assert.equal(cgptSanitizeChatLogPathSegment("..."), "current-chat");
  resetGlobals();
});

test("cgptShouldDelayChatMessageFolding waits for the quiet period to elapse", () => {
  const { cgptShouldDelayChatMessageFolding } = loadModule();

  assert.equal(cgptShouldDelayChatMessageFolding(1_000, 1_500, 1_200), true);
  assert.equal(cgptShouldDelayChatMessageFolding(1_000, 2_200, 1_200), false);
  resetGlobals();
});

test("cgptIsHelperManagedNode detects helper UI nodes", () => {
  global.Node = { ELEMENT_NODE: 1 };
  const { cgptIsHelperManagedNode } = loadModule();
  const helperNode = {
    nodeType: 1,
    id: "cgpt-code-helper-panel",
    classList: [],
    closest: () => null,
  };
  assert.equal(cgptIsHelperManagedNode(helperNode), true);
  resetGlobals();
});

test("cgptCanContainChatMessages ignores helper subtrees and accepts message hosts", () => {
  global.Node = { ELEMENT_NODE: 1 };
  const { cgptCanContainChatMessages } = loadModule();

  const helperNode = {
    nodeType: 1,
    id: "",
    classList: ["cgpt-helper-fold"],
    closest: () => null,
    matches: () => false,
    querySelector: () => null,
  };
  assert.equal(cgptCanContainChatMessages(helperNode), false);

  const messageNode = {
    nodeType: 1,
    id: "",
    classList: [],
    closest: () => null,
    matches: (selector) => selector === "[data-message-author-role]",
    querySelector: () => null,
  };
  assert.equal(cgptCanContainChatMessages(messageNode), true);
  resetGlobals();
});

test("extractChatMessageTimestamp does not fabricate the current time when none is present", () => {
  const { extractChatMessageTimestamp } = loadModule();
  const element = {
    querySelector: () => null,
  };
  assert.equal(extractChatMessageTimestamp(element), "");
  resetGlobals();
});

test("cgptResolveCachedChatTimestamp restores a timestamp from the message id cache", () => {
  const tracker = loadModule();
  const entries = tracker.cgptUpsertConversationTimestampEntry([], {
    messageId: "message-1",
    role: "assistant",
    order: 3,
    textHash: tracker.cgptHashChatMessageText("hello"),
    timestamp: "2026-03-01T12:00:00.000Z",
  });
  assert.equal(
    tracker.cgptFindCachedChatTimestampEntry(entries, { messageId: "message-1" }).timestamp,
    "2026-03-01T12:00:00.000Z"
  );
  resetGlobals();
});

test("cgptFindCachedChatTimestampEntry falls back to role and order when the message id is absent", () => {
  const tracker = loadModule();
  const entries = tracker.cgptUpsertConversationTimestampEntry([], {
    messageId: "",
    role: "user",
    order: 1,
    textHash: tracker.cgptHashChatMessageText("repeat"),
    timestamp: "2026-03-01T12:00:05.000Z",
  });
  assert.equal(
    tracker.cgptFindCachedChatTimestampEntry(entries, {
      role: "user",
      order: 1,
      textHash: tracker.cgptHashChatMessageText("other"),
    }).timestamp,
    "2026-03-01T12:00:05.000Z"
  );
  resetGlobals();
});

test("cgptFindCachedChatTimestampEntry falls back to role and text hash when order differs", () => {
  const tracker = loadModule();
  const textHash = tracker.cgptHashChatMessageText("same text");
  const entries = tracker.cgptUpsertConversationTimestampEntry([], {
    messageId: "",
    role: "assistant",
    order: 8,
    textHash,
    timestamp: "2026-03-01T12:00:10.000Z",
  });
  assert.equal(
    tracker.cgptFindCachedChatTimestampEntry(entries, {
      role: "assistant",
      order: 99,
      textHash,
    }).timestamp,
    "2026-03-01T12:00:10.000Z"
  );
  resetGlobals();
});

test("cgptHasStableRenderedMarkdown rejects raw assistant markdown without rendered structure", () => {
  const { cgptHasStableRenderedMarkdown } = loadModule();
  const element = {
    getAttribute: (name) => (name === "data-message-author-role" ? "assistant" : ""),
    querySelector: () => null,
    innerText: [
      "表示された値は正常です。",
      "それでも効かないなら、GNOME の **入力ソース切替** に `Shift + Space` を使う方式です。",
      "",
      "## 方針",
      "",
      "- Japanese(Mozc) のまま",
      "- `Shift + Space` で切り替える",
    ].join("\n"),
  };

  assert.equal(cgptHasStableRenderedMarkdown(element), false);
  resetGlobals();
});

test("cgptHasStableRenderedMarkdown rejects collapsed single-line raw markdown", () => {
  const { cgptHasStableRenderedMarkdown } = loadModule();
  const element = {
    getAttribute: (name) => (name === "data-message-author-role" ? "assistant" : ""),
    querySelector: () => null,
    innerText:
      "表示された値は正常です。 それでも効かないなら、GNOME の **入力ソース切替** です。 ## 方針 ```bash ibus engine mozc-jp ```",
  };

  assert.equal(cgptHasStableRenderedMarkdown(element), false);
  resetGlobals();
});

test("cgptHasStableRenderedMarkdown accepts assistant markdown after rendered structure appears", () => {
  const { cgptHasStableRenderedMarkdown } = loadModule();
  const element = {
    getAttribute: (name) => (name === "data-message-author-role" ? "assistant" : ""),
    querySelector: (selector) => selector.includes("h2") ? { tagName: "H2" } : null,
    innerText: ["表示された値は正常です。", "", "## 方針"].join("\n"),
  };

  assert.equal(cgptHasStableRenderedMarkdown(element), true);
  resetGlobals();
});

test("cgptSyncRawMarkdownPreservation toggles the preserve class for raw assistant markdown", () => {
  const { cgptSyncRawMarkdownPreservation } = loadModule();
  const classes = new Set();
  const bodyClasses = new Set();
  const body = {
    classList: {
      toggle(name, enabled) {
        if (enabled) {
          bodyClasses.add(name);
        } else {
          bodyClasses.delete(name);
        }
      },
      contains(name) {
        return bodyClasses.has(name);
      },
    },
  };
  const element = {
    getAttribute: (name) => (name === "data-message-author-role" ? "assistant" : ""),
    querySelector: () => null,
    querySelectorAll: (selector) => selector === ".cgpt-helper-message-body" ? [body] : [],
    innerText: ["表示された値は正常です。", "", "## 方針", "- GNOME"].join("\n"),
    classList: {
      toggle(name, enabled) {
        if (enabled) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
      },
      contains(name) {
        return classes.has(name);
      },
    },
  };

  assert.equal(cgptSyncRawMarkdownPreservation(element), true);
  assert.equal(element.classList.contains("cgpt-raw-markdown-preserve"), true);
  assert.equal(body.classList.contains("cgpt-raw-markdown-preserve"), true);

  element.querySelector = (selector) => selector.includes("h2") ? { tagName: "H2" } : null;
  assert.equal(cgptSyncRawMarkdownPreservation(element), false);
  assert.equal(element.classList.contains("cgpt-raw-markdown-preserve"), false);
  assert.equal(body.classList.contains("cgpt-raw-markdown-preserve"), false);
  resetGlobals();
});

test("cgptSyncChatMessageInlineLabel adds a user label before folding", () => {
  global.document = {
    createElement: () => ({ textContent: "" }),
    head: { appendChild: () => {} },
  };
  const { cgptSyncChatMessageInlineLabel } = loadModule();
  const classes = new Set();
  const attributes = {};
  const element = {
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute: (name) => {
      if (name === "data-message-author-role") return "user";
      return attributes[name] || "";
    },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    removeAttribute: (name) => {
      delete attributes[name];
    },
    querySelector: () => null,
  };

  assert.equal(cgptSyncChatMessageInlineLabel(element), true);
  assert.equal(element.classList.contains("cgpt-chat-message-inline-label"), true);
  assert.equal(attributes["data-cgpt-helper-message-label"], "User");
  resetGlobals();
});

test("cgptSyncChatMessageInlineLabel resolves assistant model labels before folding", () => {
  global.document = {
    createElement: () => ({ textContent: "" }),
    head: { appendChild: () => {} },
  };
  global.cgptGetChatEntryDisplayLabel = require("../../extension/content/assistantLabel.js")
    .cgptGetChatEntryDisplayLabel;
  const { cgptSyncChatMessageInlineLabel } = loadModule();
  const classes = new Set();
  const attributes = {};
  const element = {
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute: (name) => {
      if (name === "data-message-author-role") return "assistant";
      if (name === "data-message-model-slug") return "gpt-5-5-thinking";
      return attributes[name] || "";
    },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    removeAttribute: (name) => {
      delete attributes[name];
    },
    dataset: { messageModelSlug: "gpt-5-5-thinking" },
    querySelector: () => null,
  };

  assert.equal(cgptSyncChatMessageInlineLabel(element), true);
  assert.equal(element.classList.contains("cgpt-chat-message-inline-label"), true);
  assert.equal(attributes["data-cgpt-helper-message-label"], "GPT 5.5 Thinking");
  resetGlobals();
});

test("cgptSyncChatMessageInlineLabel removes the inline label after folding", () => {
  global.document = {
    createElement: () => ({ textContent: "" }),
    head: { appendChild: () => {} },
  };
  const { cgptSyncChatMessageInlineLabel } = loadModule();
  const classes = new Set(["cgpt-chat-message-inline-label"]);
  const attributes = { "data-cgpt-helper-message-label": "GPT 5.5 Thinking" };
  const element = {
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute: (name) => {
      if (name === "data-message-author-role") return "assistant";
      return attributes[name] || "";
    },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    removeAttribute: (name) => {
      delete attributes[name];
    },
    querySelector: (selector) => selector === ":scope > .cgpt-helper-fold" ? {} : null,
  };

  assert.equal(cgptSyncChatMessageInlineLabel(element), false);
  assert.equal(element.classList.contains("cgpt-chat-message-inline-label"), false);
  assert.equal(attributes["data-cgpt-helper-message-label"], undefined);
  resetGlobals();
});
