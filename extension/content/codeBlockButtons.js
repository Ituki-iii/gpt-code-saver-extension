const BUTTON_FEEDBACK_TIMEOUT_MS = 1500;

function cgptCreateButtonContainer(placement = "standalone") {
  const container = document.createElement("div");
  container.dataset.cgptCodeActions = "1";
  container.dataset.cgptCodeActionsPlacement = placement;
  container.style.display = placement === "native-header" ? "inline-flex" : "flex";
  container.style.gap = placement === "native-header" ? "4px" : "6px";
  container.style.rowGap = "0";
  container.style.alignItems = "center";
  container.style.justifyContent = "flex-end";
  container.style.flexWrap = "nowrap";
  container.style.width = placement === "native-header" ? "auto" : "100%";
  container.style.maxWidth = "100%";
  container.style.boxSizing = "border-box";
  container.style.marginBottom = placement === "native-header" ? "0" : "8px";
  container.style.position = "relative";
  container.style.zIndex = "1";
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";
  container.style.scrollbarWidth = "none";
  container.style.flex = placement === "native-header" ? "0 1 auto" : "0 0 auto";
  return container;
}

function cgptCreateBaseButtonElement(placement = "overlay") {
  const button = document.createElement("button");
  if (typeof cgptApplySharedButtonStyle === "function") {
    cgptApplySharedButtonStyle(button, { variant: "secondary", size: "sm" });
  } else {
    button.style.fontSize = "11px";
    button.style.padding = "0 8px";
    button.style.minHeight = "28px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(148,163,184,0.72)";
    button.style.cursor = "pointer";
    button.style.transition = "opacity 0.2s ease";
  }
  if (placement === "toolbar") {
    button.style.fontSize = "10px";
    button.style.minHeight = "24px";
    button.style.padding = "0 6px";
  }
  button.style.position = placement === "toolbar" ? "relative" : "relative";
  button.style.zIndex = placement === "toolbar" ? "1" : "2";
  button.style.flex = "0 0 auto";
  button.style.whiteSpace = "nowrap";
  return button;
}

function cgptApplyButtonVariant(button, variant) {
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
    return;
  }
  const palette = {
    primary: "rgba(37, 99, 235, 1)",
    secondary: "rgba(71, 85, 105, 1)",
    success: "rgba(4, 120, 87, 1)",
    danger: "rgba(185, 28, 28, 1)",
    ghost: "rgba(15, 23, 42, 0.82)",
  };
  const color = palette[variant] || palette.secondary;
  button.style.background = color;
  button.style.color = "#fff";
  button.style.border = "1px solid rgba(255,255,255,0.4)";
}

function cgptCreateSaveButtonElement(canSave = true) {
  const button = cgptCreateBaseButtonElement("toolbar");
  button.textContent = "Save";
  button.title = "Save to the project folder";
  cgptApplyButtonVariant(button, canSave ? "primary" : "secondary");
  cgptSetButtonDisabled(button, !canSave);
  return button;
}

