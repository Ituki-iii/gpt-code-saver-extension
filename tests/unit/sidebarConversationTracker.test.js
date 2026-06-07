const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarConversationTracker.js")];
  return require("../../extension/content/sidebarConversationTracker.js");
}

function installWindowStub(href = "https://chatgpt.com/") {
  global.window = {
    location: {
      href,
    },
  };
}

function cleanupWindowStub() {
  delete global.window;
}

function createAnchor({ href, title, projectItem = false, active = false }) {
  const row = {
    dataset: {
      cgptProjectItem: projectItem ? "1" : "0",
      cgptConversationActive: active ? "1" : "0",
      cgptProjectName: projectItem ? "Project Alpha" : "",
    },
    querySelector: () => null,
    closest: (selector) => {
      if (selector.includes("[data-cgpt-project-name]") && projectItem) {
        return { dataset: { cgptProjectName: "Project Alpha" } };
      }
      return null;
    },
  };
  const anchor = {
    dataset: {
      cgptConversationTitle: title,
      cgptProjectItem: projectItem ? "1" : "0",
    },
    getAttribute: (name) => {
      if (name === "href") return href;
      if (name === "aria-current") return active ? "page" : "";
      return "";
    },
    textContent: title,
    closest: () => row,
  };
  return anchor;
}

test("cgptExtractConversationIdFromHref parses ChatGPT conversation URLs", () => {
  const { cgptExtractConversationIdFromHref } = loadModule();
  assert.equal(cgptExtractConversationIdFromHref("/c/alpha-123?model=gpt"), "alpha-123");
});

test("cgptGetCurrentProjectIdFromLocation parses the current project page URL", () => {
  installWindowStub("https://chatgpt.com/g/g-p-1234567890abcdef/project");
  try {
    const { cgptGetCurrentProjectIdFromLocation } = loadModule();
    assert.equal(cgptGetCurrentProjectIdFromLocation(), "g-p-1234567890abcdef");
  } finally {
    cleanupWindowStub();
  }
});

test("cgptGetSidebarConversationRouteKey returns pathname and search", () => {
  installWindowStub("https://chatgpt.com/g/g-p-1234567890abcdef/project?view=all");
  global.window.location.pathname = "/g/g-p-1234567890abcdef/project";
  global.window.location.search = "?view=all";
  try {
    const { cgptGetSidebarConversationRouteKey } = loadModule();
    assert.equal(
      cgptGetSidebarConversationRouteKey(),
      "/g/g-p-1234567890abcdef/project?view=all"
    );
  } finally {
    cleanupWindowStub();
  }
});

test("cgptCollectSidebarConversations marks project items based on row metadata", () => {
  const { cgptCollectSidebarConversations } = loadModule();
  const anchors = [
    createAnchor({ href: "/c/alpha", title: "Alpha planning" }),
    createAnchor({ href: "/c/proj-task", title: "Project task", projectItem: true }),
  ];
  const root = {
    querySelector: (selector) => (selector === "[data-cgpt-sidebar-root='1']" ? root : null),
    querySelectorAll: (selector) => (selector === "a[href*='/c/']" ? anchors : []),
  };

  const result = cgptCollectSidebarConversations(root);
  assert.equal(result.length, 2);
  assert.equal(result[0].conversationId, "alpha");
  assert.equal(result[1].isProjectItem, true);
  assert.equal(result[1].projectName, "Project Alpha");
});

test("cgptMergeSidebarApiSnapshotWithDom prefers visible sidebar titles over API titles", () => {
  installWindowStub("https://chatgpt.com/");
  const { cgptMergeSidebarApiSnapshotWithDom } = loadModule();
  const anchors = [
    createAnchor({ href: "/c/alpha", title: "Visible Alpha Title", active: true }),
    createAnchor({ href: "/c/beta", title: "Visible Beta Title" }),
  ];
  const root = {
    querySelector: (selector) => (selector === "[data-cgpt-sidebar-root='1']" ? root : null),
    querySelectorAll: (selector) => (selector === "a[href*='/c/']" ? anchors : []),
  };
  const snapshot = {
    sidebarFound: true,
    conversations: [
      { id: "alpha", conversationId: "alpha", title: "API Alpha Title", isActive: false, isProjectItem: false, projectName: "" },
      { id: "gamma", conversationId: "gamma", title: "API Gamma Title", isActive: false, isProjectItem: false, projectName: "" },
    ],
    projects: [{ id: "proj-1", name: "Project Alpha" }],
  };

  const merged = cgptMergeSidebarApiSnapshotWithDom(snapshot, root);
  assert.equal(merged.conversations[0].title, "Visible Alpha Title");
  assert.equal(merged.conversations[0].isActive, true);
  assert.equal(merged.conversations[0].domRef, undefined);
  assert.equal(merged.conversations[1].title, "API Gamma Title");
  cleanupWindowStub();
});

