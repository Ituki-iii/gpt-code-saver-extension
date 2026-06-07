const CGPT_SIDEBAR_ACTION_LABELS = {
  archive: ["Archive", "アーカイブ"],
  delete: ["Delete", "削除"],
  rename: ["Rename", "Rename title", "名前を変更", "タイトルを変更"],
  addToProject: [
    "Add to project",
    "Move to project",
    "Move to project...",
    "Project に追加",
    "Project に移動",
    "プロジェクトに追加",
    "プロジェクトに移動",
    "プロジェクトに移動する",
  ],
  newProject: ["New project", "プロジェクトを作成", "プロジェクトを新規作成", "新しいプロジェクト"],
  confirmProject: [
    "Add",
    "Move",
    "Done",
    "Save",
    "Confirm",
    "追加",
    "移動",
    "完了",
    "保存",
    "確認",
  ],
  confirmDelete: ["Delete", "削除", "Confirm", "確認"],
  confirmArchive: ["Archive", "アーカイブ", "Confirm", "確認"],
  confirmRename: ["Save", "Rename", "保存", "変更"],
};

const CGPT_PROJECT_MOVE_DEBUG_LIMIT = 80;
const CGPT_PROJECT_MOVE_DEBUG_TEXT_LIMIT = 260;
const CGPT_PROJECT_MOVE_DEBUG_HTML_LIMIT = 1600;
const cgptSidebarProjectMoveDebugLog = [];

function cgptSidebarWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cgptTrimProjectMoveDebugText(value, limit = CGPT_PROJECT_MOVE_DEBUG_TEXT_LIMIT) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function cgptDescribeElementForProjectMoveDebug(element) {
  if (!element || typeof element !== "object") {
    return null;
  }
  const getAttribute = typeof element.getAttribute === "function"
    ? (name) => element.getAttribute(name) || ""
    : () => "";
  const dataset = {};
  if (element.dataset && typeof element.dataset === "object") {
    Object.keys(element.dataset).slice(0, 16).forEach((key) => {
      dataset[key] = cgptTrimProjectMoveDebugText(element.dataset[key], 120);
    });
  }
  const className = typeof element.className === "string" ? element.className : "";
  return {
    tagName: String(element.tagName || "").toLowerCase(),
    id: String(element.id || ""),
    className: cgptTrimProjectMoveDebugText(className, 180),
    role: getAttribute("role"),
    ariaLabel: getAttribute("aria-label"),
    title: getAttribute("title"),
    href: getAttribute("href"),
    type: getAttribute("type"),
    dataTestId: getAttribute("data-testid"),
    dataState: getAttribute("data-state"),
    ariaDisabled: getAttribute("aria-disabled"),
    disabled: Boolean(element.disabled),
    dataset,
    text: cgptTrimProjectMoveDebugText(element.textContent || ""),
    html: cgptTrimProjectMoveDebugText(element.outerHTML || "", CGPT_PROJECT_MOVE_DEBUG_HTML_LIMIT),
  };
}

function cgptGetProjectMoveOpenContainers() {
  if (typeof document === "undefined" || !document || typeof document.querySelectorAll !== "function") {
    return [];
  }
  return Array.from(
    document.querySelectorAll(
      [
        "[data-cgpt-dialog='1']",
        "[role='dialog']",
        "[data-cgpt-menu='1']",
        "[role='menu']",
        "[role='listbox']",
        "[data-state='open']",
        "[data-radix-popper-content-wrapper]",
      ].join(", ")
    )
  ).filter((container) => !cgptIsSidebarHelperNode(container));
}

function cgptDescribeProjectMoveContainer(container) {
  if (!container || typeof container.querySelectorAll !== "function") {
    return null;
  }
  const interactiveSelector = [
    "[data-cgpt-menu-item]",
    "[data-cgpt-project-option]",
    "[data-testid]",
    "[data-radix-collection-item]",
    "[role='menuitem']",
    "[role='menuitemradio']",
    "[role='menuitemcheckbox']",
    "[role='option']",
    "[role='button']",
    "button",
    "a",
    "li",
    "[tabindex]",
  ].join(", ");
  const inputSelector = "input, textarea, [contenteditable='true']";
  return {
    element: cgptDescribeElementForProjectMoveDebug(container),
    inputs: Array.from(container.querySelectorAll(inputSelector))
      .filter((item) => !cgptIsSidebarHelperNode(item))
      .slice(0, 8)
      .map((item) => {
        const description = cgptDescribeElementForProjectMoveDebug(item);
        if (description && "value" in item) {
          description.value = cgptTrimProjectMoveDebugText(item.value, 160);
        }
        return description;
      }),
    items: Array.from(container.querySelectorAll(interactiveSelector))
      .filter((item) => !cgptIsSidebarHelperNode(item))
      .slice(0, 30)
      .map(cgptDescribeElementForProjectMoveDebug),
  };
}

