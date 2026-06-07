let cgptSidebarApiDiagnostics = null;

function cgptClearSidebarApiDiagnostics() {
  cgptSidebarApiDiagnostics = null;
}

function cgptSetSidebarApiDiagnostics(nextDiagnostics = null) {
  if (!nextDiagnostics || typeof nextDiagnostics !== "object") {
    cgptSidebarApiDiagnostics = null;
    return;
  }
  cgptSidebarApiDiagnostics = {
    timestamp: new Date().toISOString(),
    phase: String(nextDiagnostics.phase || "unknown"),
    authMode: String(nextDiagnostics.authMode || "cookie"),
    status: Number.isFinite(Number(nextDiagnostics.status)) ? Number(nextDiagnostics.status) : 0,
    endpoint: String(nextDiagnostics.endpoint || ""),
    message: String(nextDiagnostics.message || "unknown"),
    endpointTried: Array.isArray(nextDiagnostics.endpointTried)
      ? nextDiagnostics.endpointTried.map((item) => ({
          url: String((item && item.url) || ""),
          status: Number.isFinite(Number(item && item.status)) ? Number(item.status) : 0,
          ok: Boolean(item && item.ok),
          shapeMatched: Boolean(item && item.shapeMatched),
        }))
      : [],
    payloadKeys: Array.isArray(nextDiagnostics.payloadKeys)
      ? nextDiagnostics.payloadKeys.map((item) => String(item || ""))
      : [],
  };
}

function cgptGetSidebarApiDiagnostics() {
  return cgptSidebarApiDiagnostics
    ? JSON.parse(JSON.stringify(cgptSidebarApiDiagnostics))
    : null;
}

async function cgptExportSidebarApiDiagnostics() {
  const diagnostics = cgptGetSidebarApiDiagnostics();
  if (!diagnostics) {
    return false;
  }
  return cgptDownloadSidebarApiDebugJson(diagnostics);
}

function cgptFormatSidebarApiDebugJson(payload) {
  return JSON.stringify(payload, null, 2);
}

function cgptCaptureSidebarApiSelectionState() {
  if (typeof document === "undefined") {
    return null;
  }

  const activeElement = document.activeElement || null;
  const selectionState = {
    activeElement,
    inputSelection: null,
    ranges: [],
  };

  if (
    activeElement &&
    typeof activeElement.selectionStart === "number" &&
    typeof activeElement.selectionEnd === "number"
  ) {
    selectionState.inputSelection = {
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd,
      direction: activeElement.selectionDirection || "none",
    };
  }

  if (typeof window !== "undefined" && typeof window.getSelection === "function") {
    const selection = window.getSelection();
    if (selection) {
      for (let index = 0; index < selection.rangeCount; index += 1) {
        selectionState.ranges.push(selection.getRangeAt(index).cloneRange());
      }
    }
  }

  return selectionState;
}

function cgptRestoreSidebarApiSelectionState(selectionState) {
  if (!selectionState || typeof document === "undefined") {
    return;
  }

  const { activeElement, inputSelection, ranges } = selectionState;
  if (activeElement && typeof activeElement.focus === "function" && document.contains(activeElement)) {
    try {
      activeElement.focus({ preventScroll: true });
    } catch (_error) {
      try {
        activeElement.focus();
      } catch (_focusError) {
      }
    }
  }

  if (
    activeElement &&
    inputSelection &&
    document.contains(activeElement) &&
    typeof activeElement.setSelectionRange === "function"
  ) {
    try {
      activeElement.setSelectionRange(
        inputSelection.start,
        inputSelection.end,
        inputSelection.direction
      );
    } catch (_error) {
    }
  }

  if (typeof window !== "undefined" && typeof window.getSelection === "function") {
    const selection = window.getSelection();
    if (selection && Array.isArray(ranges)) {
      try {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      } catch (_error) {
      }
    }
  }
}

function cgptIsSidebarApiTextareaFallbackAllowed(options = {}) {
  if (!options || options.allowTextareaFallback !== true) {
    return false;
  }
  const userActivation = globalThis.navigator && globalThis.navigator.userActivation;
  if (userActivation && typeof userActivation.isActive === "boolean") {
    return userActivation.isActive;
  }
  return true;
}

function cgptCopySidebarApiDebugJsonWithTextarea(content) {
  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const selectionState = cgptCaptureSidebarApiSelectionState();
  const textarea = document.createElement("textarea");
  try {
    textarea.value = content;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    return Boolean(document.execCommand("copy"));
  } catch (_error) {
    return false;
  } finally {
    if (textarea.parentNode) {
      textarea.remove();
    }
    cgptRestoreSidebarApiSelectionState(selectionState);
  }
}

async function cgptCopySidebarApiDebugJson(payload, options = {}) {
  const content = cgptFormatSidebarApiDebugJson(payload);
  if (!content) {
    return false;
  }
  const clipboard = globalThis.navigator && globalThis.navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(content);
      return true;
    } catch (_error) {
    }
  }
  if (!cgptIsSidebarApiTextareaFallbackAllowed(options)) {
    return false;
  }
  return cgptCopySidebarApiDebugJsonWithTextarea(content);
}

function cgptCreateSidebarApiDebugFileName(payload) {
  const timestamp = String((payload && payload.timestamp) || new Date().toISOString());
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  return `chatgpt-sidebar-api-debug-${safeTimestamp}.json`;
}

function cgptDownloadSidebarApiDebugJsonViaBackground(fileName, content) {
  return new Promise((resolve) => {
    const runtime = globalThis.chrome && globalThis.chrome.runtime;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      resolve(false);
      return;
    }

    try {
      runtime.sendMessage(
        {
          type: "downloadSidebarApiDebugJson",
          fileName,
          content,
        },
        (response) => {
          if (runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(Boolean(response && response.ok));
        }
      );
    } catch (_error) {
      resolve(false);
    }
  });
}

async function cgptDownloadSidebarApiDebugJson(payload) {
  try {
    const content = cgptFormatSidebarApiDebugJson(payload);
    if (!content) {
      return false;
    }
    const fileName = cgptCreateSidebarApiDebugFileName(payload);
    return await cgptDownloadSidebarApiDebugJsonViaBackground(fileName, content);
  } catch (_error) {
    return false;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCaptureSidebarApiSelectionState,
    cgptClearSidebarApiDiagnostics,
    cgptCopySidebarApiDebugJson,
    cgptCopySidebarApiDebugJsonWithTextarea,
    cgptCreateSidebarApiDebugFileName,
    cgptDownloadSidebarApiDebugJson,
    cgptDownloadSidebarApiDebugJsonViaBackground,
    cgptExportSidebarApiDiagnostics,
    cgptGetSidebarApiDiagnostics,
    cgptIsSidebarApiTextareaFallbackAllowed,
    cgptRestoreSidebarApiSelectionState,
    cgptSetSidebarApiDiagnostics,
  };
}
