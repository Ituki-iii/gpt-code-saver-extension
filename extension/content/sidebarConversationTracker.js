let cgptSidebarConversationSnapshot = {
  sidebarFound: false,
  conversations: [],
  projects: [],
  updatedAt: 0,
  source: "internal_api",
  debugBuild: "",
  diagnostics: null,
  projectApiSweep: null,
  projectIframeSweep: null,
};

let cgptSidebarConversationObserver = null;
let cgptSidebarConversationRefreshTimer = null;
let cgptSidebarConversationRefreshPromise = null;
let cgptSidebarConversationRouteWatcher = null;
let cgptSidebarConversationRouteKey = "";
let cgptSidebarProjectIframeSweepPromise = null;

const CGPT_SIDEBAR_PROJECT_SECTION_LABELS = [
  "projects",
  "project",
  "プロジェクト",
];

const CGPT_SIDEBAR_PROJECT_CREATE_LABELS = [
  "new project",
  "create project",
  "create new project",
  "プロジェクトを新規作成",
  "新しいプロジェクト",
  "新規プロジェクト",
];

const CGPT_SIDEBAR_PROJECT_SWEEP_STEPS = 16;
const CGPT_SIDEBAR_PROJECT_SWEEP_DELAY_MS = 80;
const CGPT_SIDEBAR_PROJECT_IFRAME_TIMEOUT_MS = 2500;

function cgptIsSidebarBulkHelperNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.id && String(node.id).startsWith("cgpt-helper-")) {
    return true;
  }
  if (typeof node.closest === "function" && node.closest("[id^='cgpt-helper-'], .cgpt-helper-fold")) {
    return true;
  }
  return false;
}

function cgptNormalizeSidebarText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cgptNormalizeSidebarLowerText(value) {
  return cgptNormalizeSidebarText(value).toLowerCase();
}

function cgptGetSidebarSectionLabel(element) {
  if (!element || typeof element.closest !== "function") return "";
  const section = element.closest("[data-cgpt-section-label], section, nav, aside, div, ul");
  if (!section) return "";
  if (section.dataset && section.dataset.cgptSectionLabel) {
    return cgptNormalizeSidebarLowerText(section.dataset.cgptSectionLabel);
  }
  const heading = section.querySelector &&
    section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]");
  if (heading) {
    return cgptNormalizeSidebarLowerText(heading.textContent || "");
  }
  return "";
}

function cgptIsProjectSectionLabel(label) {
  return CGPT_SIDEBAR_PROJECT_SECTION_LABELS.some((candidate) => label.includes(candidate));
}

function cgptIsSidebarProjectCreateLabel(label) {
  return CGPT_SIDEBAR_PROJECT_CREATE_LABELS.some((candidate) =>
    cgptNormalizeSidebarLowerText(label).includes(cgptNormalizeSidebarLowerText(candidate))
  );
}

