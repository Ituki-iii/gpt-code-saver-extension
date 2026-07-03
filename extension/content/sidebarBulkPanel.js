function cgptCreateSidebarBulkToggleButton() {
  const existing = document.getElementById("cgpt-helper-sidebar-bulk-toggle");
  if (existing) {
    if (typeof cgptDisableSharedButtonMotion === "function") {
      cgptDisableSharedButtonMotion(existing);
    }
    existing.style.transition = "none";
    existing.style.animation = "none";
    existing.style.transform = "none";
    return existing;
  }
  const button =
    typeof cgptCreateSharedChipButton === "function"
      ? cgptCreateSharedChipButton("Bulk Chats", "md")
      : document.createElement("button");
  button.id = "cgpt-helper-sidebar-bulk-toggle";
  button.textContent = "Bulk Chats";
  button.style.position = "fixed";
  button.style.right = "344px";
  button.style.bottom = "16px";
  button.style.zIndex = "9999";
  button.style.minWidth = "88px";
  button.style.padding = "0 14px";
  if (typeof cgptDisableSharedButtonMotion === "function") {
    cgptDisableSharedButtonMotion(button);
  }
  button.style.transition = "none";
  button.style.animation = "none";
  button.style.transform = "none";
  return button;
}

function cgptOpenSidebarBulkPanel() {
  let panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
  if (!panel) {
    panel = cgptCreateSidebarBulkPanel();
    document.body.appendChild(panel);
  }
  panel.style.display = "flex";
  cgptRenderSidebarBulkPanel();
  return panel;
}

function cgptCloseSidebarBulkPanel() {
  const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
  if (panel) {
    panel.style.display = "none";
  }
}

function cgptGetSidebarBulkDebugSnapshot(fallback = {}) {
  return typeof cgptGetSidebarConversationSnapshot === "function"
    ? cgptGetSidebarConversationSnapshot()
    : {
        sidebarFound: false,
        conversations: [],
        projects: [],
        diagnostics: null,
        ...fallback,
      };
}

function cgptBuildSidebarBulkDebugSnapshotSummary(snapshot = {}) {
  return {
    sidebarFound: Boolean(snapshot.sidebarFound),
    conversationCount: Array.isArray(snapshot.conversations) ? snapshot.conversations.length : 0,
    projectCount: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
    source: snapshot.source || "",
    debugBuild: snapshot.debugBuild || "",
    updatedAt: snapshot.updatedAt || 0,
  };
}

function cgptSerializeSidebarBulkDebugProjects(projects = []) {
  return (Array.isArray(projects) ? projects : []).map((project) => ({
    id: project && project.id ? String(project.id) : "",
    name: project && project.name ? String(project.name) : "",
    isCurrent: Boolean(project && project.isCurrent),
    raw: project && project.raw ? project.raw : null,
  }));
}

function cgptSerializeSidebarBulkDebugConversations(conversations = []) {
  return (Array.isArray(conversations) ? conversations : []).map((conversation) => ({
    id: conversation && conversation.id ? String(conversation.id) : "",
    title: conversation && conversation.title ? String(conversation.title) : "",
    projectId: conversation && conversation.projectId ? String(conversation.projectId) : "",
    projectName: conversation && conversation.projectName ? String(conversation.projectName) : "",
    isProjectItem: Boolean(conversation && conversation.isProjectItem),
  }));
}

async function cgptExportSidebarBulkDebugPayload(payload, labels = {}) {
  const copied =
    typeof cgptCopySidebarApiDebugJson === "function" &&
    await cgptCopySidebarApiDebugJson(payload, { allowTextareaFallback: true });
  if (copied) {
    showToast(labels.copied || "Debug copied to clipboard.", "success");
    return;
  }
  const exported =
    typeof cgptDownloadSidebarApiDebugJson === "function" &&
    await cgptDownloadSidebarApiDebugJson(payload);
  showToast(
    exported ? (labels.downloaded || "Debug downloaded.") : (labels.failed || "Debug export failed."),
    exported ? "success" : "error"
  );
}

async function cgptExportSidebarApiDebug() {
  const snapshot = cgptGetSidebarBulkDebugSnapshot();
  const diagnostics =
    snapshot.diagnostics ||
    (typeof cgptGetSidebarApiDiagnostics === "function" ? cgptGetSidebarApiDiagnostics() : null);
  const payload = diagnostics
    ? {
        ...diagnostics,
        snapshotSummary: cgptBuildSidebarBulkDebugSnapshotSummary(snapshot),
        requestTrace: snapshot.requestTrace || null,
        projectApiSweep: snapshot.projectApiSweep || null,
        projectIframeSweep: snapshot.projectIframeSweep || null,
        projects: cgptSerializeSidebarBulkDebugProjects(snapshot.projects),
        conversations: cgptSerializeSidebarBulkDebugConversations(snapshot.conversations),
      }
    : {
        timestamp: new Date().toISOString(),
        phase: "snapshot",
        authMode: "unknown",
        status: 0,
        endpoint: "",
        message: snapshot.sidebarFound
          ? ((Array.isArray(snapshot.projects) && snapshot.projects.length > 0)
              ? "snapshot_available_without_diagnostics"
              : "api_projects_missing_from_snapshot")
          : "no_api_diagnostics_yet",
        endpointTried: [],
        snapshotSummary: cgptBuildSidebarBulkDebugSnapshotSummary(snapshot),
        requestTrace: snapshot.requestTrace || null,
        projectApiSweep: snapshot.projectApiSweep || null,
        projectIframeSweep: snapshot.projectIframeSweep || null,
        projects: cgptSerializeSidebarBulkDebugProjects(snapshot.projects),
        conversations: cgptSerializeSidebarBulkDebugConversations(snapshot.conversations),
      };
  await cgptExportSidebarBulkDebugPayload(payload, {
    copied: "API debug copied to clipboard.",
    downloaded: "API debug downloaded.",
    failed: "API debug export failed.",
  });
}

