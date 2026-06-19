const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogModalFormatting.js")];
  return require("../../extension/content/chatLogModalFormatting.js");
}

function createCodeElement(textContent, classNames = []) {
  const blockElement = {
    classList: [],
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
      return nodesBySelector[selector] || [];
    },
  };
}

test("extracts file-backed code blocks and strips the metadata line", () => {
  const { cgptExtractFormattedCodeBlocksFromElement } = loadModule();
  const { codeElement } = createCodeElement("// file: src/app.js\nconsole.log('hello');", ["language-javascript"]);
  const element = {
    querySelectorAll(selector) {
      return selector === "pre code" ? [codeElement] : [];
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
      return selector === "pre code" ? [codeElement] : [];
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
  const { codeElement } = createCodeElement(
    "// file: src/demo.js\nconsole.log('cm');",
    ["language-javascript", "cm-content"]
  );
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