function cgptExtractConversationIdFromHref(href) {
  const raw = String(href || "");
  if (!raw) return "";
  const match = raw.match(/\/c\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function cgptExtractProjectIdFromHref(href) {
  const raw = String(href || "");
  if (!raw) return "";
  const match = raw.match(/\/g\/([^/?#]+)\/project/i);
  return match ? match[1] : "";
}

function cgptGetCurrentProjectIdFromLocation() {
  const href = String((window.location && window.location.href) || "");
  return cgptExtractProjectIdFromHref(href);
}

function cgptGetCurrentProjectName(root = document) {
  if (!root || typeof root.querySelector !== "function") return "";
  const heading =
    root.querySelector("[data-cgpt-project-title='1']") ||
    root.querySelector("[data-testid='project-title']") ||
    root.querySelector("main h1") ||
    root.querySelector("h1");
  return cgptNormalizeSidebarText((heading && heading.textContent) || "");
}

function cgptGetSidebarProjectRouteSlug(project = {}) {
  const raw = project && project.raw ? project.raw : {};
  const candidates = [
    raw.originalName,
    raw.matchedDomProjectId,
    raw.detailName,
    project.slug,
    project.id,
  ];
  return candidates
    .map((value) => cgptNormalizeSidebarText(value))
    .find((value) => /^g-p-[0-9a-f-]+(?:-.+)?$/i.test(value)) || "";
}

function cgptGetSidebarConversationRouteKey() {
  if (!window || !window.location) return "";
  return `${window.location.pathname || ""}${window.location.search || ""}`;
}

function cgptFindSidebarRoot(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return null;
  const explicit = root.querySelector("[data-cgpt-sidebar-root='1']");
  if (explicit) return explicit;
  const candidates = Array.from(root.querySelectorAll("aside, nav, [role='navigation']"));
  for (const candidate of candidates) {
    if (candidate.querySelector("a[href*='/c/']")) {
      return candidate;
    }
  }
  return null;
}

function cgptResolveConversationTitle(anchor) {
  if (!anchor) return "";
  const explicit = anchor.dataset && anchor.dataset.cgptConversationTitle;
  if (explicit) return cgptNormalizeSidebarText(explicit);
  const text = cgptNormalizeSidebarText(anchor.textContent || "");
  return text;
}

function cgptResolveProjectName(element) {
  if (!element) return "";
  const explicit = element.dataset && element.dataset.cgptProjectName;
  if (explicit) return cgptNormalizeSidebarText(explicit);
  const section = element.closest && element.closest("[data-cgpt-project-name]");
  if (section && section.dataset && section.dataset.cgptProjectName) {
    return cgptNormalizeSidebarText(section.dataset.cgptProjectName);
  }
  return "";
}

function cgptDelay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function cgptExtractSidebarProjectDisplayHint(value) {
  const raw = cgptNormalizeSidebarText(value);
  if (!raw) return "";
  const slugMatch = raw.match(/^g-p-[0-9a-f-]+-(.+)$/i);
  const candidate = slugMatch ? slugMatch[1] : raw;
  return cgptNormalizeSidebarText(candidate.replace(/-/g, " "));
}

function cgptNormalizeSidebarProjectMatchKey(value) {
  return cgptExtractSidebarProjectDisplayHint(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function cgptCollectSidebarConversations(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return [];
  const anchors = Array.from(sidebarRoot.querySelectorAll("a[href*='/c/']"));
  const seen = new Set();
  return anchors.map((anchor, index) => {
    const href = anchor.getAttribute("href") || "";
    const conversationId = cgptExtractConversationIdFromHref(href);
    const fallbackId = `sidebar-conversation-${index + 1}`;
    const id = conversationId || anchor.dataset.cgptConversationId || fallbackId;
    if (seen.has(id)) {
      return null;
    }
    seen.add(id);
    const row =
      anchor.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], div") || anchor;
    const sectionLabel = cgptGetSidebarSectionLabel(row);
    const isProjectItem =
      anchor.dataset.cgptProjectItem === "1" ||
      (row.dataset && row.dataset.cgptProjectItem === "1") ||
      cgptIsProjectSectionLabel(sectionLabel);
    return {
      id,
      title: cgptResolveConversationTitle(anchor),
      href,
      conversationId,
      isActive:
        anchor.getAttribute("aria-current") === "page" ||
        anchor.dataset.cgptConversationActive === "1" ||
        (row.dataset && row.dataset.cgptConversationActive === "1"),
      isProjectItem,
      projectName: isProjectItem ? cgptResolveProjectName(row) : "",
      domRef: row,
      menuAnchorInfo: {
        conversationId: conversationId || id,
      },
    };
  }).filter(Boolean);
}

function cgptCollectCurrentProjectPageConversations(root = document) {
  const projectId = cgptGetCurrentProjectIdFromLocation();
  const projectName = cgptGetCurrentProjectName(root);
  if (!projectId || !root || typeof root.querySelectorAll !== "function") {
    return [];
  }
  const sidebarRoot = cgptFindSidebarRoot(root);
  const anchors = Array.from(root.querySelectorAll("a[href*='/c/']"));
  const seen = new Set();
  return anchors.map((anchor, index) => {
    if (!anchor || typeof anchor.getAttribute !== "function") {
      return null;
    }
    if (
      cgptIsSidebarBulkHelperNode(anchor) ||
      (typeof anchor.closest === "function" &&
        anchor.closest("[id^='cgpt-helper-'], .cgpt-helper-fold"))
    ) {
      return null;
    }
    if (
      sidebarRoot &&
      typeof sidebarRoot.contains === "function" &&
      sidebarRoot.contains(anchor)
    ) {
      return null;
    }
    if (
      typeof anchor.closest === "function" &&
      anchor.closest("aside, nav, [role='navigation']")
    ) {
      return null;
    }
    const href = anchor.getAttribute("href") || "";
    const conversationId = cgptExtractConversationIdFromHref(href);
    if (!conversationId || seen.has(conversationId)) {
      return null;
    }
    seen.add(conversationId);
    const row =
      anchor.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], article, section, div") || anchor;
    return {
      id: conversationId || `project-page-conversation-${index + 1}`,
      title: cgptResolveConversationTitle(anchor),
      href,
      conversationId,
      isActive:
        anchor.getAttribute("aria-current") === "page" ||
        anchor.dataset.cgptConversationActive === "1" ||
        (row.dataset && row.dataset.cgptConversationActive === "1"),
      isProjectItem: true,
      projectId,
      projectName,
      domRef: row,
      menuAnchorInfo: {
        conversationId,
      },
      raw: {
        source: "project_page",
      },
    };
  }).filter((conversation) => conversation && conversation.title);
}

function cgptCollectProjectPageConversationsFromRoot(root = document, project = {}, options = {}) {
  const { includeSidebarAnchors = false } = options;
  if (!root || typeof root.querySelectorAll !== "function") {
    return [];
  }
  const projectId = String(project.id || project.projectId || "").trim();
  const projectName = String(project.name || project.projectName || "").trim();
  if (!projectId && !projectName) {
    return [];
  }
  const sidebarRoot = cgptFindSidebarRoot(root);
  const anchors = Array.from(root.querySelectorAll("a[href*='/c/']"));
  const seen = new Set();
  return anchors.map((anchor, index) => {
    if (!anchor || typeof anchor.getAttribute !== "function") {
      return null;
    }
    if (
      sidebarRoot &&
      includeSidebarAnchors !== true &&
      typeof sidebarRoot.contains === "function" &&
      sidebarRoot.contains(anchor)
    ) {
      return null;
    }
    const href = anchor.getAttribute("href") || "";
    const conversationId = cgptExtractConversationIdFromHref(href);
    if (!conversationId || seen.has(conversationId)) {
      return null;
    }
    seen.add(conversationId);
    const row =
      anchor.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], article, section, div") || anchor;
    return {
      id: conversationId || `project-iframe-conversation-${index + 1}`,
      title: cgptResolveConversationTitle(anchor),
      href,
      conversationId,
      isActive: false,
      isProjectItem: true,
      projectId,
      projectName,
      domRef: row,
      raw: {
        source: "project_iframe",
      },
    };
  }).filter((conversation) => conversation && conversation.title);
}

function cgptBuildPlainSidebarConversation(conversation = {}) {
  if (!conversation || typeof conversation !== "object") {
    return null;
  }
  const conversationId = String(conversation.conversationId || conversation.id || "").trim();
  if (!conversationId) {
    return null;
  }
  const raw = conversation.raw && typeof conversation.raw === "object"
    ? JSON.parse(JSON.stringify(conversation.raw))
    : undefined;
  return {
    id: String(conversation.id || conversationId),
    title: String(conversation.title || ""),
    href: String(conversation.href || `/c/${conversationId}`),
    absoluteUrl: String(conversation.absoluteUrl || ""),
    conversationId,
    isActive: conversation.isActive === true,
    isProjectItem: conversation.isProjectItem === true,
    projectName: String(conversation.projectName || ""),
    projectId: String(conversation.projectId || ""),
    author: String(conversation.author || ""),
    postedAt: String(conversation.postedAt || ""),
    membershipState: String(conversation.membershipState || ""),
    source: String(conversation.source || ""),
    raw,
  };
}

function cgptBuildPlainSidebarProject(project = {}) {
  if (!project || typeof project !== "object") {
    return null;
  }
  const id = String(project.id || project.projectId || project.name || "").trim();
  if (!id) {
    return null;
  }
  const raw = project.raw && typeof project.raw === "object"
    ? JSON.parse(JSON.stringify(project.raw))
    : undefined;
  return {
    id,
    name: String(project.name || project.projectName || id),
    slug: String(project.slug || ""),
    isCurrent: project.isCurrent === true,
    supportsCreateNew: project.supportsCreateNew === true,
    raw,
  };
}

function cgptBuildPlainSidebarSnapshot(snapshot = {}) {
  return {
    ...snapshot,
    conversations: Array.isArray(snapshot.conversations)
      ? snapshot.conversations.map(cgptBuildPlainSidebarConversation).filter(Boolean)
      : [],
    projects: Array.isArray(snapshot.projects)
      ? snapshot.projects.map(cgptBuildPlainSidebarProject).filter(Boolean)
      : [],
  };
}

function cgptResolveSidebarConversationDomRef(conversationId, root = document) {
  const key = String(conversationId || "").trim();
  if (!key || !root || typeof root.querySelectorAll !== "function") {
    return null;
  }
  const sidebarRoot = cgptFindSidebarRoot(root) || root;
  const anchors = Array.from(sidebarRoot.querySelectorAll("a[href*='/c/']"));
  for (const anchor of anchors) {
    const href = anchor.getAttribute ? anchor.getAttribute("href") || "" : "";
    const anchorId =
      (anchor.dataset && anchor.dataset.cgptConversationId) ||
      cgptExtractConversationIdFromHref(href);
    const row =
      typeof anchor.closest === "function"
        ? anchor.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], article, section, div") || anchor
        : anchor;
    const rowId = row && row.dataset ? row.dataset.cgptConversationId || "" : "";
    if (String(anchorId || rowId || "") === key) {
      return row;
    }
  }
  return null;
}

function cgptGetProjectConversationCoverageKeys(project = {}) {
  const raw = project && project.raw ? project.raw : {};
  return [
    project && project.id,
    raw.originalName,
    raw.matchedDomProjectId,
    raw.detailName,
  ]
    .map((value) => cgptNormalizeSidebarText(value))
    .filter(Boolean);
}

function cgptHasProjectConversationCoverage(snapshot = {}, project = {}) {
  const coverageKeys = new Set(cgptGetProjectConversationCoverageKeys(project));
  if (!coverageKeys.size) {
    return false;
  }
  return (Array.isArray(snapshot.conversations) ? snapshot.conversations : []).some((conversation) => {
    const conversationKeys = [
      conversation && conversation.projectId,
      conversation && conversation.raw && conversation.raw.projectId,
    ]
      .map((value) => cgptNormalizeSidebarText(value))
      .filter(Boolean);
    return conversationKeys.some((key) => coverageKeys.has(key));
  });
}

function cgptCaptureProjectIframeDebugInfo(iframeDocument, project = {}, options = {}) {
  const { conversations = [], polls = 0 } = options;
  if (!iframeDocument || typeof iframeDocument.querySelectorAll !== "function") {
    return {
      projectId: String(project && project.id || ""),
      projectName: String(project && project.name || ""),
      projectSlug: cgptGetSidebarProjectRouteSlug(project),
      status: "no_document",
      conversationCount: 0,
      polls,
      href: "",
      title: "",
      readyState: "",
      allAnchorCount: 0,
      conversationAnchorCount: 0,
      sidebarConversationAnchorCount: 0,
      mainConversationAnchorCount: 0,
      heading: "",
      bodyTextSample: "",
    };
  }
  const allAnchors = Array.from(iframeDocument.querySelectorAll("a[href]"));
  const conversationAnchors = allAnchors.filter((anchor) => {
    const href = anchor.getAttribute ? anchor.getAttribute("href") || "" : "";
    return href.includes("/c/");
  });
  const sidebarRoot = cgptFindSidebarRoot(iframeDocument);
  const sidebarConversationAnchors = conversationAnchors.filter((anchor) => {
    return Boolean(
      sidebarRoot &&
      typeof sidebarRoot.contains === "function" &&
      sidebarRoot.contains(anchor)
    );
  });
  const heading =
    (iframeDocument.querySelector &&
      (iframeDocument.querySelector("main h1") || iframeDocument.querySelector("h1"))) ||
    null;
  const bodyText = cgptNormalizeSidebarText(
    (iframeDocument.body && iframeDocument.body.textContent) || ""
  );
  return {
    projectId: String(project && project.id || ""),
    projectName: String(project && project.name || ""),
    projectSlug: cgptGetSidebarProjectRouteSlug(project),
    status: Array.isArray(conversations) && conversations.length ? "success" : "empty",
    conversationCount: Array.isArray(conversations) ? conversations.length : 0,
    polls,
    href:
      String(
        (iframeDocument.location && iframeDocument.location.href) ||
        (iframeDocument.defaultView && iframeDocument.defaultView.location && iframeDocument.defaultView.location.href) ||
        ""
      ),
    title: String(iframeDocument.title || ""),
    readyState: String(iframeDocument.readyState || ""),
    allAnchorCount: allAnchors.length,
    conversationAnchorCount: conversationAnchors.length,
    sidebarConversationAnchorCount: sidebarConversationAnchors.length,
    mainConversationAnchorCount: Math.max(0, conversationAnchors.length - sidebarConversationAnchors.length),
    heading: String((heading && heading.textContent) || "").trim(),
    bodyTextSample: bodyText.slice(0, 240),
  };
}

async function cgptLoadProjectConversationsByIframe(project = {}, root = document) {
  const projectSlug = cgptGetSidebarProjectRouteSlug(project);
  if (!projectSlug || !document.body || typeof document.createElement !== "function") {
    return {
      conversations: [],
      debug: {
        projectId: String(project && project.id || ""),
        projectName: String(project && project.name || ""),
        projectSlug,
        status: "skipped_missing_slug_or_body",
        conversationCount: 0,
        polls: 0,
      },
    };
  }
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.src = `/g/${projectSlug}/project`;
  document.body.appendChild(iframe);
  try {
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("failed_project_iframe_timeout"));
      }, CGPT_SIDEBAR_PROJECT_IFRAME_TIMEOUT_MS);
      iframe.addEventListener("load", () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
    const iframeDocument = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document) || null;
    if (!iframeDocument) {
      return {
        conversations: [],
        debug: {
          projectId: String(project && project.id || ""),
          projectName: String(project && project.name || ""),
          projectSlug,
          status: "no_document",
          conversationCount: 0,
          polls: 0,
        },
      };
    }
    const startedAt = Date.now();
    let polls = 0;
    while (Date.now() - startedAt < CGPT_SIDEBAR_PROJECT_IFRAME_TIMEOUT_MS) {
      polls += 1;
      const conversations = cgptCollectProjectPageConversationsFromRoot(
        iframeDocument,
        project,
        { includeSidebarAnchors: true }
      );
      if (conversations.length) {
        return {
          conversations,
          debug: cgptCaptureProjectIframeDebugInfo(iframeDocument, project, {
            conversations,
            polls,
          }),
        };
      }
      await cgptDelay(250);
    }
    const conversations = cgptCollectProjectPageConversationsFromRoot(
      iframeDocument,
      project,
      { includeSidebarAnchors: true }
    );
    return {
      conversations,
      debug: cgptCaptureProjectIframeDebugInfo(iframeDocument, project, {
        conversations,
        polls,
      }),
    };
  } catch (error) {
    return {
      conversations: [],
      debug: {
        projectId: String(project && project.id || ""),
        projectName: String(project && project.name || ""),
        projectSlug,
        status: error && error.message ? error.message : "iframe_unknown_error",
        conversationCount: 0,
        polls: 0,
      },
    };
  } finally {
    iframe.remove();
  }
}

