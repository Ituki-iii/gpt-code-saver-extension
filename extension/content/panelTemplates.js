function cgptDisableTemplateControlMotion(element) {
  if (!element || !element.style) return element;
  if (typeof cgptDisableSharedButtonMotion === "function" && element.tagName === "BUTTON") {
    cgptDisableSharedButtonMotion(element);
  }
  element.style.transition = "none";
  element.style.animation = "none";
  if (element.tagName === "BUTTON") {
    element.style.transform = "none";
  }
  return element;
}

function cgptCreateTemplateToggleButton() {
  const existing = document.getElementById("cgpt-helper-template-toggle");
  if (existing) return cgptDisableTemplateControlMotion(existing);

  const button =
    typeof cgptCreateSharedChipButton === "function"
      ? cgptCreateSharedChipButton("Templates", "md")
      : document.createElement("button");
  button.id = "cgpt-helper-template-toggle";
  button.textContent = "Templates";
  button.style.position = "fixed";
  button.style.right = "256px";
  button.style.bottom = "16px";
  button.style.zIndex = "9999";
  button.style.minWidth = "56px";
  button.style.padding = "0 14px";
  button.style.cursor = "pointer";
  if (typeof cgptCreateSharedChipButton !== "function") {
    button.style.height = "48px";
    button.style.borderRadius = "999px";
    button.style.fontSize = "11px";
    button.style.fontWeight = "600";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    if (typeof cgptApplySurfaceStyle === "function") {
      cgptApplySurfaceStyle(button, "panel");
    } else {
      button.style.border = "1px solid rgba(255,255,255,0.15)";
      button.style.background = "rgba(32, 33, 35, 0.9)";
      button.style.color = "#fff";
      button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.35)";
    }
  }
  return cgptDisableTemplateControlMotion(button);
}

function openTemplatePanel() {
  const existing = document.getElementById("cgpt-helper-template-panel");
  if (existing) {
    existing.style.display = "flex";
    cgptSyncTemplateToggleState(true);
    return existing;
  }

  const panel = document.createElement("div");
  panel.id = "cgpt-helper-template-panel";
  panel.style.position = "fixed";
  panel.style.right = "216px";
  panel.style.bottom = "72px";
  panel.style.zIndex = "9999";
  panel.style.boxSizing = "border-box";
  panel.style.borderRadius = "8px";
  panel.style.padding = "8px";
  panel.style.fontSize = "12px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "6px";
  panel.style.width = "min(240px, calc(100vw - 48px))";
  panel.style.maxWidth = "240px";
  panel.style.maxHeight = "calc(100vh - 112px)";
  panel.style.overflowX = "hidden";
  panel.style.overflowY = "auto";
  panel.style.backdropFilter = "blur(8px)";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(panel, "panel");
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  const title = document.createElement("div");
  title.textContent = "Templates";
  title.style.flex = "1";
  title.style.fontWeight = "700";
  title.style.fontSize = "13px";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(title, "primary");
  }
  header.appendChild(title);

  const closeButton = createPanelButton("Hide", "ghost");
  closeButton.style.padding = "2px 6px";
  closeButton.style.lineHeight = "1.3";
  cgptDisableTemplateControlMotion(closeButton);
  closeButton.addEventListener("click", () => {
    panel.style.display = "none";
    cgptSyncTemplateToggleState(false);
  });
  header.appendChild(closeButton);

  panel.appendChild(header);
  panel.appendChild(createTemplatePanelContent());
  document.body.appendChild(panel);
  cgptSyncTemplateToggleState(true);
  return panel;
}

function cgptToggleTemplatePanel() {
  const panel = document.getElementById("cgpt-helper-template-panel");
  if (!panel) {
    openTemplatePanel();
    return;
  }
  const nextVisible = panel.style.display === "none";
  panel.style.display = nextVisible ? "flex" : "none";
  cgptSyncTemplateToggleState(nextVisible);
}

function cgptSyncTemplateToggleState(isOpen) {
  const button = document.getElementById("cgpt-helper-template-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", isOpen ? "true" : "false");
  button.title = isOpen ? "Hide templates" : "Show templates";
}

