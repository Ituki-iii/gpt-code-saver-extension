const path = require("path");

const VALID_INSPECTION_TARGETS = [
  "general",
  "sidebar",
  "chatlog",
  "codeblocks",
  "share",
  "project-move",
];

const FEATURE_SELECTORS = {
  general: [
    "div[contenteditable='true'][data-testid='textbox']",
    "div[contenteditable='true'][role='textbox']",
    "textarea[data-testid='chat-input']",
    "textarea",
    "#cgpt-code-helper-panel",
    "a[href]",
    "[role='menu']",
    "[role='dialog']",
    "[role='listbox']",
    "[data-state='open']",
  ],
  sidebar: [
    "nav",
    "aside",
    "[data-testid='history-sidebar']",
    "a[href*='/c/']",
    "li",
    "[role='listitem']",
    "button",
    "[role='button']",
    "[role='menu']",
    "[role='dialog']",
    "[role='listbox']",
    "[data-state='open']",
  ],
  chatlog: [
    "[data-message-author-role]",
    "[data-message-id]",
    "time",
    "[data-message-model-slug]",
    "[aria-label*='model' i]",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "pre",
    "code",
    "a[href]",
    "table",
    "ul",
    "ol",
    "li",
  ],
  codeblocks: [
    "pre",
    "code",
    "button",
    "[role='button']",
    "[aria-label*='copy' i]",
    "[aria-label*='save' i]",
    "[data-testid*='copy' i]",
    "[data-testid*='code' i]",
  ],
  share: [
    "[role='dialog']",
    "[role='menu']",
    "button",
    "[role='button']",
    "input",
    "textarea",
    "a[href*='share']",
    "[aria-label*='share' i]",
    "[aria-label*='共有' i]",
    "[data-testid*='share' i]",
  ],
  "project-move": [
    "nav",
    "aside",
    "a[href*='/c/']",
    "[role='menu']",
    "[role='dialog']",
    "[role='listbox']",
    "[role='option']",
    "[role='menuitem']",
    "button",
    "input",
    "li",
    "[tabindex]",
  ],
};

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampText(value, maxLength = 1000) {
  const text = normalizeText(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizeInspectionTarget(value) {
  const target = normalizeText(value || "general").toLowerCase();
  return VALID_INSPECTION_TARGETS.includes(target) ? target : "general";
}

function getFeatureSelectors(target) {
  return FEATURE_SELECTORS[sanitizeInspectionTarget(target)].slice();
}

function createInspectionRunName({ target, mode, date = new Date() }) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `${sanitizeInspectionTarget(target)}-${normalizeText(mode || "anonymous").toLowerCase()}-${stamp}`;
}

function looksLikeChallengeState(snapshot = {}) {
  const bodySample = String(snapshot.bodySample || "");
  const title = String(snapshot.title || "");
  return (
    title.includes("Just a moment") ||
    bodySample.includes("Enable JavaScript and cookies to continue") ||
    bodySample.includes("検証に成功しました。chatgpt.com の応答を待っています")
  );
}

function buildDomSummary({ pageState = {}, candidateElements = [], openContainers = [], target = "general" } = {}) {
  const countsByTag = {};
  const countsByRole = {};
  for (const item of candidateElements) {
    const tag = normalizeText(item && item.tag).toLowerCase() || "unknown";
    const role = normalizeText(item && item.role).toLowerCase() || "(none)";
    countsByTag[tag] = (countsByTag[tag] || 0) + 1;
    countsByRole[role] = (countsByRole[role] || 0) + 1;
  }

  return {
    target: sanitizeInspectionTarget(target),
    url: pageState.url || "",
    title: pageState.title || "",
    readyState: pageState.readyState || "",
    hasTextbox: Boolean(pageState.hasTextbox),
    helperPanel: Boolean(pageState.helperPanel),
    challengeState: Boolean(pageState.challengeState),
    counts: {
      candidates: candidateElements.length,
      openContainers: openContainers.length,
      anchors: Number(pageState.anchorCount || 0),
      conversationAnchors: Number(pageState.conversationAnchorCount || 0),
      messages: Number(pageState.messageCount || 0),
      codeBlocks: Number(pageState.codeBlockCount || 0),
      dialogs: Number(pageState.dialogCount || 0),
      menus: Number(pageState.menuCount || 0),
      listboxes: Number(pageState.listboxCount || 0),
    },
    countsByTag,
    countsByRole,
    selectors: getFeatureSelectors(target),
  };
}

function getDefaultEdgeOptions(env = process.env) {
  return {
    executablePath:
      env.CGPT_EDGE_EXECUTABLE ||
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    userDataDir:
      env.CGPT_EDGE_USER_DATA_DIR ||
      "C:\\Users\\ituki\\AppData\\Local\\Microsoft\\Edge\\User Data",
    profileDirectory: env.CGPT_EDGE_PROFILE || "Default",
    copyProfile: String(env.CGPT_EDGE_COPY_PROFILE || "") === "1",
  };
}

function getArtifactsRoot(repoRoot) {
  return path.join(repoRoot, "tests", "artifacts", "live-chatgpt-inspect");
}

module.exports = {
  FEATURE_SELECTORS,
  VALID_INSPECTION_TARGETS,
  buildDomSummary,
  clampText,
  createInspectionRunName,
  getArtifactsRoot,
  getDefaultEdgeOptions,
  getFeatureSelectors,
  looksLikeChallengeState,
  normalizeText,
  sanitizeInspectionTarget,
};
