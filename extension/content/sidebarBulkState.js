const cgptSidebarBulkState = {
  query: "",
  selectedConversationIds: new Set(),
  runningAction: "",
  lastResult: null,
  titleBatchPrefix: "",
  titleBatchSuffix: "",
  showTitleBatchEditor: false,
  projectTarget: {
    mode: "existing",
    projectId: "",
    projectName: "",
    projectOriginalName: "",
    projectDetailName: "",
  },
  draftProjectName: "",
};

const cgptSidebarBulkSubscribers = new Set();

function cgptCloneSidebarBulkState() {
  return {
    query: cgptSidebarBulkState.query,
    selectedConversationIds: new Set(cgptSidebarBulkState.selectedConversationIds),
    runningAction: cgptSidebarBulkState.runningAction,
    lastResult: cgptSidebarBulkState.lastResult
      ? JSON.parse(JSON.stringify(cgptSidebarBulkState.lastResult))
      : null,
    titleBatchPrefix: cgptSidebarBulkState.titleBatchPrefix,
    titleBatchSuffix: cgptSidebarBulkState.titleBatchSuffix,
    showTitleBatchEditor: cgptSidebarBulkState.showTitleBatchEditor,
    projectTarget: { ...cgptSidebarBulkState.projectTarget },
    draftProjectName: cgptSidebarBulkState.draftProjectName,
  };
}

function cgptNotifySidebarBulkSubscribers() {
  const snapshot = cgptCloneSidebarBulkState();
  cgptSidebarBulkSubscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.warn("cgptNotifySidebarBulkSubscribers error", error);
    }
  });
}

function cgptGetSidebarBulkState() {
  return cgptCloneSidebarBulkState();
}

function cgptSetSidebarBulkQuery(query) {
  cgptSidebarBulkState.query = String(query || "");
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkRunningAction(action) {
  cgptSidebarBulkState.runningAction = String(action || "");
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkResult(result) {
  cgptSidebarBulkState.lastResult = result || null;
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkTitleBatchPrefix(prefix) {
  cgptSidebarBulkState.titleBatchPrefix = String(prefix || "");
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkTitleBatchSuffix(suffix) {
  cgptSidebarBulkState.titleBatchSuffix = String(suffix || "");
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkTitleBatchEditorVisible(visible) {
  cgptSidebarBulkState.showTitleBatchEditor = visible === true;
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkProjectTarget(nextTarget = {}) {
  cgptSidebarBulkState.projectTarget = {
    mode: nextTarget.mode === "create" ? "create" : "existing",
    projectId: String(nextTarget.projectId || ""),
    projectName: String(nextTarget.projectName || ""),
    projectOriginalName: String(nextTarget.projectOriginalName || ""),
    projectDetailName: String(nextTarget.projectDetailName || ""),
  };
  cgptNotifySidebarBulkSubscribers();
}

function cgptSetSidebarBulkDraftProjectName(name) {
  cgptSidebarBulkState.draftProjectName = String(name || "");
  cgptNotifySidebarBulkSubscribers();
}

function cgptGetSidebarConversationSelectionKey(conversation) {
  if (!conversation || typeof conversation !== "object") return "";
  return String(conversation.conversationId || conversation.id || "");
}

function cgptSetSidebarConversationSelected(conversationId, selected) {
  const key = String(conversationId || "");
  if (!key) return;
  if (selected) {
    cgptSidebarBulkState.selectedConversationIds.add(key);
  } else {
    cgptSidebarBulkState.selectedConversationIds.delete(key);
  }
  cgptNotifySidebarBulkSubscribers();
}

function cgptToggleSidebarConversationSelected(conversationId) {
  const key = String(conversationId || "");
  if (!key) return;
  if (cgptSidebarBulkState.selectedConversationIds.has(key)) {
    cgptSidebarBulkState.selectedConversationIds.delete(key);
  } else {
    cgptSidebarBulkState.selectedConversationIds.add(key);
  }
  cgptNotifySidebarBulkSubscribers();
}

function cgptClearSidebarConversationSelection() {
  cgptSidebarBulkState.selectedConversationIds.clear();
  cgptNotifySidebarBulkSubscribers();
}

function cgptAddVisibleSidebarConversationSelections(conversationIds = []) {
  conversationIds.forEach((conversationId) => {
    const key = String(conversationId || "");
    if (key) {
      cgptSidebarBulkState.selectedConversationIds.add(key);
    }
  });
  cgptNotifySidebarBulkSubscribers();
}

function cgptIsSidebarConversationSelected(conversationId) {
  return cgptSidebarBulkState.selectedConversationIds.has(String(conversationId || ""));
}

function cgptPruneSidebarConversationSelection(conversations = [], options = {}) {
  const { dropProjectItems = false } = options;
  const allowedKeys = new Set();
  (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
    const key = cgptGetSidebarConversationSelectionKey(conversation);
    if (!key) return;
    if (dropProjectItems && conversation.isProjectItem === true) {
      return;
    }
    allowedKeys.add(key);
  });
  let changed = false;
  Array.from(cgptSidebarBulkState.selectedConversationIds).forEach((key) => {
    if (!allowedKeys.has(key)) {
      cgptSidebarBulkState.selectedConversationIds.delete(key);
      changed = true;
    }
  });
  if (changed) {
    cgptNotifySidebarBulkSubscribers();
  }
}

function cgptFilterSidebarConversations(conversations = [], query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const visible = Array.isArray(conversations) ? conversations.slice() : [];
  if (!normalizedQuery) return visible;
  return visible.filter((conversation) => {
    const title = String((conversation && conversation.title) || "").toLowerCase();
    const projectName = String((conversation && conversation.projectName) || "").toLowerCase();
    const conversationId = String(
      (conversation && (conversation.conversationId || conversation.id)) || ""
    ).toLowerCase();
    return (
      title.includes(normalizedQuery) ||
      projectName.includes(normalizedQuery) ||
      conversationId.includes(normalizedQuery)
    );
  });
}

function cgptSummarizeSidebarSelection(conversations = [], selectedConversationIds = new Set()) {
  const conversationMap = new Map();
  (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
    conversationMap.set(cgptGetSidebarConversationSelectionKey(conversation), conversation);
  });
  let projectCount = 0;
  (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
    if (conversation && conversation.isProjectItem === true) {
      projectCount += 1;
    }
  });
  return {
    selectedCount: Array.from(selectedConversationIds || []).filter(Boolean).length,
    projectCount,
    totalCount: conversationMap.size,
  };
}

function cgptSubscribeSidebarBulkState(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }
  cgptSidebarBulkSubscribers.add(callback);
  return () => {
    cgptSidebarBulkSubscribers.delete(callback);
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptFilterSidebarConversations,
    cgptGetSidebarConversationSelectionKey,
    cgptPruneSidebarConversationSelection,
    cgptSummarizeSidebarSelection,
    cgptSetSidebarBulkTitleBatchEditorVisible,
    cgptSetSidebarBulkTitleBatchPrefix,
    cgptSetSidebarBulkTitleBatchSuffix,
  };
}
