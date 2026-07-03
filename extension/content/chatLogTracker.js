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
const CHAT_LOG_FOLD_DELAY_MS = 120;
const CHAT_LOG_FOLD_MAX_RETRIES = 8;
const CHAT_LOG_FOLD_QUIET_PERIOD_MS = 1200;
const CHAT_LOG_RENDER_RETRY_DELAY_MS = 250;
const CHAT_LOG_RENDER_MAX_RETRIES = 12;
const CHAT_LOG_MESSAGE_BADGE_SELECTOR = "[data-cgpt-helper-chat-badge='1']";
const CHAT_LOG_UPDATED_EVENT = "cgpt-helper-chatlog-updated";

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
  renderChatMessageBadge(entry);
  renderChatMessageTimestamp(entry);
  cgptScheduleChatMessageFolding(entry);
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
  const host = cgptGetChatEntryHost(element) || element;
  const roleElement = cgptGetChatRoleElement(host) || entry.roleElement || host;
  renderChatMessageDiagnostic(host, roleElement, null);
  const text = extractChatMessageText(roleElement);
  const fallbackText = text.trim() || cgptBuildChatMessageMediaPlaceholder(roleElement);
  if (fallbackText.trim()) {
    entry.text = fallbackText;
  }
  entry.timestamp = extractChatMessageTimestamp(host);
  entry.displayLabel = cgptResolveChatMessageDisplayLabel(entry.role, roleElement);
  entry.element = roleElement;
  entry.hostElement = host;
  entry.roleElement = roleElement;
  entry.order = cgptResolveChatEntryOrder(host, entry.order);
  entry.lastMutationAt = Date.now();
  renderChatMessageBadge(entry);
  renderChatMessageTimestamp(entry);
  if (entry.element.dataset.cgptHelperFoldApplied !== "1") {
    cgptScheduleChatMessageFolding(entry);
  }
  cgptNotifyChatLogUpdated();
}

function cgptNotifyChatLogUpdated() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  window.dispatchEvent(new CustomEvent(CHAT_LOG_UPDATED_EVENT));
}

function renderChatMessageBadge(entry) {
  if (!entry || !entry.element) return;
  const badgeHost = entry.roleElement || entry.element;
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
    wrapper.style.margin = "0 0 4px 0";
    wrapper.style.pointerEvents = "none";
    wrapper.style.width = "100%";
    badgeHost.insertBefore(wrapper, badgeHost.firstChild);
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
  element.querySelectorAll(`:scope > ${CHAT_LOG_MESSAGE_BADGE_SELECTOR}`).forEach((badge) => {
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
  if (entry.element.dataset.cgptHelperFoldApplied === "1") return;
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
    renderChatMessageFolding(entry);
  }, CHAT_LOG_FOLD_DELAY_MS);
  chatLogPendingFoldTimers.set(entry.id, timerId);
}

function renderChatMessageTimestamp(entry) {
  if (!entry || !entry.element) return;
  ensureChatLogTimestampStyle();
  const container = entry.element.querySelector(
    ".cgpt-helper-chatlog-timestamp-wrapper"
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
    if (entry.element.firstChild !== container) {
      entry.element.insertBefore(container, entry.element.firstChild);
    }
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "cgpt-helper-chatlog-timestamp-wrapper";

  const label = document.createElement("span");
  label.className = "cgpt-helper-chatlog-timestamp-label";
  label.textContent = labelText;
  wrapper.appendChild(label);

  entry.element.insertBefore(wrapper, entry.element.firstChild);
}

function renderChatMessageFolding(entry) {
  if (!entry || !entry.element) return;
  if (entry.element.dataset.cgptHelperFoldApplied === "1") return;

  const messageElement = entry.element;
  ensureChatLogFoldStyle();
  removeChatMessageBadge(messageElement);

  const timestampNode = messageElement.querySelector(".cgpt-helper-chatlog-timestamp-wrapper");
  const movableNodes = Array.from(messageElement.childNodes).filter((node) => node !== timestampNode);
  if (!movableNodes.length) return;

  const fold = cgptCreateFoldSection({
    title: "",
    initiallyOpen: true,
    level: 0,
    badgeText: cgptGetChatEntryDisplayLabel(entry),
    badgeVariant: entry.role === "user" ? "userChip" : "assistantChip",
    actions: cgptBuildChatFoldActions(entry),
  });
  fold.container.dataset.cgptHelperAuthorRole = entry.role || "";

  if (timestampNode) {
    fold.titleWrapper.appendChild(timestampNode);
  }

  const body = fold.body;
  body.classList.add("cgpt-helper-message-body");
  movableNodes.forEach((node) => body.appendChild(node));

  messageElement.insertBefore(fold.container, messageElement.firstChild);

  entry.element.dataset.cgptHelperFoldApplied = "1";
  const pendingTimer = chatLogPendingFoldTimers.get(entry.id);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    chatLogPendingFoldTimers.delete(entry.id);
  }
  if (entry.role === "assistant" && cgptShouldApplyHeadingFold(body)) {
    applyHeadingFold(body, 1);
  }
}

function extractChatMessageText(el) {
  if (!el) return "";
  const body =
    (typeof el.querySelector === "function" &&
      (el.querySelector(":scope > .cgpt-helper-fold .cgpt-helper-message-body") ||
        el.querySelector(".cgpt-helper-message-body"))) ||
    null;
  if (body) {
    return cgptExtractChatMessageTextFromNode(body);
  }
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

function cgptExtractChatMessageTextFromNode(node) {
  if (!node) return "";
  if (typeof node.cloneNode === "function") {
    const clone = node.cloneNode(true);
    if (clone && typeof clone.querySelectorAll === "function") {
      clone
        .querySelectorAll(
          [
            CHAT_LOG_MESSAGE_BADGE_SELECTOR,
            ".cgpt-helper-chatlog-timestamp-wrapper",
            ".cgpt-helper-fold-actions",
          ].join(",")
        )
        .forEach((helperNode) => helperNode.remove());
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
    cgptExtractChatMessageTextFromNode,
    cgptIsVisibleChatMessageRegion,
    CHAT_LOG_UPDATED_EVENT,
  };
}
