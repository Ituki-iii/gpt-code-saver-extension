const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panelLayout.js")];
  return require("../../extension/content/panelLayout.js");
}

function resetGlobals() {
  delete global.document;
  delete global.window;
}

function createElementStub(tagName) {
  return {
    tagName: String(tagName).toUpperCase(),
    id: "",
    style: {},
    children: [],
    parentNode: null,
    appendChild(node) {
      node.parentNode = this;
      node.isConnected = true;
      this.children.push(node);
    },
    getBoundingClientRect() {
      return { height: 48 };
    },
  };
}

test("cgptMountFloatingLauncher creates the dock, normalizes button positioning, and updates panel bottom", () => {
  const nodes = new Map();
  const body = createElementStub("body");
  const main = {
    style: {},
    dataset: {},
  };
  const panel = {
    id: "cgpt-code-helper-panel",
    style: {},
  };
  nodes.set(panel.id, panel);

  global.document = {
    body,
    documentElement: {},
    createElement(tagName) {
      const node = createElementStub(tagName);
      return node;
    },
    getElementById(id) {
      return nodes.get(id) || null;
    },
    querySelector(selector) {
      return selector === "main" ? main : null;
    },
  };
  global.window = {
    addEventListener() {},
  };

  const originalAppendChild = body.appendChild.bind(body);
  body.appendChild = (node) => {
    if (node.id) {
      nodes.set(node.id, node);
    }
    originalAppendChild(node);
  };

  const button = {
    id: "cgpt-helper-panel-toggle",
    style: {
      position: "fixed",
      right: "16px",
      bottom: "16px",
    },
    isConnected: false,
    parentNode: null,
  };

  const { cgptMountFloatingLauncher } = loadModule();
  cgptMountFloatingLauncher(button, { order: 10 });

  const dock = nodes.get("cgpt-helper-launcher-dock");
  assert.ok(dock);
  assert.equal(button.parentNode, dock);
  assert.equal(button.style.position, "static");
  assert.equal(button.style.right, "auto");
  assert.equal(button.style.bottom, "auto");
  assert.equal(button.style.order, "10");
  assert.equal(panel.style.bottom, "72px");
  assert.equal(main.style.paddingBottom, "84px");
  resetGlobals();
});
