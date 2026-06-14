const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarApiDataSource.js")];
  return require("../../extension/content/sidebarApiDataSource.js");
}

function installWindowStub() {
  global.window = {
    location: {
      origin: "https://chatgpt.com",
      href: "https://chatgpt.com/c/current-chat",
    },
  };
}

function cleanupWindowStub() {
  delete global.window;
  delete global.fetch;
}

test("cgptNormalizeSidebarApiProject and cgptNormalizeSidebarApiConversation normalize API records", () => {
  installWindowStub();
  try {
    const {
      cgptNormalizeSidebarApiConversation,
      cgptNormalizeSidebarApiProject,
    } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      id: "proj-1",
      name: "Project Alpha",
    });
    assert.equal(project.id, "proj-1");
    assert.equal(project.name, "Project Alpha");

    const conversation = cgptNormalizeSidebarApiConversation(
      {
        id: "chat-1",
        title: "Roadmap",
        project_id: "proj-1",
        author: "Alice",
        posted_at: "2026-05-01T10:00:00.000Z",
      },
      new Map([["proj-1", project]])
    );
    assert.equal(conversation.conversationId, "chat-1");
    assert.equal(conversation.projectName, "Project Alpha");
    assert.equal(conversation.isProjectItem, true);
    assert.equal(conversation.absoluteUrl, "https://chatgpt.com/c/chat-1");
    assert.equal(conversation.author, "Alice");
    assert.equal(conversation.postedAt, "2026-05-01T10:00:00.000Z");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptNormalizeSidebarApiConversation allows optional metadata to be blank", () => {
  installWindowStub();
  try {
    const { cgptNormalizeSidebarApiConversation } = loadModule();
    const conversation = cgptNormalizeSidebarApiConversation({
      id: "chat-2",
      title: "No Metadata",
    });
    assert.equal(conversation.absoluteUrl, "https://chatgpt.com/c/chat-2");
    assert.equal(conversation.author, "");
    assert.equal(conversation.postedAt, "");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptExtractNormalizedProjectConversationsFromPayload reads nested project conversations", () => {
  installWindowStub();
  try {
    const {
      cgptExtractNormalizedProjectConversationsFromPayload,
      cgptNormalizeSidebarApiProject,
    } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      id: "proj-1",
      name: "Project Alpha",
    });
    const conversations = cgptExtractNormalizedProjectConversationsFromPayload(
      {
        items: [
          {
            id: "proj-1",
            name: "Project Alpha",
            conversations: [
              {
                id: "chat-1",
                title: "Nested Roadmap",
              },
            ],
          },
        ],
      },
      new Map([["proj-1", project]])
    );
    assert.equal(conversations.length, 1);
    assert.equal(conversations[0].conversationId, "chat-1");
    assert.equal(conversations[0].projectId, "proj-1");
    assert.equal(conversations[0].projectName, "Project Alpha");
    assert.equal(conversations[0].isProjectItem, true);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptNormalizeSidebarApiProject unwraps snorlax sidebar gizmo wrappers", () => {
  installWindowStub();
  try {
    const { cgptNormalizeSidebarApiProject } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      gizmo: {
        id: "gizmo-1",
        displayName: "Hidden Project",
      },
      conversations: [],
    });
    assert.equal(project.id, "gizmo-1");
    assert.equal(project.name, "Hidden Project");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptNormalizeSidebarApiProject unwraps current nested snorlax gizmo display names", () => {
  installWindowStub();
  try {
    const { cgptNormalizeSidebarApiProject } = loadModule();
    const project = cgptNormalizeSidebarApiProject({
      gizmo: {
        gizmo: {
          id: "g-p-project-1",
          short_url: "g-p-project-1-slug",
          display: {
            name: "Display Project",
          },
        },
      },
      conversations: [],
    });
    assert.equal(project.id, "g-p-project-1");
    assert.equal(project.name, "Display Project");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptIsConversationPayloadShape accepts empty API collections", () => {
  const { cgptIsConversationPayloadShape } = loadModule();
  assert.equal(cgptIsConversationPayloadShape({ items: [] }), true);
  assert.equal(cgptIsConversationPayloadShape({ conversations: [] }), true);
  assert.equal(cgptIsConversationPayloadShape({ data: [] }), true);
  assert.equal(cgptIsConversationPayloadShape({ detail: "Not Found" }), false);
});

