const CGPT_SIDEBAR_API_DEBUG_BUILD = "project-api-sweep-v2";

const CGPT_SIDEBAR_API_ENDPOINTS = {
  session: [
    "/api/auth/session",
    "/backend-api/accounts/check",
    "/backend-api/me",
  ],
  projects: [
    "/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=5&limit=20",
    "/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=20&limit=20",
    "/backend-api/gizmos/snorlax/sidebar?owned_only=true&conversations_per_gizmo=100&limit=100",
    "/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=100",
    "/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=50",
    "/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=20",
    "/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=5",
    "/backend-api/projects?limit=100&offset=0",
    "/backend-api/projects",
    "/backend-api/projects?offset=0&limit=100&order=updated",
  ],
  conversations: [
    "/backend-api/conversations?offset=0&limit=28&order=updated&is_archived=false&is_starred=false",
    "/backend-api/conversations?offset=0&limit=100&order=updated&is_archived=false&is_starred=false",
    "/backend-api/conversations?offset=0&limit=100&order=updated",
    "/backend-api/conversations?limit=100&offset=0",
  ],
};

function cgptResolveSidebarApiAbsoluteUrl(pathname) {
  try {
    return new URL(pathname, window.location.origin).toString();
  } catch (_error) {
    return String(pathname || "");
  }
}

function cgptNormalizeSidebarApiText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cgptIsSidebarApiProjectSlugName(value) {
  return /^g-p-[0-9a-f-]+-/i.test(cgptNormalizeSidebarApiText(value));
}

function cgptUnwrapSidebarApiProjectCandidate(project = {}) {
  if (!project || typeof project !== "object") {
    return null;
  }
  if (
    project.gizmo &&
    typeof project.gizmo === "object" &&
    project.gizmo.gizmo &&
    typeof project.gizmo.gizmo === "object"
  ) {
    return {
      ...project,
      ...project.gizmo,
      ...project.gizmo.gizmo,
    };
  }
  if (project.gizmo && typeof project.gizmo === "object") {
    return {
      ...project,
      ...project.gizmo,
    };
  }
  if (project.project && typeof project.project === "object") {
    return {
      ...project,
      ...project.project,
    };
  }
  if (project.workspace && typeof project.workspace === "object") {
    return {
      ...project,
      ...project.workspace,
    };
  }
  return project;
}

async function cgptSidebarApiFetchJson(url, requestContext = {}) {
  const headers = {
    Accept: "application/json",
    ...(requestContext.headers || {}),
  };
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });
  let json = null;
  try {
    json = await response.json();
  } catch (_error) {
  }
  return {
    url,
    ok: response.ok,
    status: response.status,
    json,
  };
}


function cgptNormalizeSidebarApiActionId(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`api_${fieldName || "id"}_missing`);
  }
  return normalized;
}

async function cgptBuildSidebarApiActionRequestContext() {
  if (typeof fetch !== "function") {
    throw new Error("api_fetch_unavailable");
  }
  const sessionResult = await cgptFetchSessionContext();
  return cgptBuildSidebarApiRequestContext(sessionResult.payload);
}

async function cgptSidebarApiFetchActionJson(url, { method = "POST", body = null, requestContext = {} } = {}) {
  const headers = {
    Accept: "application/json",
    ...(body === null ? {} : { "Content-Type": "application/json" }),
    ...(requestContext.headers || {}),
  };
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers,
    ...(body === null ? {} : { body: JSON.stringify(body) }),
  });
  let json = null;
  try {
    json = await response.json();
  } catch (_error) {
  }
  return {
    url,
    ok: response.ok,
    status: response.status,
    json,
  };
}

async function cgptRunSidebarApiActionCandidates({ actionName, candidates }) {
  if (!Array.isArray(candidates) || !candidates.length) {
    throw new Error(`api_${actionName || "action"}_candidates_missing`);
  }
  const requestContext = await cgptBuildSidebarApiActionRequestContext();
  const attempts = [];
  for (const candidate of candidates) {
    const url = cgptResolveSidebarApiAbsoluteUrl(candidate.path);
    try {
      const result = await cgptSidebarApiFetchActionJson(url, {
        method: candidate.method,
        body: candidate.body,
        requestContext,
      });
      attempts.push({ url, method: candidate.method, status: result.status, ok: result.ok });
      if (result.ok) {
        return {
          ok: true,
          action: actionName,
          endpoint: url,
          status: result.status,
          json: result.json,
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        url,
        method: candidate.method,
        status: 0,
        ok: false,
        message: String((error && error.message) || "api_action_fetch_failed"),
      });
    }
  }
  const lastAttempt = attempts[attempts.length - 1] || {};
  const error = new Error(`api_${actionName || "action"}_failed`);
  error.attempts = attempts;
  error.status = Number(lastAttempt.status || 0);
  error.endpoint = String(lastAttempt.url || "");
  throw error;
}