function cgptStartSidebarProjectIframeSweep(snapshot, root = document) {
  if (cgptSidebarProjectIframeSweepPromise) {
    return cgptSidebarProjectIframeSweepPromise;
  }
  const missingProjects = (Array.isArray(snapshot && snapshot.projects) ? snapshot.projects : [])
    .filter((project) => !cgptHasProjectConversationCoverage(snapshot, project))
    .slice(0, 12);
  if (!missingProjects.length) {
    cgptSidebarConversationSnapshot = {
      ...cgptSidebarConversationSnapshot,
      projectIframeSweep: {
        status: "skipped_no_missing_projects",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        targetCount: 0,
        results: [],
      },
    };
    return Promise.resolve([]);
  }
  cgptSidebarConversationSnapshot = {
    ...cgptSidebarConversationSnapshot,
    projectIframeSweep: {
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: "",
      targetCount: missingProjects.length,
      results: missingProjects.map((project) => ({
        projectId: String(project && project.id || ""),
        projectName: String(project && project.name || ""),
        projectSlug: cgptGetSidebarProjectRouteSlug(project),
        status: "pending",
        conversationCount: 0,
      })),
    },
  };
  cgptSidebarProjectIframeSweepPromise = Promise.all(
    missingProjects.map((project) => cgptLoadProjectConversationsByIframe(project, root))
  )
    .then((iframeSweepEntries) => {
      const sweepResults = missingProjects.map((project, index) => {
        const entry = iframeSweepEntries[index] || {};
        const debug = entry.debug || {};
        return {
          projectId: String(debug.projectId || project && project.id || ""),
          projectName: String(debug.projectName || project && project.name || ""),
          projectSlug: String(debug.projectSlug || cgptGetSidebarProjectRouteSlug(project)),
          status: String(debug.status || "empty"),
          conversationCount: Number(debug.conversationCount || 0),
          polls: Number(debug.polls || 0),
          href: String(debug.href || ""),
          title: String(debug.title || ""),
          readyState: String(debug.readyState || ""),
          allAnchorCount: Number(debug.allAnchorCount || 0),
          conversationAnchorCount: Number(debug.conversationAnchorCount || 0),
          sidebarConversationAnchorCount: Number(debug.sidebarConversationAnchorCount || 0),
          mainConversationAnchorCount: Number(debug.mainConversationAnchorCount || 0),
          heading: String(debug.heading || ""),
          bodyTextSample: String(debug.bodyTextSample || ""),
        };
      });
      const mergedConversations = cgptMergeSidebarConversationCollections(
        cgptSidebarConversationSnapshot.conversations,
        ...iframeSweepEntries.map((entry) => entry && Array.isArray(entry.conversations) ? entry.conversations : [])
      );
      cgptSidebarConversationSnapshot = cgptBuildPlainSidebarSnapshot({
        ...cgptSidebarConversationSnapshot,
        conversations: mergedConversations,
        updatedAt: Date.now(),
        projectIframeSweep: {
          status: "completed",
          startedAt:
            cgptSidebarConversationSnapshot.projectIframeSweep &&
            cgptSidebarConversationSnapshot.projectIframeSweep.startedAt
              ? cgptSidebarConversationSnapshot.projectIframeSweep.startedAt
              : new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          targetCount: missingProjects.length,
          results: sweepResults,
        },
      });
      if (typeof cgptRenderSidebarBulkPanel === "function") {
        cgptRenderSidebarBulkPanel();
      }
      return iframeSweepEntries;
    })
    .catch(() => {
        cgptSidebarConversationSnapshot = {
          ...cgptSidebarConversationSnapshot,
          projectIframeSweep: {
            status: "failed",
            startedAt:
              cgptSidebarConversationSnapshot.projectIframeSweep &&
              cgptSidebarConversationSnapshot.projectIframeSweep.startedAt
                ? cgptSidebarConversationSnapshot.projectIframeSweep.startedAt
                : new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            targetCount: missingProjects.length,
            results: missingProjects.map((project) => ({
              projectId: String(project && project.id || ""),
              projectName: String(project && project.name || ""),
              projectSlug: cgptGetSidebarProjectRouteSlug(project),
              status: "failed",
              conversationCount: 0,
            })),
          },
        };
        if (typeof cgptRenderSidebarBulkPanel === "function") {
          cgptRenderSidebarBulkPanel();
        }
      return [];
    })
    .finally(() => {
      cgptSidebarProjectIframeSweepPromise = null;
    });
  return cgptSidebarProjectIframeSweepPromise;
}

