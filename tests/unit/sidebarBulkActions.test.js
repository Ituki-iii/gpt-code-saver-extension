const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarBulkActions.js")];
  return require("../../extension/content/sidebarBulkActions.js");
}

function installDocumentStub(buttons = []) {
  global.document = {
    querySelector(selector) {
      if (selector === "[data-cgpt-open-project-create='1']") {
        return null;
      }
      if (selector === "[data-cgpt-project-create='1']") {
        return null;
      }
      return null;
    },
  };
  global.cgptFindSidebarRoot = () => ({
    querySelectorAll(selector) {
      if (selector === "button, a, [role='button']") {
        return buttons;
      }
      return [];
    },
  });
}

function cleanupDomStub() {
  delete global.document;
  delete global.cgptFindSidebarRoot;
}

test("cgptDidConversationReachProjectTarget matches by project id and fallback names", () => {
  const { cgptDidConversationReachProjectTarget } = loadModule();
  assert.equal(
    cgptDidConversationReachProjectTarget(
      { projectId: "proj-1", projectName: "Alpha" },
      { projectId: "proj-1", projectName: "Project Alpha" }
    ),
    true
  );
  assert.equal(
    cgptDidConversationReachProjectTarget(
      { projectId: "", projectName: "project alpha" },
      { projectId: "proj-1", projectName: "Project Alpha", projectOriginalName: "slug-alpha" }
    ),
    true
  );
  assert.equal(
    cgptDidConversationReachProjectTarget(
      { projectId: "proj-2", projectName: "Beta" },
      { projectId: "proj-1", projectName: "Project Alpha" }
    ),
    false
  );
});

test("cgptBuildSidebarConversationTitleUpdate composes prefix and suffix around the current title", () => {
  const { cgptBuildSidebarConversationTitleUpdate } = loadModule();
  const result = cgptBuildSidebarConversationTitleUpdate(
    { title: "Roadmap" },
    "[Done] ",
    " v2"
  );

  assert.deepStrictEqual(result, {
    currentTitle: "Roadmap",
    nextTitle: "[Done] Roadmap v2",
    changed: true,
  });
});

test("cgptBuildSidebarConversationTitleUpdate marks unchanged titles as skipped candidates", () => {
  const { cgptBuildSidebarConversationTitleUpdate } = loadModule();
  const result = cgptBuildSidebarConversationTitleUpdate(
    { title: "Roadmap" },
    "",
    ""
  );

  assert.deepStrictEqual(result, {
    currentTitle: "Roadmap",
    nextTitle: "Roadmap",
    changed: false,
  });
});

test("cgptOpenSidebarProjectCreationUi finds the sidebar create-project button outside labeled sections", async () => {
  installDocumentStub([
    {
      textContent: "プロジェクトを新規作成",
      getAttribute(name) {
        return name === "href" ? "" : null;
      },
      clickCalled: false,
      click() {
        this.clickCalled = true;
      },
    },
  ]);
  try {
    const { cgptOpenSidebarProjectCreationUi } = loadModule();
    const opened = await cgptOpenSidebarProjectCreationUi();
    assert.equal(opened, true);
  } finally {
    cleanupDomStub();
  }
});

test("cgptFindProjectTargetOption ignores wrapper divs and returns the interactive option", () => {
  const { cgptFindProjectTargetOption } = loadModule();
  const interactiveOption = {
    tagName: "BUTTON",
    disabled: false,
    dataset: {},
    getAttribute(name) {
      if (name === "role") return "button";
      return "";
    },
    textContent: "PC管理",
  };
  const wrapperDiv = {
    tagName: "DIV",
    disabled: false,
    dataset: {},
    getAttribute(name) {
      if (name === "role") return "";
      if (name === "tabindex") return "";
      return "";
    },
    textContent: "PC管理",
  };
  const root = {
    querySelectorAll() {
      return [wrapperDiv, interactiveOption];
    },
  };

  const result = cgptFindProjectTargetOption(
    { projectName: "PC管理", projectId: "g-p-1" },
    root
  );

  assert.equal(result, interactiveOption);
});

