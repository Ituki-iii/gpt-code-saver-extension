const CHAT_LOG_PREVIEW_LINE_LIMIT = 1;
const CHAT_LOG_UPDATED_EVENT = "cgpt-helper-chatlog-updated";

function openChatLogModal() {
  if (document.getElementById("cgpt-helper-chatlog-modal")) return;
  if (typeof getChatLogEntries !== "function") {
    alert("Failed to initialize the chat log.");
    return;
  }

  if (typeof ensureChatLogFoldStyle === "function") {
    ensureChatLogFoldStyle();
  }

  const { overlay, closeModal } = cgptCreateChatLogModalOverlay();
  const dialog = cgptCreateChatLogDialog();
  const list = cgptCreateChatLogList([], closeModal);

  dialog.appendChild(cgptCreateChatLogHeader(closeModal));
  dialog.appendChild(list);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const renderEntries = () => {
    cgptPopulateChatLogList(list, getChatLogEntries(), closeModal);
  };
  renderEntries();
  window.addEventListener(CHAT_LOG_UPDATED_EVENT, renderEntries);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  overlay.addEventListener("cgpt-helper-chatlog-close", () => {
    window.removeEventListener(CHAT_LOG_UPDATED_EVENT, renderEntries);
  }, { once: true });
}

function cgptCreateChatLogModalOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "cgpt-helper-chatlog-modal";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  if (typeof cgptGetUiTheme === "function") {
    overlay.style.background = cgptGetUiTheme().overlayBackground;
  } else {
    overlay.style.background = "rgba(0,0,0,0.6)";
  }
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const closeModal = () => {
    overlay.dispatchEvent(new CustomEvent("cgpt-helper-chatlog-close"));
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  return { overlay, closeModal };
}

function cgptCreateChatLogDialog() {
  const dialog = document.createElement("div");
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(dialog, "dialog");
    dialog.style.padding = "14px";
    dialog.style.gap = "8px";
  } else {
    dialog.style.borderRadius = "16px";
    dialog.style.padding = "14px";
    dialog.style.width = "80%";
    dialog.style.maxWidth = "900px";
    dialog.style.maxHeight = "80%";
    dialog.style.gap = "8px";
  }
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(dialog, "dialog");
  } else {
    dialog.style.background = "#202123";
    dialog.style.color = "#fff";
    dialog.style.boxShadow = "0 10px 40px rgba(0,0,0,0.6)";
  }
  return dialog;
}

function cgptCreateChatLogHeader(closeModal) {
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";

  const title = document.createElement("div");
  title.textContent = "Chat Log";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(title, "title");
  } else {
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
  }
  headerRow.appendChild(title);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "8px";

  const closeBtn = cgptCreateChatLogButton("Close", "secondary");
  closeBtn.addEventListener("click", closeModal);
  headerButtons.appendChild(closeBtn);

  headerRow.appendChild(headerButtons);

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "4px";
  wrapper.appendChild(headerRow);

  const helpText = document.createElement("div");
  helpText.textContent =
    "Save uses the project folder. Save As lets you choose a file or folder for this export.";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(helpText, "meta");
  } else {
    helpText.style.fontSize = "11px";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(helpText, "muted");
  } else {
    helpText.style.color = "#9ca3af";
  }
  wrapper.appendChild(helpText);

  return wrapper;
}

function cgptCreateChatLogList(entries, closeModal) {
  const list = document.createElement("div");
  list.style.flex = "1";
  list.style.overflow = "auto";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "6px";

  cgptPopulateChatLogList(list, entries, closeModal);
  return list;
}

function cgptPopulateChatLogList(list, entries, closeModal) {
  if (!list) return;
  list.replaceChildren();

  const orderedEntries = Array.isArray(entries) ? [...entries].sort((a, b) => a.order - b.order) : [];
  if (orderedEntries.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No chat messages found.";
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(empty, "muted");
    } else {
      empty.style.color = "#9ca3af";
    }
    list.appendChild(empty);
    return;
  }

  orderedEntries.forEach((entry) => {
    const card = cgptCreateChatLogEntryCard(entry, closeModal);
    list.appendChild(card);
  });
}