async function cgptExportSidebarMoveDebug() {
  const snapshot = cgptGetSidebarBulkDebugSnapshot();
  const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  const payload = {
    timestamp: new Date().toISOString(),
    phase: "project_move_debug",
    snapshotSummary: cgptBuildSidebarBulkDebugSnapshotSummary(snapshot),
    lastResult: state && state.lastResult ? state.lastResult : null,
    projectMoveDebugLog:
      typeof cgptGetSidebarProjectMoveDebugLog === "function"
        ? cgptGetSidebarProjectMoveDebugLog()
        : [],
    projects: cgptSerializeSidebarBulkDebugProjects(snapshot.projects),
    conversations: cgptSerializeSidebarBulkDebugConversations(snapshot.conversations),
  };
  await cgptExportSidebarBulkDebugPayload(payload, {
    copied: "Move debug copied to clipboard.",
    downloaded: "Move debug downloaded.",
    failed: "Move debug export failed.",
  });
}

function cgptRegisterSidebarBulkDebugMessageHandler() {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.onMessage ||
    window.__cgptSidebarBulkDebugMessageHandlerRegistered
  ) {
    return;
  }
  window.__cgptSidebarBulkDebugMessageHandlerRegistered = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) {
      return false;
    }
    if (message.type === "cgptExportSidebarApiDebug") {
      cgptExportSidebarApiDebug()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({
          ok: false,
          error: String((error && error.message) || "api_debug_export_failed"),
        }));
      return true;
    }
    if (message.type === "cgptExportSidebarMoveDebug") {
      cgptExportSidebarMoveDebug()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({
          ok: false,
          error: String((error && error.message) || "move_debug_export_failed"),
        }));
      return true;
    }
    return false;
  });
}

cgptRegisterSidebarBulkDebugMessageHandler();

function cgptCreateSidebarBulkPanel() {
  const panel = document.createElement("div");
  panel.id = "cgpt-helper-sidebar-bulk-panel";
  panel.style.position = "fixed";
  panel.style.right = "216px";
  panel.style.bottom = "72px";
  panel.style.zIndex = "9999";
  panel.style.boxSizing = "border-box";
  panel.style.borderRadius = "8px";
  panel.style.padding = "8px";
  panel.style.fontSize = "12px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.width = "min(760px, calc(100vw - 48px))";
  panel.style.maxWidth = "760px";
  panel.style.height = "min(620px, calc(100vh - 112px))";
  panel.style.maxHeight = "calc(100vh - 112px)";
  panel.style.overflow = "hidden";
  panel.style.backdropFilter = "blur(8px)";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(panel, "panel");
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "6px";

  const title = document.createElement("div");
  title.textContent = "Bulk Chats";
  title.style.flex = "1";
  title.style.fontWeight = "700";
  title.style.fontSize = "13px";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(title, "primary");
  }
  header.appendChild(title);

  const refreshButton = createPanelButton("Refresh", "secondary");
  refreshButton.id = "cgpt-helper-sidebar-bulk-refresh";
  refreshButton.addEventListener("click", () => {
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document, { forceRefresh: true });
    }
    cgptRenderSidebarBulkPanel();
  });
  header.appendChild(refreshButton);

  const hideButton = createPanelButton("Hide", "ghost");
  hideButton.addEventListener("click", () => cgptCloseSidebarBulkPanel());
  header.appendChild(hideButton);
  panel.appendChild(header);

  const summary = document.createElement("div");
  summary.id = "cgpt-helper-sidebar-bulk-summary";
  summary.style.fontSize = "11px";
  summary.style.lineHeight = "1.45";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(summary, "secondary");
  }
  panel.appendChild(summary);

  const selectionSection = document.createElement("div");
  selectionSection.id = "cgpt-helper-sidebar-bulk-selection-section";
  selectionSection.style.display = "flex";
  selectionSection.style.flexDirection = "column";
  selectionSection.style.gap = "6px";
  selectionSection.style.padding = "8px";
  selectionSection.style.borderRadius = "10px";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(selectionSection, "subtle");
  }
  const selectionLabel = document.createElement("div");
  selectionLabel.textContent = "Filter & Selection";
  selectionLabel.style.fontSize = "11px";
  selectionLabel.style.fontWeight = "700";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(selectionLabel, "secondary");
  }
  selectionSection.appendChild(selectionLabel);
  const selectionControls = createButtonRow();
  selectionControls.id = "cgpt-helper-sidebar-bulk-selection-controls";
  selectionControls.style.flexWrap = "nowrap";
  selectionSection.appendChild(selectionControls);
  panel.appendChild(selectionSection);

  const projectControls = document.createElement("div");
  projectControls.id = "cgpt-helper-sidebar-bulk-project-controls";
  projectControls.style.display = "flex";
  projectControls.style.flexDirection = "column";
  projectControls.style.gap = "6px";
  panel.appendChild(projectControls);

  const actionSection = document.createElement("div");
  actionSection.id = "cgpt-helper-sidebar-bulk-action-section";
  actionSection.style.display = "flex";
  actionSection.style.flexDirection = "column";
  actionSection.style.gap = "6px";
  actionSection.style.padding = "8px";
  actionSection.style.borderRadius = "10px";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(actionSection, "subtle");
  }
  const actionLabel = document.createElement("div");
  actionLabel.textContent = "Chat Actions";
  actionLabel.style.fontSize = "11px";
  actionLabel.style.fontWeight = "700";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(actionLabel, "secondary");
  }
  actionSection.appendChild(actionLabel);
  const actionControls = createButtonRow();
  actionControls.id = "cgpt-helper-sidebar-bulk-action-controls";
  actionControls.style.flexWrap = "nowrap";
  actionSection.appendChild(actionControls);
  panel.appendChild(actionSection);

  const filterRow = document.createElement("div");
  filterRow.id = "cgpt-helper-sidebar-bulk-filter-row";
  filterRow.style.display = "flex";
  filterRow.style.alignItems = "center";
  filterRow.style.gap = "6px";

  const projectFilter = document.createElement("select");
  projectFilter.id = "cgpt-helper-sidebar-bulk-project-filter";
  projectFilter.title = "Filter by project";
  projectFilter.setAttribute("aria-label", "Filter by project");
  projectFilter.style.flex = "0 0 138px";
  projectFilter.style.minWidth = "0";
  projectFilter.style.minHeight = "30px";
  projectFilter.style.padding = "0 8px";
  projectFilter.style.borderRadius = "8px";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(projectFilter);
  }
  projectFilter.addEventListener("change", (event) => {
    if (typeof cgptSetSidebarBulkProjectFilter === "function") {
      cgptSetSidebarBulkProjectFilter(event.target.value || "");
    }
  });
  filterRow.appendChild(projectFilter);

  const input = document.createElement("input");
  input.id = "cgpt-helper-sidebar-bulk-search";
  input.type = "search";
  input.placeholder = "Filter by title / project / id";
  input.style.flex = "1";
  input.style.minWidth = "0";
  input.style.minHeight = "30px";
  input.style.padding = "6px 10px";
  input.style.borderRadius = "8px";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(input);
  }
  input.addEventListener("input", (event) => {
    if (typeof cgptSetSidebarBulkQuery === "function") {
      cgptSetSidebarBulkQuery(event.target.value || "");
    }
  });
  filterRow.appendChild(input);

  const inlineSelectionControls = createButtonRow();
  inlineSelectionControls.id = "cgpt-helper-sidebar-bulk-inline-selection-controls";
  inlineSelectionControls.style.flexWrap = "nowrap";
  inlineSelectionControls.style.width = "auto";
  inlineSelectionControls.style.flexShrink = "0";
  filterRow.appendChild(inlineSelectionControls);
  panel.appendChild(filterRow);

  const titleBatchControls = document.createElement("div");
  titleBatchControls.id = "cgpt-helper-sidebar-bulk-title-batch-controls";
  titleBatchControls.style.display = "flex";
  titleBatchControls.style.flexDirection = "column";
  titleBatchControls.style.gap = "6px";
  panel.appendChild(titleBatchControls);

  const list = document.createElement("div");
  list.id = "cgpt-helper-sidebar-bulk-list";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.flex = "1";
  list.style.minHeight = "0";
  list.style.gap = "6px";
  list.style.overflowY = "auto";
  list.style.paddingRight = "2px";
  panel.appendChild(list);

  const results = document.createElement("div");
  results.id = "cgpt-helper-sidebar-bulk-results";
  results.style.display = "flex";
  results.style.flexDirection = "column";
  results.style.gap = "4px";
  results.style.flexShrink = "0";
  results.style.minHeight = "0";
  results.style.maxHeight = "96px";
  results.style.overflowY = "auto";
  panel.appendChild(results);
  return panel;
}

