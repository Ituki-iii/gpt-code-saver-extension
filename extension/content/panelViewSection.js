function createViewSection() {
  const viewSection = createPanelSection("View Controls");
  viewSection.appendChild(createDisplayActionsSubLabel("Chat"));
  viewSection.appendChild(createChatWindowAlignmentControl());
  viewSection.appendChild(createDisplayActionsSubLabel("Code Blocks"));
  viewSection.appendChild(createViewModeButtonsRow());
  viewSection.appendChild(createCodeBlockReapplyButton());
  viewSection.appendChild(createHeadingViewSection());
  return viewSection;
}

function createChatWindowAlignmentControl() {
  const settings =
    typeof cgptGetViewSettings === "function"
      ? cgptGetViewSettings()
      : { chatWindowLeftAligned: false };

  const row = document.createElement("label");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "6px";
  row.style.minHeight = "28px";
  row.style.cursor = "pointer";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = settings.chatWindowLeftAligned === true;
  checkbox.style.margin = "0";
  checkbox.addEventListener("change", () => {
    const nextValue = checkbox.checked === true;
    if (typeof cgptUpdateViewSettings === "function") {
      cgptUpdateViewSettings({ chatWindowLeftAligned: nextValue }, (updatedSettings) => {
        checkbox.checked = updatedSettings.chatWindowLeftAligned === true;
        if (typeof cgptApplyChatWindowAlignment === "function") {
          cgptApplyChatWindowAlignment(updatedSettings);
        }
      });
      return;
    }
    if (typeof cgptApplyChatWindowAlignment === "function") {
      cgptApplyChatWindowAlignment({ chatWindowLeftAligned: nextValue });
    }
  });
  row.appendChild(checkbox);

  const text = document.createElement("span");
  text.textContent = "Left align";
  text.style.fontSize = "11px";
  text.style.lineHeight = "1.3";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(text, "muted");
  }
  row.appendChild(text);

  return row;
}

function createViewModeButtonsRow() {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "4px";
  row.style.minWidth = "0";

  const compactButton = createViewModeButton("Compact All", "compact");
  compactButton.style.flex = "1";
  compactButton.title = "Collapse all decorated code blocks to compact view";
  row.appendChild(compactButton);

  const expandButton = createViewModeButton("Expand All", "expanded");
  expandButton.style.flex = "1";
  expandButton.title = "Expand all decorated code blocks";
  row.appendChild(expandButton);

  return row;
}

function createDisplayActionsSubLabel(text) {
  const helpText = document.createElement("div");
  helpText.textContent = text;
  helpText.style.fontSize = "11px";
  helpText.style.fontWeight = "600";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(helpText, "muted");
  } else {
    helpText.style.color = "rgba(255,255,255,0.68)";
  }
  return helpText;
}

function createViewModeButton(label, mode) {
  const variants = {
    compact: "secondary",
    expanded: "secondary",
  };
  const variant = variants[mode] || "secondary";
  const button = createPanelButton(label, variant);
  button.addEventListener("click", () => {
    applyViewModeToAll(mode);
  });
  return button;
}

function applyViewModeToAll(mode) {
  if (typeof cgptApplyViewModeToAll === "function") {
    cgptApplyViewModeToAll(mode);
  }
}

function createCodeBlockReapplyButton() {
  const button = createPanelButton("Reapply", "secondary");
  button.title = "Rebuild helper decorations and resync visible chat layout";
  button.addEventListener("click", () => {
    requestCodeSaverReapply();
  });
  return button;
}

function requestCodeSaverReapply() {
  if (typeof cgptRefreshChatWindowAlignment === "function") {
    cgptRefreshChatWindowAlignment(document);
  }
  if (typeof resetChatLogEntries === "function" && typeof captureChatLogsFromNode === "function") {
    resetChatLogEntries();
    captureChatLogsFromNode(document);
  }
  if (typeof cgptReapplyCodeSaverDecorations === "function") {
    cgptReapplyCodeSaverDecorations(document);
  } else if (typeof decorateCodeBlocks === "function") {
    decorateCodeBlocks(document);
  }
  requestHeadingFoldReapply();
  if (typeof showToast === "function") {
    showToast("Reapplied helper view.", "success");
  }
}

function requestHeadingFoldReapply() {
  if (
    typeof applyHeadingFold !== "function" ||
    typeof cgptShouldApplyHeadingFold !== "function" ||
    !document ||
    typeof document.querySelectorAll !== "function"
  ) {
    return;
  }
  document.querySelectorAll(".cgpt-helper-message-body").forEach((body) => {
    if (cgptShouldApplyHeadingFold(body)) {
      applyHeadingFold(body, 1);
    }
  });
}

function createHeadingViewSection() {
  const headingSection = document.createElement("div");
  headingSection.style.display = "flex";
  headingSection.style.flexDirection = "column";
  headingSection.style.gap = "4px";

  const headingLabel = createDisplayActionsSubLabel("Headings");
  headingSection.appendChild(headingLabel);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.flexDirection = "row";
  controls.style.gap = "4px";

  const collapseButton = createPanelButton("Collapse All", "secondary");
  collapseButton.style.flex = "1";
  collapseButton.title = "Collapse all visible heading folds";
  collapseButton.addEventListener("click", () => requestAllHeadingFoldChanges(false));
  controls.appendChild(collapseButton);

  const expandButton = createPanelButton("Expand All", "secondary");
  expandButton.style.flex = "1";
  expandButton.title = "Expand all visible heading folds";
  expandButton.addEventListener("click", () => requestAllHeadingFoldChanges(true));
  controls.appendChild(expandButton);

  headingSection.appendChild(controls);
  return headingSection;
}

function requestHeadingFoldChange(level, shouldExpand) {
  if (typeof cgptToggleHeadingFoldsAtLevel === "function") {
    cgptToggleHeadingFoldsAtLevel(level, shouldExpand);
  }
}

function requestAllHeadingFoldChanges(shouldExpand) {
  [1, 2, 3, 4, 5, 6].forEach((level) => {
    requestHeadingFoldChange(level, shouldExpand);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createChatWindowAlignmentControl,
    requestCodeSaverReapply,
    requestHeadingFoldReapply,
  };
}
