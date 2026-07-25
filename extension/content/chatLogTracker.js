const CHAT_LOG_SELECTOR = "[data-message-author-role]";
const CHAT_LOG_TURN_SELECTOR = "section[data-testid^='conversation-turn-']";
const chatLogEntries = [];
const chatLogTrackedIds = new Set();
const chatLogPendingFoldTimers = new Map();
const chatLogPendingRenderTimers = new Map();
let chatLogOrderCounter = 0;
let chatLogTrackerInitialized = false;
let chatLogHighlightStyleInjected = false;
let chatLogTimestampStyleInjected = false;
let chatLogUpdateBatchDepth = 0;
let chatLogUpdatePending = false;
const CHAT_LOG_FOLD_DELAY_MS = 120;
const CHAT_LOG_FOLD_MAX_RETRIES = 10;
const CHAT_LOG_FOLD_QUIET_PERIOD_MS = 1200;
const CHAT_LOG_RENDER_RETRY_DELAY_MS = 250;
const CHAT_LOG_RENDER_MAX_RETRIES = 12;
const CHAT_LOG_MESSAGE_BADGE_SELECTOR = "[data-cgpt-helper-chat-badge='1']";
const CHAT_LOG_TIMESTAMP_SELECTOR = ".cgpt-helper-chatlog-timestamp-wrapper";
const CHAT_LOG_OVERLAY_ROOT_SELECTOR = ":scope > [data-cgpt-helper-chat-overlay-root='1']";
const CHAT_LOG_OVERLAY_INFO_SELECTOR = ":scope > [data-cgpt-helper-chat-overlay-info='1']";
const CHAT_LOG_OVERLAY_ACTIONS_SELECTOR = ":scope > [data-cgpt-helper-chat-overlay-actions='1']";
const CHAT_LOG_OVERLAY_GUIDES_SELECTOR = ":scope > [data-cgpt-helper-chat-overlay-guides='1']";
const CHAT_LOG_UPDATED_EVENT = "cgpt-helper-chatlog-updated";
const CHAT_LOG_HELPER_TEXT_EXCLUDE_SELECTOR = [
  CHAT_LOG_MESSAGE_BADGE_SELECTOR,
  CHAT_LOG_TIMESTAMP_SELECTOR,
  "[data-cgpt-helper-chat-overlay-root='1']",
  "[data-cgpt-helper-chat-overlay-actions='1']",
  "time",
].join(",");

function cgptGetChatLogPerfMetricsBucket() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.__cgptPerfMetrics || typeof window.__cgptPerfMetrics !== "object") {
    window.__cgptPerfMetrics = {};
  }
  if (!window.__cgptPerfMetrics.chatLog || typeof window.__cgptPerfMetrics.chatLog !== "object") {
    window.__cgptPerfMetrics.chatLog = {};
  }
  return window.__cgptPerfMetrics.chatLog;
}

function cgptIncrementChatLogPerfMetric(name, amount = 1) {
  const metrics = cgptGetChatLogPerfMetricsBucket();
  if (!metrics || !name) return;
  metrics[name] = (Number(metrics[name]) || 0) + (Number(amount) || 0);
}

function cgptIsHelperManagedNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.id === "cgpt-code-helper-panel" || node.id === "cgpt-helper-chatlog-modal") {
    return true;
  }
  if (node.classList && Array.from(node.classList).some((name) => String(name).startsWith("cgpt-helper-"))) {
    return true;
  }
  return Boolean(
    typeof node.closest === "function" &&
      node.closest(
        "#cgpt-code-helper-panel, #cgpt-helper-chatlog-modal, [class*='cgpt-helper-']"
      )
  );
}

function cgptCanContainChatMessages(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (cgptIsHelperManagedNode(node)) return false;
  if (node.matches && node.matches(CHAT_LOG_SELECTOR)) return true;
  return Boolean(
    typeof node.querySelector === "function" && node.querySelector(CHAT_LOG_SELECTOR)
  );
}

function cgptBuildChatFoldActions(entry) {
  const textSupplier = () => (entry && entry.text ? entry.text : "");
  const canSave = Boolean(cgptNormalizePlainText(textSupplier()).trim());
  const resolvedCopy = () => cgptCopyPlainText(textSupplier());
  const resolvedSave = () => cgptSaveChatResponseText(entry, textSupplier(), false);
  const resolvedSaveAs = () => cgptSaveChatResponseText(entry, textSupplier(), true);
  return {
    onSave: canSave ? resolvedSave : null,
    onSaveAs: canSave ? resolvedSaveAs : null,
    onCopy: resolvedCopy,
    showSave: canSave,
    showSaveAs: canSave,
    showCopy: true,
  };
}

function cgptNormalizePlainText(text) {
  if (typeof cgptNormalizeChatLogLineEndings === "function") {
    return cgptNormalizeChatLogLineEndings(text);
  }
  return String(text || "");
}

function cgptShouldEnableChatOverlayHelpers() {
  if (typeof cgptGetViewSettings !== "function") {
    return false;
  }
  const settings = cgptGetViewSettings();
  return Boolean(settings && settings.chatOverlayEnabled === true);
}

function cgptDispatchChatLogUpdated() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  window.dispatchEvent(new CustomEvent(CHAT_LOG_UPDATED_EVENT));
}

function cgptRunChatLogUpdateBatch(callback) {
  chatLogUpdateBatchDepth += 1;
  try {
    return typeof callback === "function" ? callback() : undefined;
  } finally {
    chatLogUpdateBatchDepth = Math.max(0, chatLogUpdateBatchDepth - 1);
    if (chatLogUpdateBatchDepth === 0 && chatLogUpdatePending) {
      chatLogUpdatePending = false;
      cgptDispatchChatLogUpdated();
    }
  }
}

function cgptRemoveChatMessageTimestamp(element) {
  if (!element || typeof element.querySelectorAll !== "function") return;
  element.querySelectorAll(CHAT_LOG_TIMESTAMP_SELECTOR).forEach((timestamp) => {
    timestamp.remove();
  });
}

function cgptGetChatOverlayRoot(messageElement) {
  if (!messageElement || typeof messageElement.querySelector !== "function") return null;
  return messageElement.querySelector(CHAT_LOG_OVERLAY_ROOT_SELECTOR);
}

function cgptGetChatOverlayTitleWrapper(messageElement) {
  const root = cgptGetChatOverlayRoot(messageElement);
  if (!root || typeof root.querySelector !== "function") return null;
  return root.querySelector(CHAT_LOG_OVERLAY_INFO_SELECTOR);
}

function cgptGetChatOverlayActionsContainer(messageElement) {
  const root = cgptGetChatOverlayRoot(messageElement);
  if (!root || typeof root.querySelector !== "function") return null;
  return root.querySelector(CHAT_LOG_OVERLAY_ACTIONS_SELECTOR);
}

