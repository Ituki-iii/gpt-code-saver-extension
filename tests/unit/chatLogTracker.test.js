const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogTracker.js")];
  return require("../../extension/content/chatLogTracker.js");
}

function resetGlobals() {
  delete global.getConversationKey;
  delete global.Node;
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

test("cgptHasUnrenderedFencedCode detects assistant text that still contains raw fenced code", () => {
  const { cgptHasUnrenderedFencedCode } = loadModule();
  const element = {
    querySelector() {
      return null;
    },
    innerText: [
      "了解です。",
      "",
      "PATH: src/main.ts",
      "```ts",
      "console.log('main');",
      "```",
    ].join("\n"),
  };

  assert.equal(cgptHasUnrenderedFencedCode(element), true);
  resetGlobals();
});

test("cgptHasUnrenderedFencedCode ignores messages whose fenced code is already rendered as pre/code", () => {
  const { cgptHasUnrenderedFencedCode } = loadModule();
  const renderedPre = {};
  const element = {
    querySelector(selector) {
      return selector === "pre code, pre .cm-content" ? renderedPre : null;
    },
    innerText: [
      "了解です。",
      "",
      "PATH: src/main.ts",
      "```ts",
      "console.log('main');",
      "```",
    ].join("\n"),
  };

  assert.equal(cgptHasUnrenderedFencedCode(element), false);
  resetGlobals();
});

test("cgptBuildChatRenderIssue reports raw fenced assistant output before helper decorations run", () => {
  const { cgptBuildChatRenderIssue } = loadModule();
  const issue = cgptBuildChatRenderIssue("assistant", {
    querySelector() {
      return null;
    },
    innerText: [
      "了解です。",
      "",
      "PATH: src/main.ts",
      "```ts",
      "console.log('main');",
      "```",
    ].join("\n"),
  });

  assert.deepEqual(issue, {
    code: "assistant-raw-fence",
    message:
      "Helper deferred decorations because the assistant message still contains raw fenced code.",
    sample: "了解です。\n\nPATH: src/main.ts\n```ts\nconsole.log('main');\n```",
  });
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

test("cgptGetChatEntryHost prefers the conversation turn wrapper", () => {
  const { cgptGetChatEntryHost } = loadModule();
  const turn = {
    matches(selector) {
      return selector === "section[data-testid^='conversation-turn-']";
    },
  };
  const roleNode = {
    matches(selector) {
      return selector === "[data-message-author-role]";
    },
    closest(selector) {
      return selector === "section[data-testid^='conversation-turn-']" ? turn : null;
    },
  };

  assert.equal(cgptGetChatEntryHost(roleNode), turn);
  resetGlobals();
});

test("cgptGetChatRoleElement resolves the inner role node from a turn host", () => {
  const roleNode = {
    getAttribute(name) {
      return name === "data-message-author-role" ? "assistant" : "";
    },
  };
  const host = {
    matches() {
      return false;
    },
    querySelector(selector) {
      return selector === "[data-message-author-role]" ? roleNode : null;
    },
  };
  const { cgptGetChatRoleElement } = loadModule();

  assert.equal(cgptGetChatRoleElement(host), roleNode);
  resetGlobals();
});

test("cgptResolveChatTurnNumber reads the numeric turn suffix", () => {
  const { cgptResolveChatTurnNumber } = loadModule();
  const host = {
    getAttribute(name) {
      return name === "data-testid" ? "conversation-turn-146" : "";
    },
  };

  assert.equal(cgptResolveChatTurnNumber(host), 146);
  resetGlobals();
});

test("cgptResolveChatEntryOrder prefers the conversation turn number", () => {
  const { cgptResolveChatEntryOrder } = loadModule();
  const host = {
    getAttribute(name) {
      return name === "data-testid" ? "conversation-turn-17" : "";
    },
  };

  assert.equal(cgptResolveChatEntryOrder(host, 999), 17);
  assert.equal(cgptResolveChatEntryOrder(null, 7), 7);
  resetGlobals();
});

test("extractChatMessageTimestamp does not fabricate a timestamp when none is present", () => {
  const { extractChatMessageTimestamp } = loadModule();
  const element = {
    querySelector() {
      return null;
    },
  };

  assert.equal(extractChatMessageTimestamp(element), "");
  resetGlobals();
});

test("cgptExtractChatMessageTextFromNode removes helper chat badges from extracted text", () => {
  const { cgptExtractChatMessageTextFromNode } = loadModule();
  const clone = {
    innerText: "ChatGPT said:\nActual message\nCompact",
    textContent: "ChatGPT said:\nActual message\nCompact",
    querySelectorAll(selector) {
      assert.ok(selector.includes("[data-cgpt-helper-chat-badge='1']"));
      return [
        {
          remove() {
            clone.innerText = "Actual message";
            clone.textContent = "Actual message";
          },
        },
      ];
    },
  };
  const node = {
    cloneNode() {
      return clone;
    },
  };

  assert.equal(cgptExtractChatMessageTextFromNode(node), "Actual message");
  resetGlobals();
});

test("cgptBuildChatMessageMediaPlaceholder creates an image placeholder from alt text", () => {
  const { cgptBuildChatMessageMediaPlaceholder } = loadModule();
  const node = {
    querySelector(selector) {
      if (selector === "img[alt]") {
        return {
          getAttribute(name) {
            return name === "alt" ? "image(25).png" : "";
          },
        };
      }
      return null;
    },
  };

  assert.equal(cgptBuildChatMessageMediaPlaceholder(node), "[Image: image(25).png]");
  resetGlobals();
});

test("cgptBuildChatMessageMediaPlaceholder falls back to the image button label", () => {
  const { cgptBuildChatMessageMediaPlaceholder } = loadModule();
  const button = {
    getAttribute(name) {
      return name === "aria-label" ? "Open image: screenshot.webp" : "";
    },
  };
  const node = {
    querySelector(selector) {
      if (selector === "img[alt]" || selector === "button[aria-label^='Open image:'] img") {
        return null;
      }
      if (selector === "button[aria-label^='Open image:']") {
        return button;
      }
      return null;
    },
  };

  assert.equal(cgptBuildChatMessageMediaPlaceholder(node), "[Image: screenshot.webp]");
  resetGlobals();
});

test("cgptBuildChatMessageTextSignature changes when text length or child counts change", () => {
  const { cgptBuildChatMessageTextSignature } = loadModule();

  assert.equal(
    cgptBuildChatMessageTextSignature({
      childNodes: [{}, {}],
      childElementCount: 1,
      textContent: "hello",
    }),
    "2:1:5"
  );
  assert.equal(
    cgptBuildChatMessageTextSignature({
      childNodes: [{}, {}, {}],
      childElementCount: 2,
      textContent: "hello world",
    }),
    "3:2:11"
  );
  resetGlobals();
});

test("cgptResolveChatMessageDisplayLabel delegates to shared label resolver", () => {
  global.cgptGetChatEntryDisplayLabel = ({ role, element }) =>
    role === "assistant" && element && element.model ? "GPT 5.5 Thinking" : "User";
  const { cgptResolveChatMessageDisplayLabel } = loadModule();

  assert.equal(cgptResolveChatMessageDisplayLabel("assistant", { model: true }), "GPT 5.5 Thinking");
  assert.equal(cgptResolveChatMessageDisplayLabel("user", {}), "User");
  delete global.cgptGetChatEntryDisplayLabel;
  resetGlobals();
});

test("cgptIsVisibleChatMessageRegion detects message areas by rendered rects", () => {
  const { cgptIsVisibleChatMessageRegion } = loadModule();

  assert.equal(
    cgptIsVisibleChatMessageRegion({
      getClientRects() {
        return [{ width: 1200, height: 32 }];
      },
    }),
    true
  );
  assert.equal(
    cgptIsVisibleChatMessageRegion({
      getClientRects() {
        return [{ width: 0, height: 0 }];
      },
    }),
    false
  );
  resetGlobals();
});
