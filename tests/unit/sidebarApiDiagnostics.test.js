const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/sidebarApiDiagnostics.js")];
  return require("../../extension/content/sidebarApiDiagnostics.js");
}

test("sidebar api diagnostics stores and clears normalized values", () => {
  const {
    cgptClearSidebarApiDiagnostics,
    cgptGetSidebarApiDiagnostics,
    cgptSetSidebarApiDiagnostics,
  } = loadModule();

  cgptSetSidebarApiDiagnostics({
    phase: "projects_fetch",
    authMode: "bearer",
    status: 403,
    endpoint: "https://chatgpt.com/backend-api/projects",
    message: "api_auth_failed",
    endpointTried: [
      { url: "https://chatgpt.com/backend-api/projects", status: 403, ok: false, shapeMatched: false },
    ],
  });
  const diagnostics = cgptGetSidebarApiDiagnostics();
  assert.equal(diagnostics.phase, "projects_fetch");
  assert.equal(diagnostics.status, 403);
  assert.equal(diagnostics.endpointTried.length, 1);

  cgptClearSidebarApiDiagnostics();
  assert.equal(cgptGetSidebarApiDiagnostics(), null);
});

test("cgptCopySidebarApiDebugJson writes formatted JSON to the clipboard", async () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        written: "",
        async writeText(value) {
          this.written = value;
        },
      },
    },
  });

  try {
    const { cgptCopySidebarApiDebugJson } = loadModule();
    const ok = await cgptCopySidebarApiDebugJson({
      phase: "projects_fetch",
      status: 200,
    });
    assert.equal(ok, true);
    assert.match(global.navigator.clipboard.written, /"phase": "projects_fetch"/);
    assert.match(global.navigator.clipboard.written, /"status": 200/);
  } finally {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
  }
});

test("cgptCopySidebarApiDebugJson does not use textarea fallback unless explicitly allowed", async () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalDocument = globalThis.document;
  let execCommandCalled = false;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  });
  globalThis.document = {
    body: {},
    createElement() {
      return {};
    },
    execCommand() {
      execCommandCalled = true;
      return true;
    },
  };

  try {
    const { cgptCopySidebarApiDebugJson } = loadModule();
    const ok = await cgptCopySidebarApiDebugJson({ phase: "projects_fetch" });
    assert.equal(ok, false);
    assert.equal(execCommandCalled, false);
  } finally {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});

test("cgptCopySidebarApiDebugJson restores focus and selection after textarea fallback", async () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const activeElement = {
    selectionStart: 2,
    selectionEnd: 5,
    selectionDirection: "forward",
    focused: false,
    restoredSelection: null,
    focus() {
      this.focused = true;
    },
    setSelectionRange(start, end, direction) {
      this.restoredSelection = { start, end, direction };
    },
  };
  const savedRange = {
    cloned: true,
    cloneRange() {
      return this;
    },
  };
  const restoredRanges = [];
  const selection = {
    rangeCount: 1,
    removed: false,
    getRangeAt(index) {
      assert.equal(index, 0);
      return savedRange;
    },
    removeAllRanges() {
      this.removed = true;
    },
    addRange(range) {
      restoredRanges.push(range);
    },
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userActivation: { isActive: true },
    },
  });
  globalThis.window = {
    getSelection() {
      return selection;
    },
  };
  globalThis.document = {
    activeElement,
    body: {
      appendChild(node) {
        node.parentNode = this;
      },
    },
    contains(node) {
      return node === activeElement;
    },
    createElement(tagName) {
      assert.equal(tagName, "textarea");
      return {
        style: {},
        parentNode: null,
        setAttribute() {},
        focus() {},
        select() {},
        remove() {
          this.parentNode = null;
        },
      };
    },
    execCommand(command) {
      assert.equal(command, "copy");
      return true;
    },
  };

  try {
    const { cgptCopySidebarApiDebugJson } = loadModule();
    const ok = await cgptCopySidebarApiDebugJson(
      { phase: "projects_fetch" },
      { allowTextareaFallback: true }
    );
    assert.equal(ok, true);
    assert.equal(activeElement.focused, true);
    assert.deepEqual(activeElement.restoredSelection, { start: 2, end: 5, direction: "forward" });
    assert.equal(selection.removed, true);
    assert.deepEqual(restoredRanges, [savedRange]);
  } finally {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});

test("cgptDownloadSidebarApiDebugJson delegates downloads to the background runtime", async () => {
  const originalChrome = globalThis.chrome;
  const sentMessages = [];
  globalThis.chrome = {
    runtime: {
      sendMessage(message, callback) {
        sentMessages.push(message);
        callback({ ok: true, downloadId: 123 });
      },
    },
  };

  try {
    const { cgptDownloadSidebarApiDebugJson } = loadModule();
    const ok = await cgptDownloadSidebarApiDebugJson({
      timestamp: "2026-06-07T00:00:00.000Z",
      phase: "projects_fetch",
    });
    assert.equal(ok, true);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].type, "downloadSidebarApiDebugJson");
    assert.equal(sentMessages[0].fileName, "chatgpt-sidebar-api-debug-2026-06-07T00-00-00-000Z.json");
    assert.match(sentMessages[0].content, /"phase": "projects_fetch"/);
  } finally {
    if (originalChrome === undefined) {
      delete globalThis.chrome;
    } else {
      globalThis.chrome = originalChrome;
    }
  }
});
