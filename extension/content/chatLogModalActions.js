function cgptResolveSaveMode(saveAs) {
  if (typeof CGPT_SAVE_MODES !== "undefined") {
    return saveAs ? CGPT_SAVE_MODES.SAVE_AS : CGPT_SAVE_MODES.SAVE;
  }
  return saveAs ? "saveAs" : "save";
}

async function cgptRunChatLogButtonAction(button, pendingLabel, action) {
  if (!button || button.disabled || typeof action !== "function") return;
  const originalText = button.textContent;
  cgptSetChatLogButtonDisabled(button, true);
  button.textContent = pendingLabel;
  try {
    return await action();
  } finally {
    button.textContent = originalText;
    cgptSetChatLogButtonDisabled(button, false);
  }
}

function cgptShowSingleChatLogError(message) {
  if (typeof showToast === "function") {
    showToast(message || "Failed to save", "error");
  }
}

function cgptTriggerChatLogDownload(filePath, content, options = {}) {
  const {
    onDone,
    saveAs = false,
    overrideFolderPath = "",
    meta = {},
    showToast: shouldShowToast = true,
    successMessage,
  } = options;
  const callback = typeof onDone === "function" ? onDone : () => {};
  if (typeof cgptRunSaveAction !== "function") {
    callback();
    return;
  }
  cgptRunSaveAction(
    {
      request: {
        content,
        targetPath: filePath,
        mode: cgptResolveSaveMode(saveAs),
        meta: {
          source: "chat-batch",
          ...meta,
        },
        overrideFolderPath,
      },
      ui: {
        showToast: shouldShowToast,
        successMessage,
        onSuccess: () => {
          callback({ ok: true, filePath });
        },
        onError: (errorMessage) => {
          callback({ ok: false, filePath, error: errorMessage || "Failed to save" });
        },
      },
    }
  );
}

function cgptCreateBatchSaveAllButton(blocks) {
  const button = cgptCreateBatchSaveButton(blocks, {
    label: "Save All",
    variant: "primary",
    pendingLabel: "Saving...",
  });
  button.title = "Save all detected code blocks to the project folder";
  return button;
}

function cgptCreateBatchSaveAsAllButton(blocks) {
  const button = cgptCreateChatLogButton("Save As All", "secondary", "sm");
  cgptSetChatLogButtonDisabled(button, !blocks || !blocks.length);
  if (!blocks || !blocks.length) {
    return button;
  }
  button.title = "Choose one folder, then save all detected code blocks there";
  button.addEventListener("click", () => {
    if (button.disabled) return;
    cgptHandleBatchSaveAsAll(button, blocks);
  });
  return button;
}

function cgptCreateBatchSaveButton(blocks, options = {}) {
  const { label = "Save All", variant = "primary", pendingLabel = "Saving..." } = options;
  const button = cgptCreateChatLogButton(label, variant, "sm");
  cgptSetChatLogButtonDisabled(button, !blocks || !blocks.length);
  if (!blocks || !blocks.length) {
    return button;
  }
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    await cgptHandleBatchSave(button, blocks, { pendingLabel });
  });
  return button;
}

