function cgptGetResolvedBuiltinTemplates() {
  if (typeof cgptGetBuiltinTemplates === "function") {
    return cgptGetBuiltinTemplates();
  }
  const id = cgptGenerateTemplateId();
  const defaultTemplateFactory =
    typeof cgptCreateDefaultTemplate === "function"
      ? cgptCreateDefaultTemplate
      : (templateId) => ({
          id: templateId,
          title: "PATH format",
          content:
            typeof cgptGetDefaultTemplateContent === "function"
              ? cgptGetDefaultTemplateContent()
              : typeof DEFAULT_TEMPLATE_CONTENT !== "undefined"
              ? DEFAULT_TEMPLATE_CONTENT
              : "",
        });
  return [defaultTemplateFactory(id)];
}

function ensureDefaultTemplates() {
  let templates = cgptGetTemplates();
  const builtinTemplates = cgptGetResolvedBuiltinTemplates();
  const builtinIds = new Set(
    builtinTemplates.map((template) => template && template.id).filter(Boolean)
  );
  const legacyBuiltinIds = new Set([
    "builtin:path-default",
    "builtin:path-multi-file",
  ]);
  if (!Array.isArray(templates) || templates.length === 0) {
    templates = builtinTemplates;
    cgptSetTemplates(templates);
    if (templates[0] && templates[0].id) {
      cgptSetSelectedTemplateId(templates[0].id);
    }
    return;
  }

  const hadLegacyBuiltins = templates.some(
    (template) => template && legacyBuiltinIds.has(template.id)
  );
  if (hadLegacyBuiltins) {
    templates = templates.filter(
      (template) => !template || !legacyBuiltinIds.has(template.id)
    );
  }

  const existingIds = new Set(templates.map((template) => template && template.id).filter(Boolean));
  const missingBuiltins = builtinTemplates.filter(
    (template) => template && builtinIds.has(template.id) && !existingIds.has(template.id)
  );
  if (missingBuiltins.length) {
    templates = [...templates, ...missingBuiltins];
    cgptSetTemplates(templates);
  } else if (hadLegacyBuiltins) {
    cgptSetTemplates(templates);
  }

  const selectedTemplateId = cgptGetSelectedTemplateId();
  if (!selectedTemplateId || legacyBuiltinIds.has(selectedTemplateId)) {
    cgptSetSelectedTemplateId(templates[0].id);
  }
}

function loadTemplatesFromStorage(callback) {
  const runtime =
    typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.sendMessage === "function"
      ? chrome.runtime
      : null;
  const finalize = (res) => {
    if (res && res.ok && Array.isArray(res.templates)) {
      cgptSetTemplates(res.templates);
    } else {
      cgptSetTemplates([]);
    }
    ensureDefaultTemplates();
    if (typeof callback === "function") callback();
  };
  if (!runtime) {
    finalize(null);
    return;
  }
  const resolve =
    typeof cgptCreateAsyncGuard === "function"
      ? cgptCreateAsyncGuard(finalize)
      : finalize;
  runtime.sendMessage({ type: "getTemplates" }, (res) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      resolve(null);
      return;
    }
    resolve(res);
  });
}

function saveTemplatesToStorage() {
  chrome.runtime.sendMessage(
    { type: "setTemplates", templates: cgptGetTemplates() },
    (res) => {
      if (!res || !res.ok) {
        console.error("Failed to save templates", res && res.error);
        showToast("Failed to save templates.", "error");
      }
    }
  );
}

function getSelectedTemplate() {
  const templates = cgptGetTemplates();
  if (!Array.isArray(templates) || templates.length === 0) return null;
  const selectedId = cgptGetSelectedTemplateId();
  const found = templates.find((t) => t.id === selectedId);
  return found || templates[0];
}

function rebuildTemplateDropdown(selectEl) {
  if (!selectEl) return;

  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  const templates = cgptGetTemplates();
  let selectedId = cgptGetSelectedTemplateId();

  if (!Array.isArray(templates) || templates.length === 0) {
    selectEl.disabled = true;
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No templates available";
    emptyOption.selected = true;
    if (typeof cgptStyleTemplateDropdownOption === "function") {
      cgptStyleTemplateDropdownOption(emptyOption);
    }
    selectEl.appendChild(emptyOption);
    return;
  }

  selectEl.disabled = false;
  const hasValidSelection = templates.some((tpl) => tpl.id === selectedId);
  if (!hasValidSelection) {
    selectedId = templates[0].id;
    cgptSetSelectedTemplateId(selectedId);
  }

  templates.forEach((tpl) => {
    const option = document.createElement("option");
    option.value = tpl.id;
    option.textContent = tpl.title;
    if (tpl.id === selectedId) {
      option.selected = true;
    }
    if (typeof cgptStyleTemplateDropdownOption === "function") {
      cgptStyleTemplateDropdownOption(option);
    }
    selectEl.appendChild(option);
  });
}

function insertTemplateToInput(templateText) {
  const inserted = cgptInsertTextToChatInput(templateText);
  if (!inserted) {
    alert("Could not find the ChatGPT input field.");
    return;
  }
  showToast("Template inserted.", "success");
}
