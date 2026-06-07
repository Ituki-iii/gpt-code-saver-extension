const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarBulkState.js")];
  return require("../../extension/content/sidebarBulkState.js");
}

test("cgptFilterSidebarConversations includes project items and matches title/project/id case-insensitively", () => {
  const { cgptFilterSidebarConversations } = loadModule();
  const conversations = [
    { id: "a", title: "Alpha planning", isProjectItem: false },
    { id: "b", title: "Beta Migration", isProjectItem: false },
    { id: "c", conversationId: "chat-project-1", title: "Project task", isProjectItem: true, projectName: "Project Alpha" },
  ];

  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "beta").map((item) => item.id),
    ["b"]
  );
  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "alpha").map((item) => item.id),
    ["a", "c"]
  );
  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "chat-project-1").map((item) => item.id),
    ["c"]
  );
  assert.deepStrictEqual(
    cgptFilterSidebarConversations(conversations, "").map((item) => item.id),
    ["a", "b", "c"]
  );
});

test("cgptSummarizeSidebarSelection returns selected, total, and project counts", () => {
  const { cgptSummarizeSidebarSelection } = loadModule();
  const summary = cgptSummarizeSidebarSelection(
    [
      { id: "alpha", conversationId: "alpha", isProjectItem: false },
      { id: "beta", conversationId: "beta", isProjectItem: false },
      { id: "proj", conversationId: "proj", isProjectItem: true },
    ],
    new Set(["alpha", "beta", "proj"])
  );

  assert.deepStrictEqual(summary, {
    selectedCount: 3,
    projectCount: 1,
    totalCount: 3,
  });
});
