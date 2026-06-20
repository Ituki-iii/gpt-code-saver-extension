function createLogSection() {
  const logSection = createPanelSection("Logs");
  const logButtons = createButtonRow();
  const logButtonVariant = "secondary";

  const historyBtn = createPanelButton("Download Log", logButtonVariant);
  historyBtn.style.flex = "1";
  historyBtn.addEventListener("click", () => {
    openLogViewer();
  });
  logButtons.appendChild(historyBtn);
  logSection.appendChild(logButtons);
  return logSection;
}
