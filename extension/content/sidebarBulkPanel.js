function cgptCreateSidebarBulkToggleButton() {
  const existing = document.getElementById("cgpt-helper-sidebar-bulk-toggle");
  if (existing) return existing;
  const button =
    typeof cgptCreateSharedChipButton === "function"
      ? cgptCreateSharedChipButton("Bulk Chats", "md")
      : document.createElement("button");
  button.id = "cgpt-helper-sidebar-bulk-toggle";
  button.textContent = "Bulk Chats";
  button.style.position = "fixed";
  button.style.right = "200px";
  button.style.bottom = "16px";
  button.style.zIndex = "9999";
  button.style.minWidth = "88px";
  button.style.padding = "0 14px";
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
  panel.style.width = "min(540px, calc(100vw - 48px))";
  panel.style.maxWidth = "540px";
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
      cgptRefreshSidebarConversationSnapshot(document);
    }
    cgptRenderSidebarBulkPanel();
  });
  header.appendChild(refreshButton);

  const debugButton = createPanelButton("API Debug", "secondary");
  debugButton.id = "cgpt-helper-sidebar-bulk-api-debug";
  debugButton.addEventListener("click", async () => {
    const snapshot =
      typeof cgptGetSidebarConversationSnapshot === "function"
        ? cgptGetSidebarConversationSnapshot()
        : { sidebarFound: false, conversations: [], projects: [], diagnostics: null };
    const diagnostics =
      snapshot.diagnostics ||
      (typeof cgptGetSidebarApiDiagnostics === "function" ? cgptGetSidebarApiDiagnostics() : null);
    const payload = diagnostics || {
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
      snapshotSummary: {
        sidebarFound: snapshot.sidebarFound,
        conversationCount: Array.isArray(snapshot.conversations) ? snapshot.conversations.length : 0,
        projectCount: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
        source: snapshot.source || "",
        debugBuild: snapshot.debugBuild || "",
        updatedAt: snapshot.updatedAt || 0,
      },
      projectApiSweep: snapshot.projectApiSweep || null,
      projectIframeSweep: snapshot.projectIframeSweep || null,
      projects: Array.isArray(snapshot.projects)
        ? snapshot.projects.map((project) => ({
            id: project && project.id ? String(project.id) : "",
            name: project && project.name ? String(project.name) : "",
            isCurrent: Boolean(project && project.isCurrent),
            raw: project && project.raw ? project.raw : null,
          }))
        : [],
      conversations: Array.isArray(snapshot.conversations)
        ? snapshot.conversations.map((conversation) => ({
            id: conversation && conversation.id ? String(conversation.id) : "",
            title: conversation && conversation.title ? String(conversation.title) : "",
            projectId: conversation && conversation.projectId ? String(conversation.projectId) : "",
            projectName: conversation && conversation.projectName ? String(conversation.projectName) : "",
            isProjectItem: Boolean(conversation && conversation.isProjectItem),
          }))
        : [],
    };
    const copied =
      typeof cgptCopySidebarApiDebugJson === "function" &&
      await cgptCopySidebarApiDebugJson(payload);
    if (copied) {
      showToast("API debug copied to clipboard.", "success");
      return;
    }
    const exported =
      typeof cgptDownloadSidebarApiDebugJson === "function" &&
      cgptDownloadSidebarApiDebugJson(payload);
    showToast(
      exported ? "API debug downloaded." : "API debug export failed.",
      exported ? "success" : "error"
    );
  });
  header.appendChild(debugButton);

  const moveDebugButton = createPanelButton("Move Debug", "secondary");
  moveDebugButton.id = "cgpt-helper-sidebar-bulk-move-debug";
  moveDebugButton.addEventListener("click", async () => {
    const snapshot =
      typeof cgptGetSidebarConversationSnapshot === "function"
        ? cgptGetSidebarConversationSnapshot()
        : { sidebarFound: false, conversations: [], projects: [] };
    const state = typeof cgptGetSidebarBulkState === "function" ? cgptGetSidebarBulkState() : null;
    const payload = {
      timestamp: new Date().toISOString(),
      phase: "project_move_debug",
      snapshotSummary: {
        sidebarFound: Boolean(snapshot.sidebarFound),
        conversationCount: Array.isArray(snapshot.conversations) ? snapshot.conversations.length : 0,
        projectCount: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
        source: snapshot.source || "",
        debugBuild: snapshot.debugBuild || "",
        updatedAt: snapshot.updatedAt || 0,
      },
      lastResult: state && state.lastResult ? state.lastResult : null,
      projectMoveDebugLog:
        typeof cgptGetSidebarProjectMoveDebugLog === "function"
          ? cgptGetSidebarProjectMoveDebugLog()
          : [],
      projects: Array.isArray(snapshot.projects)
        ? snapshot.projects.map((project) => ({
            id: project && project.id ? String(project.id) : "",
            name: project && project.name ? String(project.name) : "",
            isCurrent: Boolean(project && project.isCurrent),
            raw: project && project.raw ? project.raw : null,
          }))
        : [],
      conversations: Array.isArray(snapshot.conversations)
        ? snapshot.conversations.map((conversation) => ({
            id: conversation && conversation.id ? String(conversation.id) : "",
            title: conversation && conversation.title ? String(conversation.title) : "",
            projectId: conversation && conversation.projectId ? String(conversation.projectId) : "",
            projectName: conversation && conversation.projectName ? String(conversation.projectName) : "",
            isProjectItem: Boolean(conversation && conversation.isProjectItem),
          }))
        : [],
    };
    const copied =
      typeof cgptCopySidebarApiDebugJson === "function" &&
      await cgptCopySidebarApiDebugJson(payload);
    if (copied) {
      showToast("Move debug copied to clipboard.", "success");
      return;
    }
    const exported =
      typeof cgptDownloadSidebarApiDebugJson === "function" &&
      cgptDownloadSidebarApiDebugJson(payload);
    showToast(
      exported ? "Move debug downloaded." : "Move debug export failed.",
      exported ? "success" : "error"
    );
  });
  header.appendChild(moveDebugButton);

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
      cgptRefreshSidebarConversationSnapshot(document);
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
    if (typeof cgptRenameSidebarConversationViaUi !== "function") {
      throw new Error("failed_action_not_found");
    }
    await cgptRenameSidebarConversationViaUi(conversation, normalizedTitle);
    showToast("Chat renamed.", "success");
  } catch (error) {
    showToast(`Rename failed: ${error && error.message ? error.message : "unknown"}`, "error");
  } finally {
    if (typeof cgptSetSidebarBulkRunningAction === "function") {
      cgptSetSidebarBulkRunningAction("");
    }
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document);
    }
    cgptRenderSidebarBulkPanel();
  }
}

