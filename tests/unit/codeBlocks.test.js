const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/codeBlocks.js")];
  return require("../../extension/content/codeBlocks.js");
}

function resetGlobals() {
  delete global.Node;
}

test("cgptCollectDecoratablePres ignores nested inner pre blocks when an outer pre owns the code", () => {
  global.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptCollectDecoratablePres } = loadModule();

  const code = {};
  const innerPre = {
    nodeType: 1,
    matches: (selector) => selector === "pre",
    closest: () => null,
    querySelector: (selector) => (selector === "code, .cm-content" ? code : null),
    querySelectorAll: () => [],
    parentElement: null,
  };
  const outerPre = {
    nodeType: 1,
    matches: (selector) => selector === "pre",
    closest: (selector) => (selector === "pre" ? outerPre : null),
    querySelector: (selector) => (selector === "code, .cm-content" ? code : null),
    querySelectorAll: (selector) => (selector === "pre" ? [innerPre] : []),
    parentElement: null,
  };
  innerPre.parentElement = outerPre;
  const root = {
    nodeType: 9,
    querySelectorAll: (selector) => (selector === "pre" ? [outerPre, innerPre] : []),
  };

  const result = cgptCollectDecoratablePres(root);
  assert.equal(result.length, 1);
  assert.strictEqual(result[0], outerPre);
  resetGlobals();
});

test("cgptCollectDecoratablePres skips user message code blocks", () => {
  global.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptCollectDecoratablePres } = loadModule();

  const code = {};
  const userMessage = {
    getAttribute: (name) => (name === "data-message-author-role" ? "user" : ""),
  };
  const userPre = {
    nodeType: 1,
    matches: (selector) => selector === "pre",
    closest: (selector) => (selector === "[data-message-author-role]" ? userMessage : null),
    querySelector: (selector) => (selector === "code, .cm-content" ? code : null),
    querySelectorAll: () => [],
    parentElement: null,
  };
  const root = {
    nodeType: 9,
    querySelectorAll: (selector) => (selector === "pre" ? [userPre] : []),
  };

  const result = cgptCollectDecoratablePres(root);
  assert.equal(result.length, 0);
  resetGlobals();
});
