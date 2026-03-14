(function() {
  "use strict";
  if (document.getElementById("ts-overlay")) return;

  var GC = {
    grey:"#5f6368", blue:"#1a73e8", red:"#d93025", yellow:"#f9ab00",
    green:"#188038", pink:"#d01884", purple:"#7627bb", cyan:"#007b83", orange:"#e8710a"
  };

  var allTabs = [], groups = [], currentTabs = [], selectedIndex = 0;
  var activeGroupId = -1, chipIds = [];

  function open(tabs, grps, direction) {
    allTabs = tabs;
    groups = grps;
    var act = allTabs.find(function(t) { return t.active; });
    activeGroupId = (act && act.groupId !== -1) ? act.groupId : "ungrouped";
    applyFilter(direction);
  }

  function applyFilter(direction) {
    if (activeGroupId === -1) currentTabs = allTabs.slice();
    else if (activeGroupId === "ungrouped") currentTabs = allTabs.filter(function(t) { return t.groupId === -1; });
    else currentTabs = allTabs.filter(function(t) { return t.groupId === activeGroupId; });

    if (direction === "prev") selectedIndex = currentTabs.length > 1 ? currentTabs.length - 1 : 0;
    else selectedIndex = currentTabs.length > 1 ? 1 : 0;
    render();
  }

  function render() {
    var overlay = document.getElementById("ts-overlay");
    var box;
    var pageZoom = window.outerWidth / window.innerWidth;
    var zoomFactor = 1.1 / pageZoom;
    var maxBoxHeight = (window.screen.height * 0.70) / zoomFactor;

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "ts-overlay";
      box = document.createElement("div");
      box.id = "ts-box";
      box.style.zoom = zoomFactor;
      box.style.maxHeight = maxBoxHeight + "px";
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    } else {
      box = document.getElementById("ts-box");
      box.style.zoom = zoomFactor;
      box.style.maxHeight = maxBoxHeight + "px";
      box.innerHTML = "";
    }

    /* Group chips */
    var gbar = document.createElement("div");
    gbar.id = "ts-groups";
    var ungroupedCount = allTabs.filter(function(t) { return t.groupId === -1; }).length;
    var chips = [{ id: -1, title: "All Tabs", color: null, count: allTabs.length }];
    if (ungroupedCount > 0) chips.push({ id: "ungrouped", title: "Ungrouped", color: null, count: ungroupedCount });
    groups.forEach(function(g) {
      if (g.id === -1) return;
      chips.push({ id: g.id, title: g.title, color: g.color, count: allTabs.filter(function(t) { return t.groupId === g.id; }).length });
    });
    chipIds = chips.map(function(c) { return c.id; });
    chips.forEach(function(c) {
      var btn = document.createElement("button");
      btn.className = "ts-gchip" + (c.id === activeGroupId ? " ts-gactive" : "");
      btn.textContent = c.title + " (" + c.count + ")";
      if (c.color) btn.style.setProperty("--gc", GC[c.color] || GC.grey);
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        activeGroupId = c.id;
        applyFilter("next");
      });
      gbar.appendChild(btn);
    });
    box.appendChild(gbar);

    /* Tab list */
    var list = document.createElement("div");
    list.id = "ts-list";
    currentTabs.forEach(function(tab, i) {
      var row = document.createElement("div");
      row.className = "ts-row" + (i === selectedIndex ? " ts-sel" : "");

      var fav = document.createElement("img");
      fav.className = "ts-row-fav";
      fav.src = tab.favIconUrl || "";
      fav.onerror = function() { this.style.display = "none"; };
      row.appendChild(fav);

      var text = document.createElement("div");
      text.className = "ts-row-text";

      var title = document.createElement("div");
      title.className = "ts-row-title";
      title.textContent = tab.title;
      if (tab.customName) {
        var badge = document.createElement("span");
        badge.className = "ts-row-edited";
        badge.textContent = "\u270E";
        title.appendChild(badge);
      }

      var url = document.createElement("div");
      url.className = "ts-row-url";
      url.textContent = tab.url;

      text.appendChild(title);
      text.appendChild(url);
      row.appendChild(text);

      if (tab.active) {
        var dot = document.createElement("span");
        dot.className = "ts-row-dot";
        dot.textContent = "\u25CF";
        row.appendChild(dot);
      }

      row.addEventListener("click", function() { switchTo(i); });
      row.addEventListener("mouseenter", function() { updateSel(i); });
      list.appendChild(row);
    });
    box.appendChild(list);
  }

  function updateSel(idx) {
    selectedIndex = idx;
    var rows = document.querySelectorAll(".ts-row");
    for (var i = 0; i < rows.length; i++) {
      if (i === idx) rows[i].classList.add("ts-sel");
      else rows[i].classList.remove("ts-sel");
    }
    var sel = document.querySelector(".ts-row.ts-sel");
    if (sel) sel.scrollIntoView({ block: "nearest", behavior: "instant" });
  }

  function move(direction) {
    var len = currentTabs.length;
    if (!len) return;
    if (direction === "next") updateSel((selectedIndex + 1) % len);
    else updateSel((selectedIndex - 1 + len) % len);
  }

  function cycleGroup(dir) {
    if (chipIds.length <= 1) return;
    var idx = chipIds.indexOf(activeGroupId);
    if (idx === -1) idx = 0;
    var next = (idx + dir + chipIds.length) % chipIds.length;
    activeGroupId = chipIds[next];
    applyFilter("next");
  }

  function sendMsg(data) {
    try { chrome.runtime.sendMessage(data); } catch (_) { /* extension context invalidated */ }
  }

  function closeSelectedTab() {
    var tab = currentTabs[selectedIndex];
    if (!tab) return;
    sendMsg({ action: "close-tab", tabId: tab.id });
    // Remove from local lists and re-render
    var tabId = tab.id;
    allTabs = allTabs.filter(function(t) { return t.id !== tabId; });
    currentTabs = currentTabs.filter(function(t) { return t.id !== tabId; });
    if (!currentTabs.length) { closeOverlay(); return; }
    if (selectedIndex >= currentTabs.length) selectedIndex = currentTabs.length - 1;
    render();
  }

  function switchTo(idx) {
    var tab = currentTabs[idx];
    if (tab) sendMsg({ action: "switch-tab", tabId: tab.id });
    closeOverlay();
  }

  function confirmAndClose() {
    if (currentTabs.length && currentTabs[selectedIndex]) {
      sendMsg({ action: "switch-tab", tabId: currentTabs[selectedIndex].id });
    }
    closeOverlay();
  }

  function closeOverlay() {
    var el = document.getElementById("ts-overlay");
    if (el) el.remove();
    sendMsg({ action: "ts-closed" });
    document.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mousedown", onMouseDown, true);
  }

  function onKeyUp(e) {
    if (e.key === "Alt" || e.key === "Meta") {
      e.preventDefault(); e.stopPropagation();
      confirmAndClose();
    }
  }

  function onKeyDown(e) {
    if (!document.getElementById("ts-overlay")) return;
    var len = currentTabs.length;
    if (e.key === "Shift" && (e.altKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); move("prev"); }
    else if (e.key === "ArrowDown")  { e.preventDefault(); e.stopPropagation(); updateSel((selectedIndex + 1) % len); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); e.stopPropagation(); updateSel((selectedIndex - 1 + len) % len); }
    else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); cycleGroup(1); }
    else if (e.key === "ArrowLeft")  { e.preventDefault(); e.stopPropagation(); cycleGroup(-1); }
    else if (e.key === "Escape")     { e.preventDefault(); e.stopPropagation(); closeOverlay(); }
    else if (e.key === "Enter")      { e.preventDefault(); e.stopPropagation(); confirmAndClose(); }
    else if (e.key.toLowerCase() === "w" && (e.altKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); closeSelectedTab(); }
  }

  function onMouseDown(e) {
    var box = document.getElementById("ts-box");
    if (box && !box.contains(e.target)) closeOverlay();
  }

  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("mousedown", onMouseDown, true);

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === "ts-open") { open(msg.tabs, msg.groups, msg.direction); sendResponse({ ok: true }); }
    if (msg.action === "ts-move") { move(msg.direction); sendResponse({ ok: true }); }
  });
})();
