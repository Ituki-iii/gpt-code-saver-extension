const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/codeBlockObserver.js")];
  return require("../../extension/content/codeBlockObserver.js");
}

function resetGlobals() {
  delete global.Node;
}

test("cgptIsHelperOwnedNode treats code helper wrapper nodes as observer-owned", () => {
  global.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptIsHelperOwnedNode } = loadModule();
  const wrapperNode = {
    nodeType: 1,
    parentElement: null,
    closest: (selector) => (selector.includes("[data-cgpt-code-wrapper='1']") ? {} : null),
  };

  assert.equal(cgptIsHelperOwnedNode(wrapperNode), true);
  resetGlobals();
});

test("cgptCanContainCodeBlocks ignores helper nodes and accepts pre containers", () => {
  global.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptCanContainCodeBlocks } = loadModule();

  const helperNode = {
    nodeType: 1,
    parentElement: null,
    closest: (selector) => (selector.includes("[data-cgpt-code-toggle='1']") ? {} : null),
    matches: () => false,
    querySelector: () => null,
  };
  assert.equal(cgptCanContainCodeBlocks(helperNode), false);

  const preNode = {
    nodeType: 1,
    parentElement: null,
    closest: () => null,
    matches: (selector) => selector === "pre, code, .cm-content",
    querySelector: () => null,
  };
  assert.equal(cgptCanContainCodeBlocks(preNode), true);
  resetGlobals();
});

test("cgptResolveCodeBlockMutationRoot keeps text nodes for targeted code refreshes", () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
  const { cgptResolveCodeBlockMutationRoot } = loadModule();

  const textNode = { nodeType: 3, parentElement: { tagName: "CODE" } };
  assert.equal(cgptResolveCodeBlockMutationRoot(textNode), textNode);

  const nonCodeElement = {
    nodeType: 1,
    parentElement: null,
    closest: () => null,
    matches: () => false,
    querySelector: () => null,
  };
  assert.equal(cgptResolveCodeBlockMutationRoot(nonCodeElement), null);
  resetGlobals();
});
