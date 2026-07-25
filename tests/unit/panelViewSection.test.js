const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panelViewSection.js")];
  return require("../../extension/content/panelViewSection.js");
}

function resetGlobals() {
  delete global.cgptGetViewSettings;
  delete global.cgptUpdateViewSettings;
  delete global.cgptApplyChatWindowAlignment;
  delete global.createPanelButton;
  delete global.cgptApplyPanelTextTone;
  delete global.cgptApplyPanelInputStyle;
  delete global.cgptRefreshChatWindowAlignment;
  delete global.cgptRefreshChatOverlayHelpers;
  delete global.resetChatLogEntries;
  delete global.captureChatLogsFromNode;
  delete global.cgptReapplyCodeSaverDecorations;
  delete global.decorateCodeBlocks;
  delete global.applyHeadingFold;
  delete global.cgptShouldApplyHeadingFold;
  delete global.showToast;
  delete global.document;
}

function createElementStub(tagName) {
  const children = [];
  const listeners = {};
  return {
    tagName: String(tagName).toUpperCase(),
    type: "",
    textContent: "",
    value: "",
    checked: false,
    title: "",
    dataset: {},
    style: {},
    children,
    appendChild(child) {
      children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    dispatch(type) {
      if (listeners[type]) listeners[type]({ target: this });
    },
  };
}

test("createChatBubbleWidthControl uses horizontal presets without a slider", () => {
  global.document = {
    createElement: createElementStub,
  };
  global.createPanelButton = (text) => {
    const button = createElementStub("button");
    button.textContent = text;
    return button;
  };
  global.cgptGetViewSettings = () => ({
    compactLineCount: 1,
    chatOverlayEnabled: false,
    chatWindowLeftAligned: false,
    chatBubbleWidthPx: 960,
  });

  const { createChatBubbleWidthControl } = loadModule();
  const control = createChatBubbleWidthControl();
  const presetRow = control.children[0];
  const inputRow = control.children[1];
  const input = inputRow.children[0];

  assert.equal(presetRow.style.flexDirection, "row");
  assert.equal(presetRow.style.flexWrap, "nowrap");
  assert.deepStrictEqual(
    presetRow.children.map((button) => button.textContent),
    ["720", "960", "1200"]
  );
  assert.equal(input.type, "number");
  assert.equal(input.style.height, "28px");
  assert.equal(input.style.minHeight, "28px");
  assert.equal(
    JSON.stringify(control).includes("\"768\""),
    false
  );
  resetGlobals();
});

test("createChatBubbleWidthControl applies the entered width with a button", () => {
  const applied = [];
  global.document = {
    createElement: createElementStub,
  };
  global.createPanelButton = (text) => {
    const button = createElementStub("button");
    button.textContent = text;
    return button;
  };
  global.cgptGetViewSettings = () => ({
    compactLineCount: 1,
    chatOverlayEnabled: false,
    chatWindowLeftAligned: false,
    chatBubbleWidthPx: 960,
  });
  global.cgptUpdateViewSettings = (partial, callback) => {
    applied.push(partial);
    callback({
      compactLineCount: 1,
      chatOverlayEnabled: false,
      chatWindowLeftAligned: false,
      chatBubbleWidthPx: partial.chatBubbleWidthPx,
    });
  };
  global.cgptApplyChatWindowAlignment = (settings) => {
    applied.push({ appliedWidth: settings.chatBubbleWidthPx });
  };

  const { createChatBubbleWidthControl } = loadModule();
  const control = createChatBubbleWidthControl();
  const inputRow = control.children[1];
  const input = inputRow.children[0];
  const applyButton = inputRow.children[2];

  input.value = "1200";
  applyButton.dispatch("click");

  assert.deepStrictEqual(applied, [
    { chatBubbleWidthPx: 1200 },
    { appliedWidth: 1200 },
  ]);
  resetGlobals();
});

test("createChatOverlayControl updates the setting and refreshes overlay helpers only", () => {
  const calls = [];
  global.document = {
    createElement: createElementStub,
  };
  global.cgptGetViewSettings = () => ({
    compactLineCount: 1,
    chatOverlayEnabled: false,
    chatWindowLeftAligned: false,
    chatBubbleWidthPx: 960,
  });
  global.cgptUpdateViewSettings = (partial, callback) => {
    calls.push(partial);
    callback({
      compactLineCount: 1,
      chatOverlayEnabled: partial.chatOverlayEnabled,
      chatWindowLeftAligned: false,
      chatBubbleWidthPx: 960,
    });
  };
  global.cgptRefreshChatOverlayHelpers = (root) => {
    calls.push({ type: "overlayRefresh", root });
  };

  const { createChatOverlayControl } = loadModule();
  const control = createChatOverlayControl();
  const checkbox = control.children[0];
  checkbox.checked = true;
  checkbox.dispatch("change");

  assert.deepStrictEqual(calls, [
    { chatOverlayEnabled: true },
    { type: "overlayRefresh", root: global.document },
  ]);
  resetGlobals();
});

test("requestCodeSaverReapply resyncs chat layout, logs, code blocks, and headings", () => {
  const calls = [];
  const bodyA = { id: "body-a" };
  const bodyB = { id: "body-b" };
  global.document = {
    body: {},
    querySelectorAll(selector) {
      return selector === "[data-message-author-role='assistant']"
        ? [bodyA, bodyB]
        : [];
    },
  };
  global.cgptRefreshChatWindowAlignment = (root) => {
    calls.push({ type: "alignment", root });
  };
  global.resetChatLogEntries = () => {
    calls.push({ type: "resetChatLogs" });
  };
  global.captureChatLogsFromNode = (root) => {
    calls.push({ type: "captureChatLogs", root });
  };
  global.cgptReapplyCodeSaverDecorations = (root) => {
    calls.push({ type: "reapply", root });
  };
  global.cgptShouldApplyHeadingFold = (body) => body === bodyA;
  global.applyHeadingFold = (body, level) => {
    calls.push({ type: "headingFold", body, level });
  };
  global.showToast = (message, tone) => {
    calls.push({ type: "toast", message, tone });
  };

  const { requestCodeSaverReapply } = loadModule();
  requestCodeSaverReapply();

  assert.deepStrictEqual(calls, [
    { type: "alignment", root: global.document },
    { type: "resetChatLogs" },
    { type: "captureChatLogs", root: global.document },
    { type: "reapply", root: global.document },
    { type: "headingFold", body: bodyA, level: 1 },
    { type: "toast", message: "Reapplied helper view.", tone: "success" },
  ]);
  resetGlobals();
});

test("requestCodeSaverReapply falls back to decorating code blocks when reapply is unavailable", () => {
  const calls = [];
  global.document = {
    body: {},
    querySelectorAll() {
      return [];
    },
  };
  global.decorateCodeBlocks = (root) => {
    calls.push({ type: "decorate", root });
  };

  const { requestCodeSaverReapply } = loadModule();
  requestCodeSaverReapply();

  assert.deepStrictEqual(calls, [
    { type: "decorate", root: global.document },
  ]);
  resetGlobals();
});

test("requestChatOverlayRefresh falls back to full reapply when the lightweight hook is unavailable", () => {
  const calls = [];
  global.document = {
    body: {},
    querySelectorAll() {
      return [];
    },
  };
  global.decorateCodeBlocks = (root) => {
    calls.push({ type: "decorate", root });
  };

  const { requestChatOverlayRefresh } = loadModule();
  requestChatOverlayRefresh();

  assert.deepStrictEqual(calls, [
    { type: "decorate", root: global.document },
  ]);
  resetGlobals();
});