function cgptCreateChatLogEntryCard(entry, closeModal) {
  const card = cgptCreateChatLogEntryFold(entry, closeModal);
  if (entry && entry.role === "assistant") {
    const responseSection = cgptCreateChatLogAssistantSection(entry, closeModal);
    if (responseSection) {
      card.body.appendChild(responseSection);
    }
  }

  return card.container;
}

function cgptCreateChatLogEntryFold(entry, closeModal) {
  const container = document.createElement("div");
  container.style.padding = "0";

  const jumpBtn =
    typeof cgptCreateFoldActionButton === "function"
      ? cgptCreateFoldActionButton("Jump")
      : cgptCreateChatLogButton("Jump", "secondary", "sm");
  jumpBtn.addEventListener("click", () => {
    closeModal();
    if (typeof highlightChatMessageElement === "function") {
      highlightChatMessageElement(entry.element);
    } else {
      cgptJumpToCodeBlock(entry.element);
    }
  });

  const foldShell =
    typeof cgptCreateFoldShell === "function"
      ? cgptCreateFoldShell({
          title: "",
          badgeText: "",
          actionButtons: [jumpBtn],
        })
      : {
          container: document.createElement("div"),
          titleWrapper: document.createElement("div"),
          body: document.createElement("div"),
        };
  const fold = foldShell.container;
  fold.className = "cgpt-helper-fold";
  fold.style.marginTop = "0";
  fold.style.border = "1px solid rgba(203, 213, 225, 0.92)";
  fold.style.borderRadius = "10px";
  fold.style.background = "rgba(248, 250, 252, 0.92)";
  fold.style.color = "#0f172a";
  fold.style.padding = "8px 10px";
  foldShell.titleWrapper.appendChild(cgptCreateChatLogEntryMeta(entry));
  const body = foldShell.body;
  body.style.marginTop = "6px";
  body.style.gap = "6px";
  body.appendChild(cgptCreateChatLogMessageBody(entry));

  container.appendChild(fold);
  return { container, body, fold };
}

function cgptCreateChatLogEntryMeta(entry) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.columnGap = "8px";
  wrapper.style.rowGap = "4px";

  const badge = document.createElement("span");
  badge.textContent = cgptGetChatEntryDisplayLabel(entry);
  if (typeof cgptApplySharedChipStyle === "function") {
    cgptApplySharedChipStyle(badge, {
      variant: entry && entry.role === "user" ? "userChip" : "assistantChip",
      size: "md",
    });
  } else {
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "600";
  }
  wrapper.appendChild(badge);

  if (entry && entry.timestamp) {
    const timeEl = document.createElement("div");
    timeEl.textContent = cgptFormatChatLogTimestamp(entry.timestamp);
    if (typeof cgptApplyTextScale === "function") {
      cgptApplyTextScale(timeEl, "meta");
    } else {
      timeEl.style.fontSize = "11px";
    }
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(timeEl, "muted");
    } else {
      timeEl.style.color = "#9ca3af";
    }
    wrapper.appendChild(timeEl);
  }

  return wrapper;
}

function cgptCreateChatLogAssistantSection(entry, closeModal) {
  const assistantBlocks =
    entry && entry.element ? cgptExtractFormattedCodeBlocksFromElement(entry.element) : [];
  const assistantUrls =
    entry && entry.element ? cgptExtractStandaloneUrlsFromElement(entry.element) : [];
  const blockSection = cgptCreateChatLogBlocksSection(assistantBlocks, closeModal);
  const urlSection = cgptCreateChatLogUrlsSection(assistantUrls);
  if (!blockSection && !urlSection) {
    return null;
  }

  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "4px";

  if (blockSection) {
    section.appendChild(blockSection);
  }
  if (urlSection) {
    section.appendChild(urlSection);
  }

  return section;
}