function cgptSidebarBulkCreateControlButton(label, variant, onClick) {
  const button = createPanelButton(label, variant);
  button.style.flex = "1";
  button.style.minWidth = "0";
  button.addEventListener("click", onClick);
  return button;
}

function cgptSyncSidebarProjectSelectEnabled(panel, snapshot, state) {
  if (!panel) return;
  const select = panel.querySelector("#cgpt-helper-sidebar-bulk-project-select");
  if (!select) return;
  select.disabled = !snapshot.sidebarFound || !snapshot.projects.length || state.runningAction !== "";
}

function cgptWatchSidebarProjectCreationDialog(panel) {
  if (!panel) return;
  if (panel.__cgptSidebarProjectDialogWatchTimer) {
    clearInterval(panel.__cgptSidebarProjectDialogWatchTimer);
  }
  let sawDialog = false;
  let ticks = 0;
  panel.__cgptSidebarProjectDialogWatchTimer = setInterval(() => {
    ticks += 1;
    const hasDialog = typeof cgptHasOpenSidebarDialog === "function" && cgptHasOpenSidebarDialog();
    if (hasDialog) {
      sawDialog = true;
      return;
    }
    if (!sawDialog && ticks < 20) {
      return;
    }
    clearInterval(panel.__cgptSidebarProjectDialogWatchTimer);
    panel.__cgptSidebarProjectDialogWatchTimer = null;
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document, { forceRefresh: true });
    }
    const snapshot =
      typeof cgptGetSidebarConversationSnapshot === "function"
        ? cgptGetSidebarConversationSnapshot()
        : { sidebarFound: false, conversations: [], projects: [] };
    const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
    if (!state) return;
    cgptSyncSidebarProjectSelectEnabled(panel, snapshot, state);
    cgptRenderSidebarBulkPanel();
  }, 150);
}

async function cgptHandleOpenSidebarProjectCreation() {
  const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
  const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  if (state && typeof cgptSetSidebarBulkProjectTarget === "function") {
    cgptSetSidebarBulkProjectTarget({
      mode: "existing",
      projectId: state.projectTarget ? state.projectTarget.projectId : "",
      projectName: state.projectTarget ? state.projectTarget.projectName : "",
      projectOriginalName: state.projectTarget ? state.projectTarget.projectOriginalName : "",
      projectDetailName: state.projectTarget ? state.projectTarget.projectDetailName : "",
    });
  }
  const opened = typeof cgptOpenSidebarProjectCreationUi === "function"
    ? await cgptOpenSidebarProjectCreationUi()
    : false;
  if (!opened) {
    showToast("Could not open the ChatGPT project UI.", "error");
    return;
  }
  cgptWatchSidebarProjectCreationDialog(panel);
}

