const CGPT_CHAT_LEFT_ALIGN_CLASS = "cgpt-helper-chat-left-align";
const CGPT_CHAT_LEFT_ALIGN_STYLE_ID = "cgpt-helper-chat-left-align-style";
const CGPT_CHAT_BUBBLE_WIDTH_VAR = "--cgpt-helper-chat-bubble-width";
const CGPT_DEFAULT_CHAT_BUBBLE_WIDTH_PX = 960;

function cgptBuildChatWindowAlignmentCss() {
  return `
body {
  ${CGPT_CHAT_BUBBLE_WIDTH_VAR}: ${CGPT_DEFAULT_CHAT_BUBBLE_WIDTH_PX}px;
}

body main [data-message-author-role] {
  width: var(${CGPT_CHAT_BUBBLE_WIDTH_VAR}) !important;
  max-width: none !important;
}

body main [data-message-author-role] > div {
  width: 100% !important;
  max-width: none !important;
}

body main [data-message-author-role="user"] [class*="user-message-bubble-color"] {
  width: 100% !important;
  max-width: var(${CGPT_CHAT_BUBBLE_WIDTH_VAR}) !important;
}

body main form:has(#prompt-textarea),
body form:has(#prompt-textarea) {
  width: var(${CGPT_CHAT_BUBBLE_WIDTH_VAR}) !important;
  max-width: none !important;
}

body #prompt-textarea {
  width: 100% !important;
  max-width: none !important;
}

body.${CGPT_CHAT_LEFT_ALIGN_CLASS} main [class*="--thread-content-margin"] {
  --thread-content-margin: 0px !important;
}

body.${CGPT_CHAT_LEFT_ALIGN_CLASS} main [class*="--thread-content-max-width"] {
  margin-left: 0 !important;
  margin-right: auto !important;
}

body.${CGPT_CHAT_LEFT_ALIGN_CLASS} main [data-message-author-role] {
  align-items: flex-start !important;
}
`;
}

function cgptResolveChatBubbleWidthPx(settings = {}) {
  const parsed = Number.parseInt(settings.chatBubbleWidthPx, 10);
  if (!Number.isFinite(parsed) || parsed < 320) {
    return CGPT_DEFAULT_CHAT_BUBBLE_WIDTH_PX;
  }
  return parsed;
}

function cgptInjectChatWindowAlignmentStyle(rootDocument = document) {
  if (!rootDocument || !rootDocument.head) return;
  if (rootDocument.getElementById(CGPT_CHAT_LEFT_ALIGN_STYLE_ID)) return;

  const style = rootDocument.createElement("style");
  style.id = CGPT_CHAT_LEFT_ALIGN_STYLE_ID;
  style.textContent = cgptBuildChatWindowAlignmentCss();
  rootDocument.head.appendChild(style);
}

function cgptApplyChatWindowAlignment(settings = {}, rootDocument = document) {
  if (!rootDocument || !rootDocument.body) return false;
  cgptInjectChatWindowAlignmentStyle(rootDocument);
  const widthPx = cgptResolveChatBubbleWidthPx(settings);
  const styleTarget = rootDocument.documentElement || rootDocument.body;
  if (styleTarget && styleTarget.style && typeof styleTarget.style.setProperty === "function") {
    styleTarget.style.setProperty(CGPT_CHAT_BUBBLE_WIDTH_VAR, `${widthPx}px`);
  }
  const enabled = settings.chatWindowLeftAligned === true;
  rootDocument.body.classList.toggle(CGPT_CHAT_LEFT_ALIGN_CLASS, enabled);
  return enabled;
}

function cgptRefreshChatWindowAlignment(rootDocument = document) {
  const settings =
    typeof cgptGetViewSettings === "function"
      ? cgptGetViewSettings()
      : { chatWindowLeftAligned: false };
  return cgptApplyChatWindowAlignment(settings, rootDocument);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CGPT_CHAT_LEFT_ALIGN_CLASS,
    CGPT_CHAT_LEFT_ALIGN_STYLE_ID,
    CGPT_CHAT_BUBBLE_WIDTH_VAR,
    CGPT_DEFAULT_CHAT_BUBBLE_WIDTH_PX,
    cgptApplyChatWindowAlignment,
    cgptBuildChatWindowAlignmentCss,
    cgptInjectChatWindowAlignmentStyle,
    cgptResolveChatBubbleWidthPx,
    cgptRefreshChatWindowAlignment,
  };
}
