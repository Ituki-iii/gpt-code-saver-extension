const DEFAULT_SAVE_OPTIONS = {};

let cgptSaveOptions = { ...DEFAULT_SAVE_OPTIONS };

function cgptGetSaveOptions() {
  return { ...cgptSaveOptions };
}

function cgptMergeSaveOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== "object") {
    return;
  }
}

function cgptHasStorageSyncAccess() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
}

function cgptLoadSaveOptions(callback) {
  if (!cgptHasStorageSyncAccess()) {
    callback?.(cgptGetSaveOptions());
    return;
  }
  const resolve =
    typeof cgptCreateAsyncGuard === "function"
      ? cgptCreateAsyncGuard((result) => {
          if (result && result.cgptSaveOptions) {
            cgptMergeSaveOptions(result.cgptSaveOptions);
          }
          callback?.(cgptGetSaveOptions());
        })
      : (result) => {
          if (result && result.cgptSaveOptions) {
            cgptMergeSaveOptions(result.cgptSaveOptions);
          }
          callback?.(cgptGetSaveOptions());
        };
  chrome.storage.sync.get(["cgptSaveOptions"], (result) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      resolve(null);
      return;
    }
    resolve(result);
  });
}

function cgptUpdateSaveOptions(partialOptions, callback) {
  cgptMergeSaveOptions(partialOptions);
  if (!cgptHasStorageSyncAccess()) {
    callback?.(cgptGetSaveOptions());
    return;
  }
  chrome.storage.sync.set({ cgptSaveOptions }, () => {
    callback?.(cgptGetSaveOptions());
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_SAVE_OPTIONS,
    cgptGetSaveOptions,
    cgptMergeSaveOptions,
    cgptHasStorageSyncAccess,
    cgptLoadSaveOptions,
    cgptUpdateSaveOptions,
  };
}