async function cgptHandleSidebarConversationRename(conversation) {
  const currentTitle = String((conversation && conversation.title) || "").trim();
  const nextTitle =
    typeof window !== "undefined" && typeof window.prompt === "function"
      ? window.prompt("Rename chat", currentTitle)
      : "";
  if (nextTitle === null) {
    return;
  }
  const normalizedTitle = String(nextTitle || "").trim();
  if (!normalizedTitle || normalizedTitle === currentTitle) {
    return;
  }
  try {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("rename");
    }
    if (typeof cgptRenameSidebarConversation !== "function") {
      throw new Error("failed_action_not_found");
    }
    await cgptRenameSidebarConversation(conversation, normalizedTitle);
    showToast("Chat renamed.", "success");
  } catch (error) {
    showToast(`Rename failed: ${error && error.message ? error.message : "unknown"}`, "error");
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document, { forceRefresh: true });
    }
    cgptRenderSidebarBulkPanel();
  }
}

async function cgptHandleSidebarConversationShareLink(conversation) {
  try {
    const conversationId = String((conversation && (conversation.conversationId || conversation.id)) || "").trim();
    if (!conversationId) {
      throw new Error("conversation_id_missing");
    }
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("share");
    }
    if (typeof createConversationShareLink !== "function") {
      throw new Error("share_action_not_found");
    }
    const result = await createConversationShareLink(conversationId, conversation.currentNodeId || "");
    const shareUrl = String((result && result.shareUrl) || "").trim();
    if (!shareUrl) {
      throw new Error("share_url_missing");
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.", "success");
    } else {
      showToast(`Share link created: ${shareUrl}`, "success");
    }
  } catch (error) {
    showToast(`Share link failed: ${error && error.message ? error.message : "unknown"}`, "error");
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    cgptRenderSidebarBulkPanel();
  }
}

async function cgptHandleSidebarConversationArchive(conversation) {
  try {
    const conversationId = String((conversation && (conversation.conversationId || conversation.id)) || "").trim();
    if (!conversationId) {
      throw new Error("conversation_id_missing");
    }
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("archive");
    }
    if (typeof archiveConversation !== "function") {
      throw new Error("archive_action_not_found");
    }
    await archiveConversation(conversationId);
    showToast("Chat archived.", "success");
  } catch (error) {
    showToast(`Archive failed: ${error && error.message ? error.message : "unknown"}`, "error");
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    cgptRenderSidebarBulkPanel();
  }
}

function cgptSyncSidebarBulkSelectionSummary(panel, snapshot, state) {
  if (!panel) return;
  const visibleConversations = cgptFilterSidebarConversations(
    snapshot.conversations,
    state.query,
    state.projectFilter
  );
  const selectionSummary = cgptSummarizeSidebarSelection(
    snapshot.conversations,
    state.selectedConversationIds
  );
  const summary = panel.querySelector("#cgpt-helper-sidebar-bulk-summary");
  const isLoading =
    typeof cgptIsSidebarConversationRefreshPending === "function" &&
    cgptIsSidebarConversationRefreshPending();
  const diagnostics =
    snapshot.diagnostics ||
    (typeof cgptGetSidebarApiDiagnostics === "function" ? cgptGetSidebarApiDiagnostics() : null);
  if (summary) {
    summary.textContent = isLoading
      ? "Loading ChatGPT internal API..."
      : snapshot.sidebarFound
      ? `Visible ${selectionSummary.totalCount} / Filtered ${visibleConversations.length} / Selected ${selectionSummary.selectedCount} / Project ${selectionSummary.projectCount}`
      : `Internal API unavailable${diagnostics ? ` / ${diagnostics.phase} / ${diagnostics.message}` : ""}`;
  }
}