function cgptCreateProjectMoveDebugEntry(stage, details = {}) {
  const conversation = details.conversation || {};
  const projectTarget = details.projectTarget || {};
  const refreshedConversation = details.refreshedConversation || null;
  let row = null;
  try {
    row = cgptFindConversationRowElement(conversation) || null;
  } catch (_error) {
    row = null;
  }
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : null;
  return {
    timestamp: new Date().toISOString(),
    stage: String(stage || "unknown"),
    conversation: {
      id: String((conversation && (conversation.conversationId || conversation.id)) || ""),
      title: String((conversation && conversation.title) || ""),
      projectId: String((conversation && conversation.projectId) || ""),
      projectName: String((conversation && conversation.projectName) || ""),
      isProjectItem: Boolean(conversation && conversation.isProjectItem),
    },
    projectTarget: {
      mode: String(projectTarget.mode || ""),
      projectId: String(projectTarget.projectId || ""),
      projectName: String(projectTarget.projectName || ""),
      projectOriginalName: String(projectTarget.projectOriginalName || ""),
      projectDetailName: String(projectTarget.projectDetailName || ""),
    },
    clickedElement: cgptDescribeElementForProjectMoveDebug(details.clickedElement || null),
    secondaryElement: cgptDescribeElementForProjectMoveDebug(details.secondaryElement || null),
    row: cgptDescribeElementForProjectMoveDebug(row),
    refreshedConversation: refreshedConversation
      ? {
          id: String(refreshedConversation.conversationId || refreshedConversation.id || ""),
          title: String(refreshedConversation.title || ""),
          projectId: String(refreshedConversation.projectId || ""),
          projectName: String(refreshedConversation.projectName || ""),
          isProjectItem: Boolean(refreshedConversation.isProjectItem),
        }
      : null,
    snapshotSummary: snapshot
      ? {
          sidebarFound: Boolean(snapshot.sidebarFound),
          conversationCount: Array.isArray(snapshot.conversations) ? snapshot.conversations.length : 0,
          projectCount: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0,
          source: String(snapshot.source || ""),
          debugBuild: String(snapshot.debugBuild || ""),
          updatedAt: snapshot.updatedAt || 0,
        }
      : null,
    error: details.error
      ? {
          name: String(details.error.name || ""),
          message: String(details.error.message || details.error || ""),
          stack: cgptTrimProjectMoveDebugText(details.error.stack || "", 1000),
        }
      : null,
    openContainers: cgptGetProjectMoveOpenContainers()
      .slice(0, 8)
      .map(cgptDescribeProjectMoveContainer)
      .filter(Boolean),
  };
}

function cgptCaptureProjectMoveDebugSnapshot(stage, details = {}) {
  const entry = cgptCreateProjectMoveDebugEntry(stage, details);
  cgptSidebarProjectMoveDebugLog.push(entry);
  while (cgptSidebarProjectMoveDebugLog.length > CGPT_PROJECT_MOVE_DEBUG_LIMIT) {
    cgptSidebarProjectMoveDebugLog.shift();
  }
  return cgptSidebarProjectMoveDebugLog.length - 1;
}

function cgptGetSidebarProjectMoveDebugLog() {
  return JSON.parse(JSON.stringify(cgptSidebarProjectMoveDebugLog));
}

function cgptClearSidebarProjectMoveDebugLog() {
  cgptSidebarProjectMoveDebugLog.splice(0, cgptSidebarProjectMoveDebugLog.length);
}

function cgptHasOpenSidebarDialog() {
  return Boolean(
    document.querySelector("[data-cgpt-dialog='1'], [role='dialog']")
  );
}

function cgptIsSidebarHelperNode(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.id && String(node.id).startsWith("cgpt-helper-")) {
    return true;
  }
  return Boolean(
    typeof node.closest === "function" &&
      node.closest("[id^='cgpt-helper-'], .cgpt-helper-fold")
  );
}

async function cgptWaitForSidebarRefresh() {
  await cgptSidebarWait(120);
  if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
    cgptRefreshSidebarConversationSnapshot(document);
  }
}

