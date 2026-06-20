function cgptInitChatToolsFeature(root = document) {
  if (typeof initChatLogTracker === "function") {
    initChatLogTracker(root);
  }
  if (typeof cgptCreateChatLogToggleButton === "function") {
    const button = cgptCreateChatLogToggleButton();
    if (button && !button.isConnected) {
      if (typeof cgptMountFloatingLauncher === "function") {
        cgptMountFloatingLauncher(button, { order: 20 });
      } else {
        document.body.appendChild(button);
      }
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptInitChatToolsFeature,
  };
}