function cgptSyncSidebarBulkSelectionSummary(panel, snapshot, state) {
  if (!panel) return;
  const visibleConversations = cgptFilterSidebarConversations(snapshot.conversations, state.query);
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
      cgptRefreshSidebarConversationSnapshot(document);
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
      cgptRefreshSidebarConversationSnapshot(document);
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
    row.style.gridTemplateColumns = "18px minmax(0, 1fr) 150px";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.padding = "6px 0";
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
    content.style.gap = "2px";
    content.style.minWidth = "0";
    content.style.alignSelf = "stretch";

    const titleRow = document.createElement("div");
    titleRow.style.display = "grid";
    titleRow.style.gridTemplateColumns = "minmax(0, 1fr) auto";
    titleRow.style.alignItems = "baseline";
    titleRow.style.gap = "4px";
    titleRow.style.minWidth = "0";
    titleRow.style.width = "100%";

    const title = document.createElement("div");
    title.textContent = conversation.title || "(untitled chat)";
    title.style.fontWeight = "600";
    title.style.minWidth = "0";
    title.style.flex = "1";
    title.style.display = "inline-block";
    title.style.maxWidth = "100%";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    titleRow.appendChild(title);

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "✎";
    renameButton.title = "Rename";
    renameButton.setAttribute("aria-label", "Rename chat");
    renameButton.style.flexShrink = "0";
    renameButton.style.display = "inline-flex";
    renameButton.style.alignItems = "center";
    renameButton.style.justifyContent = "center";
    renameButton.style.margin = "0";
    renameButton.style.padding = "0";
    renameButton.style.border = "none";
    renameButton.style.background = "transparent";
    renameButton.style.boxShadow = "none";
    renameButton.style.borderRadius = "0";
    renameButton.style.minWidth = "auto";
    renameButton.style.width = "auto";
    renameButton.style.minHeight = "auto";
    renameButton.style.lineHeight = "1";
    renameButton.style.fontSize = "12px";
    renameButton.style.cursor = state.runningAction !== "" ? "default" : "pointer";
    renameButton.style.transform = "none";
    renameButton.style.verticalAlign = "baseline";
    renameButton.style.position = "relative";
    renameButton.style.top = "-1px";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(renameButton, "muted");
    }
    renameButton.disabled = state.runningAction !== "";
    renameButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    renameButton.addEventListener("click", (event) => {
      event.stopPropagation();
      cgptHandleSidebarConversationRename(conversation);
    });
    titleRow.appendChild(renameButton);
    content.appendChild(titleRow);

    const projectMeta = document.createElement("div");
    projectMeta.textContent = conversation.projectName ? `Project: ${conversation.projectName}` : "";
    projectMeta.title = projectMeta.textContent;
    projectMeta.style.fontSize = "11px";
    projectMeta.style.whiteSpace = "nowrap";
    projectMeta.style.overflow = "hidden";
    projectMeta.style.textOverflow = "ellipsis";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(projectMeta, "muted");
    }
    if (projectMeta.textContent) {
      content.appendChild(projectMeta);
    }

    const metaColumn = document.createElement("div");
    metaColumn.style.display = "flex";
    metaColumn.style.flexDirection = "column";
    metaColumn.style.alignItems = "flex-end";
    metaColumn.style.justifyContent = "center";
    metaColumn.style.textAlign = "right";
    metaColumn.style.width = "150px";
    metaColumn.style.minWidth = "150px";
    metaColumn.style.maxWidth = "150px";
    metaColumn.style.gap = "2px";
    metaColumn.style.minWidth = "0";

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
    statusMeta.textContent = conversation.isActive
      ? "Current chat"
      : conversation.projectName
      ? `Project: ${conversation.projectName}`
      : "";
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

  const visibleConversations = cgptFilterSidebarConversations(snapshot.conversations, state.query);
  cgptSyncSidebarBulkSelectionSummary(panel, snapshot, state);

  cgptRenderSidebarBulkControls(panel, visibleConversations, state);
  cgptRenderSidebarBulkProjectControls(panel, snapshot, state);
  cgptRenderSidebarBulkTitleBatchControls(panel, state);
  cgptRenderSidebarBulkList(panel, visibleConversations, state);
  cgptRenderSidebarBulkResults(panel, state);
}
