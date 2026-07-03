const CGPT_BUTTON_BASE_TOKENS = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontWeight: "600",
  borderRadius: "6px",
  gap: "6px",
  lineHeight: "1.2",
  focusInset: "0 0 0 2px rgba(17, 24, 39, 0.96)",
};

const CGPT_BUTTON_SHAPE_TOKENS = {
  rounded: CGPT_BUTTON_BASE_TOKENS.borderRadius,
  pill: "999px",
};

const CGPT_UI_THEME = {
  overlayBackground: "rgba(15, 23, 42, 0.18)",
  panelBackground: "rgba(255, 255, 255, 0.98)",
  panelBorder: "rgba(203, 213, 225, 0.96)",
  panelShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
  dialogBackground: "#ffffff",
  dialogBorder: "rgba(226, 232, 240, 0.96)",
  cardBackground: "#f8fafc",
  cardBorder: "rgba(226, 232, 240, 0.96)",
  subtleBackground: "#f5f7fb",
  subtleBorder: "rgba(203, 213, 225, 0.92)",
  codeBackground: "#f3f4f6",
  inputBackground: "#ffffff",
  inputBorder: "rgba(203, 213, 225, 0.96)",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textStrong: "#020617",
  chipBackground: "rgba(241, 245, 249, 0.92)",
  chipBorder: "rgba(148, 163, 184, 0.52)",
  chipText: "#334155",
  accentText: "#2563eb",
  successText: "#15803d",
  dangerText: "#dc2626",
  warningText: "#a16207",
  panelTextPrimary: "#0f172a",
  panelTextSecondary: "#334155",
  panelTextMuted: "#64748b",
  panelInputBackground: "#f8fafc",
  panelInputBorder: "#cbd5e1",
};

const CGPT_BUTTON_SIZE_TOKENS = {
  sm: { minHeight: "28px", fontSize: "11px", padding: "0 8px" },
  md: { minHeight: "32px", fontSize: "12px", padding: "0 10px" },
  lg: { minHeight: "36px", fontSize: "12px", padding: "0 12px" },
};

const CGPT_CHIP_BASE_TOKENS = {
  fontFamily: CGPT_BUTTON_BASE_TOKENS.fontFamily,
  fontWeight: CGPT_BUTTON_BASE_TOKENS.fontWeight,
  lineHeight: "1",
  borderRadius: CGPT_BUTTON_SHAPE_TOKENS.pill,
};

const CGPT_CHIP_SIZE_TOKENS = {
  sm: { minHeight: "28px", fontSize: "11px", padding: "0 8px" },
  md: { minHeight: "30px", fontSize: "12px", padding: "0 12px" },
  lg: { minHeight: "34px", fontSize: "12px", padding: "0 14px" },
};

const CGPT_SURFACE_LAYOUT_TOKENS = {
  dialog: {
    borderRadius: "16px",
    padding: "18px",
    gap: "12px",
    width: "80%",
    maxWidth: "900px",
    maxHeight: "80%",
  },
  dialogCompact: {
    borderRadius: "16px",
    padding: "18px",
    gap: "12px",
    width: "80%",
    maxWidth: "800px",
    maxHeight: "80%",
  },
  card: {
    borderRadius: "14px",
    padding: "12px",
    gap: "8px",
  },
  sectionCard: {
    borderRadius: "12px",
    padding: "8px",
    gap: "6px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "600",
  },
  body: {
    fontSize: "13px",
    lineHeight: "1.5",
  },
  meta: {
    fontSize: "11px",
    lineHeight: "1.4",
  },
};

