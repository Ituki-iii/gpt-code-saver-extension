const CGPT_FOLD_LEVEL_COLORS = [
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#f59e0b",
  "#38bdf8",
  "#c084fc",
];
const CGPT_FOLD_INDENT_STEP_PX = 6;
const CGPT_FOLD_GUIDE_STEP_PX = 12;
const CGPT_FOLD_LINE_LEFT_BASE_PX = 8;
const CGPT_FOLD_CONTENT_LEFT_BASE_PX = 18;
const CGPT_FOLD_LINE_WIDTH_PX = 1;
let chatLogFoldStyleInjected = false;

function cgptGetFoldLevelColor(level) {
  const paletteIndex = Math.min(
    Math.max(Number.parseInt(level, 10) || 0, 0),
    CGPT_FOLD_LEVEL_COLORS.length - 1
  );
  const color = CGPT_FOLD_LEVEL_COLORS[paletteIndex];
  return color || CGPT_FOLD_LEVEL_COLORS[0];
}

function cgptApplyFoldActionTitle(button, actionKey) {
  if (!button || !actionKey) return;
  const titles = {
    save: "Save to the project folder",
    saveAs: "Choose where to save this text",
    copy: "Copy this text",
    compact: "Collapse this section",
    expand: "Expand this section",
  };
  if (titles[actionKey]) {
    button.title = titles[actionKey];
  }
}

function cgptCreateFoldActionButton(label, variant = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cgpt-helper-fold-action-button";
  button.textContent = label;
  if (typeof cgptApplySharedButtonStyle === "function") {
    cgptApplySharedButtonStyle(button, { variant: "chip", size: "md", shape: "pill" });
  } else {
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.minHeight = "30px";
    button.style.padding = "0 12px";
    button.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    button.style.fontWeight = "600";
    button.style.fontSize = "12px";
    button.style.lineHeight = "1";
    button.style.borderRadius = "999px";
    button.style.border = "1px solid rgba(148, 163, 184, 0.52)";
    button.style.background = "rgba(241, 245, 249, 0.92)";
    button.style.color = "#334155";
  }
  button.style.boxShadow = "none";
  button.style.minWidth = "0";
  return button;
}

function cgptCreateFoldActionButtons(actionConfig = {}) {
  const buttons = [];
  const {
    onSave,
    onSaveAs,
    onCopy,
    showSave = true,
    showSaveAs = true,
    showCopy = true,
  } = actionConfig || {};

  const addButton = (label, variant, actionKey, handler, shouldShow = true) => {
    if (!shouldShow) return;
    const button = cgptCreateFoldActionButton(label, variant);
    if (actionKey) {
      button.dataset.cgptHelperFoldAction = actionKey;
      cgptApplyFoldActionTitle(button, actionKey);
    }
    if (typeof handler === "function") {
      button.addEventListener("click", handler);
    } else if (actionKey !== "compact" && actionKey !== "expand") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(button, true);
      } else {
        button.disabled = true;
      }
      button.classList.add("cgpt-helper-fold-action-disabled");
    }
    buttons.push(button);
  };

  addButton("Save", "primary", "save", onSave, showSave);
  addButton("Save As", "secondary", "saveAs", onSaveAs, showSaveAs);
  addButton("Copy", "ghost", "copy", onCopy, showCopy);
  addButton("Compact", "secondary", "compact", null, true);
  addButton("Expand", "secondary", "expand", null, true);

  return buttons;
}

