let cgptCodeBlockObserver = null;
let cgptPendingCodeBlockRoots = null;
let cgptPendingCodeBlockFlushTimer = null;

function cgptGetCodeBlockPerfMetricsBucket() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.__cgptPerfMetrics || typeof window.__cgptPerfMetrics !== "object") {
    window.__cgptPerfMetrics = {};
  }
  if (!window.__cgptPerfMetrics.codeBlocks || typeof window.__cgptPerfMetrics.codeBlocks !== "object") {
    window.__cgptPerfMetrics.codeBlocks = {};
  }
  return window.__cgptPerfMetrics.codeBlocks;
}

function cgptIncrementCodeBlockPerfMetric(name, amount = 1) {
  const metrics = cgptGetCodeBlockPerfMetricsBucket();
  if (!metrics || !name) return;
  metrics[name] = (Number(metrics[name]) || 0) + (Number(amount) || 0);
}

function cgptIsHelperOwnedNode(node) {
  if (!node) return false;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.parentElement || null;
  if (!element || typeof element.closest !== "function") {
    return false;
  }
  return Boolean(
    element.closest(
      [
        "#cgpt-code-helper-panel",
        "#cgpt-helper-chatlog-modal",
        "[data-cgpt-code-wrapper='1']",
        "[data-cgpt-code-collapse-cue='1']",
        "[data-cgpt-code-collapse-top-cue='1']",
        "[data-cgpt-code-toggle='1']",
        "[data-cgpt-code-file-path='1']",
        "[data-cgpt-code-actions='1']",
        ".cgpt-helper-fold",
        ".cgpt-helper-heading-section",
      ].join(",")
    )
  );
}

function cgptCanContainCodeBlocks(node) {
  if (!node) return false;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? node
        : node.parentElement || null;
  if (!element || cgptIsHelperOwnedNode(element)) {
    return false;
  }
  if (typeof element.matches === "function" && element.matches("pre, code, .cm-content")) {
    return true;
  }
  return Boolean(
    typeof element.querySelector === "function" && element.querySelector("pre, code, .cm-content")
  );
}

function cgptResolveCodeBlockMutationRoot(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    return node;
  }
  if (
    node.nodeType !== Node.ELEMENT_NODE &&
    node.nodeType !== Node.DOCUMENT_NODE &&
    node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  ) {
    return null;
  }
  if (!cgptCanContainCodeBlocks(node)) {
    return null;
  }
  return node;
}

function cgptFlushPendingCodeBlockRoots() {
  if (cgptPendingCodeBlockFlushTimer) {
    clearTimeout(cgptPendingCodeBlockFlushTimer);
    cgptPendingCodeBlockFlushTimer = null;
  }
  if (!cgptPendingCodeBlockRoots || cgptPendingCodeBlockRoots.size === 0) {
    return;
  }
  const pendingRoots = Array.from(cgptPendingCodeBlockRoots);
  cgptPendingCodeBlockRoots.clear();
  cgptIncrementCodeBlockPerfMetric("mutationRootFlushes");

  pendingRoots.forEach((root) => {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      tryDecorateFromTextNode(root);
      return;
    }
    decorateCodeBlocks(root);
  });

  if (typeof cgptSchedulePanelLayoutRefresh === "function") {
    cgptSchedulePanelLayoutRefresh();
  }
}

function cgptScheduleCodeBlockMutationRoot(root) {
  if (!root) return;
  if (!cgptPendingCodeBlockRoots) {
    cgptPendingCodeBlockRoots = new Set();
  }
  cgptPendingCodeBlockRoots.add(root);
  cgptIncrementCodeBlockPerfMetric("scheduledMutationRoots");
  if (cgptPendingCodeBlockFlushTimer) {
    return;
  }
  cgptPendingCodeBlockFlushTimer = setTimeout(() => {
    cgptFlushPendingCodeBlockRoots();
  }, 0);
}

function setupCodeBlockMutationObserver() {
  if (cgptCodeBlockObserver) return cgptCodeBlockObserver;
  const observer = new MutationObserver((mutations) => {
    cgptIncrementCodeBlockPerfMetric("mutationBatches");
    for (const mutation of mutations) {
      if (cgptIsHelperOwnedNode(mutation.target)) {
        continue;
      }
      const targetRoot = cgptResolveCodeBlockMutationRoot(mutation.target);
      if (targetRoot) {
        cgptScheduleCodeBlockMutationRoot(targetRoot);
      }
      if (mutation.type === "childList" && mutation.addedNodes && mutation.addedNodes.length > 0) {
        const addedNodes = Array.from(mutation.addedNodes).filter((node) => !cgptIsHelperOwnedNode(node));
        addedNodes.forEach((node) => {
          const root = cgptResolveCodeBlockMutationRoot(node);
          if (root) {
            cgptScheduleCodeBlockMutationRoot(root);
          }
        });
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  cgptCodeBlockObserver = observer;
  return observer;
}

function setupMutationObserver() {
  return setupCodeBlockMutationObserver();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptIsHelperOwnedNode,
    cgptCanContainCodeBlocks,
    cgptResolveCodeBlockMutationRoot,
  };
}
