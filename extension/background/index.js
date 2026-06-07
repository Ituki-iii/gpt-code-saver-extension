importScripts(
  "../shared/filePathValidation.js",
  "../shared/projectFolderSettings.js",
  "./logStore.js",
  "./templateStore.js",
  "./applyCode.js",
  "./projectFolderSelector.js",
  "./sidebarApiDiagnosticsDownload.js",
  "./messageHandlers.js",
  "./reloadState.js"
);

cgptRegisterReloadStateHooks();
cgptRegisterRuntimeMessageHandler();
