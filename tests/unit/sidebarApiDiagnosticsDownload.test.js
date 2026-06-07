const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/background/sidebarApiDiagnosticsDownload.js")];
  return require("../../extension/background/sidebarApiDiagnosticsDownload.js");
}

test("cgptHandleSidebarApiDebugDownload starts a downloads API download", async () => {
  const originalChrome = globalThis.chrome;
  const downloadOptions = [];
  globalThis.chrome = {
    runtime: {},
    downloads: {
      download(options, callback) {
        downloadOptions.push(options);
        callback(42);
      },
    },
  };

  try {
    const { cgptHandleSidebarApiDebugDownload } = loadModule();
    const response = await new Promise((resolve) => {
      const asyncResponse = cgptHandleSidebarApiDebugDownload(
        { fileName: "debug.json", content: "{\"ok\":true}" },
        resolve
      );
      assert.equal(asyncResponse, true);
    });

    assert.deepEqual(response, { ok: true, downloadId: 42 });
    assert.equal(downloadOptions.length, 1);
    assert.equal(downloadOptions[0].filename, "debug.json");
    assert.equal(downloadOptions[0].conflictAction, "uniquify");
    assert.equal(downloadOptions[0].saveAs, true);
    assert.match(downloadOptions[0].url, /^data:application\/json;charset=utf-8,/);
  } finally {
    if (originalChrome === undefined) {
      delete globalThis.chrome;
    } else {
      globalThis.chrome = originalChrome;
    }
  }
});