function cgptCollectSidebarProjects(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return [];
  const explicitProjects = Array.from(
    sidebarRoot.querySelectorAll("[data-cgpt-project='1'], [data-cgpt-project-option='1']")
  );
  let projectCandidates = explicitProjects;
  if (!projectCandidates.length) {
    const projectSections = Array.from(
      sidebarRoot.querySelectorAll("[data-cgpt-project-list='1'], [data-cgpt-section-label], section, nav, aside, div")
    ).filter((section) => {
      const label = cgptNormalizeSidebarLowerText(
        (section.dataset && section.dataset.cgptSectionLabel) ||
        ((section.querySelector &&
          section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]")) || {})
          .textContent || ""
      );
      return cgptIsProjectSectionLabel(label);
    });
    projectCandidates = projectSections.flatMap((section) =>
      Array.from(section.querySelectorAll("button, a")).filter((element) => {
        const href = element.getAttribute ? element.getAttribute("href") || "" : "";
        if (href.includes("/c/")) return false;
        if (element.closest("[data-cgpt-conversation-row='1'], li[role='listitem']")) return false;
        const rowLabel = cgptNormalizeSidebarLowerText(
          (element.dataset && element.dataset.cgptProjectName) || element.textContent || ""
        );
        return Boolean(
          rowLabel &&
          rowLabel !== "projects" &&
          rowLabel !== "project" &&
          rowLabel !== "プロジェクト" &&
          !cgptIsSidebarProjectCreateLabel(rowLabel)
        );
      })
    );
  }
  const seen = new Set();
  return projectCandidates.map((element, index) => {
    const name =
      cgptNormalizeSidebarText(
        (element.dataset && element.dataset.cgptProjectName) ||
          (element.textContent || "").replace(/^project:\s*/i, "")
      ) || `Project ${index + 1}`;
    if (cgptIsSidebarProjectCreateLabel(name)) return null;
    const href = element.getAttribute ? element.getAttribute("href") || "" : "";
    const id = String(
      (element.dataset && element.dataset.cgptProjectId) ||
      cgptExtractProjectIdFromHref(href) ||
      name
    );
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      name,
      isCurrent:
        element.dataset.cgptProjectCurrent === "1" || element.getAttribute("aria-current") === "page",
      domRef: element,
      supportsCreateNew: true,
      raw: {
        displayNameSource: "dom_visible",
      },
    };
  }).filter(Boolean);
}

