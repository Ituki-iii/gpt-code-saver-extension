const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panel.js")];
  return require("../../extension/content/panel.js");
}

function resetGlobals() {
  delete global.document;
}

test("cgptRemoveStaleHelperUi removes stale helper launchers, panels, and modals", () => {
  const removedIds = [];
  const ids = [
    "cgpt-code-helper-panel",
    "cgpt-helper-panel-toggle",
    "cgpt-helper-template-toggle",
    "cgpt-helper-template-panel",
    "cgpt-helper-template-modal",
    "cgpt-helper-chatlog-toggle",
    "cgpt-helper-chatlog-modal",
    "cgpt-helper-sidebar-bulk-toggle",
    "cgpt-helper-sidebar-bulk-panel",
    "cgpt-helper-log-modal",
    "cgpt-helper-launcher-dock",
  ];
  const nodes = new Map(
    ids.map((id) => [
      id,
      {
        id,
        parentNode: {
          removeChild(node) {
            removedIds.push(node.id);
          },
        },
      },
    ])
  );

  global.document = {
    getElementById(id) {
      return nodes.get(id) || null;
    },
  };

  const { cgptRemoveStaleHelperUi } = loadModule();
  cgptRemoveStaleHelperUi();

  assert.deepStrictEqual(removedIds, ids);
  resetGlobals();
});