function cgptCreateSaveAsButtonElement() {
  const button = cgptCreateBaseButtonElement("toolbar");
  button.textContent = "Save As";
  button.title = "Choose where to save this code";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptCreateCopyButtonElement() {
  const button = cgptCreateBaseButtonElement("toolbar");
  button.textContent = "Copy";
  button.title = "Copy code";
  cgptApplyButtonVariant(button, "ghost");
  return button;
}

function cgptCreateShrinkButtonElement() {
  const button = cgptCreateBaseButtonElement("toolbar");
  button.textContent = "Compact";
  button.title = "Show a single line";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptCreateExpandButtonElement() {
  const button = cgptCreateBaseButtonElement("toolbar");
  button.textContent = "Expand";
  button.title = "Show all lines";
  cgptApplyButtonVariant(button, "secondary");
  return button;
}

function cgptGetOrCreateGeneratedRelativeFilePath(pre) {
  const state =
    pre && typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  if (state && state.generatedFilePath) {
    return state.generatedFilePath;
  }
  const nextPath = cgptGenerateDefaultRelativeFilePath();
  if (state) {
    state.generatedFilePath = nextPath;
  }
  return nextPath;
}

function cgptResolveCodeBlockPathInfo(pre, code, options = {}) {
  const blockElement =
    pre ||
    (code && typeof code.closest === "function" ? code.closest("pre") : null) ||
    code ||
    null;
  const detectedPath =
    blockElement && typeof cgptResolvePathMetadataForBlock === "function"
      ? cgptResolvePathMetadataForBlock(blockElement, options)
      : null;
  if (detectedPath && detectedPath.filePath) {
    return {
      filePath: detectedPath.filePath,
      hasDetectedFilePath: true,
      node: detectedPath.node || null,
      source: detectedPath.source || "path-line",
    };
  }
  return {
    filePath: cgptGetOrCreateGeneratedRelativeFilePath(pre),
    hasDetectedFilePath: false,
    source: "generated",
  };
}

function cgptHandleSaveButtonClick(button, code, pre) {
  const pathInfo = cgptRefreshSaveButtonState(pre, code);
  if (!pathInfo || !pathInfo.filePath) {
    const errMsg = "Add a PATH: relative/path line immediately before the code block or use Save As.";
    if (typeof showToast === "function") {
      showToast(errMsg, "error");
    } else {
      alert(errMsg);
    }
    return;
  }

  const content = cgptGetContentForSave(code);
  cgptTriggerApplyCode(button, pathInfo.filePath, content);
}

function cgptHandleSaveAsButtonClick(button, code, pre) {
  const pathInfo = cgptResolveCodeBlockPathInfo(pre, code);
  const filePath = cgptGetSuggestedRelativeFilePath(pathInfo);
  const content = cgptGetContentForSave(code);
  cgptTriggerApplyCode(button, filePath, content, {
    mode: typeof CGPT_SAVE_MODES !== "undefined" ? CGPT_SAVE_MODES.SAVE_AS : "saveAs",
  });
}

function cgptTriggerApplyCode(button, filePath, content, options = {}) {
  const {
    mode = typeof CGPT_SAVE_MODES !== "undefined" ? CGPT_SAVE_MODES.SAVE : "save",
    successButtonText,
    successToastBuilder,
  } = options;
  if (typeof cgptRunSaveAction !== "function") return;
  cgptRunSaveAction({
    request: {
      content,
      targetPath: filePath,
      mode,
      meta: {
        source: "code-block",
      },
    },
    ui: {
      triggerButton: button,
      flashButtonText: successButtonText,
      successMessage: successToastBuilder,
    },
  });
}

function cgptHandleCopyButtonClick(button, code) {
  const textToCopy = cgptGetNormalizedCodeText(code);
  if (!textToCopy) return;

  const onSuccess = () => {
    cgptFlashButtonText(button, "Copied");
    if (typeof showToast === "function") {
      showToast("Copied code", "success");
    }
  };
  const onFailure = () => {
    if (typeof showToast === "function") {
      showToast("Failed to copy", "error");
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(onFailure);
    return;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) {
      onSuccess();
    } else {
      onFailure();
    }
  } catch (error) {
    onFailure();
  }
}

function cgptGetContentForSave(code) {
  return cgptGetNormalizedCodeText(code);
}

function cgptGetSuggestedRelativeFilePath(pathInfo) {
  if (pathInfo && pathInfo.filePath) {
    return pathInfo.filePath;
  }
  return cgptGenerateDefaultRelativeFilePath();
}

function cgptGenerateDefaultRelativeFilePath() {
  const now = new Date();
  const pad = (value) => `${value}`.padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `code-block-${timestamp}.txt`;
}

function cgptFlashButtonText(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, BUTTON_FEEDBACK_TIMEOUT_MS);
}

function cgptHandleShrinkButtonClick(pre) {
  cgptSetPreViewMode(pre, CGPT_VIEW_MODE.COMPACT);
}

function cgptHandleExpandButtonClick(pre) {
  cgptSetPreViewMode(pre, CGPT_VIEW_MODE.EXPANDED);
}

function cgptRefreshSaveButtonState(pre, code, pathInfoOverride) {
  if (!pre || !code) return null;
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  let saveButton = state ? state.saveButton : null;
  if (!saveButton) {
    saveButton = pre.querySelector("button[data-cgpt-button-role='save']");
    if (!saveButton) {
      return null;
    }
    if (state) {
      state.saveButton = saveButton;
    }
  }

  const pathInfo =
    pathInfoOverride !== undefined ? pathInfoOverride : cgptResolveCodeBlockPathInfo(pre, code);
  const canSave = Boolean(pathInfo && pathInfo.filePath);
  saveButton.title = canSave
    ? pathInfo.hasDetectedFilePath
      ? "Save to the project folder"
      : `Save to the project folder as ${pathInfo.filePath}`
    : "Add a PATH: relative/path line immediately before the code block to enable Save";
  cgptApplyButtonVariant(saveButton, canSave ? "primary" : "secondary");
  cgptSetButtonDisabled(saveButton, !canSave);
  pre.dataset.cgptHasResolvedPath = canSave ? "1" : "0";
  pre.dataset.cgptHasDetectedPath =
    canSave && pathInfo.hasDetectedFilePath ? "1" : "0";
  pre.dataset.cgptFilePath = canSave ? pathInfo.filePath || "" : "";
  if (state) {
    state.pathInfo = pathInfo || null;
  }
  return pathInfo;
}

function cgptSetButtonDisabled(button, disabled) {
  if (!button) return;
  if (typeof cgptSetSharedButtonDisabled === "function") {
    cgptSetSharedButtonDisabled(button, disabled);
    return;
  }
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.5" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function cgptCalculateButtonOverlayOffset(container) {
  if (!container) return 0;
  if (container.dataset && container.dataset.cgptCodeActionsPlacement !== "overlay") {
    return 0;
  }
  const rect =
    typeof container.getBoundingClientRect === "function"
      ? container.getBoundingClientRect()
      : null;
  const height = rect && rect.height ? rect.height : container.offsetHeight || 0;
  const topOffset = parseFloat(container.style.top || "0") || 0;
  const SAFE_MARGIN_PX = 8;
  return Math.max(0, height + topOffset + SAFE_MARGIN_PX);
}
