(function() {
  "use strict";

  var existing = document.getElementById("ts-rename-overlay");
  if (existing) existing.remove();

  if (window.__tsRenameListener) {
    chrome.runtime.onMessage.removeListener(window.__tsRenameListener);
  }

  window.__tsRenameListener = function(msg, sender, sendResponse) {
    if (msg.action === "ts-rename") {
      showRenameDialog(msg.tabId, msg.currentName, msg.originalTitle);
      sendResponse({ ok: true });
    }
  };
  chrome.runtime.onMessage.addListener(window.__tsRenameListener);

  function sendMsg(data) {
    try { chrome.runtime.sendMessage(data); } catch (_) { /* context invalidated */ }
  }

  function showRenameDialog(tabId, currentName, originalTitle) {
    var old = document.getElementById("ts-rename-overlay");
    if (old) old.remove();

    var overlay = document.createElement("div");
    overlay.id = "ts-rename-overlay";
    overlay.style.cssText = "position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,0.5)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;backdrop-filter:blur(6px)!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;";

    var pageZoom = window.outerWidth / window.innerWidth;
    var box = document.createElement("div");
    box.style.cssText = "background:#222!important;border:1px solid #444!important;border-radius:12px!important;padding:20px!important;width:450px!important;max-width:90vw!important;box-shadow:0 20px 60px rgba(0,0,0,0.6)!important;display:flex!important;flex-direction:column!important;gap:12px!important;";
    box.style.zoom = (1.1 / pageZoom);

    var title = document.createElement("div");
    title.style.cssText = "font-size:15px!important;font-weight:600!important;color:#fff!important;";
    title.textContent = "Rename Tab";
    box.appendChild(title);

    var orig = document.createElement("div");
    orig.style.cssText = "font-size:11px!important;color:#888!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;";
    orig.textContent = "Original: " + (originalTitle || "Untitled");
    box.appendChild(orig);

    var input = document.createElement("input");
    input.type = "text";
    input.value = currentName || "";
    input.placeholder = originalTitle || "Tab name";
    input.maxLength = 200;
    input.style.cssText = "background:#333!important;border:1px solid #555!important;border-radius:8px!important;padding:10px 12px!important;font-size:14px!important;color:#fff!important;outline:none!important;width:100%!important;box-sizing:border-box!important;";
    box.appendChild(input);

    var hint = document.createElement("div");
    hint.style.cssText = "font-size:10px!important;color:#666!important;";
    hint.textContent = "Leave empty to use original name. Press Enter to save, Esc to cancel.";
    box.appendChild(hint);

    var buttons = document.createElement("div");
    buttons.style.cssText = "display:flex!important;gap:8px!important;justify-content:flex-end!important;";

    var clearBtn = document.createElement("button");
    clearBtn.textContent = "Reset";
    clearBtn.style.cssText = "all:unset!important;cursor:pointer!important;padding:6px 16px!important;border-radius:6px!important;font-size:12px!important;background:#444!important;color:#ccc!important;";
    clearBtn.addEventListener("click", function() {
      sendMsg({ action: "save-name", tabId: tabId, name: "" });
      closeDialog();
    });

    var saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.style.cssText = "all:unset!important;cursor:pointer!important;padding:6px 16px!important;border-radius:6px!important;font-size:12px!important;background:#0078d4!important;color:#fff!important;";
    saveBtn.addEventListener("click", function() { saveAndClose(); });

    buttons.appendChild(clearBtn);
    buttons.appendChild(saveBtn);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(function() { input.focus(); }, 50);

    input.addEventListener("keydown", function(e) {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); saveAndClose(); }
      if (e.key === "Escape") { e.preventDefault(); closeDialog(); }
    });

    overlay.addEventListener("mousedown", function(e) {
      if (!box.contains(e.target)) closeDialog();
    });

    function saveAndClose() {
      var name = input.value.trim();
      sendMsg({ action: "save-name", tabId: tabId, name: name });
      closeDialog();
    }

    function closeDialog() {
      var el = document.getElementById("ts-rename-overlay");
      if (el) el.remove();
    }
  }
})();