function cgptCreateChatLogSectionTitle(label, timestamp) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.columnGap = "8px";
  wrapper.style.rowGap = "2px";

  const labelEl = document.createElement("div");
  labelEl.textContent = label;
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(labelEl, "sectionLabel");
  } else {
    labelEl.style.fontSize = "12px";
    labelEl.style.fontWeight = "600";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(labelEl, "secondary");
  } else {
    labelEl.style.color = "#d1d5db";
  }
  wrapper.appendChild(labelEl);

  if (timestamp) {
    const timeEl = document.createElement("div");
    timeEl.textContent = cgptFormatChatLogTimestamp(timestamp);
    if (typeof cgptApplyTextScale === "function") {
      cgptApplyTextScale(timeEl, "meta");
    } else {
      timeEl.style.fontSize = "11px";
    }
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(timeEl, "muted");
    } else {
      timeEl.style.color = "#9ca3af";
    }
    wrapper.appendChild(timeEl);
  }

  return wrapper;
}

function cgptCreateChatLogMessageBody(entry) {
  const messageBody = document.createElement("div");
  messageBody.style.whiteSpace = "pre-wrap";
  messageBody.style.overflowWrap = "anywhere";
  messageBody.style.wordBreak = "break-word";
  messageBody.style.paddingLeft = "2px";
  messageBody.style.color = "inherit";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(messageBody, "body");
  } else {
    messageBody.style.fontSize = "13px";
    messageBody.style.lineHeight = "1.5";
  }
  const messageText = cgptNormalizeChatLogLineEndings(entry.text || "(no text)");
  messageBody.textContent = cgptCreateSingleLinePreview(messageText, CHAT_LOG_PREVIEW_LINE_LIMIT);
  return messageBody;
}

function cgptCreateChatLogBlocksSection(blocks, closeModal) {
  if (!blocks || !blocks.length) {
    return null;
  }
  const savableBlocks = blocks.filter((block) => block && block.filePath);

  const section = cgptCreateChatLogSectionContainer();
  const blockHeaderActions = document.createElement("div");
  blockHeaderActions.style.display = "flex";
  blockHeaderActions.style.gap = "4px";
  blockHeaderActions.appendChild(cgptCreateBatchSaveAllButton(savableBlocks));
  blockHeaderActions.appendChild(cgptCreateBatchSaveAsAllButton(savableBlocks));
  section.appendChild(cgptCreateChatLogSectionHeader(`Code blocks (${blocks.length})`, "accent", blockHeaderActions));

  blocks.forEach((block) => {
    section.appendChild(cgptCreateChatLogCodeBlockCard(block, closeModal));
  });

  return section;
}

function cgptCreateChatLogCodeBlockCard(block, closeModal) {
  const blockActionWrapper = document.createElement("div");
  blockActionWrapper.style.display = "flex";
  blockActionWrapper.style.gap = "4px";
  blockActionWrapper.style.flexWrap = "wrap";

  blockActionWrapper.appendChild(cgptCreateBlockSaveButton(block));
  blockActionWrapper.appendChild(cgptCreateBlockSaveAsButton(block));

  const jumpBtn = cgptCreateChatLogButton("Jump", "secondary", "sm");
  jumpBtn.addEventListener("click", () => {
    closeModal();
    cgptJumpToCodeBlock(block.element);
  });
  blockActionWrapper.appendChild(jumpBtn);

  return cgptCreateChatLogDetailCard({
    title: block.fileName || block.filePath,
    titleTone: "accent",
    metaText: cgptBuildCodeMetaInfoText(block && block.content),
    detailText: block.filePath || cgptBuildUnnamedCodeBlockDetail(block),
    actionNode: blockActionWrapper,
  });
}

function cgptCreateChatLogUrlsSection(assistantUrls) {
  if (!assistantUrls || !assistantUrls.length) {
    return null;
  }
  const section = cgptCreateChatLogSectionContainer();
  section.appendChild(cgptCreateChatLogSectionHeader(`Links Provided (${assistantUrls.length})`, "accent"));

  assistantUrls.forEach((link) => {
    section.appendChild(cgptCreateChatLogUrlCard(link));
  });

  return section;
}

function cgptCreateChatLogUrlCard(link) {
  const openBtn = cgptCreateChatLogButton("Open Link", "secondary", "sm");
  openBtn.addEventListener("click", () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  });

  return cgptCreateChatLogDetailCard({
    title: link.text || link.url,
    titleTone: "accent",
    detailText: link.url,
    actionNode: openBtn,
  });
}