test("cgptMergeSidebarApiSnapshotWithDom appends current project page conversations missing from the API snapshot", () => {
  installWindowStub("https://chatgpt.com/g/g-p-proj-1/project");
  try {
    const { cgptMergeSidebarApiSnapshotWithDom } = loadModule();
    const projectAnchor = {
      dataset: {
        cgptConversationTitle: "SSD認識不良対処法",
      },
      getAttribute: (name) => {
        if (name === "href") return "/c/project-chat-1";
        if (name === "aria-current") return "";
        return "";
      },
      textContent: "SSD認識不良対処法",
      closest: (selector) => {
        if (selector.includes("cgpt-helper")) return null;
        if (selector.includes("aside") || selector.includes("nav")) return null;
        return {
          dataset: {},
          closest: () => null,
        };
      },
    };
    const root = {
      querySelector: (selector) => {
        if (selector === "[data-cgpt-sidebar-root='1']") return null;
        if (selector === "main h1" || selector === "h1") {
          return { textContent: "PC管理" };
        }
        return null;
      },
      querySelectorAll: (selector) => {
        if (selector === "aside, nav, [role='navigation']") return [];
        if (selector === "a[href*='/c/']") return [projectAnchor];
        return [];
      },
    };
    const snapshot = {
      sidebarFound: true,
      conversations: [],
      projects: [{ id: "g-p-proj-1", name: "PC管理" }],
    };

    const merged = cgptMergeSidebarApiSnapshotWithDom(snapshot, root);
    assert.equal(merged.conversations.length, 1);
    assert.equal(merged.conversations[0].conversationId, "project-chat-1");
    assert.equal(merged.conversations[0].projectId, "g-p-proj-1");
    assert.equal(merged.conversations[0].projectName, "PC管理");
    assert.equal(merged.conversations[0].isProjectItem, true);
    assert.equal(merged.conversations[0].domRef, undefined);
  } finally {
    cleanupWindowStub();
  }
});

test("cgptCollectProjectPageConversationsFromRoot collects non-sidebar project chats with explicit project context", () => {
  const { cgptCollectProjectPageConversationsFromRoot } = loadModule();
  const projectAnchor = {
    dataset: {
      cgptConversationTitle: "Hidden Project Chat",
    },
    getAttribute: (name) => {
      if (name === "href") return "/c/project-chat-2";
      if (name === "aria-current") return "";
      return "";
    },
    textContent: "Hidden Project Chat",
    closest: () => ({ dataset: {} }),
  };
  const root = {
    querySelector: (selector) => (selector === "[data-cgpt-sidebar-root='1']" ? null : null),
    querySelectorAll: (selector) => (selector === "a[href*='/c/']" ? [projectAnchor] : []),
  };

  const result = cgptCollectProjectPageConversationsFromRoot(root, {
    id: "proj-1",
    name: "Project Alpha",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].conversationId, "project-chat-2");
  assert.equal(result[0].projectId, "proj-1");
  assert.equal(result[0].projectName, "Project Alpha");
});

test("cgptBuildPlainSidebarSnapshot removes DOM references from conversations and projects", () => {
  const { cgptBuildPlainSidebarSnapshot } = loadModule();
  const domRef = { nodeType: 1 };
  const snapshot = cgptBuildPlainSidebarSnapshot({
    sidebarFound: true,
    conversations: [
      { id: "alpha", conversationId: "alpha", title: "Alpha", domRef, menuAnchorInfo: { conversationId: "alpha" } },
    ],
    projects: [
      { id: "proj-alpha", name: "Project Alpha", domRef },
    ],
  });
  assert.equal(snapshot.conversations[0].domRef, undefined);
  assert.equal(snapshot.conversations[0].menuAnchorInfo, undefined);
  assert.equal(snapshot.projects[0].domRef, undefined);
});

test("cgptHasProjectConversationCoverage matches project ids and slug-like raw ids", () => {
  const { cgptHasProjectConversationCoverage } = loadModule();
  const snapshot = {
    conversations: [
      {
        conversationId: "chat-1",
        projectId: "g-p-6918056b91988191834393b16852c030-jian-korehuan-jing",
      },
    ],
  };
  const covered = cgptHasProjectConversationCoverage(snapshot, {
    id: "g-p-6918056b91988191834393b16852c030",
    raw: {
      originalName: "g-p-6918056b91988191834393b16852c030-jian-korehuan-jing",
    },
  });
  assert.equal(covered, true);
});