function cgptGetSidebarProjectSections(sidebarRoot) {
  if (!sidebarRoot || typeof sidebarRoot.querySelectorAll !== "function") {
    return [];
  }
  return Array.from(
    sidebarRoot.querySelectorAll("[data-cgpt-project-list='1'], [data-cgpt-section-label], section, nav, aside, div")
  ).filter((section) => {
    const label = cgptNormalizeSidebarLowerText(
      (section.dataset && section.dataset.cgptSectionLabel) ||
      ((section.querySelector &&
        section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading'], [data-cgpt-section-heading]")) || {})
        .textContent || ""
    );
    return cgptIsProjectSectionLabel(label);
  });
}

function cgptMergeSidebarProjectCollections(existingProjects = [], nextProjects = []) {
  const seen = new Set();
  return []
    .concat(Array.isArray(existingProjects) ? existingProjects : [])
    .concat(Array.isArray(nextProjects) ? nextProjects : [])
    .filter((project) => {
      const key = String((project && (project.id || project.name)) || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cgptFindSidebarProjectScrollContainer(root = document) {
  const sidebarRoot = cgptFindSidebarRoot(root);
  if (!sidebarRoot) return null;
  let best = null;
  let bestDepth = -1;
  const candidates = [sidebarRoot].concat(Array.from(sidebarRoot.querySelectorAll("div, nav, aside, section, ul")));
  candidates.forEach((element) => {
    if (!element || typeof element.scrollTop !== "number") return;
    const scrollHeight = Number(element.scrollHeight || 0);
    const clientHeight = Number(element.clientHeight || 0);
    if (!(scrollHeight > clientHeight + 8 && clientHeight > 0)) return;
    let depth = 0;
    let cursor = element;
    while (cursor && cursor !== sidebarRoot) {
      depth += 1;
      cursor = cursor.parentElement || null;
    }
    if (depth > bestDepth) {
      best = element;
      bestDepth = depth;
    }
  });
  return best;
}

async function cgptCollectSidebarProjectsDeep(root = document) {
  let collectedProjects = cgptCollectSidebarProjects(root);
  const scrollContainer = cgptFindSidebarProjectScrollContainer(root);
  if (scrollContainer) {
    const initialScrollTop = Number(scrollContainer.scrollTop || 0);
    let previousSignature = "";
    try {
      for (let step = 0; step < CGPT_SIDEBAR_PROJECT_SWEEP_STEPS; step += 1) {
        const currentProjects = cgptCollectSidebarProjects(root);
        collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, currentProjects);
        const currentSignature = collectedProjects.map((project) => `${project.id}:${project.name}`).join("|");
        const maxScrollTop = Math.max(0, Number(scrollContainer.scrollHeight || 0) - Number(scrollContainer.clientHeight || 0));
        const nextScrollTop = Math.min(
          maxScrollTop,
          Number(scrollContainer.scrollTop || 0) + Math.max(120, Math.floor(Number(scrollContainer.clientHeight || 0) * 0.85))
        );
        if (nextScrollTop <= Number(scrollContainer.scrollTop || 0) && currentSignature === previousSignature) {
          break;
        }
        previousSignature = currentSignature;
        if (nextScrollTop <= Number(scrollContainer.scrollTop || 0)) {
          break;
        }
        scrollContainer.scrollTop = nextScrollTop;
        if (typeof scrollContainer.dispatchEvent === "function" && typeof Event === "function") {
          try {
            scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
          } catch (_error) {
          }
        }
        await cgptDelay(CGPT_SIDEBAR_PROJECT_SWEEP_DELAY_MS);
      }
      collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, cgptCollectSidebarProjects(root));
    } finally {
      scrollContainer.scrollTop = initialScrollTop;
    }
  }
  return collectedProjects;
}

  const menuProjects = await cgptCollectSidebarProjectsFromMoreMenus(root);
  collectedProjects = cgptMergeSidebarProjectCollections(collectedProjects, menuProjects);
  return collectedProjects;
}

function cgptCollectSidebarActiveConversationIndex(root = document) {
  const domConversations = []
    .concat(cgptCollectSidebarConversations(root))
    .concat(cgptCollectCurrentProjectPageConversations(root));
  const index = new Map();
  domConversations.forEach((conversation) => {
    const key = String((conversation && (conversation.conversationId || conversation.id)) || "");
    if (!key) return;
    index.set(key, conversation.isActive === true || index.get(key) === true);
  });
  return index;
}

function cgptMergeSidebarApiSnapshotWithActiveDomState(snapshot, root = document) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  const activeConversationIndex = cgptCollectSidebarActiveConversationIndex(root);
  const activeConversationKeys = Array.from(activeConversationIndex.entries())
    .filter(([_key, isActive]) => isActive === true)
    .map(([key]) => key);
  const activeConversationKeySet = new Set(activeConversationKeys);
  const domProjects = cgptCollectSidebarProjects(root);
  const currentProjectIds = new Set(
    domProjects
      .filter((project) => project && project.isCurrent === true && project.id)
      .map((project) => String(project.id))
  );
  return {
    ...snapshot,
    conversations: Array.isArray(snapshot.conversations)
      ? snapshot.conversations.map((conversation) => {
          const key = String((conversation && (conversation.conversationId || conversation.id)) || "");
          if (!key || !activeConversationIndex.has(key)) {
            return conversation;
          }
          return {
            ...conversation,
            isActive: activeConversationKeys.length
              ? activeConversationKeySet.has(key)
              : conversation.isActive === true,
          };
        })
      : snapshot.conversations,
    projects: Array.isArray(snapshot.projects)
      ? snapshot.projects.map((project) => {
          const id = String((project && project.id) || "");
          if (!id || !currentProjectIds.has(id)) {
            return project;
          }
          return {
            ...project,
            isCurrent: true,
          };
        })
      : snapshot.projects,
  };
}

function cgptAppendDomSidebarSnapshotEntries(snapshot, root = document) {
function cgptMergeSidebarApiSnapshotWithDom(snapshot, root = document) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  const domConversations = []
    .concat(cgptCollectSidebarConversations(root))
    .concat(cgptCollectCurrentProjectPageConversations(root));
  const existingConversationKeys = new Set(
    (Array.isArray(snapshot.conversations) ? snapshot.conversations : [])
      .map((conversation) => String((conversation && (conversation.conversationId || conversation.id)) || ""))
      .filter(Boolean)
  );
  const appendedConversations = domConversations
    .filter((conversation) => {
      const key = String((conversation && (conversation.conversationId || conversation.id)) || "");
      if (!key || existingConversationKeys.has(key)) {
        return false;
      }
      existingConversationKeys.add(key);
      return true;
    })
    .map((conversation) => ({
      ...conversation,
      source: conversation.source || "dom_project_page",
    }));
  const domProjects = cgptCollectSidebarProjects(root);
  const existingProjectIds = new Set(
    (Array.isArray(snapshot.projects) ? snapshot.projects : [])
      .map((project) => String((project && project.id) || ""))
      .filter(Boolean)
  );
  const appendedProjects = domProjects.filter((project) => {
    const id = String((project && project.id) || "");
    if (!id || existingProjectIds.has(id)) {
      return false;
    }
    existingProjectIds.add(id);
    return true;
  });
  return {
    ...snapshot,
    conversations: snapshot.conversations.map((conversation) => {
      const key = String(
        (conversation && (conversation.conversationId || conversation.id)) || ""
      );
      const domConversation = key ? domConversationIndex.get(key) : null;
      if (key) {
        mergedConversationKeys.add(key);
      }
      if (!domConversation) {
        return conversation;
      }
      return {
        ...conversation,
        title: domConversation.title || conversation.title,
        isActive: domConversation.isActive === true || conversation.isActive === true,
        isProjectItem: domConversation.isProjectItem === true || conversation.isProjectItem === true,
        projectId: domConversation.projectId || conversation.projectId || "",
        projectName: domConversation.projectName || conversation.projectName || "",
      };
    }).concat(
      Array.from(domConversationIndex.entries())
        .filter(([key]) => !mergedConversationKeys.has(key))
        .map(([_key, conversation]) => cgptBuildPlainSidebarConversation({
          ...conversation,
          source: conversation.source || "dom_project_page",
        }))
    ),
    conversations: Array.isArray(snapshot.conversations)
      ? snapshot.conversations.concat(appendedConversations)
      : appendedConversations,
    projects: Array.isArray(snapshot.projects)
      ? snapshot.projects.concat(appendedProjects)
      : appendedProjects,
  };
}

function cgptMergeSidebarApiSnapshotWithDom(snapshot, root = document) {
  return cgptMergeSidebarApiSnapshotWithActiveDomState(snapshot, root);
}

function cgptMergeSidebarConversationCollections(existingConversations = [], nextConversations = []) {
  const index = new Map();
  []
    .concat(Array.isArray(existingConversations) ? existingConversations : [])
    .concat(Array.isArray(nextConversations) ? nextConversations : [])
    .forEach((conversation) => {
      const key = String((conversation && (conversation.conversationId || conversation.id)) || "");
      if (!key) return;
      const previous = index.get(key);
      index.set(key, previous ? {
        ...previous,
        ...conversation,
        title: conversation.title || previous.title || "",
        projectId: conversation.projectId || previous.projectId || "",
        projectName: conversation.projectName || previous.projectName || "",
        isProjectItem: conversation.isProjectItem === true || previous.isProjectItem === true,
        isActive: conversation.isActive === true || previous.isActive === true,
      } : conversation);
    });
  return Array.from(index.values());
}

function cgptMergeSidebarApiProjectsWithDom(snapshot, domProjects = []) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.projects) || !Array.isArray(domProjects) || !domProjects.length) {
    return snapshot;
  }
  const domById = new Map();
  const domByKey = new Map();
  domProjects.forEach((project) => {
    const id = String((project && project.id) || "");
    if (id && !domById.has(id)) {
      domById.set(id, project);
    }
    const key = cgptNormalizeSidebarProjectMatchKey(project && project.name);
    if (key && !domByKey.has(key)) {
      domByKey.set(key, project);
    }
  });
  const matchedDomIds = new Set();
  let nextDomIndex = 0;
  function takeNextUnmatchedDomProject() {
    while (nextDomIndex < domProjects.length) {
      const candidate = domProjects[nextDomIndex];
      nextDomIndex += 1;
      if (!candidate || matchedDomIds.has(candidate.id)) {
        continue;
      }
      return candidate;
    }
    return null;
  }
  const mergedProjects = snapshot.projects.map((project, index) => {
    const projectId = String((project && project.id) || "");
    const matchedById = projectId ? domById.get(projectId) || null : null;
    const projectKey = cgptNormalizeSidebarProjectMatchKey(project && project.name);
    const matchedByKey = !matchedById && projectKey ? domByKey.get(projectKey) || null : null;
    const matchedByIndex =
      !matchedById &&
      !matchedByKey &&
      snapshot.projects.length === domProjects.length &&
      domProjects[index] &&
      !matchedDomIds.has(domProjects[index].id)
        ? domProjects[index]
        : null;
    const matchedSequentially =
      !matchedById &&
      !matchedByKey &&
      !matchedByIndex &&
      cgptIsSidebarApiProjectSlugName(project && project.name)
        ? takeNextUnmatchedDomProject()
        : null;
    const domProject = matchedById || matchedByKey || matchedByIndex || matchedSequentially;
    if (!domProject) {
      return project;
    }
    matchedDomIds.add(domProject.id);
    while (nextDomIndex < domProjects.length && matchedDomIds.has(domProjects[nextDomIndex].id)) {
      nextDomIndex += 1;
    }
    return {
      ...project,
      name: domProject.name || project.name,
      isCurrent: domProject.isCurrent === true || project.isCurrent === true,
      raw: {
        ...(project.raw || {}),
        matchedDomProjectId: domProject.id || "",
        matchedDomProjectName: domProject.name || "",
        displayNameSource:
          (domProject.raw && domProject.raw.displayNameSource) || "dom_sidebar",
      },
    };
  });
  const mergedProjectNameById = new Map(
    mergedProjects.map((project) => [String((project && project.id) || ""), String((project && project.name) || "")])
  );
  return {
    ...snapshot,
    projects: mergedProjects,
    conversations: Array.isArray(snapshot.conversations)
      ? snapshot.conversations.map((conversation) => {
          const projectId = String((conversation && conversation.projectId) || "");
          const resolvedProjectName = projectId ? mergedProjectNameById.get(projectId) || "" : "";
          if (!resolvedProjectName) {
            return conversation;
          }
          return {
            ...conversation,
            projectName: resolvedProjectName,
            raw: conversation && conversation.raw
              ? {
                  ...conversation.raw,
                  projectName: resolvedProjectName,
                }
              : conversation && typeof conversation === "object"
              ? conversation.raw
              : undefined,
          };
        })
      : snapshot.conversations,
  };
}

