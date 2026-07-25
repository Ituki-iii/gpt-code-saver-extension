const DEFAULT_VIEW_SETTINGS = {
  compactLineCount: 1,
  chatOverlayEnabled: false,
  chatWindowLeftAligned: false,
  chatBubbleWidthPx: 960,
};

let cgptViewSettings = { ...DEFAULT_VIEW_SETTINGS };

function cgptGetViewSettings() {
  return { ...cgptViewSettings };
}

function cgptNormalizeLineCount(value, fallback, { min = 1, max = 200 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function cgptNormalizePixelWidth(value, fallback, { min = 320 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function cgptMergeViewSettings(nextSettings) {
  if (!nextSettings || typeof nextSettings !== "object") {
    return;
  }
  if (typeof nextSettings.compactLineCount !== "undefined") {
    cgptViewSettings.compactLineCount = cgptNormalizeLineCount(
      nextSettings.compactLineCount,
      DEFAULT_VIEW_SETTINGS.compactLineCount,
      { min: 0 }
    );
  }
  if (typeof nextSettings.chatOverlayEnabled !== "undefined") {
    cgptViewSettings.chatOverlayEnabled = nextSettings.chatOverlayEnabled === true;
  }
  if (typeof nextSettings.chatWindowLeftAligned !== "undefined") {
    cgptViewSettings.chatWindowLeftAligned = nextSettings.chatWindowLeftAligned === true;
  }
  if (typeof nextSettings.chatBubbleWidthPx !== "undefined") {
    cgptViewSettings.chatBubbleWidthPx = cgptNormalizePixelWidth(
      nextSettings.chatBubbleWidthPx,
      DEFAULT_VIEW_SETTINGS.chatBubbleWidthPx
    );
  }
}

function cgptHasStorageSync() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadViewSettings(callback) {
  if (!cgptHasStorageSync()) {
    callback?.(cgptGetViewSettings());
    return;
  }
  const resolve =
    typeof cgptCreateAsyncGuard === "function"
      ? cgptCreateAsyncGuard((result) => {
          if (result && result.cgptViewSettings) {
            cgptMergeViewSettings(result.cgptViewSettings);
          }
          callback?.(cgptGetViewSettings());
        })
      : (result) => {
          if (result && result.cgptViewSettings) {
            cgptMergeViewSettings(result.cgptViewSettings);
          }
          callback?.(cgptGetViewSettings());
        };
  chrome.storage.sync.get(["cgptViewSettings"], (result) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      resolve(null);
      return;
    }
    resolve(result);
  });
}

function cgptUpdateViewSettings(partialSettings, callback) {
  cgptMergeViewSettings(partialSettings);
  if (!cgptHasStorageSync()) {
    callback?.(cgptGetViewSettings());
    return;
  }
  chrome.storage.sync.set({ cgptViewSettings }, () => {
    callback?.(cgptGetViewSettings());
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_VIEW_SETTINGS,
    cgptGetViewSettings,
    cgptNormalizeLineCount,
    cgptNormalizePixelWidth,
    cgptMergeViewSettings,
    cgptLoadViewSettings,
    cgptUpdateViewSettings,
  };
}
