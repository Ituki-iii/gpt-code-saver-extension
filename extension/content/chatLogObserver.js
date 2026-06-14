let chatLogRouteWatcher = null;
let chatLogMutationObserver = null;
let currentConversationKey = null;

function startChatRouteWatcher() {
  if (chatLogRouteWatcher) return;
  chatLogRouteWatcher = setInterval(() => {
    const key = getConversationKey();
    if (key !== currentConversationKey) {
      currentConversationKey = key;
      const rebuildChatLogView = () => {
        if (key !== currentConversationKey) {
          return;
        }
        resetChatLogEntries();
        captureChatLogsFromNode(document);
      };
      if (typeof cgptPrepareChatTimestampCache === "function") {
        cgptPrepareChatTimestampCache(key, rebuildChatLogView);
        return;
      }
      rebuildChatLogView();
      return;
    }
    if (
      typeof captureChatLogsFromNode === "function" &&
      document.querySelector("[data-message-author-role]:not([data-cgpt-helper-chat-tracked='1'])")
    ) {
      captureChatLogsFromNode(document);
    }
  }, 1000);
}

function startChatLogMutationObserver() {
  if (chatLogMutationObserver || typeof MutationObserver !== "function" || !document.body) {
    return;
  }
  chatLogMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (
          typeof cgptCanContainChatMessages === "function" &&
          !cgptCanContainChatMessages(target)
        ) {
          return;
        }
        captureChatLogsFromNode(target);
        return;
      }

      if (mutation.type !== "childList" || !mutation.addedNodes || !mutation.addedNodes.length) {
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        if (
          typeof cgptCanContainChatMessages === "function" &&
          !cgptCanContainChatMessages(node)
        ) {
          return;
        }
        captureChatLogsFromNode(node);
      });
    });
  });
  chatLogMutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: [
      "data-id",
      "data-message-author-role",
      "data-message-id",
      "data-message-model-name",
      "data-message-model-slug",
      "data-model-name",
      "data-model-slug",
    ],
    childList: true,
    subtree: true,
  });
}

function getConversationKey() {
  return window.location ? window.location.pathname + window.location.search : "";
}

function cgptSetCurrentConversationKey(value) {
  currentConversationKey = value || "";
}