function cgptCreateFoldShell({
  title = "",
  level = 0,
  visualLevel = level,
  badgeText = "",
  badgeVariant = "chip",
  actionButtons = [],
}) {
  const fold = document.createElement("div");
  fold.className = "cgpt-helper-fold";
  const parsedLevel = Number.parseInt(level, 10);
  const numericLevel = Number.isFinite(parsedLevel) ? Math.max(0, parsedLevel) : 0;
  const clampedLevel = Math.min(numericLevel, 6);
  const parsedVisualLevel = Number.parseInt(visualLevel, 10);
  const numericVisualLevel = Number.isFinite(parsedVisualLevel) ? Math.max(0, parsedVisualLevel) : 0;
  const clampedVisualLevel = Math.min(numericVisualLevel, 6);
  fold.style.setProperty("--cgpt-helper-fold-level", `${clampedVisualLevel}`);
  fold.style.setProperty(
    "--cgpt-helper-fold-indent",
    `${clampedVisualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
  );
  fold.style.setProperty("--cgpt-helper-fold-line-offset", "0px");
  fold.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(clampedLevel));
  fold.dataset.cgptHelperFoldLevel = `${clampedLevel}`;
  if (numericVisualLevel > 0) {
    fold.classList.add("cgpt-helper-fold-nested");
  }

  const header = document.createElement("div");
  header.className = "cgpt-helper-fold-header";

  const titleWrapper = document.createElement("div");
  titleWrapper.className = "cgpt-helper-fold-title";
  if (badgeText) {
    const badge = document.createElement("span");
    badge.className = "cgpt-helper-fold-title-badge";
    badge.textContent = badgeText;
    if (typeof cgptApplySharedChipStyle === "function") {
      cgptApplySharedChipStyle(badge, { variant: badgeVariant, size: "md" });
    }
    titleWrapper.appendChild(badge);
  }
  if (title) {
    const titleText = document.createElement("span");
    titleText.className = "cgpt-helper-fold-title-text";
    titleText.textContent = title;
    titleWrapper.appendChild(titleText);
  }
  header.appendChild(titleWrapper);

  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "cgpt-helper-fold-actions";
  (Array.isArray(actionButtons) ? actionButtons : []).forEach((btn) => {
    if (btn) {
      actionsWrapper.appendChild(btn);
    }
  });
  header.appendChild(actionsWrapper);
  fold.appendChild(header);

  const body = document.createElement("div");
  body.className = "cgpt-helper-fold-body";
  fold.appendChild(body);

  return { container: fold, header, titleWrapper, actionsWrapper, body };
}

function cgptApplyFoldState(foldElement, isOpen) {
  if (!foldElement) return;
  const open = isOpen !== false;
  foldElement.dataset.cgptHelperFoldOpen = open ? "1" : "0";
  foldElement.classList.toggle("cgpt-helper-fold-collapsed", !open);
  foldElement.querySelectorAll(".cgpt-helper-fold-action-button").forEach((btn) => {
    if (!btn.dataset.cgptHelperFoldAction) return;
    const action = btn.dataset.cgptHelperFoldAction;
    if (action === "compact") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, !open);
      } else {
        btn.disabled = !open;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", !open);
    }
    if (action === "expand") {
      if (typeof cgptSetSharedButtonDisabled === "function") {
        cgptSetSharedButtonDisabled(btn, open);
      } else {
        btn.disabled = open;
      }
      btn.classList.toggle("cgpt-helper-fold-action-disabled", open);
    }
  });
}

function cgptCreateFoldSection({
  title,
  initiallyOpen = true,
  level = 0,
  visualLevel = level,
  badgeText = "",
  badgeVariant = "chip",
  actions = {},
}) {
  const buttons = cgptCreateFoldActionButtons(actions);
  const shell = cgptCreateFoldShell({
    title,
    level,
    visualLevel,
    badgeText,
    badgeVariant,
    actionButtons: buttons,
  });
  const fold = shell.container;
  const body = shell.body;
  const titleWrapper = shell.titleWrapper;

  let isOpen = initiallyOpen !== false;
  const updateState = () => {
    cgptApplyFoldState(fold, isOpen);
  };

  buttons.forEach((btn) => {
    if (!btn.dataset.cgptHelperFoldAction) return;
    const action = btn.dataset.cgptHelperFoldAction;
    if (action === "compact") {
      btn.addEventListener("click", () => {
        isOpen = false;
        updateState();
      });
    }
    if (action === "expand") {
      btn.addEventListener("click", () => {
        isOpen = true;
        updateState();
      });
    }
  });

  updateState();

  return { container: fold, body, titleWrapper };
}

function ensureChatLogFoldStyle() {
  if (chatLogFoldStyleInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    .cgpt-helper-fold {
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 10px 10px 10px 14px;
      margin-top: 10px;
      background: transparent;
      color: inherit;
      width: 100%;
    }
    .cgpt-helper-fold-nested {
      padding-left: calc(${CGPT_FOLD_CONTENT_LEFT_BASE_PX}px + var(--cgpt-helper-fold-indent, 0px));
    }
    .cgpt-helper-fold-nested::before {
      content: "";
      position: absolute;
      top: 8px;
      bottom: 8px;
      left: calc(${CGPT_FOLD_LINE_LEFT_BASE_PX}px + var(--cgpt-helper-fold-line-offset, 0px));
      width: ${CGPT_FOLD_LINE_WIDTH_PX}px;
      background: var(--cgpt-helper-fold-color, rgba(124, 58, 237, 0.65));
      border-radius: 999px;
      pointer-events: none;
    }
    .cgpt-helper-fold-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      width: 100%;
    }
    .cgpt-helper-fold-title {
      display: flex;
      align-items: center;
      flex: 1 1 auto;
      min-width: 0;
      flex-wrap: wrap;
      gap: 8px;
      row-gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: inherit;
    }
    .cgpt-helper-fold-title-text {
      display: inline-flex;
      align-items: center;
      color: inherit;
    }
    .cgpt-helper-fold-title-badge {
      box-sizing: border-box;
      white-space: nowrap;
    }
    .cgpt-helper-fold-actions {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }
    .cgpt-helper-fold-action-button {
      cursor: pointer;
      gap: 4px;
      min-width: 0;
      transition: transform 0.1s ease, opacity 0.2s ease;
    }
    .cgpt-helper-fold-action-button:hover:not(.cgpt-helper-fold-action-disabled) {
      transform: translateY(-1px);
    }
    .cgpt-helper-fold-action-disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .cgpt-helper-fold-body {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: inherit;
    }
    .cgpt-helper-fold-collapsed .cgpt-helper-fold-body {
      display: none;
    }
    .cgpt-helper-heading-title {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: calc(20px + ${CGPT_FOLD_GUIDE_STEP_PX}px);
      color: inherit;
    }
    .cgpt-helper-heading-section {
      position: relative;
      margin: 2px 0;
    }
    .cgpt-helper-heading-fold {
      margin: 0;
    }
    .cgpt-helper-heading-body {
      padding-left: 0;
    }
    .cgpt-helper-heading-body > * {
      margin-top: 0;
    }
    .cgpt-helper-heading-body > * + * {
      margin-top: 8px;
    }
    .cgpt-helper-heading-body > .cgpt-helper-heading-section {
      margin-left: ${CGPT_FOLD_GUIDE_STEP_PX}px;
    }
    .cgpt-helper-heading-body > :not(.cgpt-helper-heading-section) {
      margin-left: ${CGPT_FOLD_GUIDE_STEP_PX}px;
      padding-left: 20px;
    }
    .cgpt-helper-heading-guide {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: ${CGPT_FOLD_LINE_WIDTH_PX}px;
      background: var(--cgpt-helper-fold-color, rgba(124, 58, 237, 0.65));
      border-radius: 999px;
      pointer-events: none;
    }
    .cgpt-helper-heading-toggle {
      position: relative;
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .cgpt-helper-heading-toggle::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 7px;
      height: 7px;
      border-right: 2px solid var(--cgpt-helper-fold-color, currentColor);
      border-bottom: 2px solid var(--cgpt-helper-fold-color, currentColor);
      transform: translate(-50%, -60%) rotate(45deg);
      transition: transform 0.15s ease;
    }
    .cgpt-helper-heading-collapsed .cgpt-helper-heading-toggle::before {
      transform: translate(-40%, -50%) rotate(-45deg);
    }
    .cgpt-helper-heading-section-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  chatLogFoldStyleInjected = true;
}
