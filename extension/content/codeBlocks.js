function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  cgptEnsureCodeBlockStyles();
  const pres = cgptCollectDecoratablePres(root);
  pres.forEach((pre) => {
    tryDecorateSingleCodeBlock(pre);
  });
}

function cgptGetCompactContentHost(pre) {
  const code = cgptGetDecoratableCodeContent(pre);
  if (!code) return pre;
  if (code.classList && code.classList.contains("cm-content")) {
    return code.closest(".cm-scroller") || code.parentElement || code;
  }
  return code;
}

function cgptFindNativeHeaderLabelContainer(pre) {
  if (!pre || typeof pre.querySelectorAll !== "function") return null;
  const buttons = Array.from(pre.querySelectorAll("button[aria-label]"));
  const copyButton = buttons.find((button) => {
    const label = button.getAttribute("aria-label") || "";
    return /copy|コピー/i.test(label);
  });
  if (!copyButton) return null;

  const hasCodeContentDescendant = (element) => {
    return Boolean(
      element &&
      typeof element.querySelector === "function" &&
      element.querySelector("pre, code, .cm-content, .cm-scroller")
    );
  };

  const getCandidateText = (element) => {
    if (!element) return "";
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  };

  const isCompactLabelTarget = (element) => {
    if (!element || hasCodeContentDescendant(element)) return null;
    if (
      element.dataset &&
      (
        element.dataset.cgptCodeFilePath === "1" ||
        element.dataset.cgptCodePathHost === "1" ||
        element.dataset.cgptCodeToggle === "1"
      )
    ) {
      return false;
    }
    const text = getCandidateText(element);
    return Boolean(text) && !/\n/.test(text) && text.length <= 120;
  };

  const findCompactLabelTarget = (element) => {
    if (!element || hasCodeContentDescendant(element)) return null;
    if (isCompactLabelTarget(element)) {
      return element;
    }
    const childElements = Array.from(element.children || []);
    for (const child of childElements) {
      const nestedMatch = findCompactLabelTarget(child);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
    return null;
  };

  let current = copyButton;
  while (current && current !== pre) {
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children || []).filter((child) => !child.contains(copyButton));
    for (const sibling of siblings) {
      const labelCandidate = findCompactLabelTarget(sibling);
      if (labelCandidate) {
        return labelCandidate;
      }
    }
    current = parent;
  }
  return null;
}

function cgptSyncCompactHeaderPath(pre, metadata, mode) {
  if (!pre) return;
  const existingNodes = Array.from(pre.querySelectorAll("[data-cgpt-code-file-path='1']"));
  if (!metadata || !metadata.filePath) {
    existingNodes.forEach((node) => node.remove());
    pre.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
      delete node.dataset.cgptCodePathHost;
    });
    return;
  }

  const container = cgptFindNativeHeaderLabelContainer(pre);
  if (!container) {
    existingNodes.forEach((node) => node.remove());
    return;
  }

  let keptNode = null;
  existingNodes.forEach((node) => {
    if (!container.contains(node) || keptNode) {
      node.remove();
      return;
    }
    keptNode = node;
  });

  pre.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
    if (node !== container) {
      delete node.dataset.cgptCodePathHost;
    }
  });

  container.dataset.cgptCodePathHost = "1";
  const existing =
    keptNode || container.querySelector(":scope > [data-cgpt-code-file-path='1']");

  const pathEl = existing || document.createElement("span");
  pathEl.dataset.cgptCodeFilePath = "1";
  const nextPathText = ` ${metadata.filePath}`;
  if (pathEl.textContent !== nextPathText) {
    pathEl.textContent = nextPathText;
  }
  if (pathEl.title !== metadata.filePath) {
    pathEl.title = metadata.filePath;
  }
  pathEl.style.marginInlineStart = "8px";
  pathEl.style.fontSize = "11px";
  pathEl.style.fontWeight = "500";
  pathEl.style.lineHeight = "1.2";
  pathEl.style.opacity = "0.78";
  pathEl.style.overflow = "hidden";
  pathEl.style.textOverflow = "ellipsis";
  pathEl.style.whiteSpace = "nowrap";
  pathEl.style.maxWidth = "100%";
  if (!existing) {
    container.appendChild(pathEl);
  }
}