function cgptDidConversationReachProjectTarget(conversation = {}, projectTarget = {}) {
  if (!conversation || typeof conversation !== "object" || !projectTarget || typeof projectTarget !== "object") {
    return false;
  }
  const targetIds = [
    projectTarget.projectId,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  const targetNames = [
    projectTarget.projectName,
    projectTarget.projectOriginalName,
    projectTarget.projectDetailName,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
  const conversationProjectId = String(conversation.projectId || "").trim();
  const conversationProjectName = String(conversation.projectName || "").trim().toLowerCase();
  if (targetIds.length && targetIds.includes(conversationProjectId)) {
    return true;
  }
  if (targetNames.length && targetNames.includes(conversationProjectName)) {
    return true;
  }
  return false;
}

async function cgptVerifyConversationProjectMove(conversation = {}, projectTarget = {}) {
  const conversationId = String((conversation && (conversation.conversationId || conversation.id)) || "");
  if (!conversationId || !projectTarget || !projectTarget.projectId) {
    throw new Error("failed_project_move_not_verified");
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 3500) {
    if (typeof cgptRefreshSidebarConversationSnapshot === "function") {
      cgptRefreshSidebarConversationSnapshot(document);
    }
    await cgptSidebarWait(160);
    const snapshot =
      typeof cgptGetSidebarConversationSnapshot === "function"
        ? cgptGetSidebarConversationSnapshot()
        : { conversations: [] };
    const refreshedConversation = Array.isArray(snapshot.conversations)
      ? snapshot.conversations.find((item) =>
          String((item && (item.conversationId || item.id)) || "") === conversationId
        ) || null
      : null;
    if (refreshedConversation && cgptDidConversationReachProjectTarget(refreshedConversation, projectTarget)) {
      return refreshedConversation;
    }
  }
  throw new Error("failed_project_move_not_verified");
}

function cgptFindConversationRowElement(conversation) {
  const key = cgptGetSidebarActionConversationId(conversation);
  if (!key || typeof document.querySelectorAll !== "function") return null;
  if (typeof cgptResolveSidebarConversationDomRef === "function") {
    return cgptResolveSidebarConversationDomRef(key, document);
  }
  const anchors = Array.from(document.querySelectorAll("a[href*='/c/']"));
  return (
    anchors
      .find((anchor) => {
        const href = anchor.getAttribute("href") || "";
        return href.includes(`/c/${key}`) || anchor.dataset.cgptConversationId === key;
      })
      ?.closest("[data-cgpt-conversation-row='1'], li, [role='listitem'], div") || null
  );
}

function cgptResolveConversationActionButton(conversation) {
  const row = cgptFindConversationRowElement(conversation) || null;
  if (!row || typeof row.querySelector !== "function") return null;
  return (
    row.querySelector("[data-cgpt-conversation-menu='1']") ||
    row.querySelector("button[aria-haspopup='menu']") ||
    row.querySelector("button[aria-label*='More']") ||
    row.querySelector("button")
  );
}

async function cgptOpenConversationMenu(conversation) {
  const button = cgptResolveConversationActionButton(conversation);
  if (!button) {
    throw new Error("failed_menu_open");
  }
  button.click();
  await cgptSidebarWait(40);
  return button;
}

function cgptFindMenuItemByLabels(labels = []) {
  const openContainers = Array.from(
    document.querySelectorAll(
      [
        "[data-cgpt-menu='1']",
        "[data-cgpt-dialog='1']",
        "[role='dialog']",
        "[role='menu']",
        "[role='listbox']",
        "[data-state='open']",
        "[data-radix-popper-content-wrapper]",
      ].join(", ")
    )
  ).filter((container) => !cgptIsSidebarHelperNode(container));
  const scope = openContainers.length ? openContainers : [document.body || document];
  const loweredLabels = labels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean);
  const directItems = scope.flatMap((container) =>
    Array.from(
      container.querySelectorAll(
        [
          "[data-cgpt-menu-item]",
          "[role='menuitem']",
          "[role='menuitemradio']",
          "[role='menuitemcheckbox']",
          "[role='option']",
          "[data-testid='menu-item']",
          "button",
          "a",
        ].join(", ")
      )
    )
  ).filter((item) => !cgptIsSidebarHelperNode(item));
  const directMatch = directItems.find((item) => {
    const text = String(item.textContent || item.getAttribute("aria-label") || "").trim().toLowerCase();
    return loweredLabels.some((label) => text === label || text.includes(label));
  });
  if (directMatch) {
    return directMatch;
  }
  const fallbackNodes = scope
    .flatMap((container) => Array.from(container.querySelectorAll("*")))
    .filter((node) => !cgptIsSidebarHelperNode(node));
  for (const node of fallbackNodes) {
    const text = String(node.textContent || node.getAttribute && node.getAttribute("aria-label") || "")
      .trim()
      .toLowerCase();
    if (!text || !loweredLabels.some((label) => text === label || text.includes(label))) {
      continue;
    }
    const clickable =
      (typeof node.closest === "function" &&
        node.closest(
          [
            "[data-cgpt-menu-item]",
            "[role='menuitem']",
            "[role='menuitemradio']",
            "[role='menuitemcheckbox']",
            "[role='option']",
            "[data-testid='menu-item']",
            "button",
            "a",
            "[tabindex]",
            "li",
            "div",
          ].join(", ")
        )) ||
      null;
    if (clickable) {
      return clickable;
    }
  }
  return null;
}

async function cgptWaitForMenuItemByLabels(labels = []) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 1500) {
    const item = cgptFindMenuItemByLabels(labels);
    if (item) {
      return item;
    }
    await cgptSidebarWait(50);
  }
  return null;
}

