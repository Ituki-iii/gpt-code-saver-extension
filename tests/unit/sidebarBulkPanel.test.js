const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarBulkPanel.js")];
  return require("../../extension/content/sidebarBulkPanel.js");
}

function resetGlobals() {
  delete global.document;
  delete global.cgptHasOpenSidebarDialog;
  delete global.cgptRefreshSidebarConversationSnapshot;
  delete global.cgptGetSidebarConversationSnapshot;
  delete global.cgptGetSidebarBulkState;
  delete global.cgptRenderSidebarBulkPanel;
}

test("cgptCheckSidebarProjectCreationDialogWatch waits until a seen dialog closes", () => {
  const {
    cgptCheckSidebarProjectCreationDialogWatch,
  } = loadModule();

  let refreshCount = 0;
  global.document = {
    getElementById: () => null,
  };
  global.cgptHasOpenSidebarDialog = () => true;
  global.cgptRefreshSidebarConversationSnapshot = () => {
    refreshCount += 1;
  };
  global.cgptGetSidebarConversationSnapshot = () => ({
    sidebarFound: true,
    conversations: [],
    projects: [{ id: "proj-1" }],
  });
  global.cgptGetSidebarBulkState = () => ({ runningAction: "" });
  global.cgptRenderSidebarBulkPanel = () => {};

  const panel = {
    __cgptSidebarProjectDialogWatchState: {
      sawDialog: false,
      expired: false,
    },
    querySelector: () => null,
  };

  assert.equal(cgptCheckSidebarProjectCreationDialogWatch(panel), false);
  assert.equal(panel.__cgptSidebarProjectDialogWatchState.sawDialog, true);
  assert.equal(refreshCount, 0);

  global.cgptHasOpenSidebarDialog = () => false;
  assert.equal(cgptCheckSidebarProjectCreationDialogWatch(panel), true);
  assert.equal(refreshCount, 1);
  resetGlobals();
});

test("cgptCheckSidebarProjectCreationDialogWatch finishes after timeout even when the dialog never appears", () => {
  const {
    cgptCheckSidebarProjectCreationDialogWatch,
  } = loadModule();

  let refreshCount = 0;
  global.document = {
    getElementById: () => null,
  };
  global.cgptHasOpenSidebarDialog = () => false;
  global.cgptRefreshSidebarConversationSnapshot = () => {
    refreshCount += 1;
  };
  global.cgptGetSidebarConversationSnapshot = () => ({
    sidebarFound: false,
    conversations: [],
    projects: [],
  });
  global.cgptGetSidebarBulkState = () => ({ runningAction: "" });
  global.cgptRenderSidebarBulkPanel = () => {};

  const panel = {
    __cgptSidebarProjectDialogWatchState: {
      sawDialog: false,
      expired: true,
    },
    querySelector: () => null,
  };

  assert.equal(cgptCheckSidebarProjectCreationDialogWatch(panel), true);
  assert.equal(refreshCount, 1);
  resetGlobals();
});
