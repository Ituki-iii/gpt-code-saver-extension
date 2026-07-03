function createPanelContainer() {
  const panel = document.createElement("div");
  panel.id = "cgpt-code-helper-panel";
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "72px";
  panel.style.zIndex = "9999";
  panel.style.boxSizing = "border-box";
  panel.style.borderRadius = "12px";
  panel.style.padding = "10px";
  panel.style.fontSize = "12px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "6px";
  panel.style.backdropFilter = "blur(8px)";
  panel.style.width = "min(224px, calc(100vw - 32px))";
  panel.style.maxWidth = "224px";
  panel.style.maxHeight = "calc(100vh - 112px)";
  panel.style.overflowX = "hidden";
  panel.style.overflowY = "auto";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(panel, "panel");
  }
  return panel;
}

function createPanelTitle() {
  const title = document.createElement("div");
  title.textContent = getHelperPanelTitle();
  title.style.fontWeight = "bold";
  title.style.fontSize = "13px";
  title.style.lineHeight = "1.35";
  title.style.overflowWrap = "anywhere";
  return title;
}

function getHelperPanelTitle() {
  const manifest =
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.getManifest === "function"
      ? chrome.runtime.getManifest()
      : null;
  const extensionName =
    manifest && manifest.name ? manifest.name : "ChatGPT Code Saver";
  const version = manifest && manifest.version ? manifest.version : "";
  if (!version) {
    return extensionName;
  }
  return `${extensionName} ${version}`;
}

function createSectionLabel(text) {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.fontSize = "10px";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "0";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(label, "secondary");
  } else {
    label.style.color = "rgba(255,255,255,0.8)";
  }
  return label;
}

function createPanelSection(titleText, options = {}) {
  const { description = "" } = options;
  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "6px";
  section.style.paddingTop = "8px";
  section.style.borderTop = "1px solid rgba(203, 213, 225, 0.7)";

  const label = createSectionLabel(titleText);
  section.appendChild(label);

  if (description) {
    const descriptionEl = document.createElement("div");
    descriptionEl.textContent = description;
    descriptionEl.style.fontSize = "10px";
    descriptionEl.style.lineHeight = "1.35";
    if (typeof cgptApplyPanelTextTone === "function") {
      cgptApplyPanelTextTone(descriptionEl, "muted");
    } else {
      descriptionEl.style.color = "rgba(255,255,255,0.65)";
    }
    section.appendChild(descriptionEl);
  }

  return section;
}

function createPanelButton(text, variant = "secondary", size = "sm") {
  const button =
    typeof cgptCreateSharedPanelButton === "function"
      ? cgptCreateSharedPanelButton(text, variant, size)
      : typeof cgptCreateSharedButton === "function"
        ? cgptCreateSharedButton(text, variant, size)
      : document.createElement("button");
  if (!button.textContent) {
    button.textContent = text;
  }
  if (
    typeof cgptCreateSharedPanelButton !== "function" &&
    typeof cgptCreateSharedButton !== "function"
  ) {
    button.style.fontSize = "11px";
    button.style.padding = "0 8px";
    button.style.minHeight = "28px";
    button.style.borderRadius = "6px";
    button.style.cursor = "pointer";
    applyPanelButtonVariant(button, variant);
  }
  if (typeof cgptDisableSharedButtonMotion === "function") {
    cgptDisableSharedButtonMotion(button);
  }
  button.style.transition = "none";
  button.style.animation = "none";
  button.style.transform = "none";
  button.style.flexShrink = "0";
  return button;
}

function applyPanelButtonVariant(button, variant) {
  if (typeof cgptApplySharedButtonVariant === "function") {
    cgptApplySharedButtonVariant(button, variant);
    return;
  }
  const palette = {
    primary: "rgba(37, 99, 235, 1)",
    accent: "rgba(37, 99, 235, 1)",
    success: "rgba(16, 185, 129, 1)",
    secondary: "rgba(71, 85, 105, 1)",
    muted: "rgba(71, 85, 105, 1)",
  };
  const color = palette[variant] || palette.secondary;
  button.style.background = color;
  button.style.border = "1px solid rgba(255,255,255,0.2)";
  button.style.color = "#fff";
}

function createButtonRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.width = "100%";
  row.style.minWidth = "0";
  row.style.flexWrap = "wrap";
  return row;
}

function createLineCountControls({ initialValue, onCommit, min = 1, max = 200 }) {
  const MIN_LINES = min;
  const MAX_LINES = max;

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "0";
  controls.style.width = "100%";
  controls.style.minWidth = "0";
  controls.style.minHeight = "28px";
  controls.style.borderRadius = "999px";
  controls.style.overflow = "hidden";
  controls.style.boxSizing = "border-box";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(controls, "subtle");
  } else {
    controls.style.border = "1px solid rgba(148, 163, 184, 0.16)";
    controls.style.background = "rgba(148, 163, 184, 0.08)";
  }

  const input = document.createElement("input");
  input.type = "number";
  input.min = `${MIN_LINES}`;
  input.max = `${MAX_LINES}`;
  input.value = `${initialValue}`;
  input.style.width = "0";
  input.style.minWidth = "0";
  input.style.flex = "1";
  input.style.borderRadius = "0";
  input.style.padding = "0 4px";
  input.style.minHeight = "28px";
  input.style.textAlign = "center";
  if (typeof cgptApplyPanelInputStyle === "function") {
    cgptApplyPanelInputStyle(input);
  } else {
    input.style.border = "1px solid rgba(255,255,255,0.2)";
    input.style.background = "#1f2937";
    input.style.color = "#fff";
  }
  input.style.borderTop = "none";
  input.style.borderBottom = "none";

  const createAdjustButton = (label) => {
    const button = createPanelButton(label, "secondary", "sm");
    button.style.width = "28px";
    button.style.minWidth = "28px";
    button.style.padding = "0";
    button.style.borderRadius = "0";
    button.style.borderTop = "none";
    button.style.borderBottom = "none";
    return button;
  };

  const clampValue = (value) => {
    return Math.max(MIN_LINES, Math.min(MAX_LINES, value));
  };

  const commitValue = () => {
    const parsedValue = Number.parseInt(input.value, 10);
    const parsed = clampValue(Number.isFinite(parsedValue) ? parsedValue : MIN_LINES);
    input.value = `${parsed}`;
    onCommit(parsed);
  };

  const adjustValue = (delta) => {
    const currentValue = Number.parseInt(input.value, 10);
    const current = clampValue(Number.isFinite(currentValue) ? currentValue : MIN_LINES);
    const nextValue = clampValue(current + delta);
    if (nextValue === current) return;
    input.value = `${nextValue}`;
    onCommit(nextValue);
  };

  const decrementButton = createAdjustButton("-");
  decrementButton.style.borderLeft = "none";
  decrementButton.addEventListener("click", () => adjustValue(-1));
  controls.appendChild(decrementButton);

  input.addEventListener("change", commitValue);
  input.addEventListener("blur", commitValue);
  controls.appendChild(input);

  const incrementButton = createAdjustButton("+");
  incrementButton.style.borderRight = "none";
  incrementButton.addEventListener("click", () => adjustValue(1));
  controls.appendChild(incrementButton);

  return controls;
}
