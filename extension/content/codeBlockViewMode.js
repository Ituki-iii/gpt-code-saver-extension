const CGPT_CODE_WRAPPER_CLASS = "cgpt-code-wrapper";
const CGPT_CODE_COLLAPSED_CLASS = "cgpt-code-wrapper--collapsed";
const CGPT_CODE_TOGGLE_SELECTOR = "[data-cgpt-code-toggle='1']";
const CGPT_CODE_COLLAPSE_CUE_SELECTOR = "[data-cgpt-code-collapse-cue='1']";
const CGPT_CODE_COLLAPSE_TOP_CUE_SELECTOR = "[data-cgpt-code-collapse-top-cue='1']";
let cgptCodeBlockStylesInjected = false;
const CGPT_VIEW_MODE = {
  COMPACT: "compact",
  EXPANDED: "expanded",
};
const FALLBACK_VIEW_SETTINGS = {
  compactLineCount: 1,
};

function cgptNormalizePositiveNumber(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function cgptCalculateCompactHeight(lineCount, lineHeight, buttonOverlayOffset, verticalPadding = 0) {
  const safeLineCount = Math.max(0, Number.isFinite(lineCount) ? lineCount : 0);
  const safeLineHeight = cgptNormalizePositiveNumber(lineHeight);
  const safeVerticalPadding = Math.max(0, Number.isFinite(verticalPadding) ? verticalPadding : 0);
  const codeHeight = safeLineCount * safeLineHeight + safeVerticalPadding;
  const safeOverlayOffset = Math.max(0, Number.isFinite(buttonOverlayOffset) ? buttonOverlayOffset : 0);
  return Math.max(codeHeight, safeOverlayOffset);
}

function cgptEnsureCodeBlockStyles() {
  if (cgptCodeBlockStylesInjected) return;
  const style = document.createElement("style");
  style.dataset.cgptCodeStyles = "1";
  style.textContent = `
.${CGPT_CODE_WRAPPER_CLASS} {
  position: relative;
}
.${CGPT_CODE_WRAPPER_CLASS} ${CGPT_CODE_COLLAPSE_CUE_SELECTOR} {
  opacity: 0;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.38) 100%);
  transition: opacity 0.15s ease;
  z-index: 1;
}
.${CGPT_CODE_WRAPPER_CLASS} ${CGPT_CODE_COLLAPSE_TOP_CUE_SELECTOR} {
  opacity: 0;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 26px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.22) 0%, rgba(15, 23, 42, 0) 100%);
  transition: opacity 0.15s ease;
  z-index: 1;
}
.${CGPT_CODE_WRAPPER_CLASS} [data-cgpt-code-actions="1"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS} {
  border: 0;
  box-shadow: none;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS} ${CGPT_CODE_COLLAPSE_CUE_SELECTOR} {
  opacity: 1;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS} ${CGPT_CODE_COLLAPSE_TOP_CUE_SELECTOR} {
  opacity: 1;
}
.${CGPT_CODE_WRAPPER_CLASS} ${CGPT_CODE_TOGGLE_SELECTOR} {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin: 0;
  margin-inline-end: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.${CGPT_CODE_WRAPPER_CLASS} ${CGPT_CODE_TOGGLE_SELECTOR}::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translate(-50%, -60%) rotate(45deg);
  transition: transform 0.15s ease;
}
.${CGPT_CODE_WRAPPER_CLASS}.${CGPT_CODE_COLLAPSED_CLASS} ${CGPT_CODE_TOGGLE_SELECTOR}::before {
  transform: translate(-40%, -50%) rotate(-45deg);
}
`;
  (document.head || document.documentElement).appendChild(style);
  cgptCodeBlockStylesInjected = true;
}

function cgptWrapPreWithRelativeContainer(pre) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.dataset.cgptCodeWrapper = "1";
  wrapper.classList.add(CGPT_CODE_WRAPPER_CLASS);
  if (pre.parentNode) {
    pre.parentNode.insertBefore(wrapper, pre);
  }
  wrapper.appendChild(pre);
  return wrapper;
}

function cgptGetCollapsibleElement(pre) {
  if (!pre) return null;
  const parent = pre.parentElement;
  if (parent && parent.dataset.cgptCodeWrapper === "1") {
    return parent;
  }
  return pre;
}

function cgptRememberOriginalPreStyles(pre) {
  const collapsibleEl = cgptGetCollapsibleElement(pre);
  if (!collapsibleEl) return;
  if (pre.dataset.cgptOriginalOverflow === undefined) {
    pre.dataset.cgptOriginalOverflow = collapsibleEl.style.overflow || "";
  }
  if (pre.dataset.cgptOriginalMaxHeight === undefined) {
    pre.dataset.cgptOriginalMaxHeight = collapsibleEl.style.maxHeight || "";
  }
}

