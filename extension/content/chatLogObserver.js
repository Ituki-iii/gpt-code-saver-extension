let chatLogRouteWatcher = null;
let chatLogMutationObserver = null;
let currentConversationKey = null;
let chatLogRouteListenerBound = false;
let chatLogPendingMutationRoots = null;
let chatLogPendingMutationTimer = null;

const CGPT_CHATLOG_ROUTE_CHANGE_EVENT = "cgpt-helper-route-change";
const CGPT_CHATLOG_ROUTE_FALLBACK_INTERVAL_MS = 2000;

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

function cgptFlushPendingChatLogMutationRoots() {
  if (chatLogPendingMutationTimer) {
    clearTimeout(chatLogPendingMutationTimer);
    chatLogPendingMutationTimer = null;
  }
  if (!chatLogPendingMutationRoots || chatLogPendingMutationRoots.size === 0) {
    return;
  }
  const pendingRoots = Array.from(chatLogPendingMutationRoots);
  chatLogPendingMutationRoots.clear();
  cgptIncrementChatLogPerfMetric("mutationRootFlushes");
  pendingRoots.forEach((root) => {
    captureChatLogsFromNode(root);
  });
}

function cgptScheduleChatLogMutationRoot(root) {
  if (!root) return;
  if (!chatLogPendingMutationRoots) {
    chatLogPendingMutationRoots = new Set();
  }
  chatLogPendingMutationRoots.add(root);
  cgptIncrementChatLogPerfMetric("scheduledMutationRoots");
  if (chatLogPendingMutationTimer) {
    return;
  }
  chatLogPendingMutationTimer = setTimeout(() => {
    cgptFlushPendingChatLogMutationRoots();
  }, 0);
}

function cgptResolveChatLogMutationRoot(node) {
  if (!node) return null;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.nodeType === Node.TEXT_NODE
        ? node.parentElement || null
        : null;
  if (!element || typeof cgptIsHelperManagedNode === "function" && cgptIsHelperManagedNode(element)) {
    return null;
  }
  if (typeof cgptGetChatEntryHost === "function") {
    const host = cgptGetChatEntryHost(element);
    if (host) return host;
  }
  if (
    typeof cgptCanContainChatMessages === "function" &&
    cgptCanContainChatMessages(element)
  ) {
    return element;
  }
  return null;
}

function cgptHandleConversationRouteChange() {
  const key = getConversationKey();
  if (key === currentConversationKey) {
    return;
  }
  currentConversationKey = key;
  cgptIncrementChatLogPerfMetric("routeChanges");
  resetChatLogEntries();
  captureChatLogsFromNode(document);
}

function cgptDispatchChatLogRouteChange() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  if (typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent(CGPT_CHATLOG_ROUTE_CHANGE_EVENT));
    return;
  }
  window.dispatchEvent({ type: CGPT_CHATLOG_ROUTE_CHANGE_EVENT });
}

function cgptBindChatLogRouteListeners() {
  if (chatLogRouteListenerBound || typeof window === "undefined") {
    return;
  }
  chatLogRouteListenerBound = true;
  const handleRouteChange = () => {
    cgptHandleConversationRouteChange();
  };

  if (window.history) {
    ["pushState", "replaceState"].forEach((methodName) => {
      const original = window.history[methodName];
      if (typeof original !== "function" || original.__cgptHelperWrapped === true) {
        return;
      }
      const wrapped = function wrappedHistoryState(...args) {
        const result = original.apply(this, args);
        cgptDispatchChatLogRouteChange();
        return result;
      };
      wrapped.__cgptHelperWrapped = true;
      window.history[methodName] = wrapped;
    });
  }

  if (typeof window.addEventListener === "function") {
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener(CGPT_CHATLOG_ROUTE_CHANGE_EVENT, handleRouteChange);
  }
}

function startChatRouteWatcher() {
  if (chatLogRouteWatcher) return;
  cgptBindChatLogRouteListeners();
  chatLogRouteWatcher = setInterval(() => {
    cgptHandleConversationRouteChange();
  }, CGPT_CHATLOG_ROUTE_FALLBACK_INTERVAL_MS);
}

function cgptHasUntrackedChatMessages(root = document) {
  return Boolean(
    root &&
      typeof root.querySelector === "function" &&
      root.querySelector("[data-message-author-role]:not([data-cgpt-helper-chat-tracked='1'])")
  );
}

function startChatLogMutationObserver() {
  if (chatLogMutationObserver || typeof MutationObserver !== "function" || !document.body) {
    return;
  }
  chatLogMutationObserver = new MutationObserver((mutations) => {
    cgptIncrementChatLogPerfMetric("mutationBatches");
    mutations.forEach((mutation) => {
      const targetRoot = cgptResolveChatLogMutationRoot(mutation.target);
      if (targetRoot) {
        cgptScheduleChatLogMutationRoot(targetRoot);
      }
      if (mutation.type === "characterData") {
        return;
      }
      if (!mutation.addedNodes || !mutation.addedNodes.length) {
        return;
      }
      mutation.addedNodes.forEach((node) => {
        const root = cgptResolveChatLogMutationRoot(node);
        if (root) {
          cgptScheduleChatLogMutationRoot(root);
        }
      });
    });
  });
  chatLogMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function getConversationKey() {
  return window.location ? window.location.pathname + window.location.search : "";
}

function cgptSetCurrentConversationKey(value) {
  currentConversationKey = value || "";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptHasUntrackedChatMessages,
    cgptResolveChatLogMutationRoot,
    cgptHandleConversationRouteChange,
    CGPT_CHATLOG_ROUTE_CHANGE_EVENT,
  };
}