function cgptBuildConversationApiPaths(conversationId) {
  const encodedConversationId = encodeURIComponent(conversationId);
  return [
    `/backend-api/conversation/${encodedConversationId}`,
    `/backend-api/conversations/${encodedConversationId}`,
  ];
}

async function archiveConversation(conversationId) {
  const normalizedConversationId = cgptNormalizeSidebarApiActionId(conversationId, "conversation_id");
  const candidates = cgptBuildConversationApiPaths(normalizedConversationId).map((path) => ({
    method: "PATCH",
    path,
    body: { is_archived: true },
  }));
  return cgptRunSidebarApiActionCandidates({ actionName: "archive", candidates });
}

async function deleteConversation(conversationId) {
  const normalizedConversationId = cgptNormalizeSidebarApiActionId(conversationId, "conversation_id");
  const patchCandidates = cgptBuildConversationApiPaths(normalizedConversationId).map((path) => ({
    method: "PATCH",
    path,
    body: { is_visible: false },
  }));
  const deleteCandidates = cgptBuildConversationApiPaths(normalizedConversationId).map((path) => ({
    method: "DELETE",
    path,
    body: null,
  }));
  return cgptRunSidebarApiActionCandidates({
    actionName: "delete",
    candidates: patchCandidates.concat(deleteCandidates),
  });
}

async function renameConversation(conversationId, title) {
  const normalizedConversationId = cgptNormalizeSidebarApiActionId(conversationId, "conversation_id");
  const normalizedTitle = cgptNormalizeSidebarApiText(title);
  if (!normalizedTitle) {
    throw new Error("api_title_missing");
  }
  const candidates = cgptBuildConversationApiPaths(normalizedConversationId).map((path) => ({
    method: "PATCH",
    path,
    body: { title: normalizedTitle },
  }));
  return cgptRunSidebarApiActionCandidates({ actionName: "rename", candidates });
}

async function addConversationToProject(conversationId, projectId) {
  const normalizedConversationId = cgptNormalizeSidebarApiActionId(conversationId, "conversation_id");
  const normalizedProjectId = cgptNormalizeSidebarApiActionId(projectId, "project_id");
  const encodedConversationId = encodeURIComponent(normalizedConversationId);
  const encodedProjectId = encodeURIComponent(normalizedProjectId);
  const candidates = [
    {
      method: "PATCH",
      path: `/backend-api/conversation/${encodedConversationId}`,
      body: { project_id: normalizedProjectId, gizmo_id: normalizedProjectId },
    },
    {
      method: "PATCH",
      path: `/backend-api/conversations/${encodedConversationId}`,
      body: { project_id: normalizedProjectId, gizmo_id: normalizedProjectId },
    },
    {
      method: "POST",
      path: `/backend-api/gizmos/${encodedProjectId}/conversations/${encodedConversationId}`,
      body: {},
    },
    {
      method: "PUT",
      path: `/backend-api/gizmos/${encodedProjectId}/conversations/${encodedConversationId}`,
      body: {},
    },
    {
      method: "POST",
      path: `/backend-api/projects/${encodedProjectId}/conversations/${encodedConversationId}`,
      body: {},
    },
    {
      method: "PUT",
      path: `/backend-api/projects/${encodedProjectId}/conversations/${encodedConversationId}`,
      body: {},
    },
  ];
  return cgptRunSidebarApiActionCandidates({ actionName: "project", candidates });
}

function cgptResolveSidebarShareUrl(payload = {}) {
  if (!payload || typeof payload !== "object") return "";
  const directUrl = payload.share_url || payload.shareUrl || payload.url || payload.public_url || payload.publicUrl || "";
  if (directUrl) {
    return cgptResolveSidebarApiAbsoluteUrl(directUrl);
  }
  const shareId = payload.share_id || payload.shareId || payload.id || "";
  return shareId ? cgptResolveSidebarApiAbsoluteUrl(`/share/${encodeURIComponent(String(shareId))}`) : "";
}

async function createConversationShareLink(conversationId, currentNodeId = "") {
  const normalizedConversationId = cgptNormalizeSidebarApiActionId(conversationId, "conversation_id");
  const normalizedCurrentNodeId = String(currentNodeId || "").trim();
  const bodyCandidates = [
    {
      conversation_id: normalizedConversationId,
      current_node_id: normalizedCurrentNodeId || null,
      is_anonymous: true,
    },
    {
      conversation_id: normalizedConversationId,
      is_anonymous: true,
    },
    {
      conversation_id: normalizedConversationId,
    },
  ];
  const result = await cgptRunSidebarApiActionCandidates({
    actionName: "share",
    candidates: bodyCandidates.map((body) => ({
      method: "POST",
      path: "/backend-api/share/create",
      body,
    })),
  });
  return {
    ...result,
    shareUrl: cgptResolveSidebarShareUrl(result.json),
  };
}

function cgptSummarizeSidebarApiPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      kind: "array",
      length: payload.length,
      keys: payload.length && payload[0] && typeof payload[0] === "object"
        ? Object.keys(payload[0]).slice(0, 12)
        : [],
      message: "",
    };
  }
  if (!payload || typeof payload !== "object") {
    return {
      kind: typeof payload,
      length: 0,
      keys: [],
      message: "",
    };
  }
  return {
    kind: "object",
    length: 0,
    keys: Object.keys(payload).slice(0, 12),
    message: cgptNormalizeSidebarApiText(
      payload.message ||
      payload.detail ||
      payload.error ||
      payload.description ||
      ""
    ),
  };
}

function cgptGetCurrentConversationIdFromLocation() {
  const href = String((window.location && window.location.href) || "");
  const match = href.match(/\/c\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function cgptSidebarApiExtractCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function cgptSidebarApiCollectNestedArrays(payload, matcher, path = "", depth = 0, results = []) {
  if (!payload || typeof payload !== "object" || depth > 5) {
    return results;
  }
  if (Array.isArray(payload)) {
    if (matcher(path, payload)) {
      results.push(payload);
    }
    payload.forEach((item, index) => {
      cgptSidebarApiCollectNestedArrays(item, matcher, `${path}[${index}]`, depth + 1, results);
    });
    return results;
  }
  Object.entries(payload).forEach(([key, value]) => {
    const nextPath = path ? `${path}.${key}` : key;
    cgptSidebarApiCollectNestedArrays(value, matcher, nextPath, depth + 1, results);
  });
  return results;
}

function cgptSidebarApiGetPaginationState(payload = {}, collection = []) {
  const nextCursor = payload.next_cursor || payload.nextCursor || payload.cursor || payload.after || "";
  const hasMore =
    payload.has_more === true ||
    payload.hasMore === true ||
    Boolean(nextCursor) ||
    (Number.isFinite(Number(payload.total)) && collection.length > 0 && collection.length < Number(payload.total));
  return {
    nextCursor: String(nextCursor || ""),
    hasMore,
  };
}

function cgptBuildSidebarApiRequestContext(sessionPayload = null) {
  const accessToken =
    sessionPayload && typeof sessionPayload === "object"
      ? sessionPayload.accessToken || sessionPayload.access_token || ""
      : "";
  const headers = {};
  let authMode = "cookie";
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    authMode = "bearer";
  }
  return {
    authMode,
    headers,
  };
}

async function cgptFetchSessionContext() {
  const endpointTried = [];
  for (const candidate of CGPT_SIDEBAR_API_ENDPOINTS.session) {
    const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
    try {
      const result = await cgptSidebarApiFetchJson(url, {});
      endpointTried.push({
        url,
        status: result.status,
        ok: result.ok,
        shapeMatched: Boolean(result.json && typeof result.json === "object"),
      });
      if (result.ok && result.json && typeof result.json === "object") {
        return {
          ok: true,
          endpoint: url,
          payload: result.json,
          endpointTried,
        };
      }
    } catch (_error) {
      endpointTried.push({
        url,
        status: 0,
        ok: false,
        shapeMatched: false,
      });
    }
  }
  return {
    ok: false,
    endpoint: "",
    payload: null,
    endpointTried,
  };
}

function cgptIsProjectPayloadShape(payload) {
  return cgptExtractProjectCandidatesFromPayload(payload).length > 0;
}

function cgptIsConversationPayloadShape(payload) {
  if (Array.isArray(payload)) return true;
  if (!payload || typeof payload !== "object") return false;
  return ["items", "conversations", "data"].some((key) => Array.isArray(payload[key]));
}

function cgptNormalizeSidebarApiProject(project = {}) {
  const candidate = cgptUnwrapSidebarApiProjectCandidate(project);
  if (!candidate) return null;
  const id = String(
    candidate.id ||
      candidate.project_id ||
      candidate.projectId ||
      candidate.uuid ||
      candidate.gizmo_id ||
      candidate.gizmoId ||
      candidate.workspace_id ||
      candidate.workspaceId ||
      candidate.slug ||
      candidate.share_id ||
      candidate.shareId ||
      candidate.team_id ||
      candidate.teamId ||
      ""
  ).trim();
  const name = cgptNormalizeSidebarApiText(
    candidate.name ||
      candidate.title ||
      candidate.display_name ||
      candidate.displayName ||
      (candidate.display && candidate.display.name) ||
      candidate.label ||
      candidate.workspace_name ||
      candidate.workspaceName ||
      candidate.gizmo_name ||
      candidate.gizmoName ||
      candidate.short_url ||
      candidate.shortUrl ||
      ""
  );
  if (!id || !name) return null;
  return {
    id,
    name,
    isCurrent: false,
    visibility: "api",
    source: "internal_api",
    raw: {
      id,
      name,
      originalName: name,
      displayNameSource: "api_list",
    },
  };
}

function cgptBuildSidebarApiProjectDetailCandidates(projectId) {
  const normalizedId = String(projectId || "").trim();
  if (!normalizedId) return [];
  const encodedId = encodeURIComponent(normalizedId);
  return [
    `/backend-api/gizmos/${encodedId}`,
    `/backend-api/projects/${encodedId}`,
  ];
}

function cgptBuildSidebarApiProjectConversationCandidates(project = {}) {
  const raw = project && project.raw ? project.raw : {};
  const routeCandidates = [
    project && project.id,
    raw.originalName,
    raw.detailName,
    project && project.name,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const uniqueRouteCandidates = Array.from(new Set(routeCandidates));
  if (!uniqueRouteCandidates.length) return [];
  const suffixes = [
    "/conversations?cursor=0&limit=5&owned_only=true",
    "/conversations?cursor=0&limit=20&owned_only=true",
    "/conversations?offset=0&limit=100&order=updated",
    "/conversations?limit=100&offset=0",
    "/conversations?offset=0&limit=100",
    "/conversations?limit=100&order=updated",
    "/conversations?limit=100",
    "/conversations",
  ];
  const prefixes = [
    "/backend-api/gizmos",
    "/backend-api/projects",
  ];
  const candidates = [];
  uniqueRouteCandidates.forEach((routeId) => {
    const encodedId = encodeURIComponent(routeId);
    prefixes.forEach((prefix) => {
      suffixes.forEach((suffix) => {
        candidates.push(`${prefix}/${encodedId}${suffix}`);
      });
    });
  });
  return Array.from(new Set(candidates));
}

async function cgptEnrichSidebarApiProjects(projects = [], requestContext = {}) {
  const enrichedProjects = [];
  const detailPayloads = [];
  const projectConversationPayloads = [];
  const projectApiSweep = [];
  for (const project of Array.isArray(projects) ? projects : []) {
    if (!project) {
      enrichedProjects.push(project);
      continue;
    }
    let enrichedProject = project;
    const detailCandidates = cgptBuildSidebarApiProjectDetailCandidates(project.id);
    let detailPayload = null;
    const detailTried = [];
    for (const candidate of detailCandidates) {
      const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
      try {
        const result = await cgptSidebarApiFetchJson(url, requestContext);
        const normalized = result.ok && result.json && typeof result.json === "object"
          ? cgptNormalizeSidebarApiProject(result.json)
          : null;
        const nestedConversationCount = result.ok && result.json && typeof result.json === "object"
          ? cgptExtractNormalizedProjectConversationsFromPayload(
              result.json,
              new Map(project ? [[project.id, project]] : [])
            ).length
          : 0;
        detailTried.push({
          url,
          status: result.status,
          ok: result.ok,
          shapeMatched: Boolean(result.json && typeof result.json === "object"),
          projectMatched: Boolean(normalized),
          nestedConversationCount,
        });
        if (!result.ok || !result.json || typeof result.json !== "object") {
          continue;
        }
        detailPayload = result.json;
        detailPayloads.push({
          projectId: project.id,
          payload: result.json,
        });
        if (
          normalized &&
          normalized.name &&
          (cgptIsSidebarApiProjectSlugName(project.name) || project.name !== normalized.name)
        ) {
          enrichedProject = {
            ...project,
            name: normalized.name,
            raw: {
              ...(project.raw || {}),
              detailName: normalized.name,
              detailProjectId: normalized.id,
              detailDisplayNameSource: "api_detail",
            },
          };
        }
        break;
      } catch (_error) {
        detailTried.push({
          url,
          status: 0,
          ok: false,
          shapeMatched: false,
          projectMatched: false,
          nestedConversationCount: 0,
        });
      }
    }
    const projectConversationCandidates = cgptBuildSidebarApiProjectConversationCandidates({
      ...project,
      name: enrichedProject.name || project.name || "",
      raw: {
        ...(project.raw || {}),
        detailName:
          (enrichedProject.raw && enrichedProject.raw.detailName) ||
          (project.raw && project.raw.detailName) ||
          "",
      },
    });
    const conversationTried = [];
    for (const candidate of projectConversationCandidates) {
      const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
      try {
        const result = await cgptSidebarApiFetchJson(url, requestContext);
        const shapeMatched = cgptIsConversationPayloadShape(result.json);
        const collection = shapeMatched
          ? cgptSidebarApiExtractCollection(result.json, ["items", "conversations", "data"])
          : [];
        const payloadSummary = cgptSummarizeSidebarApiPayload(result.json);
        conversationTried.push({
          url,
          status: result.status,
          ok: result.ok,
          shapeMatched,
          itemCount: Array.isArray(collection) ? collection.length : 0,
          payloadKind: payloadSummary.kind,
          payloadKeys: payloadSummary.keys,
          payloadMessage: payloadSummary.message,
        });
        if (!result.ok || !result.json) {
          continue;
        }
        if (!shapeMatched) {
          continue;
        }
        projectConversationPayloads.push({
          projectId: project.id,
          projectName: enrichedProject.name || project.name || "",
          endpoint: url,
          payload: result.json,
        });
        break;
      } catch (_error) {
        conversationTried.push({
          url,
          status: 0,
          ok: false,
          shapeMatched: false,
          itemCount: 0,
          payloadKind: "",
          payloadKeys: [],
          payloadMessage: "",
        });
      }
    }
    projectApiSweep.push({
      projectId: String(project.id || ""),
      projectName: String(enrichedProject.name || project.name || ""),
      detailTried,
      conversationTried,
      detailResolved: Boolean(detailPayload),
    });
    enrichedProjects.push(enrichedProject);
  }
  return {
    projects: enrichedProjects,
    detailPayloads,
    projectConversationPayloads,
    projectApiSweep,
  };
}

function cgptExtractProjectCandidatesFromPayload(payload = {}) {
  const selfCandidate =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    (
      Array.isArray(payload.conversations) ||
      Array.isArray(payload.recent_conversations) ||
      Array.isArray(payload.recentConversations) ||
      Array.isArray(payload.sidebar_conversations) ||
      Array.isArray(payload.sidebarConversations)
    )
      ? [payload]
      : [];
  const directCollections = [
    cgptSidebarApiExtractCollection(payload, ["gizmos", "items", "projects", "data", "workspaces"]),
  ];
  const hintedCollections = cgptSidebarApiCollectNestedArrays(
    payload,
    (path, value) =>
      Array.isArray(value) &&
      /(^|\.)(gizmos|projects|project|workspaces|workspace|spaces)(\.|$)/i.test(path),
    "",
    0,
    []
  );
  const seenObjects = new Set();
  return selfCandidate
    .concat(directCollections)
    .concat(hintedCollections)
    .flat()
    .filter((item) => item && typeof item === "object")
    .map((item) => cgptUnwrapSidebarApiProjectCandidate(item) || item)
    .filter((item) => {
      if (seenObjects.has(item)) return false;
      seenObjects.add(item);
      return true;
    });
}

function cgptNormalizeSidebarApiConversation(conversation = {}, projectIndex = new Map()) {
  const conversationId = String(
    conversation.id || conversation.conversation_id || conversation.uuid || conversation.cid || ""
  ).trim();
  const title = cgptNormalizeSidebarApiText(
    conversation.title || conversation.name || conversation.display_name || ""
  );
  if (!conversationId || !title) return null;
  const projectId = String(
    conversation.project_id ||
      (conversation.project && conversation.project.id) ||
      (conversation.workspace && conversation.workspace.id) ||
      ""
  ).trim();
  const knownProject = projectId ? projectIndex.get(projectId) || null : null;
  const rawProjectName = cgptNormalizeSidebarApiText(
    (conversation.project && conversation.project.name) ||
      (conversation.workspace && conversation.workspace.name) ||
      ""
  );
  const knownProjectName = cgptNormalizeSidebarApiText((knownProject && knownProject.name) || "");
  const projectName =
    knownProjectName && (!rawProjectName || cgptIsSidebarApiProjectSlugName(rawProjectName))
      ? knownProjectName
      : (rawProjectName || knownProjectName);
  const membershipState = projectId || projectName ? "project" : "non_project";
  const author = cgptNormalizeSidebarApiText(
    conversation.author ||
      conversation.author_name ||
      conversation.owner ||
      conversation.owner_name ||
      conversation.created_by ||
      ""
  );
  const postedAt = cgptNormalizeSidebarApiText(
    conversation.posted_at ||
      conversation.create_time ||
      conversation.created_at ||
      conversation.updated_at ||
      ""
  );
  const currentNodeId = cgptNormalizeSidebarApiText(
    conversation.current_node_id ||
      conversation.currentNodeId ||
      conversation.current_node ||
      conversation.currentNode ||
      ""
  );
  const absoluteUrl = cgptResolveSidebarApiAbsoluteUrl(`/c/${conversationId}`);
  return {
    id: conversationId,
    title,
    href: `/c/${conversationId}`,
    absoluteUrl,
    conversationId,
    isActive: conversationId === cgptGetCurrentConversationIdFromLocation(),
    isProjectItem: membershipState === "project",
    projectName,
    projectId,
    author,
    postedAt,
    currentNodeId,
    membershipState,
    source: "internal_api",
    raw: {
      id: conversationId,
      title,
      projectId,
      projectName,
      absoluteUrl,
      author,
      postedAt,
      currentNodeId,
    },
  };
}

function cgptExtractNormalizedProjectConversationsFromPayload(payload = {}, projectIndex = new Map()) {
  const normalizedConversations = [];
  const seenConversationIds = new Set();
  const projectCandidates = cgptExtractProjectCandidatesFromPayload(payload);
  projectCandidates.forEach((projectCandidate) => {
    const normalizedProject = cgptNormalizeSidebarApiProject(projectCandidate);
    if (!normalizedProject) {
      return;
    }
    const collections = [
      projectCandidate.conversations,
      projectCandidate.recent_conversations,
      projectCandidate.recentConversations,
      projectCandidate.sidebar_conversations,
      projectCandidate.sidebarConversations,
    ].filter(Array.isArray);
    collections.forEach((collection) => {
      collection.forEach((conversation) => {
        const normalizedConversation = cgptNormalizeSidebarApiConversation(
          {
            ...(conversation && typeof conversation === "object" ? conversation : {}),
            project_id:
              (conversation && (conversation.project_id || conversation.projectId)) ||
              normalizedProject.id,
            project:
              conversation && conversation.project
                ? conversation.project
                : { id: normalizedProject.id, name: normalizedProject.name },
          },
          projectIndex
        );
        if (!normalizedConversation) {
          return;
        }
        const key = String(normalizedConversation.conversationId || normalizedConversation.id || "");
        if (!key || seenConversationIds.has(key)) {
          return;
        }
        seenConversationIds.add(key);
        normalizedConversations.push(normalizedConversation);
      });
    });
  });
  return normalizedConversations;
}

function cgptMergeNormalizedSidebarConversations(...conversationLists) {
  const mergedIndex = new Map();
  conversationLists.flat().forEach((conversation) => {
    if (!conversation || typeof conversation !== "object") {
      return;
    }
    const key = String(conversation.conversationId || conversation.id || "");
    if (!key) {
      return;
    }
    const previous = mergedIndex.get(key);
    if (!previous) {
      mergedIndex.set(key, conversation);
      return;
    }
    mergedIndex.set(key, {
      ...previous,
      ...conversation,
      title: conversation.title || previous.title || "",
      projectId: conversation.projectId || previous.projectId || "",
      projectName: conversation.projectName || previous.projectName || "",
      author: conversation.author || previous.author || "",
      postedAt: conversation.postedAt || previous.postedAt || "",
      isProjectItem: conversation.isProjectItem === true || previous.isProjectItem === true,
      isActive: conversation.isActive === true || previous.isActive === true,
      raw: {
        ...(previous.raw || {}),
        ...(conversation.raw || {}),
      },
    });
  });
  return Array.from(mergedIndex.values());
}

function cgptInjectProjectContextIntoConversationPayload(payload, project = {}) {
  const items = cgptSidebarApiExtractCollection(payload, ["items", "conversations", "data"]);
  if (!Array.isArray(items) || !items.length) {
    return payload;
  }
  const projectId = String(project.projectId || project.id || "").trim();
  const projectName = String(project.projectName || project.name || "").trim();
  const normalizedItems = items.map((item) => ({
    ...(item && typeof item === "object" ? item : {}),
    project_id:
      (item && (item.project_id || item.projectId)) ||
      projectId,
    project:
      item && item.project
        ? item.project
        : projectId || projectName
        ? { id: projectId, name: projectName }
        : undefined,
  }));
  if (Array.isArray(payload)) {
    return normalizedItems;
  }
  if (Array.isArray(payload.items)) {
    return { ...payload, items: normalizedItems };
  }
  if (Array.isArray(payload.conversations)) {
    return { ...payload, conversations: normalizedItems };
  }
  if (Array.isArray(payload.data)) {
    return { ...payload, data: normalizedItems };
  }
  return payload;
}

async function cgptProbeSidebarApiEndpoint(candidates = [], requestContext = {}, shapeValidator) {
  const endpointTried = [];
  for (const candidate of candidates) {
    const url = cgptResolveSidebarApiAbsoluteUrl(candidate);
    try {
      const result = await cgptSidebarApiFetchJson(url, requestContext);
      const shapeMatched = Boolean(shapeValidator && shapeValidator(result.json));
      endpointTried.push({
        url,
        status: result.status,
        ok: result.ok,
        shapeMatched,
      });
      if (result.ok && shapeMatched) {
        return {
          ok: true,
          endpoint: url,
          payload: result.json,
          endpointTried,
        };
      }
    } catch (_error) {
      endpointTried.push({
        url,
        status: 0,
        ok: false,
        shapeMatched: false,
      });
    }
  }
  return {
    ok: false,
    endpoint: "",
    payload: null,
    endpointTried,
  };
}

function cgptBuildPaginatedSidebarApiUrl(endpoint, nextCursor, collectionLength) {
  const url = new URL(endpoint, window.location.origin);
  if (nextCursor) {
    url.searchParams.set("cursor", nextCursor);
  } else if (url.searchParams.has("offset")) {
    url.searchParams.set("offset", String(collectionLength));
  }
  return url.toString();
}

async function cgptPaginateSidebarApiCollection({
  endpoint,
  initialPayload,
  requestContext,
  collectionKeys,
  normalizeItem,
  extractItems,
}) {
  const items = [];
  const seenIds = new Set();
  let payload = initialPayload;
  let safetyCounter = 0;
  while (payload && safetyCounter < 50) {
    safetyCounter += 1;
    const collection = typeof extractItems === "function"
      ? extractItems(payload)
      : cgptSidebarApiExtractCollection(payload, collectionKeys);
    collection.forEach((item) => {
      const normalized = normalizeItem(item);
      if (!normalized) return;
      const id = String(normalized.id || normalized.conversationId || "");
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);
      items.push(normalized);
    });
    const pagination = cgptSidebarApiGetPaginationState(payload, collection);
    if (!pagination.hasMore) {
      break;
    }
    const nextUrl = cgptBuildPaginatedSidebarApiUrl(endpoint, pagination.nextCursor, items.length);
    const result = await cgptSidebarApiFetchJson(nextUrl, requestContext);
    if (!result.ok || !result.json || typeof result.json !== "object") {
      throw {
        phase: "pagination",
        status: result.status,
        endpoint: nextUrl,
        message: "api_pagination_failed",
      };
    }
    payload = result.json;
  }
  return items;
}

async function cgptFetchAllProjects(requestContext = {}) {
  const probe = await cgptProbeSidebarApiEndpoint(
    CGPT_SIDEBAR_API_ENDPOINTS.projects,
    requestContext,
    cgptIsProjectPayloadShape
  );
  if (!probe.ok) {
    throw {
      phase: "projects_fetch",
      authMode: requestContext.authMode || "cookie",
      status: probe.endpointTried.find((item) => item.status)?.status || 0,
      endpoint: probe.endpointTried[probe.endpointTried.length - 1]?.url || "",
      message: "api_projects_fetch_failed",
      endpointTried: probe.endpointTried,
    };
  }
  const projects = await cgptPaginateSidebarApiCollection({
    endpoint: probe.endpoint,
    initialPayload: probe.payload,
    requestContext,
    collectionKeys: ["gizmos", "items", "projects", "data", "workspaces"],
    normalizeItem: cgptNormalizeSidebarApiProject,
    extractItems: cgptExtractProjectCandidatesFromPayload,
  });
  const projectEnrichment = await cgptEnrichSidebarApiProjects(projects, requestContext);
  const enrichedProjects = Array.isArray(projectEnrichment.projects)
    ? projectEnrichment.projects
    : [];
  if (!enrichedProjects.length) {
    const payloadKeys = Array.isArray(probe.payload)
      ? Object.keys((probe.payload[0] && typeof probe.payload[0] === "object") ? probe.payload[0] : {}).slice(0, 20)
      : (probe.payload && typeof probe.payload === "object" ? Object.keys(probe.payload).slice(0, 20) : []);
    throw {
      phase: "projects_fetch",
      authMode: requestContext.authMode || "cookie",
      status: 200,
      endpoint: probe.endpoint,
      message: "api_projects_empty_after_normalize",
      endpointTried: probe.endpointTried,
      payloadKeys,
    };
  }
  const projectIndex = new Map(enrichedProjects.map((project) => [project.id, project]));
  const projectConversationLists = Array.isArray(projectEnrichment.projectConversationPayloads)
    ? await Promise.all(
        projectEnrichment.projectConversationPayloads.map((entry) =>
          cgptPaginateSidebarApiCollection({
            endpoint: entry.endpoint || "",
            initialPayload: cgptInjectProjectContextIntoConversationPayload(entry.payload, {
              projectId: entry.projectId,
              projectName: entry.projectName,
            }),
            requestContext,
            collectionKeys: ["items", "conversations", "data"],
            normalizeItem: (item) => cgptNormalizeSidebarApiConversation(item, projectIndex),
          }).catch(() => [])
        )
      )
    : [];
  const detailConversationCountByProjectId = new Map();
  if (Array.isArray(projectEnrichment.detailPayloads)) {
    projectEnrichment.detailPayloads.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const projectId = String(entry.projectId || "");
      if (!projectId) {
        return;
      }
      detailConversationCountByProjectId.set(
        projectId,
        cgptExtractNormalizedProjectConversationsFromPayload(entry.payload || {}, projectIndex).length
      );
    });
  }
  const endpointConversationCountByProjectId = new Map();
  if (Array.isArray(projectEnrichment.projectConversationPayloads)) {
    projectEnrichment.projectConversationPayloads.forEach((entry, index) => {
      const projectId = String((entry && entry.projectId) || "");
      if (!projectId) {
        return;
      }
      endpointConversationCountByProjectId.set(
        projectId,
        Array.isArray(projectConversationLists[index]) ? projectConversationLists[index].length : 0
      );
    });
  }
  return {
    projects: enrichedProjects,
    projectSeedConversations: cgptMergeNormalizedSidebarConversations(
      cgptExtractNormalizedProjectConversationsFromPayload(probe.payload, projectIndex),
      ...(Array.isArray(projectEnrichment.detailPayloads)
        ? projectEnrichment.detailPayloads.map((entry) =>
            cgptExtractNormalizedProjectConversationsFromPayload(
              entry.payload,
              projectIndex
            )
          )
        : [])
      ,
      ...projectConversationLists
    ),
    projectApiSweep: Array.isArray(projectEnrichment.projectApiSweep)
      ? projectEnrichment.projectApiSweep.map((entry) => ({
          ...entry,
          detailConversationCount: detailConversationCountByProjectId.get(String(entry.projectId || "")) || 0,
          endpointConversationCount: endpointConversationCountByProjectId.get(String(entry.projectId || "")) || 0,
        }))
      : [],
    endpointTried: probe.endpointTried,
    endpoint: probe.endpoint,
  };
}

