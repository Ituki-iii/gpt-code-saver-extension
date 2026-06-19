function cgptNormalizeAssistantDisplayLabel(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const cleaned = text
    .replace(/^chatgpt\s*/i, "")
    .replace(/\btemporary chat\b/gi, "")
    .replace(/\bnew chat\b/gi, "")
    .replace(/\bshare\b/gi, "")
    .replace(/\bsearch\b/gi, "")
    .trim();

  if (!cleaned) return "";

  const slugMatch = cleaned.match(/^gpt-(\d+)(?:-(\d+))?(?:-(.+))?$/i);
  if (slugMatch) {
    const [, major, minor, suffix] = slugMatch;
    const version = minor ? `${major}.${minor}` : major;
    const suffixText = suffix
      ? suffix
          .split("-")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "";
    return `GPT ${version}${suffixText ? ` ${suffixText}` : ""}`;
  }

  const gptMatch = cleaned.match(/\b(gpt[\s-]*\d(?:\.\d+)?(?:\s+[a-z0-9.-]+)*)\b/i);
  if (gptMatch && gptMatch[1]) {
    return gptMatch[1]
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (/^(o\d|o\d-mini|o\d-pro)/i.test(cleaned)) {
    return cleaned;
  }

  return cleaned.length <= 40 ? cleaned : cleaned.slice(0, 40).trim();
}

function cgptCollectAssistantDisplayLabelCandidates(entry, options = {}) {
  const candidates = [];
  const includeDomCandidates = options.includeDomCandidates === true;

  if (entry && entry.role === "user") {
    return ["User"];
  }

  if (entry && typeof entry.modelLabel === "string") {
    candidates.push(entry.modelLabel);
  }
  const element = entry && entry.element ? entry.element : null;
  if (element) {
    candidates.push(element.getAttribute("data-message-model-slug"));
    candidates.push(element.getAttribute("data-message-model-name"));
    candidates.push(element.getAttribute("data-model-slug"));
    candidates.push(element.getAttribute("data-model-name"));
    candidates.push(element.dataset ? element.dataset.messageModelSlug : "");
    candidates.push(element.dataset ? element.dataset.messageModelName : "");
    candidates.push(element.dataset ? element.dataset.modelSlug : "");
    candidates.push(element.dataset ? element.dataset.modelName : "");
  }

  if (entry && typeof entry.displayLabel === "string") {
    candidates.push(entry.displayLabel);
  }

  if (includeDomCandidates && typeof document !== "undefined") {
    [
      "[data-testid='model-switcher-dropdown-button']",
      "[data-testid='model-switcher']",
      "button[id*='model']",
      "button[aria-haspopup='menu']",
    ].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node && node.textContent) {
        candidates.push(node.textContent);
      }
    });
  }

  return candidates;
}

function cgptResolveAssistantDisplayLabel(entry, options = {}) {
  const fallback = options.fallback || "AI";
  const candidates = cgptCollectAssistantDisplayLabelCandidates(entry, options);
  for (const candidate of candidates) {
    const normalized = cgptNormalizeAssistantDisplayLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return fallback;
}

function cgptGetAssistantDisplayLabel(entry) {
  return cgptResolveAssistantDisplayLabel(entry, {
    includeDomCandidates: true,
    fallback: "AI",
  });
}

function cgptGetChatEntryDisplayLabel(entry) {
  return cgptResolveAssistantDisplayLabel(entry, {
    includeDomCandidates: false,
    fallback: "AI",
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptNormalizeAssistantDisplayLabel,
    cgptCollectAssistantDisplayLabelCandidates,
    cgptResolveAssistantDisplayLabel,
    cgptGetAssistantDisplayLabel,
    cgptGetChatEntryDisplayLabel,
  };
}