function cgptRememberOriginalCompactHostStyles(host) {
  if (!host || !host.style) return;
  if (host.dataset.cgptOriginalOverflow === undefined) {
    host.dataset.cgptOriginalOverflow = host.style.overflow || "";
  }
  if (host.dataset.cgptOriginalMaxHeight === undefined) {
    host.dataset.cgptOriginalMaxHeight = host.style.maxHeight || "";
  }
  if (host.dataset.cgptOriginalBackgroundColor === undefined) {
    host.dataset.cgptOriginalBackgroundColor = host.style.backgroundColor || "";
  }
  if (host.dataset.cgptOriginalBoxShadow === undefined) {
    host.dataset.cgptOriginalBoxShadow = host.style.boxShadow || "";
  }
}

function cgptRestoreCompactHostStyles(host) {
  if (!host || !host.style) return;
  cgptRememberOriginalCompactHostStyles(host);
  host.style.overflow = host.dataset.cgptOriginalOverflow || "";
  host.style.maxHeight = host.dataset.cgptOriginalMaxHeight || "";
  host.style.backgroundColor = host.dataset.cgptOriginalBackgroundColor || "";
  host.style.boxShadow = host.dataset.cgptOriginalBoxShadow || "";
}

function cgptGetCompactCueColors(pre) {
  if (
    !pre ||
    typeof window === "undefined" ||
    typeof window.getComputedStyle !== "function"
  ) {
    return {
      headerColor: "rgba(255, 255, 255, 0.16)",
      bodyColor: "rgba(15, 23, 42, 0.08)",
      tailColor: "rgba(15, 23, 42, 0.24)",
    };
  }

  const host =
    typeof cgptGetCompactContentHost === "function" ? cgptGetCompactContentHost(pre) : pre;
  const cueHost = cgptGetCompactCueHost(pre);
  const shell = cueHost && cueHost.parentElement ? cueHost.parentElement : null;
  const header =
    cueHost && cueHost.previousElementSibling
      ? cueHost.previousElementSibling
      : shell && shell.firstElementChild && shell.firstElementChild !== cueHost
        ? shell.firstElementChild
        : null;

  const hostStyle = host ? window.getComputedStyle(host) : null;
  const cueHostStyle = cueHost ? window.getComputedStyle(cueHost) : null;
  const shellStyle = shell ? window.getComputedStyle(shell) : null;
  const headerStyle = header ? window.getComputedStyle(header) : null;
  const pickSolidColor = (...values) =>
    values.find((value) => value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") || "";
  const cardColor = pickSolidColor(
    shellStyle && shellStyle.backgroundColor,
    cueHostStyle && cueHostStyle.backgroundColor,
    hostStyle && hostStyle.backgroundColor
  );
  const headerColor = pickSolidColor(
    headerStyle && headerStyle.backgroundColor,
    cardColor
  );

  return {
    headerColor: headerColor || "rgba(255, 255, 255, 0.16)",
    bodyColor: cardColor || "rgba(255, 255, 255, 0.12)",
    tailColor: cardColor || "rgba(255, 255, 255, 0.12)",
  };
}

function cgptGetCompactCueHost(pre) {
  if (!pre) return null;
  const host =
    typeof cgptGetCompactContentHost === "function" ? cgptGetCompactContentHost(pre) : pre;
  if (!host) return null;
  return host.parentElement || host;
}

function cgptRememberOriginalCueHostStyles(element) {
  if (!element || !element.style) return;
  if (element.dataset.cgptOriginalPosition === undefined) {
    element.dataset.cgptOriginalPosition = element.style.position || "";
  }
}

function cgptRestoreCueHostStyles(element) {
  if (!element || !element.style) return;
  cgptRememberOriginalCueHostStyles(element);
  element.style.position = element.dataset.cgptOriginalPosition || "";
}

function cgptEnsureCollapseCue(pre) {
  const cueHost = cgptGetCompactCueHost(pre);
  if (!cueHost) return null;
  cgptRememberOriginalCueHostStyles(cueHost);
  if (!cueHost.style.position) {
    cueHost.style.position = "relative";
  }
  let cue = cueHost.querySelector(`:scope > ${CGPT_CODE_COLLAPSE_CUE_SELECTOR}`);
  if (cue) {
    return cue;
  }
  cue = document.createElement("div");
  cue.dataset.cgptCodeCollapseCue = "1";
  cue.style.borderRadius = "inherit";
  cueHost.appendChild(cue);
  return cue;
}

function cgptEnsureCollapseTopCue(pre) {
  const cueHost = cgptGetCompactCueHost(pre);
  if (!cueHost) return null;
  cgptRememberOriginalCueHostStyles(cueHost);
  if (!cueHost.style.position) {
    cueHost.style.position = "relative";
  }
  let cue = cueHost.querySelector(`:scope > ${CGPT_CODE_COLLAPSE_TOP_CUE_SELECTOR}`);
  if (cue) {
    return cue;
  }
  cue = document.createElement("div");
  cue.dataset.cgptCodeCollapseTopCue = "1";
  cue.style.borderTopLeftRadius = "inherit";
  cue.style.borderTopRightRadius = "inherit";
  cueHost.appendChild(cue);
  return cue;
}

function cgptSyncCollapseCueStyles(pre) {
  const bottomCue = cgptEnsureCollapseCue(pre);
  const topCue = cgptEnsureCollapseTopCue(pre);
  const { headerColor, bodyColor, tailColor } = cgptGetCompactCueColors(pre);
  if (topCue) {
    topCue.style.background = `linear-gradient(180deg, ${headerColor} 0%, ${bodyColor} 82%, rgba(0, 0, 0, 0) 100%)`;
  }
  if (bottomCue) {
    bottomCue.style.background = `linear-gradient(180deg, ${headerColor} 0%, ${tailColor} 100%)`;
  }
}

function cgptEnsureCollapsibleState(pre) {
  if (!pre) return false;
  if (pre.dataset.cgptCollapsibleApplied !== "1") {
    cgptRememberOriginalPreStyles(pre);
    pre.dataset.cgptCollapsibleApplied = "1";
  }
  return true;
}

function cgptGetViewModeFromDataset(pre) {
  if (!pre) return CGPT_VIEW_MODE.EXPANDED;
  return pre.dataset.cgptViewMode || CGPT_VIEW_MODE.EXPANDED;
}

function cgptNormalizeLineHeight(style) {
  if (!style) {
    return null;
  }
  const rawLineHeight = style.lineHeight;
  if (!rawLineHeight || rawLineHeight === "normal") {
    return null;
  }
  const numericLineHeight = parseFloat(rawLineHeight);
  if (!Number.isFinite(numericLineHeight)) {
    return null;
  }
  if (/px$/i.test(rawLineHeight)) {
    return numericLineHeight;
  }
  const fontSize = parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * numericLineHeight;
  }
  return null;
}

