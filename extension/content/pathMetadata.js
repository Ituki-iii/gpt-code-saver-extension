(function initCgptPathMetadata(root) {
  const CGPT_PATH_METADATA_PATTERN = /^PATH:\s*(.+)$/;

  function cgptNormalizePathMetadataText(text) {
    return String(text || "").replace(/\r\n/g, "\n");
  }

  function cgptParsePathMetadataLine(text) {
    const normalized = cgptNormalizePathMetadataText(text).trim();
    if (!normalized || normalized.includes("\n")) {
      return null;
    }
    const match = normalized.match(CGPT_PATH_METADATA_PATTERN);
    if (!match) {
      return null;
    }
    const filePath = match[1].trim();
    if (!filePath) {
      return null;
    }
    return { filePath };
  }

  function cgptIsWhitespaceOnlyNode(node) {
    if (!node) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      return !String(node.textContent || "").trim();
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return !String(node.textContent || "").trim();
    }
    return true;
  }

  function cgptIsPathMetadataIgnoredNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE || typeof node.matches !== "function") {
      return false;
    }
    return node.matches(
      [
        "[data-cgpt-code-header='1']",
        "[data-cgpt-code-label-host='1']",
        "[data-cgpt-code-actions-host='1']",
        "[data-cgpt-code-actions='1']",
        "[data-cgpt-code-file-path='1']",
        "[data-cgpt-code-collapse-cue='1']",
        "[data-cgpt-code-collapse-top-cue='1']",
      ].join(",")
    );
  }

  function cgptGetPreviousSignificantSibling(startNode, boundaryRoot = null) {
    let current = startNode;
    while (current && current !== boundaryRoot) {
      let previous = current.previousSibling || null;
      while (previous) {
        if (
          !cgptIsWhitespaceOnlyNode(previous) &&
          !cgptIsPathMetadataIgnoredNode(previous)
        ) {
          return previous;
        }
        previous = previous.previousSibling || null;
      }
      current = current.parentNode || current.parentElement || null;
    }
    return null;
  }

  function cgptResolvePathMetadataBoundary(node) {
    if (!node || typeof node.closest !== "function") {
      return node && node.parentElement ? node.parentElement : null;
    }
    return (
      node.closest("[data-message-author-role]") ||
      node.closest("section[data-testid^='conversation-turn-']") ||
      node.closest("main") ||
      node.parentElement ||
      null
    );
  }

  function cgptReadPathMetadataNodeText(node) {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) {
      return cgptNormalizePathMetadataText(node.textContent || "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    if (
      typeof node.querySelector === "function" &&
      node.querySelector("pre, code, .cm-content")
    ) {
      return "";
    }
    return cgptNormalizePathMetadataText(node.textContent || "");
  }

  function cgptResolvePathMetadataForBlock(blockElement, options = {}) {
    if (!blockElement) return null;
    const boundaryRoot = options.boundaryRoot || cgptResolvePathMetadataBoundary(blockElement);
    const previousNode = cgptGetPreviousSignificantSibling(blockElement, boundaryRoot);
    if (!previousNode) {
      return null;
    }
    const parsed = cgptParsePathMetadataLine(cgptReadPathMetadataNodeText(previousNode));
    if (!parsed) {
      return null;
    }
    const validateFilePath =
      typeof root.cgptValidateFilePath === "function" ? root.cgptValidateFilePath : null;
    if (validateFilePath) {
      const validation = validateFilePath(parsed.filePath);
      if (!validation.ok) {
        return null;
      }
      return {
        filePath: validation.filePath || parsed.filePath,
        node: previousNode,
        source: "path-line",
      };
    }
    return {
      filePath: parsed.filePath,
      node: previousNode,
      source: "path-line",
    };
  }

  function cgptGetPathMetadataDisplayTarget(node) {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) {
      return node;
    }
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
      return node.parentElement;
    }
    return null;
  }

  function cgptSetPathMetadataVisibility(node, hidden) {
    const target = cgptGetPathMetadataDisplayTarget(node);
    if (!target || !target.style) {
      return false;
    }
    if (hidden) {
      if (target.dataset.cgptPathMetadataHidden !== "1") {
        target.dataset.cgptPathMetadataOriginalDisplay = target.style.display || "";
      }
      target.dataset.cgptPathMetadataHidden = "1";
      target.style.display = "none";
      target.setAttribute("aria-hidden", "true");
      return true;
    }
    if (target.dataset.cgptPathMetadataHidden === "1") {
      target.style.display = target.dataset.cgptPathMetadataOriginalDisplay || "";
      delete target.dataset.cgptPathMetadataOriginalDisplay;
      delete target.dataset.cgptPathMetadataHidden;
      target.removeAttribute("aria-hidden");
      return true;
    }
    return false;
  }

  root.cgptNormalizePathMetadataText = cgptNormalizePathMetadataText;
  root.cgptParsePathMetadataLine = cgptParsePathMetadataLine;
  root.cgptResolvePathMetadataBoundary = cgptResolvePathMetadataBoundary;
  root.cgptResolvePathMetadataForBlock = cgptResolvePathMetadataForBlock;
  root.cgptGetPathMetadataDisplayTarget = cgptGetPathMetadataDisplayTarget;
  root.cgptSetPathMetadataVisibility = cgptSetPathMetadataVisibility;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      cgptNormalizePathMetadataText,
      cgptParsePathMetadataLine,
      cgptResolvePathMetadataBoundary,
      cgptResolvePathMetadataForBlock,
      cgptGetPathMetadataDisplayTarget,
      cgptSetPathMetadataVisibility,
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