const CGPT_BUTTON_PALETTE = {
  primary: {
    background: "#dbeafe",
    hoverBackground: "#bfdbfe",
    activeBackground: "#93c5fd",
    color: "#1e3a8a",
    border: "#93c5fd",
    hoverBorder: "#60a5fa",
    activeBorder: "#3b82f6",
    focusRing: "rgba(147, 197, 253, 0.32)",
  },
  secondary: {
    background: "#ffffff",
    hoverBackground: "#f8fafc",
    activeBackground: "#f1f5f9",
    color: "#334155",
    border: "#cbd5e1",
    hoverBorder: "#94a3b8",
    activeBorder: "#94a3b8",
    focusRing: "rgba(191, 208, 234, 0.28)",
  },
  success: {
    background: "rgba(22, 101, 52, 0.22)",
    hoverBackground: "rgba(22, 101, 52, 0.28)",
    activeBackground: "rgba(22, 101, 52, 0.34)",
    color: CGPT_UI_THEME.successText,
    border: "rgba(34, 197, 94, 0.3)",
    hoverBorder: "rgba(34, 197, 94, 0.4)",
    activeBorder: "rgba(34, 197, 94, 0.5)",
    focusRing: "rgba(134, 239, 172, 0.28)",
  },
  danger: {
    background: "rgba(127, 29, 29, 0.24)",
    hoverBackground: "rgba(127, 29, 29, 0.3)",
    activeBackground: "rgba(127, 29, 29, 0.36)",
    color: CGPT_UI_THEME.dangerText,
    border: "rgba(244, 63, 94, 0.28)",
    hoverBorder: "rgba(244, 63, 94, 0.4)",
    activeBorder: "rgba(244, 63, 94, 0.48)",
    focusRing: "rgba(253, 164, 175, 0.3)",
  },
  ghost: {
    background: "transparent",
    hoverBackground: "#f8fafc",
    activeBackground: "#f1f5f9",
    color: "#475569",
    border: "#dbe3ef",
    hoverBorder: "#cbd5e1",
    activeBorder: "#94a3b8",
    focusRing: "rgba(147, 197, 253, 0.26)",
  },
  chip: {
    background: CGPT_UI_THEME.chipBackground,
    hoverBackground: "#e2e8f0",
    activeBackground: "#cbd5e1",
    color: CGPT_UI_THEME.chipText,
    border: CGPT_UI_THEME.chipBorder,
    hoverBorder: "#94a3b8",
    activeBorder: "#64748b",
    focusRing: "rgba(147, 197, 253, 0.24)",
  },
  userChip: {
    background: "rgba(37, 99, 235, 0.16)",
    hoverBackground: "rgba(37, 99, 235, 0.22)",
    activeBackground: "rgba(37, 99, 235, 0.28)",
    color: "#1e3a8a",
    border: "rgba(59, 130, 246, 0.3)",
    hoverBorder: "rgba(59, 130, 246, 0.4)",
    activeBorder: "rgba(37, 99, 235, 0.48)",
    focusRing: "rgba(96, 165, 250, 0.24)",
  },
  assistantChip: {
    background: "rgba(234, 88, 12, 0.16)",
    hoverBackground: "rgba(234, 88, 12, 0.22)",
    activeBackground: "rgba(234, 88, 12, 0.28)",
    color: "#9a3412",
    border: "rgba(249, 115, 22, 0.3)",
    hoverBorder: "rgba(249, 115, 22, 0.42)",
    activeBorder: "rgba(234, 88, 12, 0.5)",
    focusRing: "rgba(251, 146, 60, 0.24)",
  },
  disabled: {
    background: "#e2e8f0",
    hoverBackground: "#e2e8f0",
    activeBackground: "#e2e8f0",
    color: "#94a3b8",
    border: "#cbd5e1",
    hoverBorder: "#cbd5e1",
    activeBorder: "#cbd5e1",
    focusRing: "rgba(75, 85, 99, 0.28)",
  },
};

const CGPT_BUTTON_VARIANT_ALIASES = {
  accent: "primary",
  muted: "secondary",
  neutral: "secondary",
  warning: "danger",
  subtleChip: "chip",
  user: "userChip",
  assistant: "assistantChip",
};

function cgptNormalizeButtonVariant(variant = "secondary") {
  const alias = CGPT_BUTTON_VARIANT_ALIASES[variant];
  const normalized = alias || variant;
  return CGPT_BUTTON_PALETTE[normalized] ? normalized : "secondary";
}

function cgptGetButtonPaletteEntry(variant) {
  return CGPT_BUTTON_PALETTE[cgptNormalizeButtonVariant(variant)] || CGPT_BUTTON_PALETTE.secondary;
}

function cgptGetButtonSizeEntry(size = "sm") {
  return CGPT_BUTTON_SIZE_TOKENS[size] || CGPT_BUTTON_SIZE_TOKENS.sm;
}

function cgptGetChipSizeEntry(size = "md") {
  return CGPT_CHIP_SIZE_TOKENS[size] || CGPT_CHIP_SIZE_TOKENS.md;
}

function cgptGetButtonShapeEntry(shape = "rounded") {
  return CGPT_BUTTON_SHAPE_TOKENS[shape] || CGPT_BUTTON_SHAPE_TOKENS.rounded;
}