function cgptCollectSidebarBulkProjectFilterOptions(snapshot = {}) {
  const optionMap = new Map();
  (Array.isArray(snapshot.projects) ? snapshot.projects : []).forEach((project) => {
    const id = String((project && project.id) || "").trim();
    const name = String((project && project.name) || "").trim();
    if (!id && !name) return;
    optionMap.set(id || name, name || id);
  });
  (Array.isArray(snapshot.conversations) ? snapshot.conversations : []).forEach((conversation) => {
    const projectId = String((conversation && conversation.projectId) || "").trim();
    const projectName = String((conversation && conversation.projectName) || "").trim();
    if (!projectId && !projectName) return;
    optionMap.set(projectId || projectName, projectName || projectId);
  });
  return Array.from(optionMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function cgptRenderSidebarBulkProjectFilter(panel, snapshot, state) {
  if (!panel) return;
  const select = panel.querySelector("#cgpt-helper-sidebar-bulk-project-filter");
  if (!select) return;
  const options = [
    { value: "", label: "All projects" },
    { value: "__none__", label: "No project" },
    ...cgptCollectSidebarBulkProjectFilterOptions(snapshot),
  ];
  const optionSignature = options.map((option) => `${option.value}:${option.label}`).join("|");
  if (select.dataset.cgptOptionSignature !== optionSignature) {
    select.replaceChildren();
    options.forEach((option) => {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.dataset.cgptOptionSignature = optionSignature;
  }
  const values = new Set(options.map((option) => option.value));
  const nextValue = values.has(state.projectFilter) ? state.projectFilter : "";
  if (select.value !== nextValue) {
    select.value = nextValue;
  }
  select.disabled = state.runningAction !== "" || !snapshot.sidebarFound;
}

function cgptSyncSidebarBulkCheckboxes(panel, state) {
  if (!panel) return;
  Array.from(panel.querySelectorAll("#cgpt-helper-sidebar-bulk-list input[type='checkbox']")).forEach((checkbox) => {
    const key = String(checkbox.dataset.cgptConversationKey || "");
    if (!key) return;
    checkbox.checked = cgptIsSidebarConversationSelected(key);
    checkbox.disabled = state.runningAction !== "";
  });
}

function cgptUpdateSidebarBulkSelectionUi() {
  const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
  if (!panel) return;
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { sidebarFound: false, conversations: [] };
  const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  if (!state) return;
  cgptSyncSidebarBulkSelectionSummary(panel, snapshot, state);
  cgptSyncSidebarBulkCheckboxes(panel, state);
}

function cgptToggleSidebarBulkConversationSelection(selectionKey, checkbox) {
  const nextChecked = !cgptIsSidebarConversationSelected(selectionKey);
  cgptSetSidebarConversationSelected(selectionKey, nextChecked);
  if (checkbox) {
    checkbox.checked = nextChecked;
  }
}

function cgptCreateSidebarBulkRowIconButton({ icon, title, ariaLabel, disabled, onClick, top = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = icon;
  button.title = title;
  button.setAttribute("aria-label", ariaLabel);
  button.style.flexShrink = "0";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.margin = "0";
  button.style.padding = "0";
  button.style.border = "none";
  button.style.background = "transparent";
  button.style.boxShadow = "none";
  button.style.borderRadius = "0";
  button.style.minWidth = "auto";
  button.style.width = "auto";
  button.style.minHeight = "auto";
  button.style.lineHeight = "1";
  button.style.fontSize = "12px";
  button.style.cursor = disabled ? "default" : "pointer";
  button.style.transform = "none";
  button.style.verticalAlign = "baseline";
  if (top) {
    button.style.position = "relative";
    button.style.top = top;
  }
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(button, "muted");
  }
  button.disabled = Boolean(disabled);
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!button.disabled && typeof onClick === "function") {
      onClick(event);
    }
  });
  return button;
}

function cgptResolveSidebarBulkSelectedProject() {
  const select = document.getElementById("cgpt-helper-sidebar-bulk-project-select");
  if (!select || !select.value) {
    return null;
  }
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { projects: [] };
  return snapshot.projects.find((project) => project.id === select.value) || null;
}

async function cgptHandleSidebarBulkAction(action) {
  let state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  if (!state || !state.selectedConversationIds || state.selectedConversationIds.size === 0) {
    showToast("No chats selected.", "error");
    return;
  }
  if (action === "project") {
    const selectedProject = cgptResolveSidebarBulkSelectedProject();
    if (!selectedProject) {
      showToast("Select a project first.", "error");
      return;
    }
    if (typeof cgptSetSidebarBulkProjectTarget === "function") {
      cgptSetSidebarBulkProjectTarget({
        mode: "existing",
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        projectOriginalName: selectedProject.raw ? selectedProject.raw.originalName : "",
        projectDetailName: selectedProject.raw ? selectedProject.raw.detailName : "",
      });
      state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : state;
    }
  }
  if (typeof cgptSetSidebarBulkRunningAction === "function") {
    cgptSetSidebarBulkRunningAction(action);
  }
  try {
    const result = await cgptRunSidebarBulkAction({
      action,
      conversationIds: Array.from(state.selectedConversationIds),
      projectTarget: state.projectTarget,
    });
    if (typeof cgptSetSidebarBulkResult === "function") {
      cgptSetSidebarBulkResult(result);
    }
    const tone = result.counts.failed > 0 ? "error" : "success";
    showToast(
      `${action}: ${result.counts.success} success, ${result.counts.failed} failed, ${result.counts.skipped} skipped`,
      tone
    );
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document, { forceRefresh: true });
    }
    if (
      typeof cgptGetSidebarConversationSnapshot === "function" &&
      typeof cgptPruneSidebarConversationSelection === "function"
    ) {
      const refreshedSnapshot = cgptGetSidebarConversationSnapshot();
      cgptPruneSidebarConversationSelection(refreshedSnapshot.conversations);
    }
    cgptRenderSidebarBulkPanel();
  }
}

async function cgptHandleSidebarBulkTitleUpdate() {
  const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  if (!state || !state.selectedConversationIds || state.selectedConversationIds.size === 0) {
    showToast("No chats selected.", "error");
    return;
  }
  if (typeof cgptSetSidebarBulkRunningAction === "function") {
    cgptSetSidebarBulkRunningAction("titleBatch");
  }
  try {
    const result =
      typeof cgptRunSidebarBulkTitleUpdate === "function"
        ? await cgptRunSidebarBulkTitleUpdate({
            conversationIds: Array.from(state.selectedConversationIds),
            prefix: state.titleBatchPrefix,
            suffix: state.titleBatchSuffix,
          })
        : null;
    if (typeof cgptSetSidebarBulkResult === "function") {
      cgptSetSidebarBulkResult(result);
    }
    if (result) {
      const tone = result.counts.failed > 0 ? "error" : "success";
      showToast(
        `titleBatch: ${result.counts.success} success, ${result.counts.failed} failed, ${result.counts.skipped} skipped`,
        tone
      );
      if (
        typeof cgptSetSidebarBulkTitleBatchEditorVisible === "function" &&
        result.counts.success > 0 &&
        result.counts.failed === 0
      ) {
        cgptSetSidebarBulkTitleBatchEditorVisible(false);
      }
    }
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document, { forceRefresh: true });
    }
    cgptRenderSidebarBulkPanel();
  }
}

