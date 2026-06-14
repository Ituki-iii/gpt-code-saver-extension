const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatWindowAlignment.js")];
  return require("../../extension/content/chatWindowAlignment.js");
}

function createDocumentStub() {
  const classes = new Set();
  const elementsById = new Map();
  const documentStub = {
    head: {
      appended: [],
      appendChild(node) {
        this.appended.push(node);
        if (node.id) {
          elementsById.set(node.id, node);
        }
      },
    },
    body: {
      classList: {
        toggle(name, enabled) {
          if (enabled) {
            classes.add(name);
          } else {
            classes.delete(name);
          }
        },
        contains(name) {
          return classes.has(name);
        },
      },
    },
    createElement(tagName) {
      return { tagName, id: "", textContent: "" };
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
  };
  return documentStub;
}

test("cgptApplyChatWindowAlignment toggles the left align class", () => {
  const {
    CGPT_CHAT_LEFT_ALIGN_CLASS,
    CGPT_CHAT_LEFT_ALIGN_STYLE_ID,
    cgptApplyChatWindowAlignment,
  } = loadModule();
  const documentStub = createDocumentStub();

  assert.equal(
    cgptApplyChatWindowAlignment({ chatWindowLeftAligned: true }, documentStub),
    true
  );
  assert.equal(documentStub.body.classList.contains(CGPT_CHAT_LEFT_ALIGN_CLASS), true);
  assert.equal(documentStub.head.appended.length, 1);
  assert.equal(documentStub.head.appended[0].id, CGPT_CHAT_LEFT_ALIGN_STYLE_ID);

  assert.equal(
    cgptApplyChatWindowAlignment({ chatWindowLeftAligned: false }, documentStub),
    false
  );
  assert.equal(documentStub.body.classList.contains(CGPT_CHAT_LEFT_ALIGN_CLASS), false);
  assert.equal(documentStub.head.appended.length, 1);
});

test("cgptBuildChatWindowAlignmentCss avoids broad mx-auto overrides", () => {
  const { cgptBuildChatWindowAlignmentCss } = loadModule();
  const css = cgptBuildChatWindowAlignmentCss();

  assert.equal(css.includes(".mx-auto"), false);
  assert.match(css, /--thread-content-margin/);
  assert.match(css, /--thread-content-max-width/);
  assert.match(css, /align-items:\s*flex-start/);
});
