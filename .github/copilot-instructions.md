# Copilot Context — Tab Switcher

## What This Is
A Chrome/Edge extension (Manifest V3) that provides an Alt+Tab style tab switcher overlay with tab group support and custom tab renaming.

## Architecture
- **src/background.js** — Service worker: MRU tracking, screenshot capture, tab data builder, custom name persistence (serialized writes to chrome.storage.local), overlay/rename injection, message handler.
- **src/overlay.js** — IIFE injected into pages via `chrome.scripting.executeScript`. Renders full-screen dark overlay with group chips + tab list. Keyboard driven (arrows, Shift for back, Alt/Meta release to confirm). Zoom-compensated (`box.style.zoom = 1.1 / pageZoom`). Uses `sendMsg()` wrapper for all `chrome.runtime.sendMessage` calls to handle context invalidation.
- **src/overlay.css** — Overlay styling. Forces `direction:ltr` for RTL page compatibility.
- **src/rename.js** — IIFE injected for rename dialog. Zoom-compensated. Sends `save-name` message with tabId.
- **src/options.html / src/options.js** — Settings popup (right-click icon → Options). Sort order: "recently focused" (MRU) or "tab bar order" (tab index).
- **manifest.json** — v1.0.0. Permissions: tabs, tabGroups, activeTab, scripting, storage. Commands: Alt+E (switch), Alt+Shift+E (prev), Alt+R (rename).

## Key Design Decisions
- **Overlay injection, not popup** — Popup can't detect Alt key release. Overlay injected into active tab detects keyup for Alt/Meta to confirm selection.
- **Can't inject into edge:///chrome:// pages** — Browser restriction, no workaround.
- **Zoom compensation** — Page zoom affects injected DOM size. Fix: `box.style.zoom = (1.1 / pageZoom)` where `pageZoom = window.outerWidth / window.innerWidth`. Max-height calculated from `window.screen.height` (zoom-independent).
- **Name persistence** — In-memory Map keyed by tabId for the session. Persisted to chrome.storage.local as `{url, name, groupTitle, index}` entries. On restore, scored matching (URL must match, +100 for same group, +0-20 for index proximity) with greedy assignment. Retry restore at 0/1/3/6s because tabs don't have URLs immediately on startup.
- **Serialized persistence** — `persistNames()` chains via `_persistChain` promise to prevent concurrent writes from overwriting each other.
- **Extension context invalidation** — All `chrome.runtime.sendMessage` calls in injected scripts wrapped in try/catch via `sendMsg()`.

## Keyboard Shortcuts
| Action | Mac | Windows |
|---|---|---|
| Open/next | ⌥E | Alt+E |
| Previous (while open) | ⇧ (hold ⌥) | Shift (hold Alt) |
| Rename tab | ⌥R | Alt+R |
| Cycle groups | ←/→ | ←/→ |
| Navigate tabs | ↑/↓ | ↑/↓ |
| Confirm | Enter or release Alt/Cmd | Enter or release Alt |
| Cancel | Escape | Escape |

## Known Limitations
- Cannot inject into edge://, chrome://, about: pages
- Cannot inject into pages still loading
- Screenshots only captured for visited tabs (captureVisibleTab limitation)
- Max 4 extension commands in Manifest V3
- Shortcut conflicts with browser defaults must be overridden manually at edge://extensions/shortcuts