function cgptGetCodeLineHeight(pre) {
  const code =
    typeof cgptGetCodeTextContainer === "function" ? cgptGetCodeTextContainer(pre) || pre : pre;
  const style = window.getComputedStyle ? window.getComputedStyle(code) : null;
  const normalizedLineHeight = cgptNormalizeLineHeight(style);
  if (Number.isFinite(normalizedLineHeight) && normalizedLineHeight > 0) {
    return normalizedLineHeight;
  }
  const fallbackFontSize = style ? parseFloat(style.fontSize) || 14 : 14;
  return fallbackFontSize * 1.4;
}

function cgptSetCollapsedVisualState(element, isCollapsed) {
  if (!element || !element.classList) return;
  element.classList.add(CGPT_CODE_WRAPPER_CLASS);
  element.classList.toggle(CGPT_CODE_COLLAPSED_CLASS, Boolean(isCollapsed));
}

function cgptFindCodeHeaderLabelContainer(pre) {
  if (typeof cgptFindNativeHeaderLabelContainer === "function") {
    return cgptFindNativeHeaderLabelContainer(pre);
  }
  return null;
}

function cgptEnsureCodeHeaderToggle(pre) {
  if (!pre) return null;
  const container = cgptFindCodeHeaderLabelContainer(pre);
  if (!container) return null;

  pre.querySelectorAll(CGPT_CODE_TOGGLE_SELECTOR).forEach((node) => {
    if (node.parentElement !== container) {
      node.remove();
    }
  });

  let toggle = container.querySelector(`:scope > ${CGPT_CODE_TOGGLE_SELECTOR}`);
  if (toggle) {
    return toggle;
  }

  toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.cgptCodeToggle = "1";
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextMode =
      cgptGetPreViewMode(pre) === CGPT_VIEW_MODE.COMPACT
        ? CGPT_VIEW_MODE.EXPANDED
        : CGPT_VIEW_MODE.COMPACT;
    cgptSetPreViewMode(pre, nextMode);
  });
  container.insertBefore(toggle, container.firstChild);
  return toggle;
}

function cgptSyncCodeHeaderToggleState(pre, mode) {
  const toggle = cgptEnsureCodeHeaderToggle(pre);
  if (!toggle) return;
  const isExpanded = mode === CGPT_VIEW_MODE.EXPANDED;
  toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  toggle.setAttribute("aria-label", isExpanded ? "Collapse code block" : "Expand code block");
  toggle.title = isExpanded ? "Collapse code block" : "Expand code block";
}

