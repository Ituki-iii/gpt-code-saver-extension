const CGPT_CHAT_LEFT_ALIGN_CLASS = "cgpt-helper-chat-left-align";
const CGPT_CHAT_LEFT_ALIGN_STYLE_ID = "cgpt-helper-chat-left-align-style";

function cgptBuildChatWindowAlignmentCss() {
  return `
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
    cgptApplyChatWindowAlignment,
    cgptBuildChatWindowAlignmentCss,
    cgptInjectChatWindowAlignmentStyle,
    cgptRefreshChatWindowAlignment,
  };
}
