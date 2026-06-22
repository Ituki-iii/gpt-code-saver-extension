const test = require("node:test");
const assert = require("node:assert/strict");

global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
};

const {
  cgptParsePathMetadataLine,
  cgptResolvePathMetadataForBlock,
  cgptSetPathMetadataVisibility,
} = require("../../extension/content/pathMetadata.js");

function createElement(textContent = "") {
  return {
    nodeType: Node.ELEMENT_NODE,
    textContent,
    dataset: {},
    previousSibling: null,
    parentNode: null,
    parentElement: null,
    matches() {
      return false;
    },
  };
}

test("cgptParsePathMetadataLine parses a strict PATH line", () => {
  assert.deepStrictEqual(cgptParsePathMetadataLine("PATH: src/app.js"), {
    filePath: "src/app.js",
  });
});

test("cgptParsePathMetadataLine rejects multiline or non-PATH text", () => {
  assert.equal(cgptParsePathMetadataLine("PATH: src/app.js\nmore"), null);
  assert.equal(cgptParsePathMetadataLine("path: src/app.js"), null);
});

test("cgptResolvePathMetadataForBlock uses the nearest previous significant sibling", () => {
  global.cgptValidateFilePath = (value) => ({ ok: true, filePath: value.trim() });
  const boundaryRoot = createElement("");
  const pathNode = createElement("PATH: src/main.ts");
  const blockNode = createElement("");
  pathNode.parentNode = boundaryRoot;
  pathNode.parentElement = boundaryRoot;
  blockNode.parentNode = boundaryRoot;
  blockNode.parentElement = boundaryRoot;
  blockNode.previousSibling = pathNode;

  const resolved = cgptResolvePathMetadataForBlock(blockNode, { boundaryRoot });
  assert.deepStrictEqual(resolved, {
    filePath: "src/main.ts",
    node: pathNode,
    source: "path-line",
  });
  delete global.cgptValidateFilePath;
});

test("cgptResolvePathMetadataForBlock ignores invalid PATH values", () => {
  global.cgptValidateFilePath = () => ({ ok: false, error: "invalid" });
  const boundaryRoot = createElement("");
  const pathNode = createElement("PATH: ../secret.txt");
  const blockNode = createElement("");
  pathNode.parentNode = boundaryRoot;
  pathNode.parentElement = boundaryRoot;
  blockNode.parentNode = boundaryRoot;
  blockNode.parentElement = boundaryRoot;
  blockNode.previousSibling = pathNode;

  assert.equal(cgptResolvePathMetadataForBlock(blockNode, { boundaryRoot }), null);
  delete global.cgptValidateFilePath;
});

test("cgptResolvePathMetadataForBlock skips helper siblings inserted before the code block", () => {
  global.cgptValidateFilePath = (value) => ({ ok: true, filePath: value.trim() });
  const boundaryRoot = createElement("");
  const pathNode = createElement("PATH: src/main.ts");
  const helperNode = createElement("Save Save As");
  helperNode.matches = (selector) => selector.includes("[data-cgpt-code-header='1']");
  const blockNode = createElement("");

  pathNode.parentNode = boundaryRoot;
  pathNode.parentElement = boundaryRoot;
  helperNode.parentNode = boundaryRoot;
  helperNode.parentElement = boundaryRoot;
  helperNode.previousSibling = pathNode;
  blockNode.parentNode = boundaryRoot;
  blockNode.parentElement = boundaryRoot;
  blockNode.previousSibling = helperNode;

  const resolved = cgptResolvePathMetadataForBlock(blockNode, { boundaryRoot });
  assert.deepStrictEqual(resolved, {
    filePath: "src/main.ts",
    node: pathNode,
    source: "path-line",
  });
  delete global.cgptValidateFilePath;
});

test("cgptSetPathMetadataVisibility hides and restores a PATH element", () => {
  const pathNode = createElement("PATH: src/main.ts");
  pathNode.style = { display: "block" };
  pathNode.dataset = {};
  pathNode.setAttribute = (name, value) => {
    pathNode.attributes = pathNode.attributes || {};
    pathNode.attributes[name] = value;
  };
  pathNode.removeAttribute = (name) => {
    if (pathNode.attributes) {
      delete pathNode.attributes[name];
    }
  };

  assert.equal(cgptSetPathMetadataVisibility(pathNode, true), true);
  assert.equal(pathNode.style.display, "none");
  assert.equal(pathNode.dataset.cgptPathMetadataHidden, "1");
  assert.equal(pathNode.attributes["aria-hidden"], "true");

  assert.equal(cgptSetPathMetadataVisibility(pathNode, false), true);
  assert.equal(pathNode.style.display, "block");
  assert.equal(pathNode.dataset.cgptPathMetadataHidden, undefined);
  assert.equal(pathNode.attributes?.["aria-hidden"], undefined);
});
