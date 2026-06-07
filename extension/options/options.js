const statusEl = document.getElementById("status");

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

async function findChatGptTab() {
  const tabs = await chrome.tabs.query({
    url: [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
    ],
  });
  return tabs.find((tab) => tab.active) || tabs[0] || null;
}

async function sendDebugRequest(type) {
  const tab = await findChatGptTab();
  if (!tab || typeof tab.id !== "number") {
    throw new Error("Open a ChatGPT tab first.");
  }
  return chrome.tabs.sendMessage(tab.id, { type });
}

async function handleDebugClick(type, label) {
  setStatus(`${label}: requesting current ChatGPT tab...`);
  try {
    const response = await sendDebugRequest(type);
    if (!response || response.ok !== true) {
      throw new Error((response && response.error) || "debug_export_failed");
    }
    setStatus(`${label}: exported.`);
  } catch (error) {
    setStatus(`${label}: ${error && error.message ? error.message : "failed"}`);
  }
}

document.getElementById("api-debug")?.addEventListener("click", () => {
  handleDebugClick("cgptExportSidebarApiDebug", "API Debug");
});

document.getElementById("move-debug")?.addEventListener("click", () => {
  handleDebugClick("cgptExportSidebarMoveDebug", "Move Debug");
});
