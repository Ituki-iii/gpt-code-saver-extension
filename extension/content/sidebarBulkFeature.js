function cgptInitSidebarBulkFeature(root = document) {
  if (typeof cgptStartSidebarConversationTracker === "function") {
    cgptStartSidebarConversationTracker(root);
  }
  const button = cgptCreateSidebarBulkToggleButton();
  if (!button.isConnected) {
    button.addEventListener("click", () => {
      const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
      if (!panel || panel.style.display === "none") {
        cgptOpenSidebarBulkPanel();
        return;
      }
      cgptCloseSidebarBulkPanel();
    });
    document.body.appendChild(button);
  }
  if (typeof cgptSubscribeSidebarBulkState === "function") {
    if (!button.dataset.cgptSidebarBulkSubscribed) {
      button.dataset.cgptSidebarBulkSubscribed = "1";
      let previousStateSignature = "";
      cgptSubscribeSidebarBulkState((nextState) => {
        const selectionSignature = Array.from(nextState.selectedConversationIds || []).sort().join("|");
        const stateSignature = [
          nextState.query,
          nextState.projectFilter || "",
          nextState.runningAction,
          nextState.projectTarget ? nextState.projectTarget.mode : "",
          nextState.projectTarget ? nextState.projectTarget.projectId : "",
          nextState.projectTarget ? nextState.projectTarget.projectName : "",
          nextState.draftProjectName || "",
          nextState.lastResult ? JSON.stringify(nextState.lastResult.counts || {}) : "",
        ].join("::");
        if (stateSignature === previousStateSignature) {
          if (typeof cgptUpdateSidebarBulkSelectionUi === "function") {
            cgptUpdateSidebarBulkSelectionUi();
          }
          return;
        }
        previousStateSignature = stateSignature;
        button.dataset.cgptSidebarBulkSelectionSignature = selectionSignature;
        if (typeof cgptRenderSidebarBulkPanel === "function") {
          cgptRenderSidebarBulkPanel();
        }
      });
    }
  }
}
