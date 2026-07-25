function cgptShouldApplyHeadingFold(root) {
  if (!root || !(root.querySelectorAll instanceof Function)) return false;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  return headings.length > 0;
}

function cgptGetHeadingLevel(headingElement) {
  const tag = headingElement && headingElement.tagName ? headingElement.tagName.toUpperCase() : "";
  const match = tag.match(/^H(\d)$/);
  if (!match) return 0;
  const level = Number.parseInt(match[1], 10);
  return Number.isFinite(level) ? level : 0;
}

function cgptCollectHeadingSectionNodes(heading, nextHeading) {
  if (!heading || !heading.parentNode) return [];
  const nodes = [];
  let cursor = heading.nextSibling;
  while (cursor && cursor !== nextHeading) {
    nodes.push(cursor);
    cursor = cursor.nextSibling;
  }
  return nodes;
}

function cgptSetHeadingFoldOpen(heading, isOpen) {
  if (!heading) return;
  const open = isOpen !== false;
  heading.dataset.cgptHelperFoldOpen = open ? "1" : "0";
  heading.classList.toggle("cgpt-helper-heading-collapsed", !open);

  const toggleButton = heading.querySelector(".cgpt-helper-heading-toggle");
  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    toggleButton.setAttribute("aria-label", open ? "Collapse section" : "Expand section");
    toggleButton.title = open ? "Collapse section" : "Expand section";
  }
}

function cgptRefreshHeadingFoldVisibility(root) {
  if (!root || !(root.querySelectorAll instanceof Function)) return;
  const sections = Array.from(root.querySelectorAll(".cgpt-helper-heading-section"));
  const collapsedStack = [];

  sections.forEach((section) => {
    const heading = section.querySelector(".cgpt-helper-heading-fold");
    const body = section.querySelector(".cgpt-helper-heading-body");
    if (!heading) return;
    const level = Number.parseInt(heading.dataset.cgptHelperFoldLevel || "0", 10);
    if (!Number.isFinite(level) || level < 1) return;

    while (collapsedStack.length && collapsedStack[collapsedStack.length - 1].level >= level) {
      collapsedStack.pop();
    }

    const hiddenByAncestor = collapsedStack.length > 0;
    const isOpen = heading.dataset.cgptHelperFoldOpen !== "0";
    section.classList.toggle("cgpt-helper-heading-section-hidden", hiddenByAncestor);
    if (body) {
      body.classList.toggle("cgpt-helper-heading-section-hidden", !hiddenByAncestor && !isOpen);
    }

    if (!hiddenByAncestor && !isOpen) {
      collapsedStack.push({ level });
    }
  });
}

function applyHeadingFold(root, baseLevel = 0) {
  if (!root || !(root.querySelectorAll instanceof Function)) return;
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) return;

  const headingStack = [];

  headings.forEach((heading, index) => {
    if (heading.dataset.cgptHelperHeadingFoldApplied === "1") return;

    const level = cgptGetHeadingLevel(heading);
    if (!level) return;

    while (headingStack.length && headingStack[headingStack.length - 1] >= level) {
      headingStack.pop();
    }
    const parentVisualDepth = headingStack.length;
    const visualLevel = headingStack.length + 1;
    headingStack.push(level);

    const nextHeading = (() => {
      for (let i = index + 1; i < headings.length; i += 1) {
        if (cgptGetHeadingLevel(headings[i]) <= level) {
          return headings[i];
        }
      }
      return null;
    })();

    const headingId = `heading-${baseLevel}-${index}`;
    const sectionNodes = cgptCollectHeadingSectionNodes(heading, nextHeading);
    const section = document.createElement("section");
    const body = document.createElement("div");
    const guide = document.createElement("div");

    section.className = "cgpt-helper-heading-section";
    body.className = "cgpt-helper-heading-body";
    guide.className = "cgpt-helper-heading-guide";

    heading.dataset.cgptHelperHeadingId = headingId;
    heading.dataset.cgptHelperHeadingFoldApplied = "1";
    heading.classList.add("cgpt-helper-heading-fold", "cgpt-helper-heading-title");
    section.style.setProperty("--cgpt-helper-fold-visual-level", `${visualLevel}`);
    section.style.setProperty("--cgpt-helper-fold-guide-count", `${level}`);
    section.style.setProperty("--cgpt-helper-fold-level", `${visualLevel}`);
    section.style.setProperty(
      "--cgpt-helper-fold-indent",
      `${visualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
    );
    section.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(level));

    heading.style.setProperty("--cgpt-helper-fold-visual-level", `${visualLevel}`);
    heading.style.setProperty("--cgpt-helper-fold-guide-count", `${level}`);
    heading.style.setProperty(
      "--cgpt-helper-fold-indent",
      `${visualLevel > 1 ? CGPT_FOLD_INDENT_STEP_PX : 0}px`
    );
    heading.style.setProperty("--cgpt-helper-fold-color", cgptGetFoldLevelColor(level));
    heading.dataset.cgptHelperFoldLevel = `${level}`;
    guide.dataset.cgptHelperFoldDepth = `${parentVisualDepth}`;
    guide.dataset.cgptHelperFoldLevel = `${level}`;

    if (!heading.querySelector(":scope > .cgpt-helper-heading-toggle")) {
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "cgpt-helper-heading-toggle";
      toggleButton.dataset.cgptHelperFoldAction = "toggle";
      heading.insertBefore(toggleButton, heading.firstChild);
      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = heading.dataset.cgptHelperFoldOpen === "0";
        cgptSetHeadingFoldOpen(heading, nextOpen);
        cgptRefreshHeadingFoldVisibility(root);
      });
    }

    heading.parentNode.insertBefore(section, heading);
    section.appendChild(guide);
    section.appendChild(heading);
    section.appendChild(body);
    sectionNodes.forEach((node) => body.appendChild(node));

    cgptSetHeadingFoldOpen(heading, true);
  });

  cgptRefreshHeadingFoldVisibility(root);
}

function cgptFindHeadingFolds() {
  if (!document || typeof document.querySelectorAll !== "function") return [];
  return Array.from(document.querySelectorAll(".cgpt-helper-heading-fold"));
}

function cgptToggleHeadingFoldsAtLevel(level, shouldExpand = true) {
  const parsed = Number.parseInt(level, 10);
  if (!Number.isFinite(parsed)) return;
  const targetLevel = Math.min(Math.max(parsed, 1), 6);
  const affectedRoots = new Set();
  cgptFindHeadingFolds().forEach((fold) => {
    const foldLevel = Number.parseInt(fold.dataset.cgptHelperFoldLevel, 10);
    if (foldLevel === targetLevel) {
      cgptSetHeadingFoldOpen(fold, shouldExpand);
      const root =
        fold.closest("[data-message-author-role]") ||
        fold.closest("section[data-testid^='conversation-turn-']") ||
        fold.closest("[data-cgpt-helper-chat-overlay-applied='1']") ||
        fold.closest(".cgpt-helper-message-body");
      if (root) {
        affectedRoots.add(root);
      }
    }
  });
  affectedRoots.forEach((root) => cgptRefreshHeadingFoldVisibility(root));
}