function cgptEnsureSharedButtonObservers(button) {
  if (!button || button.__cgptSharedButtonBound) return;
  const render = () => cgptRenderSharedButton(button);
  button.addEventListener("mouseenter", () => {
    if (button.disabled) return;
    button.dataset.cgptButtonHovered = "1";
    render();
  });
  button.addEventListener("mouseleave", () => {
    button.dataset.cgptButtonHovered = "0";
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("mousedown", (event) => {
    if (button.disabled || event.button !== 0) return;
    button.dataset.cgptButtonPressed = "1";
    render();
  });
  button.addEventListener("mouseup", () => {
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("focus", () => {
    button.dataset.cgptButtonFocused = "1";
    render();
  });
  button.addEventListener("blur", () => {
    button.dataset.cgptButtonFocused = "0";
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  button.addEventListener("keydown", (event) => {
    if (button.disabled) return;
    if (event.key === " " || event.key === "Enter") {
      button.dataset.cgptButtonPressed = "1";
      render();
    }
  });
  button.addEventListener("keyup", () => {
    button.dataset.cgptButtonPressed = "0";
    render();
  });
  if (typeof MutationObserver === "function") {
    const observer = new MutationObserver(() => render());
    observer.observe(button, { attributes: true, attributeFilter: ["disabled"] });
    button.__cgptSharedButtonObserver = observer;
  }
  button.__cgptSharedButtonBound = true;
}

function cgptResolveSharedButtonPalette(button) {
  if (!button) return CGPT_BUTTON_PALETTE.secondary;
  if (button.__cgptSharedButtonCustomPalette) {
    return button.__cgptSharedButtonCustomPalette;
  }
  if (button.disabled) {
    return CGPT_BUTTON_PALETTE.disabled;
  }
  return cgptGetButtonPaletteEntry(button.dataset.cgptButtonVariant);
}

function cgptGetSharedButtonVisualState(button, palette) {
  if (!button || button.disabled) {
    return {
      background: palette.background,
      border: palette.border,
      color: palette.color,
      boxShadow: "none",
      transform: "translateY(0)",
      opacity: "1",
    };
  }
  const isPressed = button.dataset.cgptButtonPressed === "1";
  const isHovered = button.dataset.cgptButtonHovered === "1";
  const isFocused = button.dataset.cgptButtonFocused === "1";
  const background = isPressed
    ? palette.activeBackground || palette.hoverBackground || palette.background
    : isHovered
      ? palette.hoverBackground || palette.background
      : palette.background;
  const border = isPressed
    ? palette.activeBorder || palette.hoverBorder || palette.border
    : isHovered
      ? palette.hoverBorder || palette.border
      : palette.border;
  const color = isPressed
    ? palette.activeColor || palette.hoverColor || palette.color
    : isHovered
      ? palette.hoverColor || palette.color
      : palette.color;
  const boxShadow = isFocused
    ? `${CGPT_BUTTON_BASE_TOKENS.focusInset}, 0 0 0 4px ${palette.focusRing || "#93c5fd"}`
    : "none";
  const disableMotion = button.dataset.cgptButtonDisableMotion === "1";
  return {
    background,
    border,
    color,
    boxShadow,
    transform: disableMotion ? "none" : "translateY(0)",
    opacity: "1",
  };
}

function cgptRenderSharedButton(button) {
  if (!button || !button.style) return;
  const size = cgptGetButtonSizeEntry(button.dataset.cgptButtonSize);
  const palette = cgptResolveSharedButtonPalette(button);
  const borderRadius = cgptGetButtonShapeEntry(button.dataset.cgptButtonShape);
  const visualState = button.disabled
    ? {
      background: palette.background,
      border: palette.border,
      color: palette.color,
      boxShadow: "none",
      transform: "translateY(0)",
      opacity: "0.64",
    }
    : cgptGetSharedButtonVisualState(button, palette);

  button.style.fontFamily = CGPT_BUTTON_BASE_TOKENS.fontFamily;
  button.style.fontWeight = CGPT_BUTTON_BASE_TOKENS.fontWeight;
  button.style.fontSize = size.fontSize;
  button.style.lineHeight = CGPT_BUTTON_BASE_TOKENS.lineHeight;
  button.style.minHeight = size.minHeight;
  button.style.padding = size.padding;
  button.style.borderRadius = borderRadius;
  button.style.border = `1px solid ${visualState.border}`;
  button.style.background = visualState.background;
  button.style.color = visualState.color;
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.gap = CGPT_BUTTON_BASE_TOKENS.gap;
  button.style.boxSizing = "border-box";
  button.style.whiteSpace = "nowrap";
  const disableMotion = button.dataset.cgptButtonDisableMotion === "1";
  button.style.transition = disableMotion
    ? "none"
    : [
      "background-color 0.15s ease",
      "border-color 0.15s ease",
      "color 0.15s ease",
      "box-shadow 0.15s ease",
      "opacity 0.15s ease",
    ].join(", ");
  button.style.animation = disableMotion ? "none" : "";
  button.style.cursor = button.disabled ? "not-allowed" : "pointer";
  button.style.opacity = visualState.opacity;
  button.style.boxShadow = visualState.boxShadow;
  button.style.transform = disableMotion ? "none" : visualState.transform;
  button.style.outline = "none";
  button.style.textShadow = button.disabled ? "none" : "0 1px 1px rgba(15, 23, 42, 0.28)";
}

function cgptApplySharedButtonStyle(button, options = {}) {
  if (!button || !button.style) return button;
  const { variant = "secondary", size = "sm", shape = "rounded" } = options;
  if (!button.type) {
    button.type = "button";
  }
  button.dataset.cgptButtonVariant = cgptNormalizeButtonVariant(variant);
  button.dataset.cgptButtonSize = CGPT_BUTTON_SIZE_TOKENS[size] ? size : "sm";
  button.dataset.cgptButtonShape = CGPT_BUTTON_SHAPE_TOKENS[shape] ? shape : "rounded";
  cgptEnsureSharedButtonObservers(button);
  cgptRenderSharedButton(button);
  return button;
}

function cgptCreateSharedButton(label, variant = "secondary", size = "sm", shape = "rounded") {
  const button = document.createElement("button");
  button.textContent = label;
  return cgptApplySharedButtonStyle(button, { variant, size, shape });
}

function cgptCreateSharedChipButton(label, size = "md") {
  return cgptCreateSharedButton(label, "chip", size, "pill");
}

function cgptCreateSharedPanelButton(label, variant = "secondary", size = "sm") {
  return cgptCreateSharedButton(label, variant, size, "pill");
}

function cgptApplySharedButtonVariant(button, variant = "secondary") {
  if (!button || !button.style) return;
  cgptApplySharedButtonStyle(button, {
    variant,
    size: button.dataset.cgptButtonSize || "sm",
    shape: button.dataset.cgptButtonShape || "rounded",
  });
}

function cgptApplySharedButtonSize(button, size = "sm") {
  if (!button || !button.style) return;
  cgptApplySharedButtonStyle(button, {
    variant: button.dataset.cgptButtonVariant || "secondary",
    size,
    shape: button.dataset.cgptButtonShape || "rounded",
  });
}

function cgptApplySharedButtonShape(button, shape = "rounded") {
  if (!button || !button.style) return;
  cgptApplySharedButtonStyle(button, {
    variant: button.dataset.cgptButtonVariant || "secondary",
    size: button.dataset.cgptButtonSize || "sm",
    shape,
  });
}

function cgptSetSharedButtonDisabled(button, disabled) {
  if (!button) return;
  button.disabled = Boolean(disabled);
  cgptRenderSharedButton(button);
}

function cgptSetSharedButtonCustomPalette(button, palette) {
  if (!button) return;
  button.__cgptSharedButtonCustomPalette = palette || null;
  cgptRenderSharedButton(button);
}

function cgptDisableSharedButtonMotion(button) {
  if (!button) return;
  button.dataset.cgptButtonDisableMotion = "1";
  cgptRenderSharedButton(button);
}

function cgptGetUiTheme() {
  return { ...CGPT_UI_THEME };
}

function cgptApplySurfaceStyle(element, variant = "panel") {
  if (!element || !element.style) return element;
  const theme = CGPT_UI_THEME;
  if (variant === "dialog") {
    element.style.background = theme.dialogBackground;
    element.style.border = `1px solid ${theme.dialogBorder}`;
    element.style.boxShadow = theme.panelShadow;
    element.style.color = theme.textPrimary;
    return element;
  }
  if (variant === "card") {
    element.style.background = theme.cardBackground;
    element.style.border = `1px solid ${theme.cardBorder}`;
    element.style.color = theme.textPrimary;
    return element;
  }
  if (variant === "subtle") {
    element.style.background = theme.subtleBackground;
    element.style.border = `1px solid ${theme.subtleBorder}`;
    element.style.color = theme.textSecondary;
    return element;
  }
  if (variant === "code") {
    element.style.background = theme.codeBackground;
    element.style.border = `1px solid ${theme.subtleBorder}`;
    element.style.color = theme.textPrimary;
    return element;
  }
  element.style.background = theme.panelBackground;
  element.style.border = `1px solid ${theme.panelBorder}`;
  element.style.boxShadow = theme.panelShadow;
  element.style.color = theme.panelTextPrimary;
  return element;
}

function cgptApplyTextTone(element, tone = "primary") {
  if (!element || !element.style) return element;
  const theme = CGPT_UI_THEME;
  const colorMap = {
    primary: theme.textPrimary,
    strong: theme.textStrong,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    accent: theme.accentText,
    success: theme.successText,
    danger: theme.dangerText,
    warning: theme.warningText,
    chip: theme.chipText,
  };
  element.style.color = colorMap[tone] || colorMap.primary;
  return element;
}

function cgptApplyInputStyle(element) {
  if (!element || !element.style) return element;
  const theme = CGPT_UI_THEME;
  element.style.background = theme.inputBackground;
  element.style.border = `1px solid ${theme.inputBorder}`;
  element.style.color = theme.textPrimary;
  return element;
}

function cgptApplySharedChipStyle(element, options = {}) {
  if (!element || !element.style) return element;
  const { variant = "chip", size = "md" } = options;
  const chipSize = cgptGetChipSizeEntry(size);
  const palette = cgptGetButtonPaletteEntry(variant);

  element.style.display = "inline-flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.minHeight = chipSize.minHeight;
  element.style.padding = chipSize.padding;
  element.style.fontFamily = CGPT_CHIP_BASE_TOKENS.fontFamily;
  element.style.fontWeight = CGPT_CHIP_BASE_TOKENS.fontWeight;
  element.style.fontSize = chipSize.fontSize;
  element.style.lineHeight = CGPT_CHIP_BASE_TOKENS.lineHeight;
  element.style.borderRadius = CGPT_CHIP_BASE_TOKENS.borderRadius;
  element.style.border = `1px solid ${palette.border}`;
  element.style.background = palette.background;
  element.style.color = palette.color;
  element.style.boxSizing = "border-box";
  element.style.whiteSpace = "nowrap";
  return element;
}

function cgptApplyPanelTextTone(element, tone = "primary") {
  if (!element || !element.style) return element;
  const theme = CGPT_UI_THEME;
  const colorMap = {
    primary: theme.panelTextPrimary,
    secondary: theme.panelTextSecondary,
    muted: theme.panelTextMuted,
    accent: "#1d4ed8",
    success: "#166534",
    danger: "#b91c1c",
    warning: "#92400e",
  };
  element.style.color = colorMap[tone] || colorMap.primary;
  return element;
}

function cgptApplyPanelInputStyle(element) {
  if (!element || !element.style) return element;
  const theme = CGPT_UI_THEME;
  element.style.background = theme.panelInputBackground;
  element.style.border = `1px solid ${theme.panelInputBorder}`;
  element.style.color = theme.panelTextPrimary;
  return element;
}

function cgptGetSurfaceLayoutTokens() {
  return {
    dialog: { ...CGPT_SURFACE_LAYOUT_TOKENS.dialog },
    dialogCompact: { ...CGPT_SURFACE_LAYOUT_TOKENS.dialogCompact },
    card: { ...CGPT_SURFACE_LAYOUT_TOKENS.card },
    sectionCard: { ...CGPT_SURFACE_LAYOUT_TOKENS.sectionCard },
    title: { ...CGPT_SURFACE_LAYOUT_TOKENS.title },
    sectionLabel: { ...CGPT_SURFACE_LAYOUT_TOKENS.sectionLabel },
    body: { ...CGPT_SURFACE_LAYOUT_TOKENS.body },
    meta: { ...CGPT_SURFACE_LAYOUT_TOKENS.meta },
  };
}

function cgptApplySurfaceLayout(element, variant = "card") {
  if (!element || !element.style) return element;
  const token = CGPT_SURFACE_LAYOUT_TOKENS[variant] || CGPT_SURFACE_LAYOUT_TOKENS.card;
  if (token.borderRadius) element.style.borderRadius = token.borderRadius;
  if (token.padding) element.style.padding = token.padding;
  if (token.gap) element.style.gap = token.gap;
  if (token.width) element.style.width = token.width;
  if (token.maxWidth) element.style.maxWidth = token.maxWidth;
  if (token.maxHeight) element.style.maxHeight = token.maxHeight;
  return element;
}

function cgptApplyTextScale(element, variant = "body") {
  if (!element || !element.style) return element;
  const token = CGPT_SURFACE_LAYOUT_TOKENS[variant] || CGPT_SURFACE_LAYOUT_TOKENS.body;
  if (token.fontSize) element.style.fontSize = token.fontSize;
  if (token.fontWeight) element.style.fontWeight = token.fontWeight;
  if (token.lineHeight) element.style.lineHeight = token.lineHeight;
  return element;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptGetUiTheme,
    cgptApplySurfaceStyle,
    cgptApplyTextTone,
    cgptApplyInputStyle,
    cgptGetSurfaceLayoutTokens,
    cgptApplySurfaceLayout,
    cgptApplyTextScale,
  };
}