function cgptUpdateViewButtonStates(pre) {
  const state =
    pre && typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  const buttons = state ? state.viewButtons : null;
  if (!buttons) return;
  const mode = cgptGetViewModeFromDataset(pre);
  const disabledStates = {
    shrinkBtn: mode === CGPT_VIEW_MODE.COMPACT,
    expandBtn: mode === CGPT_VIEW_MODE.EXPANDED,
  };
  Object.keys(buttons).forEach((key) => {
    const btn = buttons[key];
    if (btn) {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, Boolean(disabledStates[key]));
      } else {
        btn.disabled = Boolean(disabledStates[key]);
      }
    }
  });
}

function cgptGetButtonOverlayOffset(pre) {
  if (!pre) return 0;
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  if (state && typeof state.buttonOverlayOffset === "number") {
    return state.buttonOverlayOffset;
  }
  const container = state ? state.buttonContainer : null;
  if (!container || typeof cgptCalculateButtonOverlayOffset !== "function") {
    return 0;
  }
  const offset = cgptCalculateButtonOverlayOffset(container);
  if (state) {
    state.buttonOverlayOffset = offset;
  }
  return offset;
}

function cgptSetPreViewMode(pre, mode) {
  if (!pre || !cgptEnsureCollapsibleState(pre)) return;
  const collapsibleEl = cgptGetCollapsibleElement(pre);
  if (!collapsibleEl) return;
  cgptSyncCollapseCueStyles(pre);
  const viewSettings =
    typeof cgptGetViewSettings === "function" ? cgptGetViewSettings() : FALLBACK_VIEW_SETTINGS;
  pre.dataset.cgptViewMode = mode;
  const host =
    typeof cgptGetCompactContentHost === "function" ? cgptGetCompactContentHost(pre) : pre;
  cgptRememberOriginalCompactHostStyles(host);
  const state =
    typeof cgptGetCodeBlockState === "function" ? cgptGetCodeBlockState(pre) : null;
  const pathInfo = state ? state.pathInfo || null : null;
  if (mode === CGPT_VIEW_MODE.EXPANDED) {
    collapsibleEl.style.maxHeight = pre.dataset.cgptOriginalMaxHeight || "";
    collapsibleEl.style.overflow = pre.dataset.cgptOriginalOverflow || "";
    cgptRestoreCompactHostStyles(host);
    cgptRestoreCueHostStyles(cgptGetCompactCueHost(pre));
    if (typeof cgptSyncCompactHeaderPath === "function") {
      cgptSyncCompactHeaderPath(pre, pathInfo, mode);
    }
    cgptSetCollapsedVisualState(collapsibleEl, false);
  } else {
    const lineCount = viewSettings.compactLineCount;
    const parsedLines = Number.parseInt(lineCount, 10);
    const normalizedLines = Number.isFinite(parsedLines)
      ? Math.max(0, parsedLines)
      : FALLBACK_VIEW_SETTINGS.compactLineCount;
    const lineHeight = cgptGetCodeLineHeight(pre);
    const overlayOffset = cgptGetButtonOverlayOffset(pre);
    if (host && host.style) {
      const compactHeight = cgptCalculateCompactHeight(normalizedLines, lineHeight, overlayOffset);
      host.style.maxHeight = compactHeight > 0 ? `${compactHeight}px` : "0px";
      host.style.overflow = "hidden";
      host.style.backgroundColor = host.dataset.cgptOriginalBackgroundColor || "";
      host.style.boxShadow = host.dataset.cgptOriginalBoxShadow || "";
    }
    collapsibleEl.style.maxHeight = "";
    collapsibleEl.style.overflow = "visible";
    if (typeof cgptSyncCompactHeaderPath === "function") {
      cgptSyncCompactHeaderPath(pre, pathInfo, mode);
    }
    cgptSetCollapsedVisualState(collapsibleEl, true);
  }
  cgptSyncCodeHeaderToggleState(pre, mode);
  cgptUpdateViewButtonStates(pre);
}

function cgptGetPreViewMode(pre) {
  return cgptGetViewModeFromDataset(pre);
}

function cgptGetDecoratedPreElements() {
  return Array.from(document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']"));
}

function cgptApplyViewModeToAll(mode) {
  cgptGetDecoratedPreElements().forEach((pre) => {
    cgptSetPreViewMode(pre, mode);
  });
}

function cgptReapplyViewMode(mode) {
  cgptGetDecoratedPreElements().forEach((pre) => {
    if (cgptGetPreViewMode(pre) === mode) {
      cgptSetPreViewMode(pre, mode);
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCalculateCompactHeight,
  };
}
