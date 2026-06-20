const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogModal.js")];
  return require("../../extension/content/chatLogModal.js");
}

function resetGlobals() {
  delete global.document;
  delete global.CustomEvent;
  delete global.cgptCreateSharedChipButton;
  delete global.cgptApplySurfaceStyle;
}

function createElementStub(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName).toUpperCase(),
    textContent: "",
    title: "",
    id: "",
    style: {},
    attributes: {},
    dataset: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    dispatch(type) {
      if (listeners[type]) listeners[type]({ target: this });
    },
  };
}

test("cgptCreateChatLogToggleButton creates a launcher with initial state", () => {
  global.document = {
    createElement: createElementStub,
    getElementById() {
      return null;
    },
  };
  global.cgptCreateSharedChipButton = (label) => {
    const button = createElementStub("button");
    button.textContent = label;
    return button;
  };

  const { cgptCreateChatLogToggleButton } = loadModule();
  const button = cgptCreateChatLogToggleButton();

  assert.equal(button.id, "cgpt-helper-chatlog-toggle");
  assert.equal(button.textContent, "Chat Log");
  assert.equal(button.style.right, "156px");
  assert.equal(button.style.bottom, "16px");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(button.title, "Show chat log");
  assert.equal(button.dataset.cgptChatLogToggleBound, "1");
  resetGlobals();
});

test("cgptIsChatLogModalOpen reflects overlay presence", () => {
  global.document = {
    getElementById(id) {
      return id === "cgpt-helper-chatlog-modal" ? { id } : null;
    },
  };

  const { cgptIsChatLogModalOpen } = loadModule();
  assert.equal(cgptIsChatLogModalOpen(), true);
  resetGlobals();
});

test("cgptCloseChatLogModal dispatches close, removes the overlay, and resets the launcher state", () => {
  const events = [];
  const removed = [];
  const overlay = {
    parentNode: {
      removeChild(node) {
        removed.push(node);
      },
    },
    dispatchEvent(event) {
      events.push(event.type);
    },
  };
  const button = createElementStub("button");
  global.CustomEvent = function CustomEvent(type) {
    this.type = type;
  };
  global.document = {
    getElementById(id) {
      if (id === "cgpt-helper-chatlog-modal") return overlay;
      if (id === "cgpt-helper-chatlog-toggle") return button;
      return null;
    },
  };

  const { cgptCloseChatLogModal } = loadModule();
  cgptCloseChatLogModal();

  assert.deepStrictEqual(events, ["cgpt-helper-chatlog-close"]);
  assert.deepStrictEqual(removed, [overlay]);
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(button.title, "Show chat log");
  resetGlobals();
});

test("cgptSyncChatLogToggleState updates the launcher aria state and title", () => {
  const button = createElementStub("button");
  button.id = "cgpt-helper-chatlog-toggle";
  global.document = {
    getElementById(id) {
      return id === "cgpt-helper-chatlog-toggle" ? button : null;
    },
  };

  const { cgptSyncChatLogToggleState } = loadModule();
  cgptSyncChatLogToggleState(true);
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(button.title, "Hide chat log");

  cgptSyncChatLogToggleState(false);
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(button.title, "Show chat log");
  resetGlobals();
});
