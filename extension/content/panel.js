function cgptRemoveStaleHelperUi() {
  [
    "cgpt-code-helper-panel",
    "cgpt-helper-panel-toggle",
    "cgpt-helper-template-toggle",
    "cgpt-helper-template-panel",
    "cgpt-helper-template-modal",
    "cgpt-helper-chatlog-toggle",
    "cgpt-helper-chatlog-modal",
    "cgpt-helper-sidebar-bulk-toggle",
    "cgpt-helper-sidebar-bulk-panel",
    "cgpt-helper-log-modal",
    "cgpt-helper-launcher-dock",
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
}

function createFloatingPanel() {
  cgptRemoveStaleHelperUi();

  const panel = createPanelContainer();
  const toggleButton =
    typeof cgptCreatePanelToggleButton === "function"
      ? cgptCreatePanelToggleButton()
      : null;
  const templateToggleButton =
    typeof cgptCreateTemplateToggleButton === "function"
      ? cgptCreateTemplateToggleButton()
      : null;

  const visibilityState =
    typeof cgptGetPanelVisibility === "function"
      ? cgptGetPanelVisibility()
      : { hidden: false };

  const applyHiddenState =
    typeof cgptApplyPanelVisibility === "function"
      ? cgptApplyPanelVisibility(panel, {
          hidden: visibilityState.hidden,
          toggleButton,
        })
      : null;

  const requestVisibility = (hidden) => {
    if (typeof cgptUpdatePanelVisibility === "function") {
      cgptUpdatePanelVisibility({ hidden }, (state) => {
        applyHiddenState?.(state.hidden);
      });
      return;
    }
    applyHiddenState?.(hidden);
  };

  const header =
    typeof cgptCreatePanelHeader === "function"
      ? cgptCreatePanelHeader({ onHide: () => requestVisibility(true) })
      : createPanelTitle();
  panel.appendChild(header);
  if (typeof createExtensionToggleSection === "function") {
    panel.appendChild(createExtensionToggleSection());
  }
  panel.appendChild(createProjectFolderSection());
  panel.appendChild(createSaveOptionsSection());
  panel.appendChild(createLightweightModeSection());
  panel.appendChild(createViewSection());
  panel.appendChild(createLogSection());

  document.body.appendChild(panel);

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const nextHidden =
        typeof cgptGetPanelVisibility === "function"
          ? !cgptGetPanelVisibility().hidden
          : panel.style.display !== "none";
      requestVisibility(nextHidden);
    });
    if (typeof cgptMountFloatingLauncher === "function") {
      cgptMountFloatingLauncher(toggleButton, { order: 40 });
    } else {
      document.body.appendChild(toggleButton);
    }
  }

  if (templateToggleButton) {
    templateToggleButton.addEventListener("click", () => {
      if (typeof cgptToggleTemplatePanel === "function") {
        cgptToggleTemplatePanel();
      } else if (typeof openTemplatePanel === "function") {
        openTemplatePanel();
      }
    });
    if (typeof cgptMountFloatingLauncher === "function") {
      cgptMountFloatingLauncher(templateToggleButton, { order: 30 });
    } else {
      document.body.appendChild(templateToggleButton);
    }
  }

  if (typeof cgptSyncPanelLayoutState === "function") {
    cgptSyncPanelLayoutState({
      panel,
      toggleButton,
      hidden: visibilityState.hidden,
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptRemoveStaleHelperUi,
  };
}
