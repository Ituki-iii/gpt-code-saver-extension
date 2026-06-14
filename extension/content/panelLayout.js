const cgptPanelLayoutState = {
  panel: null,
  toggleButton: null,
  hidden: false,
  bound: false,
};

function cgptUpdatePanelLayout() {
  const main = document.querySelector("main");
  if (!main) return;

  if (!main.dataset.cgptPanelLayoutBound) {
    main.dataset.cgptPanelLayoutBound = "1";
    main.dataset.cgptPanelLayoutOriginalMarginRight = main.style.marginRight || "";
    main.dataset.cgptPanelLayoutOriginalPaddingBottom = main.style.paddingBottom || "";
  }

  main.style.marginRight = main.dataset.cgptPanelLayoutOriginalMarginRight || "";
  main.style.paddingBottom = main.dataset.cgptPanelLayoutOriginalPaddingBottom || "";
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
