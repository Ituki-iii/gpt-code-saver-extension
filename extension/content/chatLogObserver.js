let chatLogRouteWatcher = null;
let chatLogMutationObserver = null;
let currentConversationKey = null;

function startChatRouteWatcher() {
  if (chatLogRouteWatcher) return;
  chatLogRouteWatcher = setInterval(() => {
    const key = getConversationKey();
    if (key !== currentConversationKey) {
      currentConversationKey = key;
      resetChatLogEntries();
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