function cgptGetProjectTargetCandidateStrings(projectTarget = {}) {
  const values = [
    projectTarget.projectName,
    projectTarget.projectId,
    projectTarget.projectOriginalName,
    projectTarget.projectDetailName,
  ];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function cgptIsProjectTargetOptionCandidate(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  if (cgptIsSidebarHelperNode(item)) {
    return false;
  }
  const ariaDisabled = String(item.getAttribute && item.getAttribute("aria-disabled") || "").trim().toLowerCase();
  if (ariaDisabled === "true" || item.disabled === true) {
    return false;
  }
  const role = String(item.getAttribute && item.getAttribute("role") || "").trim().toLowerCase();
  const tagName = String(item.tagName || "").trim().toLowerCase();
  const tabindex = String(item.getAttribute && item.getAttribute("tabindex") || "").trim();
  const hasExplicitProjectData = Boolean(
    (item.dataset && (item.dataset.cgptProjectOption || item.dataset.cgptProjectName || item.dataset.cgptProjectId)) ||
    (item.getAttribute && (item.getAttribute("data-testid") || item.getAttribute("data-radix-collection-item")))
  );
  if (hasExplicitProjectData) {
    return true;
  }
  if (role && role !== "presentation" && role !== "none") {
    return true;
  }
  if (tagName === "button" || tagName === "a") {
    return true;
  }
  if (tabindex && tabindex !== "-1") {
    return true;
  }
  return false;
}

function cgptFindProjectTargetOption(projectTarget = {}, root = document) {
  const candidateStrings = cgptGetProjectTargetCandidateStrings(projectTarget);
  if (!candidateStrings.length || !root || typeof root.querySelectorAll !== "function") {
    return null;
  }
  const selector = [
    "[data-cgpt-project-option='1']",
    "[data-cgpt-project-name]",
    "[data-cgpt-project-id]",
    "[data-testid]",
    "[data-radix-collection-item]",
    "[role='option']",
    "[role='menuitem']",
    "[role='menuitemradio']",
    "[role='menuitemcheckbox']",
    "[role='treeitem']",
    "[role='button']",
    "[tabindex]",
    "button",
    "a",
    "li",
  ].join(", ");
  const items = Array.from(root.querySelectorAll(selector)).filter(cgptIsProjectTargetOptionCandidate);
  return (
    items.find((item) => {
      const text = String(item.textContent || "").trim().toLowerCase();
      const ariaLabel = String(item.getAttribute && item.getAttribute("aria-label") || "").trim().toLowerCase();
      const title = String(item.getAttribute && item.getAttribute("title") || "").trim().toLowerCase();
      const projectName = String(item.dataset && item.dataset.cgptProjectName || "").trim().toLowerCase();
      const projectId = String(item.dataset && item.dataset.cgptProjectId || "").trim().toLowerCase();
      const href = String(item.getAttribute && item.getAttribute("href") || "").trim().toLowerCase();
      return candidateStrings.some((candidate) => {
        if (!candidate) return false;
        return (
          text === candidate ||
          text.includes(candidate) ||
          ariaLabel === candidate ||
          ariaLabel.includes(candidate) ||
          title === candidate ||
          title.includes(candidate) ||
          projectName === candidate ||
          projectId === candidate ||
          href.endsWith(`/${candidate}`) ||
          href.includes(candidate)
        );
      });
    }) || null
  );
}

function cgptFindProjectChooserInput(root = document) {
  if (!root || typeof root.querySelector !== "function") return null;
  return (
    root.querySelector("input[data-cgpt-project-name-input='1']") ||
    root.querySelector("input[placeholder*='project' i]") ||
    root.querySelector("input[aria-label*='project' i]") ||
    root.querySelector("input[type='search']") ||
    root.querySelector("input[type='text']")
  );
}

function cgptSetNativeInputValue(input, value) {
  if (!input || !("value" in input)) return;
  const nextValue = String(value || "");
  input.focus();
  input.value = nextValue;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function cgptWaitForProjectTargetOption(projectTarget = {}) {
  const startedAt = Date.now();
  const seedCandidates = cgptGetProjectTargetCandidateStrings(projectTarget);
  const seededSearchValues = new Set();
  while (Date.now() - startedAt <= 2500) {
    const openContainers = Array.from(
      document.querySelectorAll(
        [
          "[data-cgpt-dialog='1']",
          "[role='dialog']",
          "[data-cgpt-menu='1']",
          "[role='menu']",
          "[role='listbox']",
          "[data-state='open']",
          "[data-radix-popper-content-wrapper]",
        ].join(", ")
      )
    ).filter((container) => !cgptIsSidebarHelperNode(container));
    if (!openContainers.length) {
      await cgptSidebarWait(80);
      continue;
    }
    const scopes = openContainers;
    for (const scope of scopes) {
      const option = cgptFindProjectTargetOption(projectTarget, scope);
      if (option) {
        return option;
      }
      const input = cgptFindProjectChooserInput(scope);
      if (input) {
        for (const candidate of seedCandidates) {
          if (!candidate || seededSearchValues.has(candidate)) {
            continue;
          }
          cgptSetNativeInputValue(input, candidate);
          seededSearchValues.add(candidate);
          break;
        }
      }
    }
    await cgptSidebarWait(80);
  }
  return null;
}

async function cgptClickMenuItemByText(labels = []) {
  const item = await cgptWaitForMenuItemByLabels(labels);
  if (!item) {
    throw new Error("failed_action_not_found");
  }
  item.click();
  await cgptSidebarWait(40);
  return item;
}

function cgptWaitForDialog() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const dialog =
        document.querySelector("[data-cgpt-dialog='1']") ||
        document.querySelector("[role='dialog']");
      if (dialog) {
        resolve(dialog);
        return;
      }
      if (Date.now() - startedAt > 1500) {
        reject(new Error("failed_timeout"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function cgptFindActiveRenameEditor() {
  const scopes = Array.from(document.querySelectorAll("[data-cgpt-dialog='1'], [role='dialog']")).concat([document]);
  for (const scope of scopes) {
    const input =
      scope.querySelector("input[data-cgpt-rename-input='1']") ||
      scope.querySelector("input[aria-label*='title' i]") ||
      scope.querySelector("input[placeholder*='title' i]") ||
      scope.querySelector("input[type='text']") ||
      scope.querySelector("textarea") ||
      scope.querySelector("[contenteditable='true']");
    if (input && !(input.closest && input.closest("[id^='cgpt-helper-']"))) {
      return input;
    }
  }
  return null;
}

async function cgptWaitForRenameEditor() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const editor = cgptFindActiveRenameEditor();
      if (editor) {
        resolve(editor);
        return;
      }
      if (Date.now() - startedAt > 2000) {
        reject(new Error("failed_timeout"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function cgptSetRenameEditorValue(editor, value) {
  if (!editor) return;
  if ("value" in editor) {
    editor.value = value;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  editor.textContent = value;
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

async function cgptCommitRenameEditor(editor) {
  const dialog = editor.closest && editor.closest("[data-cgpt-dialog='1'], [role='dialog']");
  if (dialog) {
    const saveButton = Array.from(dialog.querySelectorAll("button, [role='button']")).find((button) => {
      const text = String(button.textContent || "").trim().toLowerCase();
      return CGPT_SIDEBAR_ACTION_LABELS.confirmRename.some((label) =>
        text.includes(String(label).trim().toLowerCase())
      );
    });
    if (saveButton) {
      saveButton.click();
      await cgptSidebarWait(80);
      return;
    }
  }
  if (typeof editor.focus === "function") {
    editor.focus();
  }
  editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
  await cgptSidebarWait(120);
}

async function cgptConfirmDialog(labels = []) {
  const dialog = await cgptWaitForDialog();
  const buttons = Array.from(dialog.querySelectorAll("button, [role='button']")).filter((button) => {
    if (!button || cgptIsSidebarHelperNode(button)) {
      return false;
    }
    const ariaDisabled = String(button.getAttribute && button.getAttribute("aria-disabled") || "").trim().toLowerCase();
    return ariaDisabled !== "true" && button.disabled !== true;
  });
  const loweredLabels = labels.map((label) => String(label || "").trim().toLowerCase()).filter(Boolean);
  const button = buttons.find((candidate) => {
    const text = String(candidate.textContent || "").trim().toLowerCase();
    const ariaLabel = String(candidate.getAttribute && candidate.getAttribute("aria-label") || "").trim().toLowerCase();
    const title = String(candidate.getAttribute && candidate.getAttribute("title") || "").trim().toLowerCase();
    return loweredLabels.some((label) =>
      text === label ||
      text.includes(label) ||
      ariaLabel === label ||
      ariaLabel.includes(label) ||
      title === label ||
      title.includes(label)
    );
  });
  if (!button) {
    throw new Error("failed_confirmation");
  }
  button.click();
  await cgptSidebarWait(60);
}

async function cgptHandleProjectTarget(projectTarget = {}, debugContext = {}) {
  if (!projectTarget || !projectTarget.projectName || projectTarget.mode === "create") {
    throw new Error("failed_action_not_found");
  }
  let dialog = null;
  try {
    dialog = await cgptWaitForDialog();
  } catch (_error) {
  }
  if (debugContext.conversation) {
    cgptCaptureProjectMoveDebugSnapshot("project_picker_open", {
      conversation: debugContext.conversation,
      projectTarget,
      secondaryElement: dialog,
    });
  }
  const projectOption = await cgptWaitForProjectTargetOption(projectTarget);
  if (!projectOption) {
    throw new Error("failed_project_target_not_found");
  }
  projectOption.click();
  await cgptSidebarWait(60);
  try {
    if (!dialog || !document.contains(dialog)) {
      dialog =
        document.querySelector("[data-cgpt-dialog='1']") ||
        document.querySelector("[role='dialog']");
    }
    const loweredLabels = CGPT_SIDEBAR_ACTION_LABELS.confirmProject
      .concat(CGPT_SIDEBAR_ACTION_LABELS.addToProject)
      .map((label) => String(label || "").trim().toLowerCase())
      .filter(Boolean);
    const confirmButton = dialog
      ? Array.from(dialog.querySelectorAll("button, [role='button']")).find((button) => {
          if (!button || cgptIsSidebarHelperNode(button)) {
            return false;
          }
          const ariaDisabled = String(button.getAttribute && button.getAttribute("aria-disabled") || "").trim().toLowerCase();
          if (ariaDisabled === "true" || button.disabled === true) {
            return false;
          }
          const text = String(button.textContent || "").trim().toLowerCase();
          const ariaLabel = String(button.getAttribute && button.getAttribute("aria-label") || "").trim().toLowerCase();
          const title = String(button.getAttribute && button.getAttribute("title") || "").trim().toLowerCase();
          return loweredLabels.some((label) =>
            text === label ||
            text.includes(label) ||
            ariaLabel === label ||
            ariaLabel.includes(label) ||
            title === label ||
            title.includes(label)
          );
        }) || null
      : null;
    if (confirmButton) {
      confirmButton.click();
      await cgptSidebarWait(80);
    }
    return { projectOption, confirmButton: confirmButton || null, dialog: dialog || null };
  } catch (_error) {
  }
  return { projectOption, confirmButton: null, dialog: dialog || null };
}

async function cgptOpenSidebarProjectCreationUi() {
  const explicitButton =
    document.querySelector("[data-cgpt-open-project-create='1']") ||
    document.querySelector("[data-cgpt-project-create='1']");
  if (explicitButton) {
    explicitButton.click();
    await cgptSidebarWait(40);
    return true;
  }

  const sidebarRoot =
    typeof cgptFindSidebarRoot === "function" ? cgptFindSidebarRoot(document) : null;
  if (!sidebarRoot) {
    return false;
  }

  const buttons = Array.from(sidebarRoot.querySelectorAll("button, a, [role='button']"));
  const newProjectButton = buttons.find((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    if (!text) return false;
    if (button.getAttribute && String(button.getAttribute("href") || "").includes("/c/")) {
      return false;
    }
    return CGPT_SIDEBAR_ACTION_LABELS.newProject.some((label) =>
      text.includes(String(label).trim().toLowerCase())
    );
  });
  if (!newProjectButton) {
    return false;
  }
  newProjectButton.click();
  await cgptSidebarWait(40);
  return true;
}

function cgptGetSidebarActionConversationId(conversation = {}) {
  return String((conversation && (conversation.conversationId || conversation.id)) || "").trim();
}

function cgptBuildSidebarActionApiRequests(conversation, action, projectTarget = {}) {
  const conversationId = cgptGetSidebarActionConversationId(conversation);
  if (!conversationId) {
    return [];
  }
  const encodedId = encodeURIComponent(conversationId);
  if (action === "archive") {
    return [
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "PATCH",
        body: { is_archived: true },
      },
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "PATCH",
        body: { is_visible: false },
      },
    ];
  }
  if (action === "delete") {
    return [
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "PATCH",
        body: { is_visible: false },
      },
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "DELETE",
        body: null,
      },
    ];
  }
  if (action === "rename") {
    const nextTitle = String((projectTarget && projectTarget.nextTitle) || "").trim();
    if (!nextTitle) {
      return [];
    }
    return [
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "PATCH",
        body: { title: nextTitle },
      },
    ];
  }
  if (action === "project") {
    const projectId = String((projectTarget && projectTarget.projectId) || "").trim();
    if (!projectId) {
      return [];
    }
    return [
      {
        path: `/backend-api/conversation/${encodedId}`,
        method: "PATCH",
        body: { project_id: projectId },
      },
      {
        path: `/backend-api/conversation/${encodedId}/project`,
        method: "POST",
        body: { project_id: projectId },
      },
    ];
  }
  return [];
}

async function cgptFetchSidebarActionApiJson(request) {
  if (!request || !request.path || typeof fetch !== "function") {
    throw new Error("api_action_unavailable");
  }
  const url =
    typeof cgptResolveSidebarApiAbsoluteUrl === "function"
      ? cgptResolveSidebarApiAbsoluteUrl(request.path)
      : request.path;
  const response = await fetch(url, {
    method: request.method || "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: request.body === null ? undefined : JSON.stringify(request.body || {}),
  });
  const contentType = String(response.headers && response.headers.get ? response.headers.get("content-type") || "" : "");
  let json = null;
  try {
    json = contentType.includes("application/json") ? await response.json() : null;
  } catch (_error) {
  }
  if (response.ok && !contentType.includes("application/json") && response.status !== 204) {
    throw new Error("api_action_non_json_response");
  }
  if (!response.ok) {
    const message = json && (json.message || json.detail || json.error);
    const error = new Error(message ? String(message) : "api_action_failed");
    error.status = response.status;
    throw error;
  }
  return { ok: true, status: response.status, json };
}

async function cgptRunSingleSidebarApiAction(conversation, action, projectTarget) {
  const requests = cgptBuildSidebarActionApiRequests(conversation, action, projectTarget);
  if (!requests.length) {
    throw new Error("api_action_unavailable");
  }
  let lastError = null;
  for (const request of requests) {
    try {
      return await cgptFetchSidebarActionApiJson(request);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("api_action_failed");
}

async function cgptRunSingleSidebarGuiFallbackAction(conversation, action, projectTarget) {
  const menuButton = await cgptOpenConversationMenu(conversation);
  if (action === "archive") {
    await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.archive);
    try {
      await cgptConfirmDialog(CGPT_SIDEBAR_ACTION_LABELS.confirmArchive);
    } catch (_error) {
    }
    await cgptWaitForSidebarRefresh();
    return;
  }
  if (action === "delete") {
    await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.delete);
    await cgptConfirmDialog(CGPT_SIDEBAR_ACTION_LABELS.confirmDelete);
    await cgptWaitForSidebarRefresh();
    return;
  }
  if (action === "project") {
    cgptCaptureProjectMoveDebugSnapshot("after_menu_open", {
      conversation,
      projectTarget,
      clickedElement: menuButton,
    });
    const addToProjectItem = await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.addToProject);
    cgptCaptureProjectMoveDebugSnapshot("after_add_to_project_click", {
      conversation,
      projectTarget,
      clickedElement: addToProjectItem,
    });
    const targetResult = await cgptHandleProjectTarget(projectTarget, { conversation });
    cgptCaptureProjectMoveDebugSnapshot("after_project_target_click", {
      conversation,
      projectTarget,
      clickedElement: targetResult && targetResult.projectOption,
      secondaryElement: targetResult && targetResult.confirmButton,
    });
    await cgptWaitForSidebarRefresh();
    try {
      const refreshedConversation = await cgptVerifyConversationProjectMove(conversation, projectTarget);
      cgptCaptureProjectMoveDebugSnapshot("verify_success", {
        conversation,
        projectTarget,
        refreshedConversation,
      });
    } catch (error) {
      cgptCaptureProjectMoveDebugSnapshot("verify_failed", {
        conversation,
        projectTarget,
        error,
      });
      throw error;
    }
    return;
  }
  throw new Error("failed_action_not_found");
}

async function cgptRunSingleSidebarAction(conversation, action, projectTarget) {
  try {
    await cgptRunSingleSidebarApiAction(conversation, action, projectTarget);
    if (typeof cgptWaitForSidebarRefresh === "function") {
      await cgptWaitForSidebarRefresh();
    }
    return;
  } catch (_apiError) {
    return cgptRunSingleSidebarGuiFallbackAction(conversation, action, projectTarget);
  }
}

async function cgptRenameSidebarConversation(conversation, nextTitle) {
  try {
    await cgptRunSingleSidebarApiAction(conversation, "rename", { nextTitle });
    if (typeof cgptWaitForSidebarRefresh === "function") {
      await cgptWaitForSidebarRefresh();
    }
    return;
  } catch (_apiError) {
    return cgptRenameSidebarConversationViaUi(conversation, nextTitle);
  }
}

async function cgptRenameSidebarConversationViaUi(conversation, nextTitle) {
  const normalizedTitle = String(nextTitle || "").trim();
  if (!normalizedTitle) {
    throw new Error("failed_confirmation");
  }
  await cgptOpenConversationMenu(conversation);
  await cgptClickMenuItemByText(CGPT_SIDEBAR_ACTION_LABELS.rename);
  const editor = await cgptWaitForRenameEditor();
  cgptSetRenameEditorValue(editor, normalizedTitle);
  await cgptCommitRenameEditor(editor);
  await cgptWaitForSidebarRefresh();
}

function cgptBuildSidebarConversationTitleUpdate(conversation, prefix = "", suffix = "") {
  const currentTitle = String((conversation && conversation.title) || "").trim();
  const nextTitle = `${String(prefix || "")}${currentTitle}${String(suffix || "")}`.trim();
  return {
    currentTitle,
    nextTitle,
    changed: Boolean(nextTitle) && nextTitle !== currentTitle,
  };
}

async function cgptRunSidebarBulkAction({ action, conversationIds, projectTarget } = {}) {
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { conversations: [] };
  const conversationMap = new Map(
    (snapshot.conversations || []).map((conversation) => [
      String(conversation.conversationId || conversation.id || ""),
      conversation,
    ])
  );
  const results = [];
  for (const conversationId of Array.isArray(conversationIds) ? conversationIds : []) {
    const key = String(conversationId || "");
    const conversation = conversationMap.get(key);
    if (!conversation) {
      results.push({ ok: false, status: "skipped_missing_dom", conversationId: key });
      continue;
    }
    if (
      action === "project" &&
      projectTarget &&
      String(projectTarget.projectId || "") &&
      String(conversation.projectId || "") === String(projectTarget.projectId || "")
    ) {
      results.push({ ok: false, status: "skipped_same_project", conversationId: key, title: conversation.title });
      continue;
    }
    try {
      await cgptRunSingleSidebarAction(conversation, action, projectTarget);
      results.push({ ok: true, status: "success", conversationId: key, title: conversation.title });
    } catch (error) {
      const moveDebugIndex = action === "project"
        ? cgptCaptureProjectMoveDebugSnapshot("project_move_failed", {
            conversation,
            projectTarget,
            error,
          })
        : -1;
      results.push({
        ok: false,
        status: error && error.message ? error.message : "failed_timeout",
        conversationId: key,
        title: conversation.title,
        moveDebugIndex,
      });
    }
  }
  return {
    action,
    results,
    counts: results.reduce(
      (acc, result) => {
        acc.total += 1;
        if (result.ok) {
          acc.success += 1;
        } else if (String(result.status || "").startsWith("skipped_")) {
          acc.skipped += 1;
        } else {
          acc.failed += 1;
        }
        return acc;
      },
      { total: 0, success: 0, failed: 0, skipped: 0 }
    ),
  };
}

async function cgptRunSidebarBulkTitleUpdate({ conversationIds, prefix, suffix } = {}) {
  const snapshot =
    typeof cgptGetSidebarConversationSnapshot === "function"
      ? cgptGetSidebarConversationSnapshot()
      : { conversations: [] };
  const conversationMap = new Map(
    (snapshot.conversations || []).map((conversation) => [
      String(conversation.conversationId || conversation.id || ""),
      conversation,
    ])
  );
  const results = [];
  for (const conversationId of Array.isArray(conversationIds) ? conversationIds : []) {
    const key = String(conversationId || "");
    const conversation = conversationMap.get(key);
    if (!conversation) {
      results.push({ ok: false, status: "skipped_missing_dom", conversationId: key });
      continue;
    }
    const titleUpdate = cgptBuildSidebarConversationTitleUpdate(conversation, prefix, suffix);
    if (!titleUpdate.nextTitle) {
      results.push({ ok: false, status: "skipped_unchanged", conversationId: key, title: conversation.title });
      continue;
    }
    if (!titleUpdate.changed) {
      results.push({ ok: false, status: "skipped_unchanged", conversationId: key, title: conversation.title });
      continue;
    }
    try {
      await cgptRenameSidebarConversation(conversation, titleUpdate.nextTitle);
      results.push({
        ok: true,
        status: "success",
        conversationId: key,
        title: conversation.title,
        nextTitle: titleUpdate.nextTitle,
      });
    } catch (error) {
      results.push({
        ok: false,
        status: error && error.message ? error.message : "failed_timeout",
        conversationId: key,
        title: conversation.title,
        nextTitle: titleUpdate.nextTitle,
      });
    }
  }
  return {
    action: "titleBatch",
    results,
    counts: results.reduce(
      (acc, result) => {
        acc.total += 1;
        if (result.ok) {
          acc.success += 1;
        } else if (String(result.status || "").startsWith("skipped_")) {
          acc.skipped += 1;
        } else {
          acc.failed += 1;
        }
        return acc;
      },
      { total: 0, success: 0, failed: 0, skipped: 0 }
    ),
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptBuildSidebarConversationTitleUpdate,
    cgptCaptureProjectMoveDebugSnapshot,
    cgptClearSidebarProjectMoveDebugLog,
    cgptDidConversationReachProjectTarget,
    cgptBuildSidebarActionApiRequests,
    cgptFindProjectTargetOption,
    cgptGetSidebarProjectMoveDebugLog,
    cgptOpenSidebarProjectCreationUi,
    cgptRenameSidebarConversation,
    cgptRenameSidebarConversationViaUi,
    cgptRunSingleSidebarApiAction,
    cgptRunSingleSidebarGuiFallbackAction,
    cgptRunSidebarBulkAction,
    cgptRunSidebarBulkTitleUpdate,
  };
}