async function cgptFetchAllConversations(requestContext = {}, projectIndex = new Map()) {
  const probe = await cgptProbeSidebarApiEndpoint(
    CGPT_SIDEBAR_API_ENDPOINTS.conversations,
    requestContext,
    cgptIsConversationPayloadShape
  );
  if (!probe.ok) {
    throw {
      phase: "conversations_fetch",
      authMode: requestContext.authMode || "cookie",
      status: probe.endpointTried.find((item) => item.status)?.status || 0,
      endpoint: probe.endpointTried[probe.endpointTried.length - 1]?.url || "",
      message: "api_conversations_fetch_failed",
      endpointTried: probe.endpointTried,
    };
  }
  const conversations = await cgptPaginateSidebarApiCollection({
    endpoint: probe.endpoint,
    initialPayload: probe.payload,
    requestContext,
    collectionKeys: ["items", "conversations", "data"],
    normalizeItem: (item) => cgptNormalizeSidebarApiConversation(item, projectIndex),
  });
  return {
    conversations,
    endpointTried: probe.endpointTried,
    endpoint: probe.endpoint,
  };
}

async function cgptFetchSidebarApiSnapshot() {
  const sessionResult = await cgptFetchSessionContext();
  const requestContext = cgptBuildSidebarApiRequestContext(sessionResult.payload);
  const endpointTried = [...sessionResult.endpointTried];
  try {
    const projectResult = await cgptFetchAllProjects(requestContext);
    endpointTried.push(...projectResult.endpointTried);
    const projectIndex = new Map(projectResult.projects.map((project) => [project.id, project]));
    let conversationResult = null;
    let conversationDiagnostics = null;
    try {
      conversationResult = await cgptFetchAllConversations(requestContext, projectIndex);
      endpointTried.push(...conversationResult.endpointTried);
    } catch (conversationError) {
      conversationDiagnostics = {
        phase: String((conversationError && conversationError.phase) || "conversations_fetch"),
        authMode: requestContext.authMode || "cookie",
        status: Number((conversationError && conversationError.status) || 0),
        endpoint: String((conversationError && conversationError.endpoint) || ""),
        message: String((conversationError && conversationError.message) || "api_conversations_fetch_failed"),
        endpointTried: Array.isArray(conversationError && conversationError.endpointTried)
          ? conversationError.endpointTried
          : [],
      };
      endpointTried.push(...conversationDiagnostics.endpointTried);
    }
    const mergedConversations = cgptMergeNormalizedSidebarConversations(
      Array.isArray(projectResult.projectSeedConversations) ? projectResult.projectSeedConversations : [],
      conversationResult && Array.isArray(conversationResult.conversations)
        ? conversationResult.conversations
        : []
    );
    return {
      ok: true,
      snapshot: {
        sidebarFound: true,
        conversations: mergedConversations,
        projects: projectResult.projects,
        updatedAt: Date.now(),
        source: "internal_api",
        debugBuild: CGPT_SIDEBAR_API_DEBUG_BUILD,
        diagnostics: conversationDiagnostics,
        projectApiSweep: Array.isArray(projectResult.projectApiSweep)
          ? projectResult.projectApiSweep
          : [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: {
        phase: String((error && error.phase) || "endpoint_discovery"),
        authMode: requestContext.authMode || "cookie",
        status: Number((error && error.status) || 0),
        endpoint: String((error && error.endpoint) || ""),
        message: String((error && error.message) || "api_unknown_error"),
        endpointTried: Array.isArray(error && error.endpointTried)
          ? error.endpointTried
          : endpointTried,
      },
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    addConversationToProject,
    archiveConversation,
    createConversationShareLink,
    deleteConversation,
    renameConversation,
    cgptBuildSidebarApiRequestContext,
    cgptFetchSessionContext,
    cgptFetchSidebarApiSnapshot,
    cgptIsConversationPayloadShape,
    cgptIsProjectPayloadShape,
    cgptIsSidebarApiProjectSlugName,
    cgptExtractNormalizedProjectConversationsFromPayload,
    cgptMergeNormalizedSidebarConversations,
    cgptNormalizeSidebarApiConversation,
    cgptNormalizeSidebarApiProject,
    cgptResolveSidebarApiAbsoluteUrl,
  };
}