function cgptRenderSidebarBulkProjectControls(panel, snapshot, state) {
  const host = panel.querySelector("#cgpt-helper-sidebar-bulk-project-controls");
  if (!host) return;
  let row = host.querySelector("[data-cgpt-project-controls-row='1']");
  let select = host.querySelector("#cgpt-helper-sidebar-bulk-project-select");
  let newButton = host.querySelector("#cgpt-helper-sidebar-bulk-project-toggle");

  if (!row) {
    host.replaceChildren();
    row = document.createElement("div");
    row.dataset.cgptProjectControlsRow = "1";
    row.style.display = "flex";
    row.style.flexDirection = "row";
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.style.flexWrap = "wrap";

    select = document.createElement("select");
    select.id = "cgpt-helper-sidebar-bulk-project-select";
    select.style.flex = "1";
    select.style.minWidth = "180px";
    select.style.minHeight = "30px";
    select.style.boxSizing = "border-box";
    select.style.borderRadius = "8px";
    select.style.padding = "0 8px";
    if (typeof cgptApplyPanelInputStyle === "function") {
      cgptApplyPanelInputStyle(select);
    }
    select.addEventListener("change", (event) => {
      const latestSnapshot =
        typeof cgptGetSidebarConversationSnapshot === "function"
          ? cgptGetSidebarConversationSnapshot()
          : { projects: [] };
      const project = latestSnapshot.projects.find((item) => item.id === event.target.value);
      if (typeof cgptSetSidebarBulkProjectTarget === "function") {
        cgptSetSidebarBulkProjectTarget({
          mode: "existing",
          projectId: project ? project.id : "",
          projectName: project ? project.name : "",
          projectOriginalName: project && project.raw ? project.raw.originalName : "",
          projectDetailName: project && project.raw ? project.raw.detailName : "",
        });
      }
    });
    row.appendChild(select);

    newButton = createPanelButton("+ New Project", "secondary");
    newButton.id = "cgpt-helper-sidebar-bulk-project-toggle";
    newButton.style.flexShrink = "0";
    newButton.style.whiteSpace = "nowrap";
    newButton.addEventListener("click", () => {
      cgptHandleOpenSidebarProjectCreation();
    });
    row.appendChild(newButton);
    host.appendChild(row);
  }

  const currentValue = state.projectTarget.mode === "existing" ? state.projectTarget.projectId : "";
  const optionSignature = snapshot.projects.map((project) => `${project.id}:${project.name}`).join("|");
  if (select.dataset.cgptOptionSignature !== optionSignature) {
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = snapshot.projects.length ? "Select project" : "Project unavailable";
    select.appendChild(placeholder);
    snapshot.projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      select.appendChild(option);
    });
    select.dataset.cgptOptionSignature = optionSignature;
  }
  select.value = currentValue;
  cgptSyncSidebarProjectSelectEnabled(panel, snapshot, state);
}

function cgptGetSidebarBulkLayoutMode(panel) {
  const width = panel && typeof panel.getBoundingClientRect === "function"
    ? panel.getBoundingClientRect().width
    : 0;
  return width > 0 && width < 700 ? "compact" : "regular";
}

function cgptRenderSidebarBulkControls(panel, visibleConversations, state) {
  const selectionSection = panel.querySelector("#cgpt-helper-sidebar-bulk-selection-section");
  const selectionControls = panel.querySelector("#cgpt-helper-sidebar-bulk-inline-selection-controls");
  const actionControls = panel.querySelector("#cgpt-helper-sidebar-bulk-action-controls");
  if (!selectionControls || !actionControls || !selectionSection) return;
  selectionControls.replaceChildren();
  actionControls.replaceChildren();
  selectionSection.style.display = "none";
  selectionControls.style.flexWrap = "wrap";
  actionControls.style.flexWrap = "wrap";
  selectionControls.appendChild(
    cgptSidebarBulkCreateControlButton("Select All", "secondary", () => {
      cgptAddVisibleSidebarConversationSelections(
        visibleConversations.map((conversation) => cgptGetSidebarConversationSelectionKey(conversation))
      );
    })
  );
  selectionControls.appendChild(
    cgptSidebarBulkCreateControlButton("Clear", "ghost", () => {
      cgptClearSidebarConversationSelection();
    })
  );
  actionControls.appendChild(
    cgptSidebarBulkCreateControlButton("Archive Selected", "secondary", () => {
      cgptHandleSidebarBulkAction("archive");
    })
  );
  actionControls.appendChild(
    cgptSidebarBulkCreateControlButton("Delete Selected", "danger", () => {
      cgptHandleSidebarBulkAction("delete");
    })
  );
  actionControls.appendChild(
    cgptSidebarBulkCreateControlButton("Add to Project", "primary", () => {
      cgptHandleSidebarBulkAction("project");
    })
  );
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { sidebarFound: false };
  Array.from(panel.querySelectorAll("#cgpt-helper-sidebar-bulk-selection-controls button, #cgpt-helper-sidebar-bulk-action-controls button")).forEach((button) => {
    button.disabled = state.runningAction !== "" || !snapshot.sidebarFound;
  });
}

function cgptRenderSidebarBulkTitleBatchControls(panel, state) {
  const host = panel.querySelector("#cgpt-helper-sidebar-bulk-title-batch-controls");
  if (!host) return;
  host.replaceChildren();
  if (!state.showTitleBatchEditor) {
    const section = document.createElement("div");
    section.style.display = "flex";
    section.style.flexDirection = "column";
    section.style.gap = "6px";
    section.style.padding = "8px";
    section.style.borderRadius = "10px";
    section.style.boxSizing = "border-box";
    if (typeof cgptApplySurfaceStyle === "function") {
      cgptApplySurfaceStyle(section, "subtle");
    }
    const openButton = createPanelButton("Bulk Rename", "secondary");
    openButton.disabled = state.runningAction !== "";
    openButton.style.width = "100%";
    openButton.style.boxSizing = "border-box";
    openButton.addEventListener("click", () => {
      if (typeof cgptSetSidebarBulkTitleBatchEditorVisible === "function") {
        cgptSetSidebarBulkTitleBatchEditorVisible(true);
      }
    });
    section.appendChild(openButton);
    host.appendChild(section);
    return;
  }

  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";
  section.style.padding = "8px";
  section.style.boxSizing = "border-box";
  section.style.borderRadius = "10px";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(section, "subtle");
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "6px";
  header.style.flexWrap = "wrap";

  const label = document.createElement("div");
  label.textContent = "Bulk Rename";
  label.style.fontSize = "11px";
  label.style.fontWeight = "700";
  label.style.flex = "1";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(label, "secondary");
  }
  header.appendChild(label);

  const cancelButton = createPanelButton("Close", "ghost");
  cancelButton.disabled = state.runningAction !== "";
  cancelButton.addEventListener("click", () => {
    if (typeof cgptSetSidebarBulkTitleBatchEditorVisible === "function") {
      cgptSetSidebarBulkTitleBatchEditorVisible(false);
    }
  });
  header.appendChild(cancelButton);
  section.appendChild(header);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.alignItems = "center";
  row.style.flexWrap = "wrap";

  const prefixInput = document.createElement("input");
  prefixInput.type = "text";
  prefixInput.placeholder = "Prefix";
  prefixInput.value = state.titleBatchPrefix || "";
  prefixInput.disabled = state.runningAction !== "";
  prefixInput.style.flex = "1";
  prefixInput.style.minWidth = "0";
  prefixInput.style.width = "0";
  prefixInput.style.minHeight = "30px";
  prefixInput.style.boxSizing = "border-box";
  prefixInput.style.padding = "6px 10px";
  prefixInput.style.borderRadius = "8px";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(prefixInput);
  }
  prefixInput.addEventListener("input", (event) => {
    if (typeof cgptSetSidebarBulkTitleBatchPrefix === "function") {
      cgptSetSidebarBulkTitleBatchPrefix(event.target.value || "");
    }
  });
  row.appendChild(prefixInput);

  const suffixInput = document.createElement("input");
  suffixInput.type = "text";
  suffixInput.placeholder = "Suffix";
  suffixInput.value = state.titleBatchSuffix || "";
  suffixInput.disabled = state.runningAction !== "";
  suffixInput.style.flex = "1";
  suffixInput.style.minWidth = "0";
  suffixInput.style.width = "0";
  suffixInput.style.minHeight = "30px";
  suffixInput.style.boxSizing = "border-box";
  suffixInput.style.padding = "6px 10px";
  suffixInput.style.borderRadius = "8px";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(suffixInput);
  }
  suffixInput.addEventListener("input", (event) => {
    if (typeof cgptSetSidebarBulkTitleBatchSuffix === "function") {
      cgptSetSidebarBulkTitleBatchSuffix(event.target.value || "");
    }
  });
  row.appendChild(suffixInput);

  const applyButton = createPanelButton("Apply", "primary");
  applyButton.disabled = state.runningAction !== "";
  applyButton.style.flexShrink = "0";
  applyButton.style.whiteSpace = "nowrap";
  applyButton.addEventListener("click", () => {
    cgptHandleSidebarBulkTitleUpdate();
  });
  row.appendChild(applyButton);

  section.appendChild(row);
  host.appendChild(section);
}