function cgptGetChatOverlayGuidesContainer(messageElement) {
  const root = cgptGetChatOverlayRoot(messageElement);
  if (!root || typeof root.querySelector !== "function") return null;
  return root.querySelector(CHAT_LOG_OVERLAY_GUIDES_SELECTOR);
}

function cgptRememberInlineStyleProperty(messageElement, propertyName, dataKey) {
  if (!messageElement || !messageElement.style || !messageElement.dataset) return;
  if (typeof messageElement.dataset[dataKey] === "undefined") {
    messageElement.dataset[dataKey] = messageElement.style[propertyName] || "";
  }
}

function cgptEnsureChatOverlayHostPosition(messageElement) {
  if (!messageElement || !messageElement.style || !messageElement.dataset) return;
  cgptRememberInlineStyleProperty(
    messageElement,
    "position",
    "cgptHelperChatOverlayOriginalPosition"
  );
  cgptRememberInlineStyleProperty(
    messageElement,
    "overflow",
    "cgptHelperChatOverlayOriginalOverflow"
  );
  if (!messageElement.style.position) {
    messageElement.style.position = "relative";
  }
  if (!messageElement.style.overflow) {
    messageElement.style.overflow = "visible";
  }
}

function cgptRestoreChatOverlayHostPosition(messageElement) {
  if (!messageElement || !messageElement.style || !messageElement.dataset) return;
  if (typeof messageElement.dataset.cgptHelperChatOverlayOriginalPosition !== "undefined") {
    const originalPosition = messageElement.dataset.cgptHelperChatOverlayOriginalPosition;
    if (originalPosition) {
      messageElement.style.position = originalPosition;
    } else {
      messageElement.style.removeProperty("position");
    }
    delete messageElement.dataset.cgptHelperChatOverlayOriginalPosition;
  }
  if (typeof messageElement.dataset.cgptHelperChatOverlayOriginalOverflow !== "undefined") {
    const originalOverflow = messageElement.dataset.cgptHelperChatOverlayOriginalOverflow;
    if (originalOverflow) {
      messageElement.style.overflow = originalOverflow;
    } else {
      messageElement.style.removeProperty("overflow");
    }
    delete messageElement.dataset.cgptHelperChatOverlayOriginalOverflow;
  }
}

function cgptEnsureChatOverlayRoot(messageElement) {
  if (!messageElement || typeof document === "undefined") return null;
  ensureChatLogFoldStyle();
  cgptEnsureChatOverlayHostPosition(messageElement);
  let root = cgptGetChatOverlayRoot(messageElement);
  if (root) return root;

  root = document.createElement("div");
  root.className = "cgpt-helper-chat-overlay-root";
  root.dataset.cgptHelperChatOverlayRoot = "1";

  const guides = document.createElement("div");
  guides.className = "cgpt-helper-chat-overlay-guides";
  guides.dataset.cgptHelperChatOverlayGuides = "1";

  const info = document.createElement("div");
  info.className = "cgpt-helper-chat-overlay-info";
  info.dataset.cgptHelperChatOverlayInfo = "1";

  const actions = document.createElement("div");
  actions.className = "cgpt-helper-chat-overlay-actions cgpt-helper-fold-actions";
  actions.dataset.cgptHelperChatOverlayActions = "1";

  root.appendChild(guides);
  root.appendChild(info);
  root.appendChild(actions);
  messageElement.appendChild(root);
  return root;
}

function cgptSetChatMessageCollapsed(messageElement, collapsed) {
  if (!messageElement || !messageElement.dataset) return;
  if (collapsed) {
    messageElement.dataset.cgptHelperChatCollapsed = "1";
    return;
  }
  delete messageElement.dataset.cgptHelperChatCollapsed;
}

function cgptSyncChatOverlayActionState(messageElement) {
  if (!messageElement) return;
  const actionsContainer = cgptGetChatOverlayActionsContainer(messageElement);
  if (!actionsContainer) return;
  const isCollapsed = messageElement.dataset.cgptHelperChatCollapsed === "1";
  actionsContainer.querySelectorAll(".cgpt-helper-fold-action-button").forEach((btn) => {
    if (!btn || !btn.dataset || !btn.dataset.cgptHelperFoldAction) return;
    const action = btn.dataset.cgptHelperFoldAction;
    if (action === "compact") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, isCollapsed);
      } else {
        btn.disabled = isCollapsed;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", isCollapsed);
    }
    if (action === "expand") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, !isCollapsed);
      } else {
        btn.disabled = !isCollapsed;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", !isCollapsed);
    }
  });
}

function cgptResolveHeadingLevelForOverlay(headingElement) {
  if (typeof cgptGetHeadingLevel === "function") {
    return cgptGetHeadingLevel(headingElement);
  }
  const tag = headingElement && headingElement.tagName ? headingElement.tagName.toUpperCase() : "";
  const match = tag.match(/^H(\d)$/);
  if (!match) return 0;
  const level = Number.parseInt(match[1], 10);
  return Number.isFinite(level) ? level : 0;
}

function cgptResolveHeadingGuideColor(level) {
  if (typeof cgptGetFoldLevelColor === "function") {
    return cgptGetFoldLevelColor(level);
  }
  const fallbackColors = [
    "#60a5fa",
    "#a78bfa",
    "#f472b6",
    "#34d399",
    "#f59e0b",
    "#38bdf8",
    "#c084fc",
  ];
  const index = Math.min(
    Math.max(Number.parseInt(level, 10) || 0, 0),
    fallbackColors.length - 1
  );
  return fallbackColors[index] || fallbackColors[0];
}

function cgptCollectChatOverlayGuides(messageElement) {
  if (!messageElement || typeof messageElement.querySelectorAll !== "function") return [];
  const headings = Array.from(messageElement.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length || typeof messageElement.getBoundingClientRect !== "function") return [];

  const guideStepPx =
    typeof CGPT_FOLD_GUIDE_STEP_PX === "number" ? CGPT_FOLD_GUIDE_STEP_PX : 12;
  const guideBaseLeftPx = 8;
  const messageRect = messageElement.getBoundingClientRect();
  const headingStack = [];

  return headings
    .map((heading, index) => {
      const level = cgptResolveHeadingLevelForOverlay(heading);
      if (!level || typeof heading.getBoundingClientRect !== "function") {
        return null;
      }
      while (headingStack.length && headingStack[headingStack.length - 1] >= level) {
        headingStack.pop();
      }
      const visualLevel = headingStack.length + 1;
      headingStack.push(level);

      let nextHeading = null;
      for (let nextIndex = index + 1; nextIndex < headings.length; nextIndex += 1) {
        if (cgptResolveHeadingLevelForOverlay(headings[nextIndex]) <= level) {
          nextHeading = headings[nextIndex];
          break;
        }
      }

      const headingRect = heading.getBoundingClientRect();
      const startTop = Math.max(0, headingRect.top - messageRect.top);
      const nextTop = nextHeading && typeof nextHeading.getBoundingClientRect === "function"
        ? nextHeading.getBoundingClientRect().top - messageRect.top
        : messageRect.height;
      const height = Math.max(14, Math.min(messageRect.height, nextTop) - startTop);
      return {
        level,
        visualLevel,
        top: startTop,
        height,
        left: guideBaseLeftPx + (visualLevel - 1) * guideStepPx,
        color: cgptResolveHeadingGuideColor(level),
      };
    })
    .filter(Boolean);
}

