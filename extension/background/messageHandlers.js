const cgptMessageHandlers = {
  applyCodeBlock(message, _sender, sendResponse) {
    return cgptHandleApplyCodeBlock(message, sendResponse);
  },
  downloadSidebarApiDebugJson(message, _sender, sendResponse) {
    return cgptHandleSidebarApiDebugDownload(message, sendResponse);
  },
  pickDownloadFolder(_message, _sender, sendResponse) {
    cgptPromptProjectFolderSelection((result) => {
      sendResponse(result);
    });
    return true;
  },
  getTemplates(_message, _sender, sendResponse) {
    cgptGetTemplates((templates) => {
      sendResponse({ ok: true, templates });
    });
    return true;
  },
  setTemplates(message, _sender, sendResponse) {
    const templates = Array.isArray(message.templates) ? message.templates : [];
    cgptSetTemplates(templates, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  },
  getLogs(_message, _sender, sendResponse) {
    cgptGetLogs((logs) => {
      sendResponse({ ok: true, logs });
    });
    return true;
  },
  clearLogs(_message, _sender, sendResponse) {
    cgptClearLogs(() => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  },
  openDownloadedFile(message, _sender, sendResponse) {
    const downloadId = message.downloadId;
    if (typeof downloadId !== "number") {
      sendResponse({ ok: false, error: "invalid_download_id" });
      return false;
    }
    chrome.downloads.open(downloadId);
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ ok: true });
    }
    return false;
  },
};

function cgptHandleRuntimeMessage(message, sender, sendResponse) {
  if (!message || !message.type) return;
  const handler = cgptMessageHandlers[message.type];
  if (typeof handler !== "function") {
    return;
  }
  return handler(message, sender, sendResponse);
}

function cgptRegisterRuntimeMessageHandler() {
  chrome.runtime.onMessage.addListener(cgptHandleRuntimeMessage);
}
