"use strict";

/* ── MRU Tab Order ── */

let tabOrder = [];
const screenshots = new Map();

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  tabOrder = tabOrder.filter(id => id !== tabId);
  tabOrder.unshift(tabId);
  setTimeout(() => captureCurrentTab(), 300);
  setTimeout(() => captureCurrentTab(), 1500);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    setTimeout(() => captureCurrentTab(), 300);
  }
});

async function captureCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 50 });
    screenshots.set(tab.id, dataUrl);
  } catch (_) { /* restricted page */ }
}

async function initTabOrder() {
  const tabs = await chrome.tabs.query({});
  const existing = new Set(tabOrder);
  for (const t of tabs) {
    if (!existing.has(t.id)) tabOrder.push(t.id);
  }
  const allIds = new Set(tabs.map(t => t.id));
  tabOrder = tabOrder.filter(id => allIds.has(id));
  captureCurrentTab();
}

chrome.runtime.onStartup.addListener(initTabOrder);
chrome.runtime.onInstalled.addListener(initTabOrder);
initTabOrder();

function sortByMRU(tabs) {
  return [...tabs].sort((a, b) => {
    const ai = tabOrder.indexOf(a.id);
    const bi = tabOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/* ── Tab Groups ── */

async function getGroupInfo(groupId) {
  if (groupId === -1 || groupId === undefined) return null;
  try {
    const g = await chrome.tabGroups.get(groupId);
    return { id: g.id, title: g.title || "Unnamed Group", color: g.color };
  } catch (_) { return null; }
}

/* ── Custom Tab Names ── */

const tabCustomNames = new Map();

function getTabCustomName(tabId) {
  return tabCustomNames.get(tabId) || null;
}

async function setTabCustomName(tabId, name) {
  if (typeof name === "string" && name.length > 0) {
    tabCustomNames.set(tabId, name.slice(0, 200));
  } else {
    tabCustomNames.delete(tabId);
  }
  await persistNames();
}

let _persistChain = Promise.resolve();

function persistNames() {
  _persistChain = _persistChain.then(_doPersist).catch(() => {});
  return _persistChain;
}

async function _doPersist() {
  const allTabs = await chrome.tabs.query({});
  const entries = [];
  for (const tab of allTabs) {
    const name = tabCustomNames.get(tab.id);
    if (name && tab.url) {
      let groupTitle = null;
      if (tab.groupId !== -1 && tab.groupId !== undefined) {
        const g = await getGroupInfo(tab.groupId);
        if (g) groupTitle = g.title;
      }
      entries.push({ url: tab.url, name, groupTitle, index: tab.index });
    }
  }
  await chrome.storage.local.set({ persistedNames2: entries });
}

async function restoreNames() {
  const data = await chrome.storage.local.get({ persistedNames2: [] });
  const entries = data.persistedNames2;
  if (!Array.isArray(entries) || !entries.length) return;

  const allTabs = await chrome.tabs.query({});
  const tabGroupTitles = new Map();
  for (const tab of allTabs) {
    if (tab.groupId !== -1 && tab.groupId !== undefined) {
      if (!tabGroupTitles.has(tab.groupId)) {
        const g = await getGroupInfo(tab.groupId);
        tabGroupTitles.set(tab.groupId, g ? g.title : null);
      }
    }
  }

  const usedEntries = new Set();
  const usedTabs = new Set();
  const pairs = [];

  for (let ei = 0; ei < entries.length; ei++) {
    const entry = entries[ei];
    if (!entry || typeof entry.url !== "string") continue;
    for (const tab of allTabs) {
      if (tab.url !== entry.url) continue;
      let score = 0;
      const tabGroup = tabGroupTitles.get(tab.groupId) || null;
      if (entry.groupTitle === tabGroup) score += 100;
      score += Math.max(0, 20 - Math.abs(tab.index - (entry.index || 0)));
      pairs.push({ ei, tabId: tab.id, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  for (const p of pairs) {
    if (usedEntries.has(p.ei) || usedTabs.has(p.tabId)) continue;
    const name = entries[p.ei].name;
    if (typeof name === "string" && name.length > 0) {
      tabCustomNames.set(p.tabId, name.slice(0, 200));
    }
    usedEntries.add(p.ei);
    usedTabs.add(p.tabId);
  }
}

// Restore names with retry — tabs may not have URLs yet on startup
async function restoreNamesWithRetry() {
  // Try immediately, then retry after delays for tabs still loading
  for (const delay of [0, 1000, 3000, 6000]) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    await restoreNames();
  }
}

chrome.runtime.onStartup.addListener(restoreNamesWithRetry);
chrome.runtime.onInstalled.addListener(restoreNamesWithRetry);
restoreNamesWithRetry();

/* ── Tab Cleanup ── */

chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabOrder = tabOrder.filter(id => id !== tabId);
  screenshots.delete(tabId);
  if (tabCustomNames.has(tabId)) {
    tabCustomNames.delete(tabId);
    await persistNames();
  }
});

/* ── Build Tab Data ── */

async function buildTabData() {
  const settings = await chrome.storage.local.get({ sortOrder: "recent" });
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const sorted = settings.sortOrder === "tab-bar"
    ? [...allTabs].sort((a, b) => a.index - b.index)
    : sortByMRU(allTabs);
  const groupMap = new Map();
  for (const tab of sorted) {
    if (tab.groupId !== -1 && tab.groupId !== undefined && !groupMap.has(tab.groupId)) {
      const info = await getGroupInfo(tab.groupId);
      if (info) groupMap.set(tab.groupId, info);
    }
  }
  const tabData = sorted.map(tab => {
    const customName = getTabCustomName(tab.id);
    return {
      id: tab.id,
      title: customName || tab.title || "Untitled",
      originalTitle: tab.title || "Untitled",
      customName: customName,
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || "",
      active: tab.active,
      groupId: tab.groupId || -1,
      screenshot: screenshots.get(tab.id) || null
    };
  });
  const groups = [{ id: -1, title: "All Tabs", color: "grey" }];
  for (const [, g] of groupMap) groups.push(g);
  return { tabs: tabData, groups };
}

/* ── Overlay Injection ── */

const RESTRICTED_PREFIXES = ["edge://", "chrome://", "about:", "chrome-extension://"];
let overlayTabId = null;

function isRestrictedUrl(url) {
  return RESTRICTED_PREFIXES.some(p => url.startsWith(p));
}

async function injectOverlay(tabId, tabUrl, direction) {
  if (!tabUrl || isRestrictedUrl(tabUrl)) return;

  try {
    if (overlayTabId === tabId) {
      await chrome.tabs.sendMessage(tabId, { action: "ts-move", direction });
    } else {
      const data = await buildTabData();
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/overlay.css"] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ["src/overlay.js"] });
      await new Promise(r => setTimeout(r, 100));
      await chrome.tabs.sendMessage(tabId, {
        action: "ts-open", tabs: data.tabs, groups: data.groups, direction
      });
      overlayTabId = tabId;
    }
  } catch (_) {
    overlayTabId = null;
  }
}

/* ── Icon Click ── */

chrome.action.onClicked.addListener(async (tab) => {
  await injectOverlay(tab.id, tab.url || "", "next");
});

/* ── Keyboard Commands ── */

chrome.commands.onCommand.addListener(async (command) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  if (command === "rename-tab") {
    if (!activeTab.url || isRestrictedUrl(activeTab.url)) return;
    try {
      await chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ["src/overlay.css"] });
      await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ["src/rename.js"] });
      await new Promise(r => setTimeout(r, 50));
      await chrome.tabs.sendMessage(activeTab.id, {
        action: "ts-rename",
        tabId: activeTab.id,
        currentName: getTabCustomName(activeTab.id) || "",
        originalTitle: activeTab.title || "Untitled"
      });
    } catch (_) { /* page not ready */ }
    return;
  }

  if (command === "switch-next" || command === "switch-prev") {
    const direction = command === "switch-next" ? "next" : "prev";
    await injectOverlay(activeTab.id, activeTab.url || "", direction);
  }
});

/* ── Message Handler ── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.action !== "string") return;

  if (msg.action === "get-tabs") {
    buildTabData().then(data => sendResponse(data));
    return true;
  }

  if (msg.action === "switch-tab") {
    const tabId = Number(msg.tabId);
    if (!Number.isInteger(tabId) || tabId <= 0) return;
    chrome.tabs.update(tabId, { active: true });
    overlayTabId = null;
    sendResponse({ success: true });
  }

  if (msg.action === "ts-closed") {
    overlayTabId = null;
  }

  if (msg.action === "save-name") {
    const tabId = Number(msg.tabId);
    if (!Number.isInteger(tabId) || tabId <= 0) return;
    const name = typeof msg.name === "string" ? msg.name.trim() : "";
    setTabCustomName(tabId, name).then(() => sendResponse({ ok: true }));
    return true;
  }
});