function cgptCreateSidebarApiFailureSnapshot(diagnostics = null) {
  return {
    sidebarFound: false,
    conversations: [],
    projects: [],
    updatedAt: Date.now(),
    source: "internal_api",
    debugBuild: "",
    diagnostics,
    projectApiSweep: null,
    projectIframeSweep: null,
  };
}

function cgptRefreshSidebarConversationSnapshot(root = document) {
  if (!cgptSidebarConversationRefreshPromise && typeof cgptFetchSidebarApiSnapshot === "function") {
    cgptSidebarConversationRefreshPromise = cgptFetchSidebarApiSnapshot()
      .then((result) => {
        if (result && result.ok && result.snapshot) {
          const mergedSnapshot = cgptMergeSidebarApiSnapshotWithDom(result.snapshot, root);
          const hasProjects = Array.isArray(mergedSnapshot.projects) && mergedSnapshot.projects.length > 0;
          if (!hasProjects) {
            const syntheticDiagnostics = {
              phase: "snapshot",
              authMode: "unknown",
              status: 0,
              endpoint: "",
              message: "api_projects_missing_from_snapshot",
              endpointTried: [],
            };
            if (typeof cgptSetSidebarApiDiagnostics === "function") {
              cgptSetSidebarApiDiagnostics(syntheticDiagnostics);
            }
            cgptSidebarConversationSnapshot = {
              sidebarFound: false,
              conversations: [],
              projects: [],
              updatedAt: Date.now(),
              source: "internal_api",
              debugBuild: "",
              diagnostics:
                typeof cgptGetSidebarApiDiagnostics === "function"
                  ? cgptGetSidebarApiDiagnostics()
                  : syntheticDiagnostics,
              projectApiSweep: null,
              projectIframeSweep: null,
            };
            return;
          }
          if (typeof cgptClearSidebarApiDiagnostics === "function") {
            cgptClearSidebarApiDiagnostics();
          }
          cgptSidebarConversationSnapshot = cgptBuildPlainSidebarSnapshot({
            ...mergedSnapshot,
            source: "internal_api",
            diagnostics: null,
            projectIframeSweep: null,
          });
          cgptStartSidebarProjectIframeSweep(cgptSidebarConversationSnapshot, root);
        } else {
          if (typeof cgptSetSidebarApiDiagnostics === "function") {
            cgptSetSidebarApiDiagnostics(result ? result.diagnostics : null);
          }
          cgptSidebarConversationSnapshot = {
            sidebarFound: false,
            conversations: [],
            projects: [],
            updatedAt: Date.now(),
            source: "internal_api",
            debugBuild: "",
            diagnostics:
              typeof cgptGetSidebarApiDiagnostics === "function"
                ? cgptGetSidebarApiDiagnostics()
                : (result ? result.diagnostics : null),
            projectApiSweep: null,
            projectIframeSweep: null,
          };
          cgptSidebarConversationSnapshot = {
            ...cgptMergeSidebarApiSnapshotWithActiveDomState(result.snapshot, root),
            source: "internal_api",
            diagnostics: null,
            projectIframeSweep: null,
          };
          return;
        }
        if (typeof cgptSetSidebarApiDiagnostics === "function") {
          cgptSetSidebarApiDiagnostics(result ? result.diagnostics : null);
        }
        cgptSidebarConversationSnapshot = cgptCreateSidebarApiFailureSnapshot(
          typeof cgptGetSidebarApiDiagnostics === "function"
            ? cgptGetSidebarApiDiagnostics()
            : (result ? result.diagnostics : null)
        );
      })
      .catch((_error) => {
        if (typeof cgptSetSidebarApiDiagnostics === "function") {
          cgptSetSidebarApiDiagnostics({
            phase: "unknown",
            authMode: "cookie",
            status: 0,
            endpoint: "",
            message: "api_unknown_error",
            endpointTried: [],
          });
        }
        cgptSidebarConversationSnapshot = cgptCreateSidebarApiFailureSnapshot(
          typeof cgptGetSidebarApiDiagnostics === "function"
            ? cgptGetSidebarApiDiagnostics()
            : null
        );
      })
      .finally(() => {
        cgptSidebarConversationRefreshPromise = null;
        if (typeof cgptRenderSidebarBulkPanel === "function") {
          cgptRenderSidebarBulkPanel();
        }
      });
  }
  return cgptGetSidebarConversationSnapshot();
}

