function cgptCreateSidebarApiDebugDownloadUrl(content) {
  const encoded = encodeURIComponent(content);
  return `data:application/json;charset=utf-8,${encoded}`;
}

function cgptHandleSidebarApiDebugDownload(message, sendResponse) {
  const downloads = globalThis.chrome && globalThis.chrome.downloads;
  const runtime = globalThis.chrome && globalThis.chrome.runtime;
  if (!downloads || typeof downloads.download !== "function") {
    sendResponse({ ok: false, error: "downloads_api_unavailable" });
    return false;
  }

  const fileName = typeof message.fileName === "string" ? message.fileName : "";
  const content = typeof message.content === "string" ? message.content : "";
  if (!fileName || !content) {
    sendResponse({ ok: false, error: "invalid_debug_download_payload" });
    return false;
  }

  downloads.download(
    {
      url: cgptCreateSidebarApiDebugDownloadUrl(content),
      filename: fileName,
      conflictAction: "uniquify",
      saveAs: true,
    },
    (downloadId) => {
      if (runtime && runtime.lastError) {
        sendResponse({ ok: false, error: runtime.lastError.message || "unknown error" });
        return;
      }
      sendResponse({ ok: true, downloadId });
    }
  );
  return true;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCreateSidebarApiDebugDownloadUrl,
    cgptHandleSidebarApiDebugDownload,
  };
}
