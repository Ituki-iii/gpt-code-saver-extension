const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/codeBlocks.js")];
  return require("../../extension/content/codeBlocks.js");
}

function resetGlobals() {
  delete global.Node;
}

test("cgptCollectDecoratablePres ignores outer pre containers that contain nested pre blocks", () => {
  global.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptCollectDecoratablePres } = loadModule();

  const code = {};
  const innerPre = {
    nodeType: 1,
    matches: (selector) => selector === "pre",
    closest: () => null,
    querySelector: (selector) => (selector === "code, .cm-content" ? code : null),
    querySelectorAll: () => [],
  };
  const outerPre = {
    nodeType: 1,
    matches: (selector) => selector === "pre",
    closest: () => null,
    querySelector: (selector) => (selector === "code, .cm-content" ? code : null),
    querySelectorAll: (selector) => (selector === "pre" ? [innerPre] : []),
  };
  const root = {
    nodeType: 9,
    querySelectorAll: (selector) => (selector === "pre" ? [outerPre, innerPre] : []),
  };

  assert.deepStrictEqual(cgptCollectDecoratablePres(root), [innerPre]);
  resetGlobals();
});