function cgptGetDecoratableCodeContent(pre) {
  if (!pre || typeof pre.querySelector !== "function") return null;
  if (typeof cgptGetCodeTextContainer === "function") {
    return cgptGetCodeTextContainer(pre);
  }
  return pre.querySelector("code, .cm-content");
}

function cgptCollectDecoratablePres(root) {
  const collected = [];
  const seen = new Set();

  const addPre = (pre) => {
    if (!pre || seen.has(pre)) return;
    if (
      typeof pre.querySelector === "function" &&
      Array.from(pre.querySelectorAll("pre")).some((nestedPre) =>
        nestedPre !== pre && cgptGetDecoratableCodeContent(nestedPre)
      )
    ) {
      return;
    }
    if (!cgptGetDecoratableCodeContent(pre)) return;
    seen.add(pre);
    collected.push(pre);
  };

  if (root.nodeType === Node.ELEMENT_NODE) {
    if (root.matches("pre")) {
      addPre(root);
    }
    const closestPre = root.closest("pre");
    if (closestPre) {
      addPre(closestPre);
    }
  }

  root.querySelectorAll("pre").forEach((pre) => {
    addPre(pre);
  });

  return collected;
}

function tryDecorateSingleCodeBlock(pre) {
  if (!pre) return;
  const code = cgptGetDecoratableCodeContent(pre);
  if (!code) return;

  const metadata = cgptParseCodeBlockMetadata(code);
  const isAlreadyDecorated = pre.dataset.cgptCodeHelperApplied === "1";
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;

  if (!isAlreadyDecorated) {
    const wrapper = cgptWrapPreWithRelativeContainer(pre);
    pre.dataset.cgptCodeHelperApplied = "1";

    const buttonContainer = cgptCreateButtonContainer();

    const saveBtn = cgptCreateSaveButtonElement(Boolean(metadata));
    saveBtn.dataset.cgptButtonRole = "save";
    if (state) {
      state.saveButton = saveBtn;
    }
    saveBtn.addEventListener("click", () => {
      cgptHandleSaveButtonClick(saveBtn, code, pre);
    });
    buttonContainer.appendChild(saveBtn);

    const saveAsBtn = cgptCreateSaveAsButtonElement();
    saveAsBtn.dataset.cgptButtonRole = "save-as";
    pre.cgptSaveAsButton = saveAsBtn;
    saveAsBtn.addEventListener("click", () => {
      cgptHandleSaveAsButtonClick(saveAsBtn, code, pre);
    });
    buttonContainer.appendChild(saveAsBtn);

    const copyBtn = cgptCreateCopyButtonElement();
    copyBtn.addEventListener("click", () => {
      cgptHandleCopyButtonClick(copyBtn, code);
    });
    buttonContainer.appendChild(copyBtn);

    const shrinkBtn = cgptCreateShrinkButtonElement();
    const expandBtn = cgptCreateExpandButtonElement();
    shrinkBtn.addEventListener("click", () => {
      cgptHandleShrinkButtonClick(pre);
    });
    expandBtn.addEventListener("click", () => {
      cgptHandleExpandButtonClick(pre);
    });
    buttonContainer.appendChild(shrinkBtn);
    buttonContainer.appendChild(expandBtn);

    wrapper.appendChild(buttonContainer);
    buttonContainer.addEventListener("mouseenter", () => {
      cgptRefreshSaveButtonState(pre, code);
    });

    if (state) {
      state.buttonContainer = buttonContainer;
    }
    if (typeof cgptCalculateButtonOverlayOffset === "function") {
      const overlayOffset = cgptCalculateButtonOverlayOffset(buttonContainer);
      if (state) {
        state.buttonOverlayOffset = overlayOffset;
      }
    }

    cgptEnsureCollapsibleState(pre);
    if (state) {
      state.viewButtons = { shrinkBtn, expandBtn };
      state.metadata = metadata || null;
    }
    cgptSetPreViewMode(pre, CGPT_VIEW_MODE.EXPANDED);
  }

  if (state) {
    state.metadata = metadata || null;
  }
  cgptRefreshSaveButtonState(pre, code, metadata);
}