function cgptMergeChatOverlayGuideSegments(guides) {
  if (!Array.isArray(guides) || !guides.length) return [];
  const sorted = guides
    .slice()
    .sort((a, b) => (a.visualLevel - b.visualLevel) || (a.top - b.top));
  const merged = [];
  sorted.forEach((guide) => {
    const previous = merged[merged.length - 1];
    const guideBottom = guide.top + guide.height;
    if (
      previous &&
      previous.visualLevel === guide.visualLevel &&
      previous.left === guide.left &&
      guide.top <= previous.top + previous.height + 2
    ) {
      const nextBottom = Math.max(previous.top + previous.height, guideBottom);
      previous.top = Math.min(previous.top, guide.top);
      previous.height = nextBottom - previous.top;
      return;
    }
    merged.push({ ...guide });
  });
  return merged;
}

function renderChatOverlayGuides(entry) {
  if (!entry || !entry.element) return;
  const messageElement = entry.element;
  const guidesContainer = cgptGetChatOverlayGuidesContainer(messageElement);
  if (!guidesContainer) return;
  guidesContainer.replaceChildren();
  guidesContainer.style.removeProperty("left");
  guidesContainer.style.removeProperty("width");
  guidesContainer.style.removeProperty("right");
  if (!cgptShouldEnableChatOverlayHelpers()) return;
  if (entry.role !== "assistant") return;
  if (messageElement.dataset.cgptHelperChatCollapsed === "1") return;

  const guides = cgptCollectChatOverlayGuides(messageElement);
  if (!guides.length) return;
  const mergedGuides = cgptMergeChatOverlayGuideSegments(guides);

  const guideStepPx =
    typeof CGPT_FOLD_GUIDE_STEP_PX === "number" ? CGPT_FOLD_GUIDE_STEP_PX : 12;
  const maxVisualLevel = guides.reduce(
    (maxLevel, guide) => Math.max(maxLevel, Number(guide.visualLevel) || 0),
    1
  );
  const gutterWidth = 8 + maxVisualLevel * guideStepPx;
  guidesContainer.style.left = `-${gutterWidth}px`;
  guidesContainer.style.width = `${gutterWidth}px`;
  guidesContainer.style.right = "auto";

  mergedGuides.forEach((guide) => {
    const line = document.createElement("div");
    line.className = "cgpt-helper-chat-overlay-guide";
    line.dataset.cgptHelperChatGuideLevel = `${guide.level}`;
    line.dataset.cgptHelperChatGuideVisualLevel = `${guide.visualLevel}`;
    line.style.top = `${guide.top}px`;
    line.style.left = `${guide.left}px`;
    line.style.height = `${guide.height}px`;
    line.style.background = guide.color;
    guidesContainer.appendChild(line);
  });

  guides.forEach((guide) => {
    const marker = document.createElement("div");
    marker.className = "cgpt-helper-chat-overlay-guide-marker";
    marker.dataset.cgptHelperChatGuideLevel = `${guide.level}`;
    marker.dataset.cgptHelperChatGuideVisualLevel = `${guide.visualLevel}`;
    marker.style.top = `${guide.top}px`;
    marker.style.left = `${guide.left}px`;
    marker.style.background = guide.color;
    guidesContainer.appendChild(marker);
  });
}

function cgptRemoveChatOverlayRoot(messageElement, { restoreHeadingFolds = false } = {}) {
  if (!messageElement || typeof messageElement.querySelector !== "function") return;
  const root = cgptGetChatOverlayRoot(messageElement);
  if (root) {
    root.remove();
  }
  if (restoreHeadingFolds) {
    cgptRestoreHeadingFolds(messageElement);
  }
  delete messageElement.dataset.cgptHelperChatOverlayApplied;
  delete messageElement.dataset.cgptHelperChatShellApplied;
  delete messageElement.dataset.cgptHelperFoldApplied;
  delete messageElement.dataset.cgptHelperChatCollapsed;
  messageElement.classList.remove("cgpt-helper-message-body");
  cgptUnmarkChatMessageContentNodes(messageElement);
  cgptRestoreChatOverlayHostPosition(messageElement);
}

function cgptMarkChatMessageContentNodes(messageElement) {
  if (!messageElement || typeof messageElement.childNodes === "undefined") return;
  Array.from(messageElement.childNodes).forEach((node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    if (cgptIsHelperManagedNode(node)) return;
    node.dataset.cgptHelperChatContent = "1";
  });
}

function cgptUnmarkChatMessageContentNodes(messageElement) {
  if (!messageElement || typeof messageElement.querySelectorAll !== "function") return;
  messageElement.querySelectorAll(":scope > [data-cgpt-helper-chat-content='1']").forEach((node) => {
    delete node.dataset.cgptHelperChatContent;
  });
}

function cgptCaptureVisibleChatAnchor(root = document) {
  if (!root || typeof root.querySelectorAll !== "function" || typeof window === "undefined") {
    return null;
  }
  const viewportHeight = Number(window.innerHeight) || 0;
  const messages = Array.from(root.querySelectorAll(CHAT_LOG_SELECTOR));
  for (const message of messages) {
    if (!message || typeof message.getBoundingClientRect !== "function") continue;
    const rect = message.getBoundingClientRect();
    if (rect.height < 8 || rect.bottom <= 0 || rect.top >= viewportHeight) continue;
    return {
      element: message,
      top: rect.top,
    };
  }
  return null;
}

function cgptRestoreVisibleChatAnchor(anchor) {
  if (
    !anchor ||
    !anchor.element ||
    !anchor.element.isConnected ||
    typeof anchor.element.getBoundingClientRect !== "function" ||
    typeof window === "undefined" ||
    typeof window.scrollBy !== "function"
  ) {
    return;
  }
  const nextTop = anchor.element.getBoundingClientRect().top;
  const delta = nextTop - anchor.top;
  if (Math.abs(delta) >= 1) {
    window.scrollBy(0, delta);
  }
}

function cgptScheduleInitialChatOverlayRefreshes(root = document) {
  if (typeof setTimeout !== "function") return;
  [250, 1500, 4000].forEach((delayMs) => {
    setTimeout(() => {
      cgptRefreshChatOverlayHelpers(root);
    }, delayMs);
  });
}

