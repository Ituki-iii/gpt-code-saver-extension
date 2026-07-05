const CGPT_LIGHTWEIGHT_CLASS = "cgpt-lightweight";
const CGPT_LIGHTWEIGHT_POLL_INTERVAL = 2000;
let cgptLightweightStyleInjected = false;
let cgptLastIsGenerating = null;
let cgptLightweightInterval = null;
let cgptLightweightObserver = null;
let cgptLightweightSyncTimer = null;

function cgptEnsureLightweightStyles() {
  if (cgptLightweightStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
/* 軽量モード中のコードブロック軽量化 */
html.${CGPT_LIGHTWEIGHT_CLASS} pre code,
body.${CGPT_LIGHTWEIGHT_CLASS} pre code {
  white-space: pre;
  font-feature-settings: "kern" 0;
}

/* 長大コードはホバー時以外は折りたたむ（拡張側でExpanded指定時は除外） */
html.${CGPT_LIGHTWEIGHT_CLASS} pre:not(:hover):not([data-cgpt-view-mode="expanded"]),
body.${CGPT_LIGHTWEIGHT_CLASS} pre:not(:hover):not([data-cgpt-view-mode="expanded"]) {
  max-height: 350px;
  overflow: hidden;
}

/* 構文ハイライトを事実上オフにして描画負荷を下げる */
html.${CGPT_LIGHTWEIGHT_CLASS} pre code span,
body.${CGPT_LIGHTWEIGHT_CLASS} pre code span {
  color: inherit !important;
  background: none !important;
}

/* スムーズスクロールを無効化（自動スクロール負荷軽減） */
html.${CGPT_LIGHTWEIGHT_CLASS},
body.${CGPT_LIGHTWEIGHT_CLASS} {
  scroll-behavior: auto !important;
}

/* GPU負荷軽減（影やぼかしを除去） */
html.${CGPT_LIGHTWEIGHT_CLASS} *,
body.${CGPT_LIGHTWEIGHT_CLASS} * {
  backdrop-filter: none !important;
  text-shadow: none !important;
  box-shadow: none !important;
}
`;
  (document.head || document.documentElement).appendChild(style);
  cgptLightweightStyleInjected = true;
}

function cgptIsChatGenerating() {
  return Boolean(
    document.querySelector('button[aria-label*="停止"]') ||
      document.querySelector('button[aria-label*="Stop"]')
  );
}

function cgptToggleLightweightMode(isEnabled) {
  if (!document || !document.body || !document.body.classList) return;
  const roots = [document.documentElement, document.body].filter(
    (node) => node && node.classList
  );
  if (isEnabled) {
    roots.forEach((node) => node.classList.add(CGPT_LIGHTWEIGHT_CLASS));
  } else {
    roots.forEach((node) => node.classList.remove(CGPT_LIGHTWEIGHT_CLASS));
  }
}

function cgptSyncAutoLightweightMode() {
  const nowGenerating = cgptIsChatGenerating();
  if (nowGenerating === cgptLastIsGenerating) {
    return;
  }
  cgptLastIsGenerating = nowGenerating;
  cgptToggleLightweightMode(Boolean(nowGenerating));
}

function cgptScheduleAutoLightweightSync() {
  if (cgptLightweightSyncTimer) {
    return;
  }
  cgptLightweightSyncTimer = setTimeout(() => {
    cgptLightweightSyncTimer = null;
    cgptSyncAutoLightweightMode();
  }, 0);
}

function cgptStopLightweightPolling() {
  if (cgptLightweightSyncTimer) {
    clearTimeout(cgptLightweightSyncTimer);
    cgptLightweightSyncTimer = null;
  }
  if (cgptLightweightObserver) {
    cgptLightweightObserver.disconnect();
    cgptLightweightObserver = null;
  }
  if (cgptLightweightInterval) {
    clearInterval(cgptLightweightInterval);
    cgptLightweightInterval = null;
  }
  cgptLastIsGenerating = null;
}

function cgptStartLightweightPolling() {
  if (cgptLightweightInterval || cgptLightweightObserver) return;
  const initialGenerating = cgptIsChatGenerating();
  cgptLastIsGenerating = initialGenerating;
  cgptToggleLightweightMode(Boolean(initialGenerating));
  if (typeof MutationObserver === "function" && document && document.body) {
    cgptLightweightObserver = new MutationObserver(() => {
      cgptScheduleAutoLightweightSync();
    });
    cgptLightweightObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
    return;
  }
  cgptLightweightInterval = setInterval(() => {
    cgptSyncAutoLightweightMode();
  }, CGPT_LIGHTWEIGHT_POLL_INTERVAL);
}

function cgptApplyLightweightMode(mode) {
  const selectedMode = mode || CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  if (selectedMode === CGPT_LIGHTWEIGHT_MODES.LIGHT) {
    cgptEnsureLightweightStyles();
    cgptStopLightweightPolling();
    cgptToggleLightweightMode(true);
    return;
  }
  if (selectedMode === CGPT_LIGHTWEIGHT_MODES.NORMAL) {
    cgptStopLightweightPolling();
    cgptToggleLightweightMode(false);
    return;
  }
  cgptEnsureLightweightStyles();
  cgptStartLightweightPolling();
}

function cgptStartLightweightModeWatcher() {
  const resolveMode =
    typeof cgptGetLightweightMode === "function"
      ? cgptGetLightweightMode
      : () => CGPT_DEFAULT_LIGHTWEIGHT_MODE;
  cgptApplyLightweightMode(resolveMode());
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CGPT_LIGHTWEIGHT_CLASS,
    CGPT_LIGHTWEIGHT_POLL_INTERVAL,
    cgptEnsureLightweightStyles,
    cgptIsChatGenerating,
    cgptToggleLightweightMode,
    cgptStopLightweightPolling,
    cgptStartLightweightPolling,
    cgptApplyLightweightMode,
    cgptStartLightweightModeWatcher,
  };
}