function cgptRenderSidebarBulkList(panel, visibleConversations, state) {
  const list = panel.querySelector("#cgpt-helper-sidebar-bulk-list");
  if (!list) return;
  const layoutMode = cgptGetSidebarBulkLayoutMode(panel);
  const isCompactLayout = layoutMode === "compact";
  const previousScrollTop = list.scrollTop;
  list.replaceChildren();
  if (!visibleConversations.length) {
    const empty = document.createElement("div");
    empty.textContent = "No visible chats match the current filter.";
    empty.style.padding = "10px";
    empty.style.borderRadius = "10px";
    if (typeof cgptApplySurfaceStyle === "function") {
      cgptApplySurfaceStyle(empty, "subtle");
    }
    list.appendChild(empty);
    list.scrollTop = 0;
    return;
  }
  visibleConversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = isCompactLayout
      ? "18px minmax(0, 1fr) minmax(120px, 180px)"
      : "18px minmax(0, 1fr) minmax(180px, 240px)";
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.style.padding = "3px 0";
    row.style.minWidth = "0";
    row.style.cursor = state.runningAction !== "" ? "default" : "pointer";
    row.style.borderBottom = "1px solid rgba(203, 213, 225, 0.55)";

    const selectionKey = cgptGetSidebarConversationSelectionKey(conversation);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.cgptConversationKey = selectionKey;
    checkbox.checked = cgptIsSidebarConversationSelected(selectionKey);
    checkbox.disabled = state.runningAction !== "";
    checkbox.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      cgptToggleSidebarBulkConversationSelection(selectionKey, checkbox);
    });
    row.appendChild(checkbox);

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "0";
    content.style.minWidth = "0";
    content.style.alignSelf = "stretch";

    const titleRow = document.createElement("div");
    titleRow.style.display = "grid";
    titleRow.style.gridTemplateColumns = isCompactLayout
      ? "88px minmax(0, 1fr)"
      : "120px minmax(0, 1fr)";
    titleRow.style.alignItems = "flex-start";
    titleRow.style.gap = "4px";
    titleRow.style.minWidth = "0";
    titleRow.style.width = "100%";

    const projectLabel = conversation.projectName || "-";
    const projectPrefix = document.createElement("div");
    projectPrefix.textContent = projectLabel;
    projectPrefix.title = conversation.projectName ? `Project: ${conversation.projectName}` : "No project";
    projectPrefix.style.fontSize = "11px";
    projectPrefix.style.lineHeight = "1.2";
    projectPrefix.style.whiteSpace = "normal";
    projectPrefix.style.overflowWrap = "anywhere";
    projectPrefix.style.wordBreak = "break-word";
    projectPrefix.style.width = "100%";
    projectPrefix.style.maxWidth = "100%";
    projectPrefix.style.minWidth = "0";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(projectPrefix, "muted");
    }
    titleRow.appendChild(projectPrefix);

    const titleActions = document.createElement("div");
    titleActions.style.display = "flex";
    titleActions.style.alignItems = "flex-start";
    titleActions.style.gap = "4px";
    titleActions.style.minWidth = "0";
    titleActions.style.overflow = "hidden";
    titleActions.style.flexWrap = "wrap";

    const title = document.createElement("div");
    title.textContent = conversation.title || "(untitled chat)";
    title.title = `${projectLabel} / ${title.textContent}`;
    title.style.fontWeight = "600";
    title.style.fontSize = "12px";
    title.style.lineHeight = "1.25";
    title.style.minWidth = "0";
    title.style.flex = "1 1 auto";
    title.style.display = "block";
    title.style.maxWidth = "100%";
    title.style.whiteSpace = "normal";
    title.style.overflowWrap = "anywhere";
    title.style.wordBreak = "break-word";
    titleActions.appendChild(title);

    const rowActionDisabled = state.runningAction !== "";
    const renameButton = cgptCreateSidebarBulkRowIconButton({
      icon: "✎",
      title: "Rename",
      ariaLabel: "Rename chat",
      disabled: rowActionDisabled,
      top: "-1px",
      onClick: () => cgptHandleSidebarConversationRename(conversation),
    });
    titleActions.appendChild(renameButton);

    const shareButton = cgptCreateSidebarBulkRowIconButton({
      icon: "🔗",
      title: "Create share link",
      ariaLabel: "Create share link",
      disabled: rowActionDisabled,
      onClick: () => cgptHandleSidebarConversationShareLink(conversation),
    });
    titleActions.appendChild(shareButton);

    const archiveButton = cgptCreateSidebarBulkRowIconButton({
      icon: "🗄",
      title: "Archive chat",
      ariaLabel: "Archive chat",
      disabled: rowActionDisabled,
      onClick: () => cgptHandleSidebarConversationArchive(conversation),
    });
    titleActions.appendChild(archiveButton);
    titleRow.appendChild(titleActions);
    content.appendChild(titleRow);

    const metaColumn = document.createElement("div");
    metaColumn.style.display = "flex";
    metaColumn.style.flexDirection = "column";
    metaColumn.style.alignItems = "flex-end";
    metaColumn.style.justifyContent = "center";
    metaColumn.style.textAlign = "right";
    metaColumn.style.width = "100%";
    metaColumn.style.minWidth = "0";
    metaColumn.style.maxWidth = "100%";
    metaColumn.style.gap = "2px";

    const idMeta = document.createElement("div");
    idMeta.textContent = conversation.conversationId || conversation.id;
    idMeta.title = idMeta.textContent;
    idMeta.style.fontSize = "11px";
    idMeta.style.whiteSpace = "nowrap";
    idMeta.style.overflow = "hidden";
    idMeta.style.textOverflow = "ellipsis";
    idMeta.style.maxWidth = "100%";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(idMeta, "muted");
    }
    metaColumn.appendChild(idMeta);

    const statusMeta = document.createElement("div");
    statusMeta.textContent = conversation.isActive ? "Current chat" : "";
    statusMeta.title = statusMeta.textContent;
    statusMeta.style.fontSize = "11px";
    statusMeta.style.whiteSpace = "nowrap";
    statusMeta.style.overflow = "hidden";
    statusMeta.style.textOverflow = "ellipsis";
    statusMeta.style.maxWidth = "100%";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(statusMeta, "muted");
    }
    if (statusMeta.textContent) {
      metaColumn.appendChild(statusMeta);
    }
    if (state.runningAction === "") {
      row.addEventListener("click", () => {
        cgptToggleSidebarBulkConversationSelection(selectionKey, checkbox);
      });
    }
    row.appendChild(content);
    row.appendChild(metaColumn);
    list.appendChild(row);
  });
  const lastRow = list.lastElementChild;
  if (lastRow && lastRow.style) {
    lastRow.style.borderBottom = "none";
  }
  list.scrollTop = previousScrollTop;
}