async function cgptHandleBatchSave(button, blocks, options = {}) {
  await cgptRunChatLogButtonAction(button, options.pendingLabel || "Saving...", async () => {
    try {
      const results = await cgptDownloadCodeBlocksSequentially(blocks, { showToast: false });
      cgptShowBatchSaveSummary(results, {
        successMessage: (savedCount) => `Saved ${savedCount} code block${savedCount === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      cgptShowBatchSaveSummary(error && error.results ? error.results : [], {
        fallbackError: error && error.message ? error.message : "Failed to save",
      });
    }
  });
}

async function cgptHandleBatchSaveAsAll(button, blocks) {
  await cgptRunChatLogButtonAction(button, "Selecting...", async () => {
    try {
      const folderPath = await cgptPromptUserForDownloadFolder();
      if (!folderPath) {
        return;
      }
      button.textContent = "Saving...";
      const results = await cgptDownloadCodeBlocksSequentially(blocks, {
        overrideFolderPath: folderPath,
        showToast: false,
      });
      cgptShowBatchSaveSummary(results, {
        successMessage: (savedCount) =>
          `Saved ${savedCount} code block${savedCount === 1 ? "" : "s"} to: ${folderPath}`,
      });
    } catch (error) {
      if (error && Array.isArray(error.results)) {
        cgptShowBatchSaveSummary(error.results, {
          fallbackError: error.message || "Failed to save",
        });
      } else {
        cgptShowSingleChatLogError((error && error.message) || "Failed to select a folder.");
      }
    }
  });
}

function cgptCreateChatLogButton(label, variant = "secondary", size = "md") {
  const useChipButton = variant === "secondary" || variant === "ghost" || variant === "primary";
  const button =
    typeof cgptCreateSharedChipButton === "function" && useChipButton
      ? cgptCreateSharedChipButton(label, size)
      : typeof cgptCreateSharedButton === "function"
        ? cgptCreateSharedButton(label, variant, size)
        : document.createElement("button");
  if (!button.textContent) {
    button.textContent = label;
  }
  if (typeof cgptDisableSharedButtonMotion === "function") {
    cgptDisableSharedButtonMotion(button);
  }
  if (typeof cgptCreateSharedButton !== "function") {
    button.style.fontSize = size === "sm" ? "11px" : "12px";
    button.style.padding = size === "sm" ? "0 8px" : "0 10px";
    button.style.minHeight = size === "sm" ? "28px" : "32px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(255,255,255,0.3)";
    button.style.cursor = "pointer";
    button.style.transition = "opacity 0.2s ease";
    if (typeof cgptApplySharedButtonVariant === "function") {
      cgptApplySharedButtonVariant(button, variant);
    } else {
      const fallback = {
        primary: "#2563eb",
        success: "#047857",
        danger: "#b91c1c",
        secondary: "#475569",
        ghost: "rgba(15, 23, 42, 0.82)",
      };
      button.style.background = fallback[variant] || fallback.secondary;
      button.style.color = "#fff";
    }
  }
  button.style.transition = "none";
  button.style.animation = "none";
  button.style.transform = "none";
  return button;
}

function cgptSetChatLogButtonDisabled(button, disabled) {
  if (!button) return;
  if (typeof cgptSetSharedButtonDisabled === "function") {
    cgptSetSharedButtonDisabled(button, disabled);
    return;
  }
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.5" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function cgptDownloadCodeBlocksSequentially(blocks, options = {}) {
  const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
  return normalizedBlocks.reduce((promise, block) => {
    return promise.then((results) => {
      return cgptCreateBlockDownloadPromise(block, options).then((result) => {
        results.push(result);
        if (!result || !result.ok) {
          const error = new Error(
            result && result.error ? result.error : "Failed to save"
          );
          error.results = results;
          throw error;
        }
        return results;
      });
    });
  }, Promise.resolve([]));
}

function cgptCreateBlockDownloadPromise(block, options = {}) {
  const triggerDownload =
    typeof options.triggerDownload === "function"
      ? options.triggerDownload
      : cgptTriggerChatLogDownload;
  return new Promise((resolve) => {
    triggerDownload(block.filePath, block.content, {
      saveAs: Boolean(options.saveAs),
      overrideFolderPath: options.overrideFolderPath,
      showToast: options.showToast,
      meta: options.meta,
      onDone: resolve,
    });
  });
}

function cgptShowBatchSaveSummary(results, options = {}) {
  if (typeof showToast !== "function") {
    return;
  }
  const normalizedResults = Array.isArray(results) ? results : [];
  const failed = normalizedResults.filter((result) => !result || !result.ok);
  const savedCount = normalizedResults.length - failed.length;
  if (!normalizedResults.length) {
    showToast(options.fallbackError || "No code blocks were saved.", "error");
    return;
  }
  if (failed.length) {
    const firstError =
      (failed[0] && failed[0].error) || options.fallbackError || "Failed to save";
    showToast(
      `Stopped after saving ${savedCount}/${normalizedResults.length} code blocks. First error: ${firstError}`,
      "error"
    );
    return;
  }
  const successMessage =
    typeof options.successMessage === "function"
      ? options.successMessage(savedCount)
      : options.successMessage || `Saved ${savedCount} code block${savedCount === 1 ? "" : "s"}.`;
  showToast(successMessage, "success");
}

function cgptPromptUserForDownloadFolder() {
  return new Promise((resolve, reject) => {
    const canSendRuntimeMessage =
      typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.sendMessage === "function";
    if (!canSendRuntimeMessage) {
      reject(new Error("Unable to start the folder picker."));
      return;
    }

    chrome.runtime.sendMessage({ type: "pickDownloadFolder" }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error("Failed to select a folder."));
        return;
      }
      if (!response.ok) {
        if (response.error === "folder_picker_canceled") {
          resolve("");
          return;
        }
        reject(new Error(response.error || "Failed to select a folder."));
        return;
      }
      resolve(response.folderPath || "");
    });
  });
}

function cgptJumpToCodeBlock(targetElement) {
  if (!targetElement) return;
  if (typeof highlightChatMessageElement === "function") {
    highlightChatMessageElement(targetElement);
    return;
  }
  if (typeof targetElement.scrollIntoView === "function") {
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function cgptCreateBlockSaveButton(block) {
  const button = cgptCreateChatLogButton("Save", "primary", "sm");
  if (!block || !block.filePath) {
    cgptSetChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.title = "Save this code block to the project folder";
  button.addEventListener("click", () => {
    cgptHandleBlockSave(button, block, false);
  });
  return button;
}

function cgptCreateBlockSaveAsButton(block) {
  const button = cgptCreateChatLogButton("Save As", "secondary", "sm");
  if (!block || !block.filePath) {
    cgptSetChatLogButtonDisabled(button, true);
    button.title = "File path not detected";
    return button;
  }
  button.title = "Choose where to save this code block";
  button.addEventListener("click", () => {
    cgptHandleBlockSave(button, block, true);
  });
  return button;
}

function cgptHandleBlockSave(button, block, saveAs) {
  if (!button || !block || !block.filePath) return;
  cgptRunChatLogButtonAction(button, "Saving...", async () => {
    await new Promise((resolve) => {
      cgptTriggerChatLogDownload(block.filePath, block.content, {
        saveAs,
        meta: {
          source: "chat-block",
        },
        onDone: resolve,
      });
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptDownloadCodeBlocksSequentially,
    cgptShowBatchSaveSummary,
  };
}
