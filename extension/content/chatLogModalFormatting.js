function cgptNormalizeChatLogLineEndings(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function cgptCreateSingleLinePreview(text, lineLimit = 1) {
  if (!text) return "";
  if (!lineLimit || lineLimit <= 0) return text;
  const normalized = cgptNormalizeChatLogLineEndings(text);
  const lines = normalized.split("\n");
  const hasMore = lines.length > lineLimit;
  const preview = lines.slice(0, lineLimit).join("\n").trimEnd();
  return hasMore ? `${preview}...` : preview;
}

function cgptFormatChatLogTimestamp(ts) {
  const date = new Date(ts);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString();
  }
  return ts || "";
}

function cgptCollectAssistantBlocksForEntry(entry, nextEntry, allEntries) {
  const blocks = [];
  if (!entry || !Array.isArray(allEntries)) {
    return blocks;
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  allEntries
    .filter((candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      cgptExtractFormattedCodeBlocksFromElement(assistantEntry.element).forEach((block) => {
        blocks.push(block);
      });
    });
  return blocks;
}

function cgptCollectAssistantEntriesForUserEntry(entry, nextEntry, allEntries) {
  if (!entry || !Array.isArray(allEntries)) {
    return [];
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  return allEntries.filter(
    (candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder
  );
}

function cgptCollectAssistantUrlsForEntry(entry, nextEntry, allEntries) {
  const urls = [];
  if (!entry || !Array.isArray(allEntries)) {
    return urls;
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  const seen = new Set();
  allEntries
    .filter((candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      cgptExtractStandaloneUrlsFromElement(assistantEntry.element).forEach((link) => {
        const key = `${link.url}|${link.text}`;
        if (seen.has(key)) return;
        seen.add(key);
        urls.push(link);
      });
    });
  return urls;
}

function cgptCollectAssistantHeadingSections(entry, nextEntry, allEntries) {
  const sections = [];
  if (!entry || !Array.isArray(allEntries)) {
    return sections;
  }
  const startOrder = entry.order;
  const endOrder = nextEntry ? nextEntry.order : Infinity;
  allEntries
    .filter((candidate) => candidate.role === "assistant" && candidate.order > startOrder && candidate.order < endOrder)
    .forEach((assistantEntry) => {
      if (!assistantEntry.element) return;
      const extracted = cgptExtractHeadingSectionsFromElement(assistantEntry.element);
      extracted.forEach((section) => sections.push(section));
    });
  return sections;
}

function cgptExtractFormattedCodeBlocksFromElement(element) {
  const results = [];
  if (!element) return results;
  const seenBlocks = new Set();
  const blockElements = [];
  if (typeof element.querySelectorAll === "function") {
    element.querySelectorAll("pre").forEach((pre) => {
      if (!pre || seenBlocks.has(pre)) return;
      const ancestorPre =
        pre.parentElement && typeof pre.parentElement.closest === "function"
          ? pre.parentElement.closest("pre")
          : null;
      if (ancestorPre && cgptGetChatLogCodeTextContainer(ancestorPre)) {
        return;
      }
      if (!cgptGetChatLogCodeTextContainer(pre)) return;
      seenBlocks.add(pre);
      blockElements.push(pre);
    });
  }

  blockElements.forEach((blockElement, index) => {
    const codeEl = cgptGetChatLogCodeTextContainer(blockElement) || blockElement;
    const rawText = codeEl.textContent || "";
    const normalized = cgptNormalizeChatLogLineEndings(rawText);
    const language = cgptExtractCodeBlockLanguage(codeEl, blockElement);
    const detectedPath =
      typeof cgptResolvePathMetadataForBlock === "function"
        ? cgptResolvePathMetadataForBlock(blockElement, { boundaryRoot: element })
        : null;
    if (detectedPath && detectedPath.filePath) {
      const filePath = detectedPath.filePath;
      results.push({
        filePath,
        fileName: cgptDeriveFileName(filePath),
        content: normalized,
        element: blockElement,
        language,
        hasDetectedFilePath: true,
      });
      return;
    }
    const generatedFilePath = cgptBuildGeneratedCodeBlockPath(language, index);
    results.push({
      filePath: generatedFilePath,
      fileName: cgptDeriveFileName(generatedFilePath),
      content: normalized,
      element: blockElement,
      language,
      hasDetectedFilePath: false,
    });
  });
  return results;
}

function cgptGetChatLogCodeTextContainer(blockElement) {
  if (!blockElement || typeof blockElement.querySelector !== "function") return null;
  return blockElement.querySelector("code, .cm-content");
}

function cgptExtractCodeBlockLanguage(codeElement, blockElement) {
  const candidates = [];
  if (codeElement && codeElement.classList) {
    candidates.push(...Array.from(codeElement.classList));
  }
  if (blockElement && blockElement.classList) {
    candidates.push(...Array.from(blockElement.classList));
  }
  for (const className of candidates) {
    const match = String(className || "").match(/(?:language-|lang-)([a-z0-9_+-]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }
  return "";
}

function cgptBuildUnnamedCodeBlockLabel(language, index = 0) {
  const order = Number.isFinite(index) ? index + 1 : 1;
  if (language) {
    return `${language}-block-${order}`;
  }
  return `code-block-${order}`;
}

function cgptBuildGeneratedCodeBlockPath(language, index = 0) {
  const baseName = cgptBuildUnnamedCodeBlockLabel(language, index);
  const extension = cgptGetCodeBlockExtension(language);
  return `chat-code-blocks/${baseName}.${extension}`;
}

function cgptGetCodeBlockExtension(language) {
  const normalized = String(language || "").trim().toLowerCase();
  const extensionMap = {
    bash: "sh",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    css: "css",
    go: "go",
    html: "html",
    java: "java",
    javascript: "js",
    js: "js",
    json: "json",
    jsx: "jsx",
    kotlin: "kt",
    markdown: "md",
    md: "md",
    php: "php",
    powershell: "ps1",
    ps1: "ps1",
    python: "py",
    py: "py",
    ruby: "rb",
    rust: "rs",
    shell: "sh",
    sql: "sql",
    swift: "swift",
    ts: "ts",
    typescript: "ts",
    tsx: "tsx",
    xml: "xml",
    yaml: "yml",
    yml: "yml",
  };
  return extensionMap[normalized] || "txt";
}

function cgptExtractHeadingSectionsFromElement(element) {
  const results = [];
  if (!element) return results;
  const headings = Array.from(element.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) return results;

  const headingInfos = headings
    .map((heading) => ({ heading, level: cgptGetHeadingLevel(heading) }))
    .filter((info) => info.level);
  if (!headingInfos.length) return results;

  const minLevel = headingInfos.reduce((acc, info) => Math.min(acc, info.level), Infinity);

  const roots = [];
  const stack = [];
  headingInfos.forEach((info, index) => {
    const { heading, level } = info;
    const nextHeading = headingInfos[index + 1] ? headingInfos[index + 1].heading : undefined;
    const normalizedLevel = level - minLevel + 1;
    const content = cgptExtractHeadingContent(heading, nextHeading);
    const node = {
      title: (heading.textContent || "").trim(),
      level: normalizedLevel,
      originalLevel: level,
      content,
      children: [],
    };
    while (stack.length && stack[stack.length - 1].level >= normalizedLevel) {
      stack.pop();
    }
    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  });

  return roots;
}

function cgptGetHeadingLevel(headingElement) {
  if (!headingElement || !headingElement.tagName) return 0;
  const match = headingElement.tagName.match(/^H(\d)$/i);
  if (!match) return 0;
  const level = Number.parseInt(match[1], 10);
  return Number.isFinite(level) ? level : 0;
}

function cgptExtractHeadingContent(heading, nextHeading) {
  const doc = heading && heading.ownerDocument ? heading.ownerDocument : document;
  if (!doc || typeof doc.createRange !== "function") return "";
  const range = doc.createRange();
  try {
    range.setStartAfter(heading);
    if (nextHeading) {
      range.setEndBefore(nextHeading);
    } else if (heading.parentNode && heading.parentNode.lastChild) {
      range.setEndAfter(heading.parentNode.lastChild);
    } else {
      return "";
    }
    return range.toString().trim();
  } catch (e) {
    return "";
  } finally {
    if (typeof range.detach === "function") {
      range.detach();
    }
  }
}

function cgptCountHeadingNodes(nodes) {
  let count = 0;
  const traverse = (list) => {
    list.forEach((node) => {
      count += 1;
      if (node.children && node.children.length) {
        traverse(node.children);
      }
    });
  };
  traverse(Array.isArray(nodes) ? nodes : []);
  return count;
}

function cgptExtractStandaloneUrlsFromElement(element) {
  const results = [];
  if (!element) return results;
  element.querySelectorAll("a[href]").forEach((anchor) => {
    if (anchor.closest("pre")) return;
    const href = anchor.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    const text = (anchor.textContent || "").trim();
    results.push({ url: href, text });
  });
  return results;
}

function cgptDeriveFileName(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function cgptBuildCodeMetaInfoText(content) {
  if (!content) {
    return "No code detected in this block.";
  }
  const normalized = cgptNormalizeChatLogLineEndings(content);
  const lines = normalized.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;
  const totalChars = normalized.length;
  const summaryParts = [];
  summaryParts.push(`Lines: ${lines.length}`);
  summaryParts.push(`Non-empty: ${nonEmptyLines}`);
  summaryParts.push(`Characters: ${totalChars}`);
  return summaryParts.join(" • ");
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptCreateSingleLinePreview,
    cgptExtractFormattedCodeBlocksFromElement,
    cgptExtractCodeBlockLanguage,
    cgptBuildUnnamedCodeBlockLabel,
    cgptBuildGeneratedCodeBlockPath,
    cgptGetCodeBlockExtension,
  };
}
