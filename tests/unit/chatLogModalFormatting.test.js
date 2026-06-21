const test = require("node:test");
const assert = require("node:assert/strict");
const { cgptValidateFilePath } = require("../../extension/shared/filePathValidation.js");

global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
};
global.cgptValidateFilePath = cgptValidateFilePath;
require("../../extension/content/pathMetadata.js");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogModalFormatting.js")];
  return require("../../extension/content/chatLogModalFormatting.js");
}

function createCodeElement(textContent, classNames = []) {
  const blockElement = {
    nodeType: Node.ELEMENT_NODE,
    classList: [],
    textContent: "",
    previousSibling: null,
    parentNode: null,
    parentElement: null,
    querySelector(selector) {
      return selector === "code, .cm-content" ? codeElement : null;
    },
  };
  const codeElement = {
    textContent,
    classList: classNames,
    closest(selector) {
      return selector === "pre" ? blockElement : null;
    },
  };
  return { codeElement, blockElement };
}

function createFormattingElement(nodesBySelector) {
  return {
    querySelectorAll(selector) {
      if (selector === "pre" && !nodesBySelector.pre) {
        const blockSet = new Set();
        ["pre code", "pre .cm-content"].forEach((key) => {
          (nodesBySelector[key] || []).forEach((node) => {
            if (node && typeof node.closest === "function") {
              const block = node.closest("pre");
              if (block) blockSet.add(block);
            }
          });
        });
        return Array.from(blockSet);
      }
      return nodesBySelector[selector] || [];
    },
  };
}

function attachPathHint(blockElement, pathText) {
  const boundaryRoot = {
    nodeType: Node.ELEMENT_NODE,
    textContent: "",
  };
  const pathNode = {
    nodeType: Node.ELEMENT_NODE,
    textContent: pathText,
    querySelector() {
      return null;
    },
    previousSibling: null,
    parentNode: boundaryRoot,
    parentElement: boundaryRoot,
  };
  blockElement.previousSibling = pathNode;
  blockElement.parentNode = boundaryRoot;
  blockElement.parentElement = boundaryRoot;
  return boundaryRoot;
}

test("extracts PATH-backed code blocks without altering the code content", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const { codeElement, blockElement } = createCodeElement("console.log('hello');", ["language-javascript"]);
  attachPathHint(blockElement, "PATH: src/app.js");
  const element = {
    querySelectorAll(selector) {
      return selector === "pre" ? [blockElement] : [];
    },
  };

  const blocks = cgptExtractFormattedCodeBlocksFromElement(element);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].filePath, "src/app.js");
  assert.equal(blocks[0].fileName, "app.js");
  assert.equal(blocks[0].content, "console.log('hello');");
  assert.equal(blocks[0].language, "javascript");
  assert.equal(blocks[0].hasDetectedFilePath, true);
});

test("extracts fenced code blocks without file metadata using generated labels", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const { codeElement } = createCodeElement("# Python\nprint('hello')\n", ["language-python"]);
  const element = {
    querySelectorAll(selector) {
      return selector === "pre" ? [codeElement.closest("pre")] : [];
    },
  };

  const blocks = cgptExtractFormattedCodeBlocksFromElement(element);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].filePath, "chat-code-blocks/python-block-1.py");
  assert.equal(blocks[0].fileName, "python-block-1.py");
  assert.equal(blocks[0].content, "# Python\nprint('hello')\n");
  assert.equal(blocks[0].language, "python");
  assert.equal(blocks[0].hasDetectedFilePath, false);
});

test("extracts CodeMirror code blocks when pre code is absent", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const { codeElement, blockElement } = createCodeElement(
    "console.log('cm');",
    ["language-javascript", "cm-content"]
  );
  attachPathHint(blockElement, "PATH: src/demo.js");
  const element = createFormattingElement({
    "pre code": [],
    "pre .cm-content": [codeElement],
  });

  const blocks = cgptExtractFormattedCodeBlocksFromElement(element);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].filePath, "src/demo.js");
  assert.equal(blocks[0].content, "console.log('cm');");
  assert.equal(blocks[0].language, "javascript");
});

test("deduplicates nested pre structures and extracts a single visible code block", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const outerPre = {
    nodeType: Node.ELEMENT_NODE,
    parentElement: null,
    querySelector: (selector) => (selector === "code, .cm-content" ? codeElement : null),
  };
  const innerPre = {
    nodeType: Node.ELEMENT_NODE,
    parentElement: {
      closest(selector) {
        return selector === "pre" ? outerPre : null;
      },
    },
    querySelector: () => null,
  };
  const codeElement = {
    textContent: "console.log('once');",
    classList: ["language-javascript", "cm-content"],
    closest(selector) {
      return selector === "pre" ? innerPre : null;
    },
  };
  attachPathHint(outerPre, "PATH: src/once.js");
  const element = {
    querySelectorAll(selector) {
      return selector === "pre" ? [outerPre, innerPre] : [];
    },
  };

  const blocks = cgptExtractFormattedCodeBlocksFromElement(element);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].filePath, "src/once.js");
  assert.equal(blocks[0].content, "console.log('once');");
  assert.equal(blocks[0].language, "javascript");
  assert.strictEqual(blocks[0].element, outerPre);
});

test("ignores non-adjacent PATH candidates and falls back to generated labels", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const { codeElement, blockElement } = createCodeElement("print('hello')\n", ["language-python"]);
  attachPathHint(blockElement, "PATH: src/app.py\nextra");
  const element = {
    querySelectorAll(selector) {
      return selector === "pre" ? [blockElement] : [];
    },
  };

  const blocks = cgptExtractFormattedCodeBlocksFromElement(element);
  assert.equal(blocks[0].filePath, "chat-code-blocks/python-block-1.py");
  assert.equal(blocks[0].hasDetectedFilePath, false);
});

test("cgptCreateSingleLinePreview summarizes multiline content to the first line", () => {
  const { cgptCreateSingleLinePreview } = loadModule();
  assert.equal(
    cgptCreateSingleLinePreview("line 1\nline 2\nline 3", 1),
    "line 1..."
  );
  assert.equal(
    cgptCreateSingleLinePreview("line 1\nline 2\nline 3\nline 4", 3),
    "line 1\nline 2\nline 3..."
  );
});