function cgptGetSidebarConversationSnapshot() {
  const plainSnapshot = cgptBuildPlainSidebarSnapshot(cgptSidebarConversationSnapshot);
  return {
    sidebarFound: plainSnapshot.sidebarFound,
    conversations: plainSnapshot.conversations,
    projects: plainSnapshot.projects,
    updatedAt: plainSnapshot.updatedAt,
    source: plainSnapshot.source,
    debugBuild: String(plainSnapshot.debugBuild || ""),
    diagnostics: plainSnapshot.diagnostics
      ? JSON.parse(JSON.stringify(plainSnapshot.diagnostics))
      : null,
    projectApiSweep: plainSnapshot.projectApiSweep
      ? JSON.parse(JSON.stringify(plainSnapshot.projectApiSweep))
      : null,
    projectIframeSweep: plainSnapshot.projectIframeSweep
      ? JSON.parse(JSON.stringify(plainSnapshot.projectIframeSweep))
      : null,
  };
}

function cgptIsSidebarConversationRefreshPending() {
  return Boolean(cgptSidebarConversationRefreshPromise);
}

function cgptScheduleSidebarSnapshotRefresh(root = document) {
  if (cgptSidebarConversationRefreshTimer) {
    clearTimeout(cgptSidebarConversationRefreshTimer);
  }
  cgptSidebarConversationRefreshTimer = setTimeout(() => {
    cgptSidebarConversationRefreshTimer = null;
    cgptRefreshSidebarConversationSnapshot(root);
    if (typeof cgptRenderSidebarBulkPanel === "function") {
      cgptRenderSidebarBulkPanel();
    }
  }, 80);
}