function createTemplatePanelContent() {
  const templateSection = document.createElement("div");
  templateSection.style.display = "flex";
  templateSection.style.flexDirection = "column";
  templateSection.style.gap = "6px";
  templateSection.style.paddingTop = "6px";
  templateSection.style.borderTop = "1px solid rgba(203, 213, 225, 0.7)";

  const templateRow = document.createElement("div");
  templateRow.style.display = "flex";
  templateRow.style.gap = "8px";
  templateRow.style.alignItems = "stretch";

  const templateDropdownContainer = document.createElement("div");
  templateDropdownContainer.style.flex = "1";
  templateDropdownContainer.style.position = "relative";
  templateDropdownContainer.style.display = "flex";
  templateDropdownContainer.style.alignItems = "center";
  templateDropdownContainer.style.borderRadius = "8px";
  templateDropdownContainer.style.transition = "none";
  templateDropdownContainer.style.animation = "none";
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(templateDropdownContainer, "subtle");
  } else {
    templateDropdownContainer.style.border = "1px solid rgba(255,255,255,0.25)";
    templateDropdownContainer.style.background = "rgba(31, 41, 55, 0.95)";
  }

  const templateDropdown = document.createElement("select");
  templateDropdown.style.flex = "1";
  templateDropdown.style.appearance = "none";
  templateDropdown.style.WebkitAppearance = "none";
  templateDropdown.style.MozAppearance = "none";
  templateDropdown.style.background = "transparent";
  templateDropdown.style.border = "none";
  templateDropdown.style.outline = "none";
  templateDropdown.style.padding = "6px 32px 6px 10px";
  templateDropdown.style.colorScheme = "light";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(templateDropdown, "primary");
  } else {
    templateDropdown.style.color = "#fff";
  }
  templateDropdown.style.fontSize = "12px";
  templateDropdown.style.height = "28px";
  templateDropdown.style.cursor = "pointer";
  templateDropdown.style.transition = "none";
  templateDropdown.style.animation = "none";
  templateDropdown.setAttribute("aria-label", "Select template");
  templateDropdownContainer.appendChild(templateDropdown);

  const dropdownIcon = document.createElement("span");
  dropdownIcon.textContent = "v";
  dropdownIcon.style.position = "absolute";
  dropdownIcon.style.right = "10px";
  dropdownIcon.style.pointerEvents = "none";
  if (typeof cgptApplyPanelTextTone === "function") {
    cgptApplyPanelTextTone(dropdownIcon, "muted");
  } else {
    dropdownIcon.style.color = "rgba(255,255,255,0.6)";
  }
  dropdownIcon.style.fontSize = "10px";
  dropdownIcon.style.lineHeight = "1";
  templateDropdownContainer.appendChild(dropdownIcon);

  templateDropdown.addEventListener("focus", () => {
    templateDropdownContainer.style.borderColor = "#93c5fd";
    templateDropdownContainer.style.background = "#f8fafc";
  });

  templateDropdown.addEventListener("blur", () => {
    templateDropdownContainer.style.borderColor = "#cbd5e1";
    templateDropdownContainer.style.background = "#f8fafc";
  });

  templateDropdownContainer.addEventListener("mouseenter", () => {
    templateDropdownContainer.style.borderColor = "#94a3b8";
  });

  templateDropdownContainer.addEventListener("mouseleave", () => {
    templateDropdownContainer.style.borderColor =
      document.activeElement === templateDropdown ? "#93c5fd" : "#cbd5e1";
  });

  templateRow.appendChild(templateDropdownContainer);

  templateDropdown.addEventListener("change", (event) => {
    const templateId = event.target.value;
    if (templateId) {
      cgptSetSelectedTemplateId(templateId);
    }
  });

  const refreshTemplateList = () => {
    rebuildTemplateDropdown(templateDropdown);
  };
  refreshTemplateList();

  templateSection.appendChild(templateRow);
  templateSection.appendChild(createTemplateActionRow(refreshTemplateList));
  return templateSection;
}

function createTemplateActionRow(refreshTemplateList) {
  const manageRow = createButtonRow();

  const editBtn = createPanelButton("Edit", "secondary");
  editBtn.style.flex = "1";
  cgptDisableTemplateControlMotion(editBtn);
  editBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("No templates available.");
      return;
    }
    openTemplateEditor("edit", tpl.id, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(editBtn);

  const addBtn = createPanelButton("Add", "secondary");
  addBtn.style.flex = "1";
  cgptDisableTemplateControlMotion(addBtn);
  addBtn.addEventListener("click", () => {
    openTemplateEditor("new", null, () => {
      refreshTemplateList();
    });
  });
  manageRow.appendChild(addBtn);

  const insertBtn = createPanelButton("Insert", "primary");
  insertBtn.style.flex = "1";
  cgptDisableTemplateControlMotion(insertBtn);
  insertBtn.addEventListener("click", () => {
    const tpl = getSelectedTemplate();
    if (!tpl) {
      alert("No templates available.");
      return;
    }
    insertTemplateToInput(tpl.content);
  });
  manageRow.appendChild(insertBtn);

  return manageRow;
}

function cgptStyleTemplateDropdownOption(option) {
  if (!option || !option.style) return option;
  option.style.background = "#f8fafc";
  option.style.color = "#0f172a";
  return option;
}