test("cgptFetchSidebarApiSnapshot returns a normalized API snapshot", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "proj-1", name: "Project Alpha" }],
            has_more: false,
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "chat-1", title: "Roadmap", project_id: "proj-1" }],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.source, "internal_api");
    assert.equal(result.snapshot.projects.length, 1);
    assert.equal(result.snapshot.conversations.length, 1);
    assert.equal(result.snapshot.conversations[0].projectName, "Project Alpha");
    assert.ok(result.snapshot.requestTrace.total > 0);
    assert.equal(result.snapshot.requestTrace.byPhase.session, 1);
    assert.ok(result.snapshot.requestTrace.byPhase.projects_probe >= 1);
    assert.ok(result.snapshot.requestTrace.byPhase.conversations_probe >= 1);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot enriches slug-like project names from project detail endpoints", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: [
            {
              gizmo: {
                id: "gizmo-1",
                displayName: "g-p-69391d8aa50c8191a08b1059db926432-surface-pro",
              },
            },
          ],
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/gizmo-1",
        {
          ok: true,
          status: 200,
          body: {
            id: "gizmo-1",
            displayName: "Surface Pro",
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "chat-1", title: "Roadmap", project_id: "gizmo-1" }],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.projects[0].name, "Surface Pro");
    assert.equal(result.snapshot.conversations[0].projectName, "Surface Pro");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot merges nested project conversations even when general conversations omit them", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: [
            {
              gizmo: {
                id: "proj-1",
                displayName: "Project Alpha",
              },
              conversations: [
                {
                  id: "chat-project-1",
                  title: "Project-only Chat",
                },
              ],
            },
          ],
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
        {
          ok: true,
          status: 200,
          body: {
            items: [{ id: "chat-1", title: "Normal Chat" }],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.conversations.length, 2);
    const projectConversation = result.snapshot.conversations.find((item) => item.conversationId === "chat-project-1");
    assert.ok(projectConversation);
    assert.equal(projectConversation.projectId, "proj-1");
    assert.equal(projectConversation.projectName, "Project Alpha");
    assert.equal(projectConversation.isProjectItem, true);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot reads unopened project conversations from project detail payloads", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: [
            {
              gizmo: {
                id: "proj-1",
                displayName: "Project Alpha",
              },
            },
          ],
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/proj-1",
        {
          ok: true,
          status: 200,
          body: {
            id: "proj-1",
            displayName: "Project Alpha",
            conversations: [
              {
                id: "chat-project-detail-1",
                title: "Detail-only Project Chat",
              },
            ],
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
        {
          ok: true,
          status: 200,
          body: {
            items: [
              {
                id: "chat-normal-1",
                title: "General Chat",
              },
            ],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    const projectConversation = result.snapshot.conversations.find(
      (item) => item.conversationId === "chat-project-detail-1"
    );
    assert.ok(projectConversation);
    assert.equal(projectConversation.projectId, "proj-1");
    assert.equal(projectConversation.projectName, "Project Alpha");
    assert.equal(projectConversation.isProjectItem, true);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot records project API sweep diagnostics and prefers current snorlax sidebar probes", async () => {
  installWindowStub();
  try {
    const seenUrls = [];
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: [
            {
              gizmo: {
                id: "proj-1",
                displayName: "Project Alpha",
              },
            },
          ],
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/proj-1",
        {
          ok: true,
          status: 200,
          body: {
            id: "proj-1",
            displayName: "Project Alpha",
            conversations: [
              {
                id: "chat-project-detail-1",
                title: "Detail-only Project Chat",
              },
            ],
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/proj-1/conversations?cursor=0&limit=100&owned_only=true",
        {
          ok: true,
          status: 200,
          body: {
            items: [
              {
                id: "chat-project-endpoint-1",
                title: "Endpoint Project Chat",
              },
            ],
            has_more: false,
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
        {
          ok: true,
          status: 200,
          body: {
            items: [
              {
                id: "chat-normal-1",
                title: "General Chat",
              },
            ],
            has_more: false,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      seenUrls.push(String(url));
      const hit = responses.get(String(url));
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(
      seenUrls.includes("https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20"),
      true
    );
    assert.equal(
      seenUrls.includes("https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=5"),
      false
    );
    assert.ok(Array.isArray(result.snapshot.projectApiSweep));
    assert.equal(result.snapshot.projectApiSweep.length, 1);
    assert.equal(result.snapshot.projectApiSweep[0].projectId, "proj-1");
    assert.equal(result.snapshot.projectApiSweep[0].detailConversationCount, 1);
    assert.equal(result.snapshot.projectApiSweep[0].endpointConversationCount, 1);
    assert.equal(result.snapshot.projectApiSweep[0].detailResolved, true);
    assert.equal(result.snapshot.projectApiSweep[0].conversationTried[0].status, 200);
    assert.equal(result.snapshot.projectApiSweep[0].conversationTried[0].itemCount, 1);
    const successfulConversationProbe = result.snapshot.projectApiSweep[0].conversationTried.find(
      (entry) => entry.url === "https://chatgpt.com/backend-api/gizmos/proj-1/conversations?cursor=0&limit=100&owned_only=true"
    );
    assert.ok(successfulConversationProbe);
    assert.equal(successfulConversationProbe.itemCount, 1);
    assert.equal(
      seenUrls.includes("https://chatgpt.com/backend-api/gizmos/proj-1/conversations?cursor=0&limit=100&owned_only=true"),
      true
    );
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot keeps projects available when the general conversation API is rate limited", async () => {
  installWindowStub();
  try {
    const responses = new Map([
      [
        "https://chatgpt.com/api/auth/session",
        { ok: true, status: 200, body: { accessToken: "token-1" } },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
        {
          ok: true,
          status: 200,
          body: {
            items: [
              {
                gizmo: {
                  gizmo: {
                    id: "proj-1",
                    display: {
                      name: "Project Alpha",
                    },
                  },
                },
                conversations: [
                  {
                    id: "chat-project-1",
                    title: "Project Chat",
                  },
                ],
              },
            ],
            cursor: null,
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/proj-1",
        {
          ok: true,
          status: 200,
          body: {
            id: "proj-1",
            displayName: "Project Alpha",
          },
        },
      ],
      [
        "https://chatgpt.com/backend-api/gizmos/proj-1/conversations?cursor=0&limit=100&owned_only=true",
        {
          ok: true,
          status: 200,
          body: {
            items: [],
            cursor: null,
          },
        },
      ],
    ]);
    global.fetch = async (url) => {
      const hit = responses.get(String(url));
      if (!hit && String(url).includes("/backend-api/conversations")) {
        return {
          ok: false,
          status: 429,
          async json() {
            return { detail: "rate limited" };
          },
        };
      }
      if (!hit) {
        return {
          ok: false,
          status: 404,
          async json() {
            return { error: "not found" };
          },
        };
      }
      return {
        ok: hit.ok,
        status: hit.status,
        async json() {
          return hit.body;
        },
      };
    };
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, true);
    assert.equal(result.snapshot.projects.length, 1);
    assert.equal(result.snapshot.projects[0].name, "Project Alpha");
    assert.equal(result.snapshot.conversations.length, 1);
    assert.equal(result.snapshot.conversations[0].projectName, "Project Alpha");
    assert.equal(result.snapshot.diagnostics.phase, "conversations_fetch");
    assert.equal(result.snapshot.diagnostics.status, 429);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptFetchSidebarApiSnapshot hard-fails when endpoints do not match", async () => {
  installWindowStub();
  try {
    global.fetch = async () => ({
      ok: false,
      status: 404,
      async json() {
        return { error: "missing" };
      },
    });
    const { cgptFetchSidebarApiSnapshot } = loadModule();
    const result = await cgptFetchSidebarApiSnapshot();
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.message, "api_projects_fetch_failed");
  } finally {
    cleanupWindowStub();
  }
});

test("conversation API action functions use single-purpose API requests", async () => {
  installWindowStub();
  try {
    const requests = [];
    global.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url) === "https://chatgpt.com/api/auth/session") {
        return {
          ok: true,
          status: 200,
          async json() {
            return { accessToken: "token-1" };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return String(url).includes("/backend-api/share/create")
            ? { share_url: "/share/share-1" }
            : { ok: true };
        },
      };
    };

    const {
      archiveConversation,
      deleteConversation,
      renameConversation,
      addConversationToProject,
      createConversationShareLink,
    } = loadModule();

    await archiveConversation("chat-1");
    await deleteConversation("chat-2");
    await renameConversation("chat-3", "Next title");
    await addConversationToProject("chat-4", "project-1");
    const shareResult = await createConversationShareLink("chat-5", "node-1");
    assert.equal(shareResult.shareUrl, "https://chatgpt.com/share/share-1");

    const actionRequests = requests.filter((request) => !request.url.endsWith("/api/auth/session"));
    assert.equal(actionRequests.length, 5);
    assert.deepStrictEqual(
      actionRequests.map((request) => ({
        url: request.url,
        method: request.options.method,
        body: request.options.body ? JSON.parse(request.options.body) : null,
      })),
      [
        {
          url: "https://chatgpt.com/backend-api/conversation/chat-1",
          method: "PATCH",
          body: { is_archived: true },
        },
        {
          url: "https://chatgpt.com/backend-api/conversation/chat-2",
          method: "PATCH",
          body: { is_visible: false },
        },
        {
          url: "https://chatgpt.com/backend-api/conversation/chat-3",
          method: "PATCH",
          body: { title: "Next title" },
        },
        {
          url: "https://chatgpt.com/backend-api/conversation/chat-4",
          method: "PATCH",
          body: { project_id: "project-1", gizmo_id: "project-1" },
        },
        {
          url: "https://chatgpt.com/backend-api/share/create",
          method: "POST",
          body: { conversation_id: "chat-5", current_node_id: "node-1", is_anonymous: true },
        },
      ]
    );
    assert.equal(actionRequests[0].options.credentials, "include");
    assert.equal(actionRequests[0].options.headers.Authorization, "Bearer token-1");
  } finally {
    cleanupWindowStub();
  }
});