function cgptRestoreHeadingFolds(root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const sections = Array.from(root.querySelectorAll(".cgpt-helper-heading-section")).reverse();
  sections.forEach((section) => {
    if (!section || !section.parentNode || typeof section.querySelector !== "function") return;
    const heading = section.querySelector(":scope > .cgpt-helper-heading-fold");
    const body = section.querySelector(":scope > .cgpt-helper-heading-body");
    if (!heading || !body) return;

    const toggleButton =
      typeof heading.querySelector === "function"
        ? heading.querySelector(":scope > .cgpt-helper-heading-toggle")
        : null;
    if (toggleButton) {
      toggleButton.remove();
    }
    heading.classList.remove(
      "cgpt-helper-heading-fold",
      "cgpt-helper-heading-title",
      "cgpt-helper-heading-collapsed"
    );
    delete heading.dataset.cgptHelperHeadingId;
    delete heading.dataset.cgptHelperHeadingFoldApplied;
    delete heading.dataset.cgptHelperFoldLevel;
    heading.style.removeProperty("--cgpt-helper-fold-visual-level");
    heading.style.removeProperty("--cgpt-helper-fold-guide-count");
    heading.style.removeProperty("--cgpt-helper-fold-indent");
    heading.style.removeProperty("--cgpt-helper-fold-color");

    section.parentNode.insertBefore(heading, section);
    Array.from(body.childNodes).forEach((node) => {
      section.parentNode.insertBefore(node, section);
    });
    section.remove();
  });
}

function cgptRestoreChatMessageUi(messageElement, options = {}) {
  if (!messageElement || typeof messageElement.querySelector !== "function") return;
  const preserveRoot = options && options.preserveRoot === true;
  const restoreHeadingFolds = options && options.restoreHeadingFolds === true;
  const titleWrapper = cgptGetChatOverlayTitleWrapper(messageElement);
  removeChatMessageBadge(titleWrapper || messageElement);
  cgptRemoveChatMessageTimestamp(titleWrapper || messageElement);
  const guidesContainer = cgptGetChatOverlayGuidesContainer(messageElement);
  if (guidesContainer) {
    guidesContainer.replaceChildren();
  }
  if (!preserveRoot) {
    cgptRemoveChatOverlayRoot(messageElement, { restoreHeadingFolds });
    return;
  }
  if (restoreHeadingFolds) {
    cgptRestoreHeadingFolds(messageElement);
  }
  delete messageElement.dataset.cgptHelperChatOverlayApplied;
  delete messageElement.dataset.cgptHelperFoldApplied;
  messageElement.classList.remove("cgpt-helper-message-body");
  cgptSyncChatOverlayActionState(messageElement);
}

function cgptRestoreTrackedChatMessageElements(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll(CHAT_LOG_SELECTOR).forEach((messageElement) => {
    cgptRestoreChatMessageUi(messageElement, {
      preserveRoot: false,
      restoreHeadingFolds: true,
    });
  });
}

function cgptSaveChatResponseText(entry, rawText, saveAs = false) {
  const normalized = cgptNormalizePlainText(rawText || (entry && entry.text));
  const trimmed = normalized.trim();
  if (!trimmed) {
    return;
  }
  const filePath = cgptBuildResponseFilePath(entry);
  if (typeof cgptTriggerChatLogDownload === "function") {
    cgptTriggerChatLogDownload(filePath, trimmed, {
      saveAs,
      meta: {
        source: "chat-entry",
        entryRole: entry && entry.role ? entry.role : "",
        timestamp: entry && entry.timestamp ? entry.timestamp : "",
        conversationKey:
          typeof getConversationKey === "function" ? getConversationKey() : "",
      },
    });
    return;
  }
  cgptDownloadTextLocally(filePath, trimmed);
}