function cgptStartSidebarConversationTracker(root = document) {
  cgptRefreshSidebarConversationSnapshot(root);
  cgptSidebarConversationRouteKey = cgptGetSidebarConversationRouteKey();
  if (!cgptSidebarConversationRouteWatcher) {
    cgptSidebarConversationRouteWatcher = setInterval(() => {
      const nextRouteKey = cgptGetSidebarConversationRouteKey();
      if (!nextRouteKey || nextRouteKey === cgptSidebarConversationRouteKey) {
        return;
      }
      cgptSidebarConversationRouteKey = nextRouteKey;
      cgptScheduleSidebarSnapshotRefresh(root);
    }, 500);
  }
  if (cgptSidebarConversationObserver || typeof MutationObserver !== "function" || !document.body) {
    return;
  }
  cgptSidebarConversationObserver = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) => {
      if (cgptIsSidebarBulkHelperNode(mutation.target)) {
        return false;
      }
      if (mutation.type === "attributes") {
        return true;
      }
      const addedNodes = Array.from(mutation.addedNodes || []).filter((node) => !cgptIsSidebarBulkHelperNode(node));
      const removedNodes = Array.from(mutation.removedNodes || []).filter((node) => !cgptIsSidebarBulkHelperNode(node));
      return addedNodes.length > 0 || removedNodes.length > 0;
    });
    if (!shouldRefresh) return;
    cgptScheduleSidebarSnapshotRefresh(root);
  });
  cgptSidebarConversationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current", "data-cgpt-project-item", "data-cgpt-project-name"],
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCollectSidebarConversations,
    cgptCollectSidebarProjects,
    cgptCollectCurrentProjectPageConversations,
    cgptCollectProjectPageConversationsFromRoot,
    cgptCollectSidebarProjectsDeep,
    cgptCollectSidebarProjectsFromOpenProjectMenus,
    cgptBuildPlainSidebarConversation,
    cgptBuildPlainSidebarProject,
    cgptBuildPlainSidebarSnapshot,
    cgptResolveSidebarConversationDomRef,
    cgptExtractConversationIdFromHref,
    cgptExtractProjectIdFromHref,
    cgptGetCurrentProjectIdFromLocation,
    cgptHasProjectConversationCoverage,
    cgptGetSidebarConversationRouteKey,
    cgptGetSidebarConversationSnapshot,
    cgptRefreshSidebarConversationSnapshot,
    cgptIsSidebarConversationRefreshPending,
    cgptMergeSidebarApiProjectsWithDom,
    cgptMergeSidebarApiSnapshotWithActiveDomState,
    cgptAppendDomSidebarSnapshotEntries,
    cgptMergeSidebarApiSnapshotWithDom,
    cgptFilterProjectSectionLabel: cgptIsProjectSectionLabel,
  };
}