function cgptCreateChatLogSectionContainer() {
  const section = document.createElement("div");
  section.style.display = "flex";
  section.style.flexDirection = "column";
  section.style.gap = "4px";
  return section;
}

function cgptCreateChatLogSectionHeader(title, tone = "accent", actionNode = null) {
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "6px";

  const label = document.createElement("div");
  label.textContent = title;
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(label, "sectionLabel");
  } else {
    label.style.fontSize = "12px";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(label, tone);
  } else {
    label.style.color = tone === "accent" ? "#2563eb" : "#334155";
  }
  header.appendChild(label);

  if (actionNode) {
    header.appendChild(actionNode);
  }

  return header;
}

function cgptCreateChatLogDetailCard({
  title,
  titleTone = "accent",
  metaText = "",
  detailText = "",
  actionNode = null,
}) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  if (typeof cgptApplySurfaceLayout === "function") {
    cgptApplySurfaceLayout(wrapper, "sectionCard");
    wrapper.style.padding = "6px";
    wrapper.style.gap = "4px";
  } else {
    wrapper.style.borderRadius = "8px";
    wrapper.style.padding = "6px";
    wrapper.style.gap = "4px";
  }
  if (typeof cgptApplySurfaceStyle === "function") {
    cgptApplySurfaceStyle(wrapper, "subtle");
  } else {
    wrapper.style.border = "1px solid #dbe4ee";
    wrapper.style.background = "#f8fafc";
  }

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.justifyContent = "space-between";
  row.style.alignItems = "center";
  row.style.gap = "6px";

  const labelWrapper = document.createElement("div");
  labelWrapper.style.flex = "1";
  labelWrapper.style.display = "flex";
  labelWrapper.style.flexDirection = "column";
  labelWrapper.style.gap = "2px";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.flexWrap = "wrap";
  titleRow.style.alignItems = "baseline";
  titleRow.style.columnGap = "4px";

  const titleEl = document.createElement("div");
  titleEl.textContent = title || "";
  if (typeof cgptApplyTextScale === "function") {
    cgptApplyTextScale(titleEl, "sectionLabel");
  } else {
    titleEl.style.fontSize = "12px";
    titleEl.style.fontWeight = "600";
  }
  if (typeof cgptApplyTextTone === "function") {
    cgptApplyTextTone(titleEl, titleTone);
  } else {
    titleEl.style.color = titleTone === "accent" ? "#2563eb" : "#334155";
  }
  titleRow.appendChild(titleEl);

  if (metaText) {
    const metaEl = document.createElement("span");
    metaEl.textContent = metaText;
    if (typeof cgptApplyTextScale === "function") {
      cgptApplyTextScale(metaEl, "meta");
    } else {
      metaEl.style.fontSize = "11px";
    }
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(metaEl, "muted");
    } else {
      metaEl.style.color = "#64748b";
    }
    metaEl.style.opacity = "0.9";
    titleRow.appendChild(metaEl);
  }

  labelWrapper.appendChild(titleRow);

  if (detailText) {
    const detailEl = document.createElement("div");
    detailEl.textContent = detailText;
    if (typeof cgptApplyTextScale === "function") {
      cgptApplyTextScale(detailEl, "meta");
    } else {
      detailEl.style.fontSize = "11px";
    }
    if (typeof cgptApplyTextTone === "function") {
      cgptApplyTextTone(detailEl, "muted");
    } else {
      detailEl.style.color = "#475569";
    }
    detailEl.style.opacity = "0.9";
    labelWrapper.appendChild(detailEl);
  }

  row.appendChild(labelWrapper);

  if (actionNode) {
    row.appendChild(actionNode);
  }

  wrapper.appendChild(row);
  return wrapper;
}

function cgptBuildUnnamedCodeBlockDetail(block) {
  if (block && block.filePath) {
    return `Generated path: ${block.filePath}`;
  }
  if (block && block.language) {
    return `Detected language: ${block.language}`;
  }
  return "File path not detected";
}