function cgptCopyPlainText(text) {
  const normalized = cgptNormalizePlainText(text).trim();
  if (!normalized) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(normalized);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = normalized;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function cgptBuildResponseFilePath(entry) {
  const rolePrefix = entry && entry.role === "assistant" ? "assistant" : "user";
  const conversationKey =
    typeof getConversationKey === "function" ? getConversationKey() : "";
  const timestamp = (() => {
    if (entry && entry.timestamp) {
      const date = new Date(entry.timestamp);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return new Date().toISOString();
  })();
  const safe = timestamp.replace(/[:.]/g, "-");
  const safeConversationKey = cgptSanitizeChatLogPathSegment(conversationKey || "current-chat");
  return `chat-logs/${safeConversationKey}/${rolePrefix}-${safe}.txt`;
}

function cgptSanitizeChatLogPathSegment(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized || "current-chat";
}

function cgptDownloadTextLocally(fileName, content) {
  try {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    // noop
  }
}

function initChatLogTracker(root = document) {
  if (chatLogTrackerInitialized) return;
  chatLogTrackerInitialized = true;
  ensureChatLogHighlightStyle();
  if (typeof cgptSetCurrentConversationKey === "function") {
    cgptSetCurrentConversationKey(getConversationKey());
  }
  captureChatLogsFromNode(root);
  cgptRefreshChatOverlayHelpers(root);
  cgptScheduleInitialChatOverlayRefreshes(root);
  startChatLogMutationObserver();
  startChatRouteWatcher();
}

function resetChatLogEntries() {
  chatLogEntries.length = 0;
  chatLogTrackedIds.clear();
  chatLogPendingFoldTimers.forEach((timerId) => clearTimeout(timerId));
  chatLogPendingFoldTimers.clear();
  chatLogPendingRenderTimers.forEach((timerId) => clearTimeout(timerId));
  chatLogPendingRenderTimers.clear();
  chatLogOrderCounter = 0;
  if (document && typeof document.querySelectorAll === "function") {
    cgptRestoreTrackedChatMessageElements(document);
    document.querySelectorAll("[data-cgpt-helper-chat-tracked='1']").forEach((el) => {
      delete el.dataset.cgptHelperChatTracked;
    });
    document.querySelectorAll("[data-cgpt-helper-chat-diagnostic='1']").forEach((el) => {
      el.remove();
    });
  }
  cgptNotifyChatLogUpdated();
}

function ensureChatLogHighlightStyle() {
  if (chatLogHighlightStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-chatlog-highlight {
      outline: 3px solid #fbbf24 !important;
      border-radius: 12px;
      animation: cgpt-helper-chatlog-pulse 2s ease;
    }
    @keyframes cgpt-helper-chatlog-pulse {
      0% { outline-color: #fbbf24; }
      50% { outline-color: rgba(251, 191, 36, 0.2); }
      100% { outline-color: transparent; }
    }
  `;
  document.head.appendChild(style);
  chatLogHighlightStyleInjected = true;
}

function ensureChatLogTimestampStyle() {
  if (chatLogTimestampStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-chatlog-timestamp-wrapper {
      display: flex;
      align-items: center;
    }
    .cgpt-helper-chatlog-timestamp-label {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.4;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
  chatLogTimestampStyleInjected = true;
}

function captureChatLogsFromNode(rootNode) {
  if (!rootNode) return;
  cgptIncrementChatLogPerfMetric("captureCalls");

  if (rootNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    Array.from(rootNode.childNodes).forEach((child) => {
      captureChatLogsFromNode(child);
    });
    return;
  }

  if (rootNode.nodeType === Node.DOCUMENT_NODE) {
    rootNode.querySelectorAll(CHAT_LOG_TURN_SELECTOR).forEach((el) => {
      cgptProcessOrRefreshChatMessageElement(el);
    });
    rootNode.querySelectorAll(CHAT_LOG_SELECTOR).forEach((el) => {
      if (!el.closest(CHAT_LOG_TURN_SELECTOR)) {
        cgptProcessOrRefreshChatMessageElement(el);
      }
    });
    return;
  }

  if (rootNode.nodeType !== Node.ELEMENT_NODE) return;
  if (cgptIsHelperManagedNode(rootNode)) return;

  const ownerMessage = cgptGetChatEntryHost(rootNode);
  if (ownerMessage && ownerMessage.dataset.cgptHelperChatTracked === "1") {
    cgptRefreshTrackedChatMessage(ownerMessage);
  }

  if (rootNode.matches && (rootNode.matches(CHAT_LOG_TURN_SELECTOR) || rootNode.matches(CHAT_LOG_SELECTOR))) {
    cgptProcessOrRefreshChatMessageElement(rootNode);
  }
  rootNode.querySelectorAll(CHAT_LOG_TURN_SELECTOR).forEach((el) => {
    cgptProcessOrRefreshChatMessageElement(el);
  });
  rootNode.querySelectorAll(CHAT_LOG_SELECTOR).forEach((el) => {
    if (!el.closest(CHAT_LOG_TURN_SELECTOR)) {
      cgptProcessOrRefreshChatMessageElement(el);
    }
  });
}

function cgptProcessOrRefreshChatMessageElement(element) {
  const host = cgptGetChatEntryHost(element);
  if (!host) return;
  if (host.dataset && host.dataset.cgptHelperChatTracked === "1") {
    cgptRefreshTrackedChatMessage(host);
    return;
  }
  processChatMessageElement(host);
}

function processChatMessageElement(el, renderAttempt = 0) {
  if (!el) return;
  cgptIncrementChatLogPerfMetric("processCalls");
  const host = cgptGetChatEntryHost(el);
  if (!host || host.dataset.cgptHelperChatTracked === "1") return;
  const roleElement = cgptGetChatRoleElement(host);
  const messageElement = roleElement || host;

  const role = (roleElement && roleElement.getAttribute("data-message-author-role") || "").toLowerCase();
  if (role !== "user" && role !== "assistant") return;
  const renderIssue = cgptBuildChatRenderIssue(role, messageElement);
  if (renderIssue) {
    if (renderAttempt < CHAT_LOG_RENDER_MAX_RETRIES) {
      cgptScheduleChatMessageRenderRetry(host, renderAttempt + 1);
    } else {
      renderChatMessageDiagnostic(host, roleElement, renderIssue);
    }
    return;
  }
  const pendingRenderTimer = chatLogPendingRenderTimers.get(host);
  if (pendingRenderTimer) {
    clearTimeout(pendingRenderTimer);
    chatLogPendingRenderTimers.delete(host);
  }
  renderChatMessageDiagnostic(host, roleElement, null);

  const rawId =
    host.getAttribute("data-testid") ||
    host.getAttribute("data-message-id") ||
    host.dataset.messageId ||
    host.getAttribute("data-id") ||
    (roleElement && roleElement.getAttribute("data-message-id")) ||
    (roleElement && roleElement.dataset && roleElement.dataset.messageId) ||
    (roleElement && roleElement.getAttribute("data-id")) ||
    null;
  const entryId = rawId || `cgpt-helper-chat-${role}-${Date.now()}-${chatLogOrderCounter}`;
  if (chatLogTrackedIds.has(entryId)) {
    host.dataset.cgptHelperChatTracked = "1";
    if (roleElement && roleElement !== host) {
      roleElement.dataset.cgptHelperChatTracked = "1";
    }
    return;
  }

  const text = extractChatMessageText(messageElement);
  const fallbackText = text.trim() || cgptBuildChatMessageMediaPlaceholder(messageElement);
  if (!fallbackText.trim()) {
    removeChatMessageBadge(messageElement);
    return;
  }

  chatLogTrackedIds.add(entryId);
  host.dataset.cgptHelperChatTracked = "1";
  if (roleElement && roleElement !== host) {
    roleElement.dataset.cgptHelperChatTracked = "1";
  }
  const entry = {
    id: entryId,
    role,
    text: fallbackText,
    textSignature: cgptBuildChatMessageTextSignature(messageElement),
    timestamp: extractChatMessageTimestamp(host),
    displayLabel: cgptResolveChatMessageDisplayLabel(role, messageElement),
    messageId: rawId || "",
    element: messageElement,
    hostElement: host,
    roleElement: messageElement,
    order: cgptResolveChatEntryOrder(host, chatLogOrderCounter),
    lastMutationAt: Date.now(),
  };
  chatLogOrderCounter += 1;

  chatLogEntries.push(entry);
  renderChatMessageFolding(entry);
  renderChatMessageBadge(entry);
  renderChatMessageTimestamp(entry);
  if (cgptShouldEnableChatOverlayHelpers()) {
    cgptScheduleChatMessageFolding(entry);
  }
  cgptNotifyChatLogUpdated();
}

function cgptGetChatEntryHost(element) {
  if (!element || typeof element.matches !== "function") return null;
  if (element.matches(CHAT_LOG_TURN_SELECTOR)) return element;
  if (typeof element.closest === "function") {
    const turn = element.closest(CHAT_LOG_TURN_SELECTOR);
    if (turn) return turn;
  }
  if (element.matches(CHAT_LOG_SELECTOR)) return element;
  return typeof element.closest === "function" ? element.closest(CHAT_LOG_SELECTOR) : null;
}

function cgptGetChatRoleElement(host) {
  if (!host) return null;
  if (host.matches && host.matches(CHAT_LOG_SELECTOR)) return host;
  return typeof host.querySelector === "function" ? host.querySelector(CHAT_LOG_SELECTOR) : null;
}

function cgptIsVisibleChatMessageRegion(element) {
  if (!element || typeof element.getClientRects !== "function") return false;
  return Array.from(element.getClientRects()).some(
    (rect) => rect && rect.width >= 24 && rect.height >= 12
  );
}

function cgptResolveChatMessageDisplayLabel(role, element) {
  if (typeof cgptGetChatEntryDisplayLabel === "function") {
    return cgptGetChatEntryDisplayLabel({ role, element });
  }
  return role === "assistant" ? "AI" : "User";
}

function cgptResolveChatTurnNumber(host) {
  if (!host || typeof host.getAttribute !== "function") return null;
  const testId = String(host.getAttribute("data-testid") || "");
  const match = testId.match(/^conversation-turn-(\d+)$/);
  if (!match) return null;
  const turnNumber = Number.parseInt(match[1], 10);
  return Number.isFinite(turnNumber) ? turnNumber : null;
}

function cgptResolveChatEntryOrder(host, fallbackOrder) {
  const turnNumber = cgptResolveChatTurnNumber(host);
  if (Number.isFinite(turnNumber)) {
    return turnNumber;
  }
  return Number.isFinite(fallbackOrder) ? fallbackOrder : 0;
}

function extractChatMessageTimestamp(el) {
  const timeEl = el.querySelector("time");
  if (timeEl) {
    const dt =
      timeEl.getAttribute("datetime") ||
      timeEl.dateTime ||
      (timeEl.textContent ? timeEl.textContent.trim() : "");
    if (dt) return dt;
  }
  return "";
}

function cgptGetTrackedChatEntry(element) {
  if (!element) return null;
  const host = cgptGetChatEntryHost(element) || element;
  const entryId =
    host.getAttribute("data-testid") ||
    host.getAttribute("data-message-id") ||
    host.dataset.messageId ||
    host.getAttribute("data-id") ||
    null;
  if (entryId) {
    const exactMatch = chatLogEntries.find((entry) => entry && entry.id === entryId);
    if (exactMatch) return exactMatch;
  }
  return (
    chatLogEntries.find(
      (entry) =>
        entry &&
        (entry.hostElement === host ||
          entry.element === host ||
          entry.roleElement === element ||
          entry.roleElement === cgptGetChatRoleElement(host))
    ) || null
  );
}

function cgptRefreshTrackedChatMessage(element) {
  const entry = cgptGetTrackedChatEntry(element);
  if (!entry) return;
  cgptIncrementChatLogPerfMetric("refreshCalls");
  const host = cgptGetChatEntryHost(element) || element;
  const roleElement = cgptGetChatRoleElement(host) || entry.roleElement || host;
  renderChatMessageDiagnostic(host, roleElement, null);
  const nextTextSignature = cgptBuildChatMessageTextSignature(roleElement);
  const nextTimestamp = extractChatMessageTimestamp(host);
  const nextDisplayLabel = cgptResolveChatMessageDisplayLabel(entry.role, roleElement);
  const textChanged = nextTextSignature !== entry.textSignature;
  const timestampChanged = nextTimestamp !== entry.timestamp;
  if (nextTextSignature !== entry.textSignature) {
    const text = extractChatMessageText(roleElement);
    const fallbackText = text.trim() || cgptBuildChatMessageMediaPlaceholder(roleElement);
    if (fallbackText.trim()) {
      entry.text = fallbackText;
    }
    entry.textSignature = nextTextSignature;
  }
  entry.timestamp = nextTimestamp;
  entry.displayLabel = nextDisplayLabel;
  entry.element = roleElement;
  entry.hostElement = host;
  entry.roleElement = roleElement;
  entry.order = cgptResolveChatEntryOrder(host, entry.order);
  if (textChanged || timestampChanged) {
    entry.lastMutationAt = Date.now();
  }
  renderChatMessageFolding(entry);
  renderChatMessageBadge(entry);
  renderChatMessageTimestamp(entry);
  if (cgptShouldEnableChatOverlayHelpers() && entry.element.dataset.cgptHelperChatOverlayApplied !== "1") {
    cgptScheduleChatMessageFolding(entry);
  } else if (cgptShouldEnableChatOverlayHelpers()) {
    renderChatOverlayGuides(entry);
    cgptSyncChatOverlayActionState(entry.element);
  } else if (!cgptShouldEnableChatOverlayHelpers()) {
    cgptRestoreChatMessageUi(entry.element, { preserveRoot: true });
  }
  cgptNotifyChatLogUpdated();
}

function cgptNotifyChatLogUpdated() {
  if (chatLogUpdateBatchDepth > 0) {
    chatLogUpdatePending = true;
    return;
  }
  cgptDispatchChatLogUpdated();
}

function cgptCancelPendingChatMessageFold(entryId) {
  if (!entryId) return;
  const pendingTimer = chatLogPendingFoldTimers.get(entryId);
  if (!pendingTimer) return;
  clearTimeout(pendingTimer);
  chatLogPendingFoldTimers.delete(entryId);
}

function cgptRefreshChatOverlayHelpers(root = document) {
  const targetRoot =
    root && typeof root.querySelectorAll === "function"
      ? root
      : document && typeof document.querySelectorAll === "function"
        ? document
        : null;
  const visibleAnchor = cgptCaptureVisibleChatAnchor(targetRoot);

  cgptRunChatLogUpdateBatch(() => {
    if (targetRoot) {
      targetRoot.querySelectorAll(CHAT_LOG_TURN_SELECTOR).forEach((element) => {
        cgptProcessOrRefreshChatMessageElement(element);
      });
      targetRoot.querySelectorAll(CHAT_LOG_SELECTOR).forEach((element) => {
        if (!element.closest(CHAT_LOG_TURN_SELECTOR)) {
          cgptProcessOrRefreshChatMessageElement(element);
        }
      });
    }

    if (!cgptShouldEnableChatOverlayHelpers()) {
      chatLogEntries.forEach((entry) => {
        if (!entry) return;
        cgptCancelPendingChatMessageFold(entry.id);
        const messageElement = entry.element || entry.roleElement || entry.hostElement || null;
        if (messageElement) {
          cgptRestoreChatMessageUi(messageElement, { preserveRoot: true });
        }
      });
      return;
    }
  });
  cgptRestoreVisibleChatAnchor(visibleAnchor);
}

function renderChatMessageBadge(entry) {
  if (!entry || !entry.element) return;
  const badgeHost = cgptGetChatOverlayTitleWrapper(entry.roleElement || entry.element);
  if (!badgeHost) return;
  if (!cgptShouldEnableChatOverlayHelpers()) {
    removeChatMessageBadge(badgeHost);
    return;
  }
  if (entry.role === "user") {
    removeChatMessageBadge(badgeHost);
    return;
  }

  const labelText = entry.displayLabel || cgptResolveChatMessageDisplayLabel(entry.role, badgeHost);
  if (!labelText) return;

  let wrapper = badgeHost.querySelector(`:scope > ${CHAT_LOG_MESSAGE_BADGE_SELECTOR}`);
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.dataset.cgptHelperChatBadge = "1";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = entry.role === "user" ? "flex-end" : "flex-start";
    wrapper.style.gap = "8px";
    wrapper.style.minWidth = "0";
    badgeHost.appendChild(wrapper);
  }

  let badge = wrapper.querySelector("span");
  if (!badge) {
    badge = document.createElement("span");
    wrapper.appendChild(badge);
  }
  badge.textContent = labelText;
  if (typeof cgptApplySharedChipStyle === "function") {
    cgptApplySharedChipStyle(badge, {
      variant: entry.role === "user" ? "userChip" : "assistantChip",
      size: "sm",
    });
  } else {
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.borderRadius = "999px";
    badge.style.padding = "2px 8px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "600";
  }
}

function removeChatMessageBadge(element) {
  if (!element || typeof element.querySelectorAll !== "function") return;
  element.querySelectorAll(CHAT_LOG_MESSAGE_BADGE_SELECTOR).forEach((badge) => {
    badge.remove();
  });
}

function cgptHasStableCodeBlocks(element) {
  if (!element || typeof element.querySelectorAll !== "function") return true;
  const preBlocks = Array.from(element.querySelectorAll("pre"));
  if (!preBlocks.length) return true;
  return preBlocks.every((pre) => pre.querySelector("code, .cm-content"));
}

function cgptHasUnrenderedFencedCode(element) {
  if (!element) return false;
  const hasRenderedCodeBlock =
    typeof element.querySelector === "function" && Boolean(element.querySelector("pre code, pre .cm-content"));
  if (hasRenderedCodeBlock) {
    return false;
  }
  const rawText =
    typeof element.innerText === "string"
      ? element.innerText
      : typeof element.textContent === "string"
        ? element.textContent
        : "";
  if (!rawText) return false;
  const normalized = rawText.replace(/\r\n/g, "\n");
  return /(^|\n)```[^\n]*\n/.test(normalized);
}

function cgptBuildChatRenderIssue(role, messageElement) {
  if (role !== "assistant" || !cgptHasUnrenderedFencedCode(messageElement)) {
    return null;
  }
  const rawText =
    typeof messageElement.innerText === "string"
      ? messageElement.innerText
      : typeof messageElement.textContent === "string"
        ? messageElement.textContent
        : "";
  return {
    code: "assistant-raw-fence",
    message:
      "Helper deferred decorations because the assistant message still contains raw fenced code.",
    sample: cgptNormalizePlainText(rawText).slice(0, 240),
  };
}

function cgptGetChatDiagnosticContainer(host, roleElement) {
  if (host && roleElement && host !== roleElement) {
    return host;
  }
  if (roleElement && roleElement.parentElement) {
    return roleElement.parentElement;
  }
  return host || roleElement || null;
}

function cgptLogChatRenderIssue(host, issue) {
  if (!host || !issue || host.dataset.cgptHelperChatDiagnosticLogged === issue.code) {
    return;
  }
  host.dataset.cgptHelperChatDiagnosticLogged = issue.code;
  try {
    console.error("[ChatGPT Code Saver]", issue.message, {
      code: issue.code,
      messageId:
        host.getAttribute("data-message-id") ||
        host.getAttribute("data-testid") ||
        "",
      sample: issue.sample || "",
    });
  } catch (_error) {
    // noop
  }
}

function renderChatMessageDiagnostic(host, roleElement, issue) {
  const container = cgptGetChatDiagnosticContainer(host, roleElement);
  if (!container || typeof container.querySelector !== "function") return;
  let diagnostic = container.querySelector(":scope > [data-cgpt-helper-chat-diagnostic='1']");
  if (!issue) {
    if (diagnostic) {
      diagnostic.remove();
    }
    if (host && host.dataset) {
      delete host.dataset.cgptHelperChatDiagnosticLogged;
    }
    return;
  }
  if (!diagnostic) {
    diagnostic = document.createElement("div");
    diagnostic.dataset.cgptHelperChatDiagnostic = "1";
    diagnostic.className = "cgpt-helper-chat-diagnostic";
    diagnostic.style.margin = "0 0 6px 0";
    diagnostic.style.padding = "8px 10px";
    diagnostic.style.borderRadius = "10px";
    diagnostic.style.border = "1px solid rgba(239, 68, 68, 0.28)";
    diagnostic.style.background = "rgba(127, 29, 29, 0.08)";
    diagnostic.style.color = "#991b1b";
    diagnostic.style.fontSize = "12px";
    diagnostic.style.lineHeight = "1.45";
    diagnostic.style.whiteSpace = "pre-wrap";
    container.insertBefore(diagnostic, container.firstChild);
  }
  diagnostic.dataset.cgptHelperChatDiagnosticCode = issue.code || "";
  diagnostic.textContent =
    "Rendering error: assistant message still has raw ``` fences, so helper decorations were skipped.";
  diagnostic.title = issue.sample || issue.message || "";
  cgptLogChatRenderIssue(host || container, issue);
}

function cgptScheduleChatMessageRenderRetry(host, attempt = 1) {
  if (!host) return;
  const existingTimer = chatLogPendingRenderTimers.get(host);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timerId = setTimeout(() => {
    chatLogPendingRenderTimers.delete(host);
    processChatMessageElement(host, attempt);
  }, CHAT_LOG_RENDER_RETRY_DELAY_MS);
  chatLogPendingRenderTimers.set(host, timerId);
}

function cgptShouldDelayChatMessageFolding(
  lastMutationAt,
  now = Date.now(),
  quietPeriodMs = CHAT_LOG_FOLD_QUIET_PERIOD_MS
) {
  const normalizedLastMutationAt = Number(lastMutationAt) || 0;
  const quietForMs = now - normalizedLastMutationAt;
  return quietForMs < quietPeriodMs;
}

function cgptScheduleChatMessageFolding(entry, attempt = 0) {
  if (!entry || !entry.element) return;
  if (!cgptShouldEnableChatOverlayHelpers()) {
    cgptRestoreChatMessageUi(entry.element, { preserveRoot: true });
    return;
  }
  if (entry.element.dataset.cgptHelperChatOverlayApplied === "1") return;
  const existingTimer = chatLogPendingFoldTimers.get(entry.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timerId = setTimeout(() => {
    chatLogPendingFoldTimers.delete(entry.id);
    if (cgptShouldDelayChatMessageFolding(entry.lastMutationAt)) {
      if (attempt < CHAT_LOG_FOLD_MAX_RETRIES) {
        cgptScheduleChatMessageFolding(entry, attempt + 1);
      }
      return;
    }
    if (!cgptHasStableCodeBlocks(entry.element)) {
      if (attempt < CHAT_LOG_FOLD_MAX_RETRIES) {
        cgptScheduleChatMessageFolding(entry, attempt + 1);
      }
      return;
    }
    if (entry.role === "assistant" && cgptHasUnrenderedFencedCode(entry.element)) {
      if (attempt < CHAT_LOG_FOLD_MAX_RETRIES) {
        cgptScheduleChatMessageFolding(entry, attempt + 1);
      }
      return;
    }
    cgptApplyChatOverlayHelpers(entry);
  }, CHAT_LOG_FOLD_DELAY_MS);
  chatLogPendingFoldTimers.set(entry.id, timerId);
}

function cgptApplyChatOverlayHelpers(entry) {
  if (!entry || !entry.element) return;
  const messageElement = entry.element;
  renderChatMessageFolding(entry);
  messageElement.classList.add("cgpt-helper-message-body");
  messageElement.dataset.cgptHelperChatOverlayApplied = "1";
  messageElement.dataset.cgptHelperFoldApplied = "1";
  renderChatMessageBadge(entry);
  renderChatMessageTimestamp(entry);
  renderChatOverlayGuides(entry);
  cgptSyncChatOverlayActionState(messageElement);
  const pendingTimer = chatLogPendingFoldTimers.get(entry.id);
  if (pendingTimer) {
    cgptCancelPendingChatMessageFold(entry.id);
  }
}

function renderChatMessageTimestamp(entry) {
  if (!entry || !entry.element) return;
  const titleWrapper = cgptGetChatOverlayTitleWrapper(entry.element);
  if (!titleWrapper) return;
  if (!cgptShouldEnableChatOverlayHelpers()) {
    cgptRemoveChatMessageTimestamp(titleWrapper);
    return;
  }
  ensureChatLogTimestampStyle();
  const container = titleWrapper.querySelector(
    CHAT_LOG_TIMESTAMP_SELECTOR
  );
  const rawTimestamp = entry && entry.timestamp ? String(entry.timestamp).trim() : "";
  if (!rawTimestamp) {
    if (container) {
      container.remove();
    }
    return;
  }
  const labelText =
    typeof cgptFormatChatLogTimestamp === "function"
      ? cgptFormatChatLogTimestamp(rawTimestamp)
      : rawTimestamp;

  if (container) {
    const label = container.querySelector(".cgpt-helper-chatlog-timestamp-label");
    if (label) {
      label.textContent = labelText;
    }
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "cgpt-helper-chatlog-timestamp-wrapper";

  const label = document.createElement("span");
  label.className = "cgpt-helper-chatlog-timestamp-label";
  label.textContent = labelText;
  wrapper.appendChild(label);

  titleWrapper.appendChild(wrapper);
}

function renderChatMessageFolding(entry) {
  if (!entry || !entry.element) return;
  const messageElement = entry.element;
  cgptMarkChatMessageContentNodes(messageElement);
  const root = cgptEnsureChatOverlayRoot(messageElement);
  if (!root) return;
  root.dataset.cgptHelperAuthorRole = entry.role || "";
  const actionsContainer = cgptGetChatOverlayActionsContainer(messageElement);
  if (!actionsContainer) return;
  actionsContainer.replaceChildren();

  const actionButtons =
    typeof cgptCreateFoldActionButtons === "function"
      ? cgptCreateFoldActionButtons(cgptBuildChatFoldActions(entry))
      : [];
  actionButtons.forEach((button) => {
    if (!button) return;
    const action = button.dataset ? button.dataset.cgptHelperFoldAction : "";
    if (action === "compact") {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cgptSetChatMessageCollapsed(messageElement, true);
        cgptSyncChatOverlayActionState(messageElement);
      });
    }
    if (action === "expand") {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cgptSetChatMessageCollapsed(messageElement, false);
        cgptSyncChatOverlayActionState(messageElement);
      });
    }
    actionsContainer.appendChild(button);
  });
  if (!actionButtons.length) {
    actionsContainer.style.display = "none";
  } else {
    actionsContainer.style.display = "flex";
  }
  cgptSyncChatOverlayActionState(messageElement);
}

function extractChatMessageText(el) {
  if (!el) return "";
  return cgptExtractChatMessageTextFromNode(el);
}

function cgptBuildChatMessageMediaPlaceholder(node) {
  if (!node || typeof node.querySelector !== "function") return "";
  const image =
    node.querySelector("img[alt]") ||
    node.querySelector("button[aria-label^='Open image:'] img") ||
    null;
  const imageLabel = image && typeof image.getAttribute === "function"
    ? String(image.getAttribute("alt") || "").trim()
    : "";
  if (imageLabel) {
    return `[Image: ${imageLabel}]`;
  }

  const imageButton = node.querySelector("button[aria-label^='Open image:']");
  if (imageButton && typeof imageButton.getAttribute === "function") {
    const ariaLabel = String(imageButton.getAttribute("aria-label") || "").trim();
    const match = ariaLabel.match(/^Open image:\s*(.+)$/i);
    if (match && match[1]) {
      return `[Image: ${match[1].trim()}]`;
    }
    return "[Image]";
  }

  return "";
}

function cgptBuildChatMessageTextSignature(node) {
  if (!node) return "";
  const normalizedText = cgptNormalizePlainText(cgptExtractChatMessageTextFromNode(node));
  const structuralCounts = [
    typeof node.querySelectorAll === "function" ? node.querySelectorAll("pre").length : 0,
    typeof node.querySelectorAll === "function" ? node.querySelectorAll("table").length : 0,
    typeof node.querySelectorAll === "function" ? node.querySelectorAll("img").length : 0,
    typeof node.querySelectorAll === "function" ? node.querySelectorAll("blockquote").length : 0,
  ];
  return [normalizedText.length, normalizedText.slice(0, 240), ...structuralCounts].join(":");
}

function cgptExtractChatMessageTextFromNode(node) {
  if (!node) return "";
  cgptIncrementChatLogPerfMetric("textExtractions");
  if (
    typeof node.querySelector === "function" &&
    !node.querySelector(CHAT_LOG_HELPER_TEXT_EXCLUDE_SELECTOR)
  ) {
    if (node.innerText) return node.innerText.trim();
    if (node.textContent) return node.textContent.trim();
    return "";
  }
  if (typeof node.cloneNode === "function") {
    const clone = node.cloneNode(true);
    if (clone && typeof clone.querySelectorAll === "function") {
      if (clone.dataset) {
        delete clone.dataset.cgptHelperChatCollapsed;
      }
      clone.querySelectorAll(CHAT_LOG_HELPER_TEXT_EXCLUDE_SELECTOR).forEach((helperNode) => helperNode.remove());
    }
    if (clone && clone.innerText) return clone.innerText.trim();
    if (clone && clone.textContent) return clone.textContent.trim();
  }
  if (node.innerText) return node.innerText.trim();
  if (node.textContent) return node.textContent.trim();
  return "";
}

function getChatLogEntries() {
  return chatLogEntries
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({ ...entry }));
}
function highlightChatMessageElement(el) {
  if (!el || typeof el.scrollIntoView !== "function") return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("cgpt-helper-chatlog-highlight");
  setTimeout(() => {
    el.classList.remove("cgpt-helper-chatlog-highlight");
  }, 2000);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptBuildResponseFilePath,
    cgptSanitizeChatLogPathSegment,
    cgptShouldDelayChatMessageFolding,
    cgptIsHelperManagedNode,
    cgptCanContainChatMessages,
    extractChatMessageTimestamp,
    cgptResolveChatMessageDisplayLabel,
    cgptResolveChatTurnNumber,
    cgptResolveChatEntryOrder,
    cgptGetChatEntryHost,
    cgptGetChatRoleElement,
    cgptHasStableCodeBlocks,
    cgptHasUnrenderedFencedCode,
    cgptBuildChatRenderIssue,
    cgptBuildChatMessageMediaPlaceholder,
    cgptBuildChatMessageTextSignature,
    cgptExtractChatMessageTextFromNode,
    cgptIsVisibleChatMessageRegion,
    cgptShouldEnableChatOverlayHelpers,
    cgptRefreshChatOverlayHelpers,
    cgptRestoreHeadingFolds,
    cgptRestoreChatMessageUi,
    cgptRestoreTrackedChatMessageElements,
    CHAT_LOG_UPDATED_EVENT,
  };
}
