function decorateCodeBlocks(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  if (typeof window !== "undefined") {
    if (!window.__cgptPerfMetrics || typeof window.__cgptPerfMetrics !== "object") {
      window.__cgptPerfMetrics = {};
    }
    if (!window.__cgptPerfMetrics.codeBlocks || typeof window.__cgptPerfMetrics.codeBlocks !== "object") {
      window.__cgptPerfMetrics.codeBlocks = {};
    }
    window.__cgptPerfMetrics.codeBlocks.decorateCalls =
      (Number(window.__cgptPerfMetrics.codeBlocks.decorateCalls) || 0) + 1;
  }
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
  const existingPathHost = pre.querySelector("[data-cgpt-code-path-host='1']");
  if (existingPathHost) return existingPathHost;
  const existingPathNode = pre.querySelector("[data-cgpt-code-file-path='1']");
  if (existingPathNode && existingPathNode.parentElement) {
    return existingPathNode.parentElement;
  }
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
      element.tagName === "BUTTON" ||
      (typeof element.closest === "function" &&
        element.closest("[data-cgpt-code-actions='1'], .cgpt-mock-code-actions"))
    ) {
      return false;
    }
    if (
      element.dataset &&
      (
        element.dataset.cgptCodeActions === "1" ||
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

function cgptFindNativeHeaderActionsContainer(pre) {
  if (!pre || typeof pre.querySelectorAll !== "function") return null;
  const existingActions = pre.querySelector(
    "[data-cgpt-code-actions='1'][data-cgpt-code-actions-placement='native-header']"
  );
  if (existingActions && existingActions.parentElement) {
    return existingActions.parentElement;
  }
  const buttons = Array.from(pre.querySelectorAll("button[aria-label]"));
  const copyButton = buttons.find((button) => {
    const label = button.getAttribute("aria-label") || "";
    return /copy|コピー/i.test(label);
  });
  if (!copyButton || !copyButton.parentElement) return null;
  return copyButton.parentElement;
}

function cgptEnsureStandaloneHeader(pre) {
  if (!pre || !pre.parentElement || pre.parentElement.dataset.cgptCodeWrapper !== "1") {
    return null;
  }
  const wrapper = pre.parentElement;
  let header = wrapper.querySelector(":scope > [data-cgpt-code-header='1']");
  if (!header) {
    header = document.createElement("div");
    header.dataset.cgptCodeHeader = "1";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    header.style.width = "100%";
    header.style.maxWidth = "100%";
    header.style.boxSizing = "border-box";
    header.style.marginBottom = "8px";
    header.style.overflow = "hidden";

    const labelHost = document.createElement("div");
    labelHost.dataset.cgptCodeLabelHost = "1";
    labelHost.style.display = "flex";
    labelHost.style.alignItems = "center";
    labelHost.style.minWidth = "0";
    labelHost.style.flex = "1 1 auto";
    labelHost.style.overflow = "hidden";

    const actionsHost = document.createElement("div");
    actionsHost.dataset.cgptCodeActionsHost = "1";
    actionsHost.style.display = "flex";
    actionsHost.style.alignItems = "center";
    actionsHost.style.justifyContent = "flex-end";
    actionsHost.style.flex = "0 0 auto";
    actionsHost.style.minWidth = "0";

    header.appendChild(labelHost);
    header.appendChild(actionsHost);
    wrapper.insertBefore(header, pre);
  }
  return header;
}

function cgptMoveChildrenPreservingOrder(source, target, { prepend = false } = {}) {
  if (!source || !target) return;
  const nodes = Array.from(source.childNodes || []).filter((node) => {
    return !(
      node.nodeType === Node.TEXT_NODE &&
      !String(node.textContent || "").trim()
    );
  });
  nodes.forEach((node) => {
    if (prepend && target.firstChild) {
      target.insertBefore(node, target.firstChild);
    } else {
      target.appendChild(node);
    }
  });
}

function cgptReconcileStandaloneHeaderWithNativeHeader(pre) {
  if (!pre || !pre.parentElement || pre.parentElement.dataset.cgptCodeWrapper !== "1") {
    return;
  }
  const wrapper = pre.parentElement;
  const standaloneHeader = wrapper.querySelector(":scope > [data-cgpt-code-header='1']");
  if (!standaloneHeader) return;

  const nativeLabelHost = cgptFindNativeHeaderLabelContainer(pre);
  const nativeActionsHost = cgptFindNativeHeaderActionsContainer(pre);
  if (!nativeLabelHost && !nativeActionsHost) return;

  const standaloneLabelHost =
    standaloneHeader.querySelector(":scope > [data-cgpt-code-label-host='1']");
  const standaloneActionsHost =
    standaloneHeader.querySelector(":scope > [data-cgpt-code-actions-host='1']");

  if (nativeLabelHost && standaloneLabelHost) {
    cgptMoveChildrenPreservingOrder(standaloneLabelHost, nativeLabelHost, { prepend: true });
  }
  if (nativeActionsHost && standaloneActionsHost) {
    cgptMoveChildrenPreservingOrder(standaloneActionsHost, nativeActionsHost);
  }

  standaloneHeader.remove();
}

function cgptFindCodeHeaderLabelContainer(pre) {
  const native = cgptFindNativeHeaderLabelContainer(pre);
  if (native) {
    cgptReconcileStandaloneHeaderWithNativeHeader(pre);
    return native;
  }
  const standaloneHeader = cgptEnsureStandaloneHeader(pre);
  return standaloneHeader
    ? standaloneHeader.querySelector(":scope > [data-cgpt-code-label-host='1']")
    : null;
}

function cgptFindCodeHeaderActionsContainer(pre) {
  const native = cgptFindNativeHeaderActionsContainer(pre);
  if (native) {
    cgptReconcileStandaloneHeaderWithNativeHeader(pre);
    return native;
  }
  const standaloneHeader = cgptEnsureStandaloneHeader(pre);
  return standaloneHeader
    ? standaloneHeader.querySelector(":scope > [data-cgpt-code-actions-host='1']")
    : null;
}

function cgptSyncCompactHeaderPath(pre, pathInfo, mode) {
  if (!pre) return;
  const existingNodes = Array.from(pre.querySelectorAll("[data-cgpt-code-file-path='1']"));
  if (!pathInfo || !pathInfo.filePath || !pathInfo.hasDetectedFilePath) {
    existingNodes.forEach((node) => node.remove());
    pre.querySelectorAll("[data-cgpt-code-path-host='1']").forEach((node) => {
      delete node.dataset.cgptCodePathHost;
    });
    return;
  }

  const container =
    typeof cgptFindCodeHeaderLabelContainer === "function"
      ? cgptFindCodeHeaderLabelContainer(pre)
      : cgptFindNativeHeaderLabelContainer(pre);
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
  const nextPathText = ` ${pathInfo.filePath}`;
  if (pathEl.textContent !== nextPathText) {
    pathEl.textContent = nextPathText;
  }
  if (pathEl.title !== pathInfo.filePath) {
    pathEl.title = pathInfo.filePath;
  }
  pathEl.style.marginInlineStart = "8px";
  pathEl.style.fontSize = "inherit";
  pathEl.style.fontWeight = "500";
  pathEl.style.lineHeight = "inherit";
  pathEl.style.opacity = "1";
  pathEl.style.display = "inline-flex";
  pathEl.style.alignItems = "center";
  pathEl.style.padding = "3px 8px";
  pathEl.style.borderRadius = "8px";
  pathEl.style.backgroundColor = "rgba(59, 130, 246, 0.18)";
  pathEl.style.border = "1px solid rgba(59, 130, 246, 0.3)";
  pathEl.style.boxSizing = "border-box";
  pathEl.style.overflow = "hidden";
  pathEl.style.textOverflow = "ellipsis";
  pathEl.style.whiteSpace = "nowrap";
  pathEl.style.maxWidth = "100%";
  if (!existing) {
    container.appendChild(pathEl);
  }
}

function cgptSyncPathMetadataVisibility(pre, pathInfo) {
  if (!pre) return;
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  const previousNode = state ? state.pathMetadataNode || null : null;
  const roleHost =
    typeof pre.closest === "function" ? pre.closest("[data-message-author-role]") : null;
  const role = roleHost ? String(roleHost.getAttribute("data-message-author-role") || "").toLowerCase() : "";
  const shouldHideDetectedPath =
    pathInfo &&
    pathInfo.hasDetectedFilePath &&
    pathInfo.node &&
    (!role || role === "assistant");
  const nextNode = shouldHideDetectedPath ? pathInfo.node : null;

  if (
    previousNode &&
    previousNode !== nextNode &&
    typeof cgptSetPathMetadataVisibility === "function"
  ) {
    cgptSetPathMetadataVisibility(previousNode, false);
  }

  if (nextNode && typeof cgptSetPathMetadataVisibility === "function") {
    cgptSetPathMetadataVisibility(nextNode, true);
  }

  if (state) {
    state.pathMetadataNode = nextNode || null;
  }
}

function cgptGetDecoratableCodeContent(pre) {
  if (!pre || typeof pre.querySelector !== "function") return null;
  if (typeof cgptGetCodeTextContainer === "function") {
    return cgptGetCodeTextContainer(pre);
  }
  return pre.querySelector("code, .cm-content");
}

function cgptIsAssistantCodeBlock(pre) {
  if (!pre || typeof pre.closest !== "function") {
    return true;
  }
  const roleHost = pre.closest("[data-message-author-role]");
  if (!roleHost || typeof roleHost.getAttribute !== "function") {
    return true;
  }
  const role = String(roleHost.getAttribute("data-message-author-role") || "").toLowerCase();
  return !role || role === "assistant";
}

function cgptCollectDecoratablePres(root) {
  const collected = [];
  const seen = new Set();

  const addPre = (pre) => {
    if (!pre || seen.has(pre)) return;
    const ancestorPre =
      pre.parentElement && typeof pre.parentElement.closest === "function"
        ? pre.parentElement.closest("pre")
        : null;
    if (ancestorPre && cgptGetDecoratableCodeContent(ancestorPre)) {
      return;
    }
    if (!cgptGetDecoratableCodeContent(pre)) return;
    if (!cgptIsAssistantCodeBlock(pre)) return;
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

  const isAlreadyDecorated = pre.dataset.cgptCodeHelperApplied === "1";
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  const pathInfo =
    typeof cgptResolveCodeBlockPathInfo === "function"
      ? cgptResolveCodeBlockPathInfo(pre, code)
      : null;
  if (typeof cgptReconcileStandaloneHeaderWithNativeHeader === "function") {
    cgptReconcileStandaloneHeaderWithNativeHeader(pre);
  }

  if (!isAlreadyDecorated) {
    const wrapper = cgptWrapPreWithRelativeContainer(pre);
    pre.dataset.cgptCodeHelperApplied = "1";
    const actionsHost =
      typeof cgptFindCodeHeaderActionsContainer === "function"
        ? cgptFindCodeHeaderActionsContainer(pre)
        : null;
    const buttonContainer = cgptCreateButtonContainer(
      actionsHost ? "native-header" : "standalone"
    );

    const saveBtn = cgptCreateSaveButtonElement(Boolean(pathInfo && pathInfo.filePath));
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

    if (!actionsHost || actionsHost.dataset.cgptCodeActionsHost === "1") {
      const copyBtn = cgptCreateCopyButtonElement();
      copyBtn.addEventListener("click", () => {
        cgptHandleCopyButtonClick(copyBtn, code);
      });
      buttonContainer.appendChild(copyBtn);
    }

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

    if (actionsHost) {
      actionsHost.insertBefore(buttonContainer, actionsHost.firstChild);
    } else {
      wrapper.insertBefore(buttonContainer, pre);
    }
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
      state.pathInfo = pathInfo || null;
    }
    cgptSetPreViewMode(pre, CGPT_VIEW_MODE.EXPANDED);
  }

  if (state) {
    state.pathInfo = pathInfo || null;
  }
  if (typeof cgptSyncPathMetadataVisibility === "function") {
    cgptSyncPathMetadataVisibility(pre, pathInfo);
  }
  cgptRefreshSaveButtonState(pre, code, pathInfo);
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
          "[data-cgpt-code-header='1']",
          "[data-cgpt-code-label-host='1']",
          "[data-cgpt-code-actions-host='1']",
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
  delete pre.dataset.cgptHasResolvedPath;
  delete pre.dataset.cgptHasDetectedPath;
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
    if (
      state.pathMetadataNode &&
      typeof cgptSetPathMetadataVisibility === "function"
    ) {
      cgptSetPathMetadataVisibility(state.pathMetadataNode, false);
    }
    state.saveButton = null;
    state.buttonContainer = null;
    state.buttonOverlayOffset = null;
    state.viewButtons = null;
    state.pathInfo = null;
    state.pathMetadataNode = null;
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
  root
    .querySelectorAll("pre[data-cgpt-code-helper-applied='1']")
    .forEach((pre) => {
      if (!cgptIsAssistantCodeBlock(pre)) {
        cgptResetCodeBlockHelperState(pre);
      }
    });
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