test("cgptMergeSidebarApiProjectsWithDom prefers visible sidebar project names", () => {
  const { cgptMergeSidebarApiProjectsWithDom } = loadModule();
  const snapshot = {
    projects: [
      { id: "api-1", name: "g-p-693c77dbfe881918a99ba92717701f5-pcguan-li", isCurrent: false },
      { id: "api-2", name: "g-p-69391d8aa50c8191a08b1059db926432-surface-pro", isCurrent: false },
      { id: "api-3", name: "g-p-6918056b91988191834393b16852c030-jian-korehuan-jing", isCurrent: false },
      { id: "api-4", name: "iPhone", isCurrent: false },
    ],
  };
  const domProjects = [
    { id: "dom-1", name: "PC管理", isCurrent: false },
    { id: "dom-2", name: "surface pro", isCurrent: true },
    { id: "dom-3", name: "艦これ環境", isCurrent: false },
    { id: "dom-4", name: "iPhone", isCurrent: false },
  ];

  const merged = cgptMergeSidebarApiProjectsWithDom(snapshot, domProjects);
  assert.equal(merged.projects[0].name, "PC管理");
  assert.equal(merged.projects[1].name, "surface pro");
  assert.equal(merged.projects[2].name, "艦これ環境");
  assert.equal(merged.projects[3].name, "iPhone");
  assert.equal(merged.projects[1].isCurrent, true);
});

test("cgptMergeSidebarApiProjectsWithDom prefers exact project id matches from hidden menu entries", () => {
  const { cgptMergeSidebarApiProjectsWithDom } = loadModule();
  const snapshot = {
    projects: [
      { id: "g-p-69717146c5b88191867de1dedc35cc5e", name: "g-p-69717146c5b88191867de1dedc35cc5e-chu-zhang", isCurrent: false },
      { id: "g-p-69391c9321d881918607edfff58499ba", name: "g-p-69391c9321d881918607edfff58499ba-chromekuo-zhang-kai-fa", isCurrent: false },
    ],
  };
  const domProjects = [
    { id: "g-p-69717146c5b88191867de1dedc35cc5e", name: "出張", isCurrent: false, raw: { displayNameSource: "dom_more_menu" } },
    { id: "g-p-69391c9321d881918607edfff58499ba", name: "chrome拡張開発", isCurrent: false, raw: { displayNameSource: "dom_more_menu" } },
  ];

  const merged = cgptMergeSidebarApiProjectsWithDom(snapshot, domProjects);
  assert.equal(merged.projects[0].name, "出張");
  assert.equal(merged.projects[0].raw.displayNameSource, "dom_more_menu");
  assert.equal(merged.projects[1].name, "chrome拡張開発");
  assert.equal(merged.projects[1].raw.displayNameSource, "dom_more_menu");
});

test("cgptCollectSidebarProjects excludes the create-project entry", () => {
  const { cgptCollectSidebarProjects } = loadModule();
  const projectSection = {
    dataset: { cgptSectionLabel: "プロジェクト" },
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (selector !== "button, a") return [];
      return [
        {
          dataset: {},
          textContent: "プロジェクトを新規作成",
          getAttribute: () => "",
          closest: () => null,
        },
        {
          dataset: {},
          textContent: "PC管理",
          getAttribute: () => "",
          closest: () => null,
        },
      ];
    },
  };
  const root = {
    querySelector: (selector) => (selector === "[data-cgpt-sidebar-root='1']" ? root : null),
    querySelectorAll: (selector) => {
      if (selector === "[data-cgpt-project='1'], [data-cgpt-project-option='1']") return [];
      if (selector === "[data-cgpt-project-list='1'], [data-cgpt-section-label], section, nav, aside, div") {
        return [projectSection];
      }
      return [];
    },
  };

  const projects = cgptCollectSidebarProjects(root);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, "PC管理");
});

test("cgptCollectSidebarProjectsFromOpenProjectMenus reads hidden project names from the more menu", () => {
  const { cgptCollectSidebarProjectsFromOpenProjectMenus } = loadModule();
  const menuLinks = [
    {
      dataset: {},
      textContent: "出張",
      getAttribute: (name) => {
        if (name === "href") return "/g/g-p-69717146c5b88191867de1dedc35cc5e-chu-zhang/project";
        if (name === "aria-current") return "";
        return "";
      },
    },
    {
      dataset: {},
      textContent: "chrome拡張開発",
      getAttribute: (name) => {
        if (name === "href") return "/g/g-p-69391c9321d881918607edfff58499ba-chromekuo-zhang-kai-fa/project";
        if (name === "aria-current") return "";
        return "";
      },
    },
  ];
  const root = {
    querySelectorAll: (selector) => {
      if (selector === "a[href*='/g/'][href*='/project'], [role='menu'] a, [role='dialog'] a, [data-radix-popper-content-wrapper] a") {
        return menuLinks;
      }
      return [];
    },
  };

  const projects = cgptCollectSidebarProjectsFromOpenProjectMenus(root);
  assert.equal(projects.length, 2);
  assert.equal(projects[0].name, "出張");
  assert.equal(projects[1].name, "chrome拡張開発");
});