test("project move debug snapshots capture stage, target, and errors", () => {
  const {
    cgptCaptureProjectMoveDebugSnapshot,
    cgptClearSidebarProjectMoveDebugLog,
    cgptGetSidebarProjectMoveDebugLog,
  } = loadModule();
  global.document = {
    querySelectorAll() {
      return [];
    },
  };
  global.cgptGetSidebarConversationSnapshot = () => ({
    sidebarFound: true,
    conversations: [{ id: "chat-1", title: "Myanmar" }],
    projects: [{ id: "project-1", name: "Travel" }],
    source: "unit",
    debugBuild: "test",
    updatedAt: 123,
  });
  try {
    cgptClearSidebarProjectMoveDebugLog();
    const index = cgptCaptureProjectMoveDebugSnapshot("verify_failed", {
      conversation: {
        id: "chat-1",
        title: "Myanmar",
        projectId: "",
        projectName: "",
      },
      projectTarget: {
        projectId: "project-1",
        projectName: "Travel",
      },
      error: new Error("failed_project_move_not_verified"),
    });
    const log = cgptGetSidebarProjectMoveDebugLog();

    assert.equal(index, 0);
    assert.equal(log.length, 1);
    assert.equal(log[0].stage, "verify_failed");
    assert.equal(log[0].conversation.id, "chat-1");
    assert.equal(log[0].projectTarget.projectId, "project-1");
    assert.equal(log[0].error.message, "failed_project_move_not_verified");
    assert.equal(log[0].snapshotSummary.conversationCount, 1);
  } finally {
    cgptClearSidebarProjectMoveDebugLog();
    delete global.document;
    delete global.cgptGetSidebarConversationSnapshot;
  }
});

test("cgptRunSidebarBulkAction runs API actions by conversation id without GUI fallback", async () => {
  const calls = [];
  global.cgptGetSidebarConversationSnapshot = () => ({
    conversations: [
      { conversationId: "chat-1", title: "Roadmap", projectId: "" },
      { conversationId: "chat-2", title: "Already there", projectId: "project-1" },
    ],
  });
  global.archiveConversation = async (conversationId) => {
    calls.push({ action: "archive", conversationId });
    return { ok: true };
  };
  global.document = { querySelectorAll() { return []; } };
  try {
    const { cgptRunSidebarBulkAction } = loadModule();
    const result = await cgptRunSidebarBulkAction({
      action: "archive",
      conversationIds: ["chat-1", "missing"],
    });

    assert.deepStrictEqual(calls, [{ action: "archive", conversationId: "chat-1" }]);
    assert.equal(result.counts.success, 1);
    assert.equal(result.counts.skipped, 1);
    assert.equal(result.results[1].status, "skipped_missing_snapshot");
  } finally {
    delete global.cgptGetSidebarConversationSnapshot;
    delete global.archiveConversation;
    delete global.document;
  }
});

test("cgptRunSidebarBulkAction hard-fails when API executor is unavailable by default", async () => {
  global.cgptGetSidebarConversationSnapshot = () => ({
    conversations: [{ conversationId: "chat-1", title: "Roadmap", projectId: "" }],
  });
  global.document = { querySelectorAll() { return []; } };
  try {
    const { cgptRunSidebarBulkAction } = loadModule();
    const result = await cgptRunSidebarBulkAction({
      action: "delete",
      conversationIds: ["chat-1"],
    });

    assert.equal(result.counts.failed, 1);
    assert.equal(result.results[0].status, "failed_api_action_unavailable");
  } finally {
    delete global.cgptGetSidebarConversationSnapshot;
    delete global.document;
  }
});

test("cgptRunSidebarBulkTitleUpdate renames through the API action layer", async () => {
  const calls = [];
  global.cgptGetSidebarConversationSnapshot = () => ({
    conversations: [{ conversationId: "chat-1", title: "Roadmap" }],
  });
  global.renameConversation = async (conversationId, title) => {
    calls.push({ conversationId, title });
    return { ok: true };
  };
  global.document = { querySelectorAll() { return []; } };
  try {
    const { cgptRunSidebarBulkTitleUpdate } = loadModule();
    const result = await cgptRunSidebarBulkTitleUpdate({
      conversationIds: ["chat-1"],
      prefix: "[Done] ",
      suffix: "",
    });

    assert.deepStrictEqual(calls, [{ conversationId: "chat-1", title: "[Done] Roadmap" }]);
    assert.equal(result.counts.success, 1);
  } finally {
    delete global.cgptGetSidebarConversationSnapshot;
    delete global.renameConversation;
    delete global.document;
  }
});

test("cgptRenameSidebarConversation surfaces API failure without UI fallback", async () => {
  installDocumentStub();
  global.window = {
    location: {
      origin: "https://chatgpt.com",
    },
  };
  global.fetch = async () => ({
    ok: false,
    status: 500,
    headers: {
      get() {
        return "application/json";
      },
    },
    async json() {
      return { error: "api_action_failed" };
    },
  });
  global.renameConversation = async () => {
    throw new Error("api_action_failed");
  };
  try {
    const { cgptRenameSidebarConversation } = loadModule();
    await assert.rejects(
      () => cgptRenameSidebarConversation({ conversationId: "chat-1", title: "Roadmap" }, "Next title"),
      /api_action_failed/
    );
  } finally {
    delete global.fetch;
    delete global.renameConversation;
    delete global.window;
    cleanupDomStub();
  }
});
