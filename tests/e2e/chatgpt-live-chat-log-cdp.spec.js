const { test, expect, chromium } = require("@playwright/test");

const DEFAULT_TARGET_URL = "https://chatgpt.com/c/6a259002-edcc-83a8-a0a1-0ae9c1df883d";
const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const TARGET_TEXT = "はい。まず 1手順だけです。";

test("checks live Chat Log density through the extension UI @live", async () => {
  test.setTimeout(90_000);

  const browser = await chromium.connectOverCDP(process.env.CGPT_CDP_URL || DEFAULT_CDP_URL);
  try {
    const context = browser.contexts()[0] || (await browser.newContext());
    const page =
      context.pages().find((candidate) => candidate.url().includes("chatgpt.com")) ||
      (await context.newPage());

    await page.goto(process.env.CGPT_CHAT_LOG_URL || DEFAULT_TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForSelector("#cgpt-helper-panel-toggle", { timeout: 30_000 });
    await page.waitForTimeout(5_000);

    const panelVisible = await page.locator("#cgpt-code-helper-panel").isVisible().catch(() => false);
    if (!panelVisible) {
      await page.locator("#cgpt-helper-panel-toggle").click();
    }

    await page.getByRole("button", { name: "Chat Log" }).click();
    await page.waitForSelector("#cgpt-helper-chatlog-modal", { timeout: 10_000 });

    const state = await page.evaluate((targetText) => {
      const messages = [...document.querySelectorAll("[data-message-author-role]")];
      const isVisibleMessageRegion = (message) => {
        const rects = [...message.getClientRects()];
        return rects.some((rect) => rect.width >= 24 && rect.height >= 12);
      };
      const getCleanMessageText = (message) => {
        const clone = message.cloneNode(true);
        clone
          .querySelectorAll(
            [
              "[data-cgpt-helper-chat-badge='1']",
              ".cgpt-helper-chatlog-timestamp-wrapper",
              ".cgpt-helper-fold-actions",
            ].join(",")
          )
          .forEach((node) => node.remove());
        return String(clone.innerText || clone.textContent || "").trim();
      };
      const chatLabels = messages.map((message, index) => {
        const role = message.getAttribute("data-message-author-role") || "";
        const text = getCleanMessageText(message);
        const badge = message.querySelector(":scope > [data-cgpt-helper-chat-badge='1'] span");
        const foldBadge = message.querySelector(":scope > .cgpt-helper-fold .cgpt-helper-fold-title-badge");
        const rect = message.getBoundingClientRect();
        const shortText = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 4);
        return {
          role,
          modelSlug:
            message.getAttribute("data-message-model-slug") ||
            message.getAttribute("data-model-slug") ||
            "",
          modelName:
            message.getAttribute("data-message-model-name") ||
            message.getAttribute("data-model-name") ||
            "",
          helperModelLabel: message.dataset ? message.dataset.cgptHelperModelLabel || "" : "",
          badgeLabel: badge ? String(badge.textContent || "").trim() : "",
          foldBadgeLabel: foldBadge ? String(foldBadge.textContent || "").trim() : "",
          index,
          visibleRegion: isVisibleMessageRegion(message),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          shortText,
        };
      });
      const visibleChatRegions = chatLabels.filter((item) => item.visibleRegion);
      const turnRegions = [
        ...document.querySelectorAll("section[data-testid^='conversation-turn-']"),
      ].map((section, index) => {
        const roleNode = section.querySelector("[data-message-author-role]");
        const rect = section.getBoundingClientRect();
        const turnId = section.getAttribute("data-testid") || "";
        const turnNumberMatch = turnId.match(/conversation-turn-(\d+)/);
        const text = roleNode ? getCleanMessageText(roleNode) : "";
        return {
          index,
          turnId,
          turnNumber: turnNumberMatch ? Number(turnNumberMatch[1]) : index,
          role: roleNode ? roleNode.getAttribute("data-message-author-role") || "" : "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visibleRegion: rect.width >= 24 && rect.height >= 12,
          shortText: text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 4),
        };
      });
      const sortedVisibleTurns = turnRegions
        .filter((item) => item.visibleRegion && item.role)
        .sort((a, b) => a.turnNumber - b.turnNumber);
      const roleSequenceIssues = [];
      sortedVisibleTurns.forEach((item, sequenceIndex) => {
        const previous = sortedVisibleTurns[sequenceIndex - 1];
        if (previous && previous.role === item.role) {
          roleSequenceIssues.push({
            previous,
            current: item,
          });
        }
      });
      const modal = document.querySelector("#cgpt-helper-chatlog-modal");
      const dialog = modal ? modal.firstElementChild : null;
      const list = dialog ? dialog.children[1] : null;
      const fold = modal ? modal.querySelector(".cgpt-helper-fold") : null;
      const foldBody = fold ? fold.querySelector(".cgpt-helper-fold-body") : null;
      const detailCard = modal ? modal.querySelector(".cgpt-helper-fold-body > div > div") : null;
      const messageBody = modal ? modal.querySelector(".cgpt-helper-fold-body > div") : null;
      const modalLabels = modal
        ? [...modal.querySelectorAll(".cgpt-helper-fold-title")]
            .map((node) => {
              const badge = node.querySelector("span");
              return badge ? String(badge.textContent || "").trim() : "";
            })
            .filter(Boolean)
        : [];
      const normalizeForSearch = (value) => String(value || "").replace(/\s+/g, "");
      const normalizedTargetText = normalizeForSearch(targetText);
      const findTextMatches = (root) => {
        if (!root) return [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const matches = [];
        while (walker.nextNode()) {
          const text = String(walker.currentNode.nodeValue || "");
          if (!normalizeForSearch(text).includes(normalizedTargetText)) continue;
          const element = walker.currentNode.parentElement;
          const message = element ? element.closest("[data-message-author-role]") : null;
          const turn = element ? element.closest("section[data-testid^='conversation-turn-']") : null;
          const foldEntry = element ? element.closest(".cgpt-helper-fold") : null;
          const rect = element ? element.getBoundingClientRect() : null;
          matches.push({
            text,
            messageRole: message ? message.getAttribute("data-message-author-role") || "" : "",
            turnId: turn ? turn.getAttribute("data-testid") || "" : "",
            foldLabel: foldEntry
              ? String((foldEntry.querySelector(".cgpt-helper-fold-title span") || {}).textContent || "").trim()
              : "",
            visible: rect ? rect.width >= 1 && rect.height >= 1 : false,
            width: rect ? Math.round(rect.width) : 0,
            height: rect ? Math.round(rect.height) : 0,
          });
        }
        return matches;
      };
      const findTextCandidates = (root) => {
        if (!root) return [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const candidates = [];
        while (walker.nextNode()) {
          const text = String(walker.currentNode.nodeValue || "").replace(/\s+/g, " ").trim();
          if (!text.includes("まず")) continue;
          const element = walker.currentNode.parentElement;
          const message = element ? element.closest("[data-message-author-role]") : null;
          const turn = element ? element.closest("section[data-testid^='conversation-turn-']") : null;
          candidates.push({
            text,
            messageRole: message ? message.getAttribute("data-message-author-role") || "" : "",
            turnId: turn ? turn.getAttribute("data-testid") || "" : "",
          });
        }
        return candidates.slice(0, 20);
      };
      const chatTargetMatches = findTextMatches(document.body).filter(
        (match) => match.messageRole || match.turnId
      );
      const modalTargetMatches = findTextMatches(modal);
      const chatTextCandidates = findTextCandidates(document.body);
      const modalTextCandidates = findTextCandidates(modal);
      const modalRows = modal
        ? [...modal.querySelectorAll(".cgpt-helper-fold")].map((fold, index) => {
            const label = String(
              (fold.querySelector(".cgpt-helper-fold-title span") || {}).textContent || ""
            ).trim();
            const body = String(
              (fold.querySelector(".cgpt-helper-fold-body") || {}).innerText || ""
            )
              .replace(/\s+/g, " ")
              .trim();
            return {
              index,
              label,
              body: body.slice(0, 300),
              hasMazu: body.includes("まず"),
              hasTarget: normalizeForSearch(body).includes(normalizedTargetText),
              hasYouSaidOnly: /^You said:\s*$/.test(body),
              hasChatGptPrefix: body.includes("ChatGPT said:"),
              hasThoughtTime: body.includes("思考時間:"),
            };
          })
        : [];

      const styleOf = (node) => {
        if (!node) return null;
        const style = getComputedStyle(node);
        return {
          padding: style.padding,
          gap: style.gap,
          marginTop: style.marginTop,
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
        };
      };

      return {
        modalPresent: Boolean(modal),
        entryCount: modal ? modal.querySelectorAll(".cgpt-helper-fold").length : 0,
        chatMessageCount: visibleChatRegions.length,
        chatRoleCounts: visibleChatRegions
          .reduce((acc, item) => {
            acc[item.role] = (acc[item.role] || 0) + 1;
            return acc;
          }, {}),
        visibleChatRegions: visibleChatRegions.map((item) => ({
          index: item.index,
          role: item.role,
          width: item.width,
          height: item.height,
          badgeLabel: item.badgeLabel,
          shortText: item.shortText,
        })),
        sortedVisibleTurns: sortedVisibleTurns.map((item) => ({
          turnId: item.turnId,
          turnNumber: item.turnNumber,
          role: item.role,
          width: item.width,
          height: item.height,
          shortText: item.shortText,
        })),
        roleSequenceIssues: roleSequenceIssues.map((issue) => ({
          previous: {
            index: issue.previous.index,
            role: issue.previous.role,
            width: issue.previous.width,
            height: issue.previous.height,
            shortText: issue.previous.shortText,
          },
          current: {
            index: issue.current.index,
            role: issue.current.role,
            width: issue.current.width,
            height: issue.current.height,
            shortText: issue.current.shortText,
          },
        })),
        modalRoleCounts: modalLabels.reduce((acc, label) => {
          const role = label === "User" ? "user" : "assistant";
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {}),
        chatTargetMatches,
        modalTargetMatches,
        chatTextCandidates,
        modalTextCandidates,
        modalRows,
        chatLabels,
        modalLabels,
        dialog: styleOf(dialog),
        list: styleOf(list),
        fold: styleOf(fold),
        foldBody: styleOf(foldBody),
        detailCard: styleOf(detailCard),
        messageBody: styleOf(messageBody),
      };
    }, TARGET_TEXT);

    console.log(JSON.stringify({
      chatMessageCount: state.chatMessageCount,
      chatRoleCounts: state.chatRoleCounts,
      chatLogEntryCount: state.entryCount,
      chatLogRoleCounts: state.modalRoleCounts,
      roleSequenceIssueCount: state.roleSequenceIssues.length,
      firstRoleSequenceIssue: state.roleSequenceIssues[0] || null,
      chatTargetMatches: state.chatTargetMatches,
      modalTargetMatches: state.modalTargetMatches,
      chatTextCandidateCount: state.chatTextCandidates.length,
      modalTextCandidateCount: state.modalTextCandidates.length,
      modalRowsWithMazu: state.modalRows
        .filter((row) => row.hasMazu)
        .map((row) => ({ index: row.index, label: row.label })),
      assistantModalRowCount: state.modalRows.filter((row) => /^GPT|^AI|^o\d/i.test(row.label)).length,
      emptyUserRows: state.modalRows.filter((row) => row.hasYouSaidOnly).length,
      assistantRowsWithPrefixes: state.modalRows
        .filter((row) => /^GPT|^AI|^o\d/i.test(row.label) && (row.hasChatGptPrefix || row.hasThoughtTime))
        .map((row) => ({ index: row.index, label: row.label, body: row.body })),
    }, null, 2));

    expect(state.modalPresent).toBe(true);
    expect(state.entryCount).toBeGreaterThan(0);
    expect(state.entryCount).toBe(state.chatMessageCount);
    expect(state.modalRoleCounts).toEqual(state.chatRoleCounts);
    expect(state.chatLabels.some((item) => item.role === "user" && item.badgeLabel)).toBe(false);
    expect(
      state.chatLabels.some(
        (item) =>
          item.role === "assistant" &&
          /^GPT|^AI|^o\d/i.test(item.badgeLabel || item.foldBadgeLabel)
      )
    ).toBe(true);
    expect(state.modalLabels.some((label) => label === "User")).toBe(true);
    expect(state.modalLabels.some((label) => /^GPT|^AI|^o\d/i.test(label))).toBe(true);
    expect(state.modalRows.some((row) => row.hasYouSaidOnly)).toBe(false);
    expect(
      state.modalRows.some(
        (row) => /^GPT|^AI|^o\d/i.test(row.label) && (row.hasChatGptPrefix || row.hasThoughtTime)
      )
    ).toBe(false);
    if (state.chatTargetMatches.length > 0) {
      expect(state.chatTargetMatches.some((match) => match.messageRole === "assistant")).toBe(true);
      expect(state.modalTargetMatches.length).toBeGreaterThan(0);
      expect(state.modalTargetMatches.some((match) => /^GPT|^AI|^o\d/i.test(match.foldLabel))).toBe(true);
    }
    expect(state.dialog.padding).toBe("14px");
    expect(state.dialog.gap).toBe("8px");
    expect(state.list.gap).toBe("6px");
    expect(state.fold.padding).toBe("8px 10px");
    expect(state.fold.borderRadius).toBe("10px");
    expect(state.foldBody.marginTop).toBe("6px");
    expect(state.foldBody.gap).toBe("6px");
    expect(state.messageBody.fontSize).toBeTruthy();
  } finally {
    await browser.close();
  }
});
