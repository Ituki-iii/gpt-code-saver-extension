function cgptGetCodeTextContainer(element) {
  if (!element) return null;
  if (element.matches && element.matches("code, .cm-content")) {
    return element;
  }
  if (typeof element.querySelector === "function") {
    return element.querySelector("code, .cm-content");
  }
  return null;
}

function cgptIsCodeHelperTextNode(node) {
  if (!node || !node.matches) return false;
  return node.matches(
    [
      "[data-cgpt-code-actions='1']",
      "[data-cgpt-code-collapse-cue='1']",
      "[data-cgpt-code-collapse-top-cue='1']",
      "[data-cgpt-code-toggle='1']",
      "[data-cgpt-code-file-path='1']",
    ].join(",")
  );
}

function cgptReadCodeTextWithoutHelperNodes(textContainer) {
  if (!textContainer) return "";
  if (typeof textContainer.cloneNode !== "function") {
    return textContainer.innerText || textContainer.textContent || "";
  }
  const clone = textContainer.cloneNode(true);
  if (clone && typeof clone.querySelectorAll === "function") {
    clone
      .querySelectorAll(
        [
          "[data-cgpt-code-actions='1']",
          "[data-cgpt-code-collapse-cue='1']",
          "[data-cgpt-code-collapse-top-cue='1']",
          "[data-cgpt-code-toggle='1']",
          "[data-cgpt-code-file-path='1']",
        ].join(",")
      )
      .forEach((node) => node.remove());
  }
  return clone.innerText || clone.textContent || "";
}

function cgptGetRawCodeText(element) {
  const textContainer = cgptGetCodeTextContainer(element) || element;
  return cgptReadCodeTextWithoutHelperNodes(textContainer);
}

function cgptParseCodeBlockMetadata(_code) {
  return null;
}

function cgptExtractFirstLine(text) {
  const newlineIndex = text.indexOf("\n");
  const firstLineRaw = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  const remainingText = newlineIndex === -1 ? "" : text.slice(newlineIndex + 1);
  return { firstLineRaw, remainingText };
}

function cgptGetNormalizedCodeText(code) {
  if (!code) return "";
  const text = cgptGetRawCodeText(code);
  return text.replace(/\r\n/g, "\n");
}

function cgptGetDisplayCodeText(code) {
  return cgptGetNormalizedCodeText(code);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptGetCodeTextContainer,
    cgptIsCodeHelperTextNode,
    cgptReadCodeTextWithoutHelperNodes,
    cgptGetRawCodeText,
    cgptParseCodeBlockMetadata,
    cgptGetNormalizedCodeText,
    cgptGetDisplayCodeText,
  };
}
