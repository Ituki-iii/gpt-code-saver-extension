const cgptPanelLayoutState = {
  panel: null,
  toggleButton: null,
  hidden: false,
  bound: false,
};
const CGPT_FLOATING_LAUNCHER_DOCK_ID = "cgpt-helper-launcher-dock";

function cgptGetFloatingLauncherDock() {
  let dock = document.getElementById(CGPT_FLOATING_LAUNCHER_DOCK_ID);
  if (dock) return dock;
  if (!document.body) return null;

  dock = document.createElement("div");
  dock.id = CGPT_FLOATING_LAUNCHER_DOCK_ID;
  dock.style.position = "fixed";
  dock.style.right = "16px";
  dock.style.bottom = "16px";
  dock.style.zIndex = "9999";
  dock.style.display = "flex";
  dock.style.flexWrap = "wrap";
  dock.style.justifyContent = "flex-end";
  dock.style.alignItems = "center";
  dock.style.gap = "8px";
  dock.style.rowGap = "8px";
  dock.style.maxWidth = "min(calc(100vw - 32px), 640px)";
  document.body.appendChild(dock);
  return dock;
}

function cgptMountFloatingLauncher(button, { order = 0 } = {}) {
  if (!button) return null;
  const dock = cgptGetFloatingLauncherDock();
  if (!dock) return button;

  button.style.position = "static";
  button.style.right = "auto";
  button.style.bottom = "auto";
  button.style.zIndex = "auto";
  button.style.margin = "0";
  button.style.order = `${order}`;
  button.style.flexShrink = "0";

  if (button.parentNode !== dock) {
    dock.appendChild(button);
  }

  cgptUpdatePanelLayout();
  return button;
}

function cgptGetFloatingLauncherOffset() {
  const dock = document.getElementById(CGPT_FLOATING_LAUNCHER_DOCK_ID);
  const dockHeight = dock
    ? Math.max(48, Math.ceil(dock.getBoundingClientRect().height))
    : 48;
  return 16 + dockHeight + 8;
}

function cgptUpdatePanelLayout() {
  const main = document.querySelector("main");
  const floatingBottom = cgptGetFloatingLauncherOffset();
  [
    "cgpt-code-helper-panel",
    "cgpt-helper-template-panel",
    "cgpt-helper-sidebar-bulk-panel",
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node) {
      node.style.bottom = `${floatingBottom}px`;
    }
  });

  if (!main) return;

  if (!main.dataset.cgptPanelLayoutBound) {
    main.dataset.cgptPanelLayoutBound = "1";
    main.dataset.cgptPanelLayoutOriginalMarginRight = main.style.marginRight || "";
    main.dataset.cgptPanelLayoutOriginalPaddingBottom = main.style.paddingBottom || "";
  }

  main.style.marginRight = main.dataset.cgptPanelLayoutOriginalMarginRight || "";
  main.style.paddingBottom =
    main.dataset.cgptPanelLayoutOriginalPaddingBottom || `${floatingBottom + 12}px`;
}

function cgptEnsurePanelLayoutBinding() {
  if (cgptPanelLayoutState.bound) return;
  cgptPanelLayoutState.bound = true;
  window.addEventListener("resize", () => {
    cgptUpdatePanelLayout();
  });
}

function cgptSyncPanelLayoutState({ panel, toggleButton, hidden }) {
  cgptPanelLayoutState.panel = panel || null;
  cgptPanelLayoutState.toggleButton = toggleButton || null;
  cgptPanelLayoutState.hidden = hidden === true;
  cgptEnsurePanelLayoutBinding();
  cgptUpdatePanelLayout();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptGetFloatingLauncherDock,
    cgptMountFloatingLauncher,
    cgptGetFloatingLauncherOffset,
    cgptSyncPanelLayoutState,
  };
}