function cgptResetCodeBlockHelperState(pre) {
  if (!pre) {
    return typeof CGPT_VIEW_MODE !== "undefined" ? CGPT_VIEW_MODE.COMPACT : "compact";
  }

  const compactMode =
    typeof CGPT_VIEW_MODE !== "undefined" ? CGPT_VIEW_MODE.COMPACT : "compact";
  const expandedMode =
    typeof CGPT_VIEW_MODE !== "undefined" ? CGPT_VIEW_MODE.EXPANDED : "expanded";
  const previousMode =
    typeof cgptGetPreViewMode === "function"
      ? cgptGetPreViewMode(pre)
      : pre.dataset.cgptViewMode || compactMode;
  const normalizedMode = previousMode === expandedMode ? expandedMode : compactMode;

  const wrapper =
    pre.parentElement && pre.parentElement.dataset.cgptCodeWrapper === "1"
      ? pre.parentElement
      : null;
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  const host =
    typeof cgptGetCompactContentHost === "function" ? cgptGetCompactContentHost(pre) : pre;
  const cueHost =
    typeof cgptGetCompactCueHost === "function" ? cgptGetCompactCueHost(pre) : host;
  const collapsibleEl =
    typeof cgptGetCollapsibleElement === "function" ? cgptGetCollapsibleElement(pre) : pre;

  if (typeof cgptRestoreCompactHostStyles === "function") {
    cgptRestoreCompactHostStyles(host);
  }
  if (cueHost && typeof cgptRestoreCueHostStyles === "function") {
    cgptRestoreCueHostStyles(cueHost);
  }

  [wrapper, cueHost, pre].filter(Boolean).forEach((root) => {
    if (typeof root.querySelectorAll !== "function") return;
    root
      .querySelectorAll(
        [
          "[data-cgpt-code-actions='1']",
          "[data-cgpt-code-collapse-cue='1']",
          "[data-cgpt-code-collapse-top-cue='1']",
          "[data-cgpt-code-file-path='1']",
        ].join(",")
      )
      .forEach((node) => {
        node.remove();
      });
    root.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
      delete node.dataset.cgptCodePathHost;
    });
  });

  if (pre.style) {
    pre.style.overflow = pre.dataset.cgptOriginalOverflow || "";
    pre.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
  }
  if (collapsibleEl && collapsibleEl !== pre && collapsibleEl.style) {
    collapsibleEl.style.overflow = pre.dataset.cgptOriginalOverflow || "";
    collapsibleEl.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
    collapsibleEl.classList.remove(CGPT_CODE_COLLAPSED_CLASS);
    collapsibleEl.classList.remove(CGPT_CODE_WRAPPER_CLASS);
  }

  delete pre.dataset.cgptCodeHelperApplied;
  delete pre.dataset.cgptCollapsibleApplied;
  delete pre.dataset.cgptViewMode;
  delete pre.dataset.cgptHasMetadata;
  delete pre.dataset.cgptFilePath;
  delete pre.dataset.cgptOriginalOverflow;
  delete pre.dataset.cgptOriginalMaxHeight;

  if (host && host.dataset) {
    delete host.dataset.cgptOriginalOverflow;
    delete host.dataset.cgptOriginalMaxHeight;
    delete host.dataset.cgptOriginalBackgroundColor;
    delete host.dataset.cgptOriginalBoxShadow;
  }
  if (cueHost && cueHost.dataset) {
    delete cueHost.dataset.cgptOriginalPosition;
  }

  if (state) {
    state.saveButton = null;
    state.buttonContainer = null;
    state.buttonOverlayOffset = null;
    state.viewButtons = null;
    state.metadata = null;
  }

  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.insertBefore(pre, wrapper);
    wrapper.remove();
  }

  return normalizedMode;
}

function cgptReapplyCodeSaverDecorations(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  cgptEnsureCodeBlockStyles();
  const pres = cgptCollectDecoratablePres(root);
  pres.forEach((pre) => {
    const mode = cgptResetCodeBlockHelperState(pre);
    tryDecorateSingleCodeBlock(pre);
    if (typeof cgptSetPreViewMode === "function") {
      cgptSetPreViewMode(pre, mode);
    }
  });
  if (typeof cgptSchedulePanelLayoutRefresh === "function") {
    cgptSchedulePanelLayoutRefresh();
  }
}

function tryDecorateFromTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const elementParent = node.parentElement;
  if (!elementParent) return;
  const content = elementParent.closest("code, .cm-content");
  const pre = content ? content.closest("pre") : elementParent.closest("pre");
  if (!pre) return;
  tryDecorateSingleCodeBlock(pre);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCollectDecoratablePres,
    cgptResetCodeBlockHelperState,
  };
}