function cgptRenderSidebarBulkResults(panel, state) {
  const host = panel.querySelector("#cgpt-helper-sidebar-bulk-results");
  if (!host) return;
  host.replaceChildren();
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { diagnostics: null };
  const diagnostics =
    snapshot.diagnostics ||
    (typeof cgptGetSidebarApiDiagnostics === "function" ? cgptGetSidebarApiDiagnostics() : null);
  if (diagnostics) {
    const errorLine = document.createElement("div");
    errorLine.textContent = `Internal API unavailable: ${diagnostics.phase} / ${diagnostics.status || 0} / ${diagnostics.message}`;
    errorLine.style.fontSize = "11px";
    errorLine.style.fontWeight = "600";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(errorLine, "danger");
    }
    host.appendChild(errorLine);

    const endpointLine = document.createElement("div");
    endpointLine.textContent = diagnostics.endpoint || "No endpoint resolved";
    endpointLine.style.fontSize = "11px";
    endpointLine.style.wordBreak = "break-all";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(endpointLine, "muted");
    }
    host.appendChild(endpointLine);

  }
  if (!state.lastResult) return;
  const summary = document.createElement("div");
  summary.textContent = `Result: ${state.lastResult.counts.success} success / ${state.lastResult.counts.failed} failed / ${state.lastResult.counts.skipped} skipped`;
  summary.style.fontSize = "11px";
  summary.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(summary, state.lastResult.counts.failed ? "danger" : "success");
  }
  host.appendChild(summary);
  state.lastResult.results
    .filter((item) => !item.ok)
    .slice(0, 6)
    .forEach((item) => {
      const line = document.createElement("div");
      line.textContent = `${item.title || item.conversationId || "unknown"}: ${item.status}${
        Number.isInteger(item.moveDebugIndex) && item.moveDebugIndex >= 0 ? " (Move Debug available)" : ""
      }`;
      line.style.fontSize = "11px";
      if (typeof cgptApplyPanelTextTone === "function") {
        cgptApplyPanelTextTone(line, "muted");
      }
      host.appendChild(line);
    });
}

function cgptRenderSidebarBulkPanel() {
  const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
  if (!panel) return;
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { sidebarFound: false, conversations: [], projects: [] };
  const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
  if (!state) return;

  const input = panel.querySelector("#cgpt-helper-sidebar-bulk-search");
  if (input && input.value !== state.query) {
    input.value = state.query;
  }

  cgptRenderSidebarBulkProjectFilter(panel, snapshot, state);
  const visibleConversations = cgptFilterSidebarConversations(
    snapshot.conversations,
    state.query,
    state.projectFilter
  );
  cgptSyncSidebarBulkSelectionSummary(panel, snapshot, state);

  cgptRenderSidebarBulkControls(panel, visibleConversations, state);
  cgptRenderSidebarBulkProjectControls(panel, snapshot, state);
  cgptRenderSidebarBulkTitleBatchControls(panel, state);
  cgptRenderSidebarBulkList(panel, visibleConversations, state);
  cgptRenderSidebarBulkResults(panel, state);
}
