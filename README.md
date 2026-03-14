# Tab Switcher — Chrome & Edge Extension

An Alt+Tab style tab switcher for Google Chrome and Microsoft Edge with tab group filtering, MRU ordering, and custom tab renaming.

## Features

- **Alt+Tab Style Overlay** — Full-screen dark overlay with blurred backdrop, sorted by most recently used
- **Tab Group Filtering** — Automatically shows tabs from your current group; cycle through groups with ← → arrow keys
- **Custom Tab Renaming** — Give any tab a persistent custom name (survives browser restarts)
- **Keyboard Driven** — Navigate entirely with keyboard shortcuts
- **Zoom Independent** — Overlay renders at consistent size regardless of page zoom level

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Open switcher / next tab | `⌥ E` | `Alt+E` |
| Previous tab (while open) | `⇧` (hold `⌥`) | `Shift` (hold `Alt`) |
| Rename current tab | `⌥ R` | `Alt+R` |

While the overlay is open:

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate tabs |
| `←` / `→` | Switch between groups |
| `Enter` | Switch to selected tab |
| `Escape` | Close without switching |
| Release `⌥` / `Alt` | Switch to selected tab |

> **Tip:** You can override shortcuts at `edge://extensions/shortcuts` or `chrome://extensions/shortcuts`.

## Installation

1. Open `edge://extensions/` or `chrome://extensions/` in your browser
2. Enable **Developer mode** (toggle in the bottom-left or top-right)
3. Click **Load unpacked** and select this folder
4. (Optional) Customize keyboard shortcuts at `edge://extensions/shortcuts` or `chrome://extensions/shortcuts`

## How It Works

- **MRU Ordering** — Tabs are sorted by most recently focused, so Alt+E immediately highlights your previous tab
- **Group Auto-Detection** — If you're in a tab group, the overlay shows only that group's tabs by default
- **Name Persistence** — Custom names are stored in `chrome.storage.local` and restored on restart using URL + group + position matching
- **Screenshot Capture** — Captures visible tab screenshots in the background for future preview support

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension configuration (Manifest V3) |
| `src/background.js` | Service worker: MRU tracking, screenshots, tab data, name persistence |
| `src/overlay.js` | Tab switcher overlay (injected into pages) |
| `src/overlay.css` | Overlay styling |
| `src/rename.js` | Rename dialog (injected into pages) |
| `src/options.html` | Settings page |
| `src/options.js` | Settings logic |
| `icons/` | Extension icons (16, 48, 128px) |

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Read tab titles, URLs, and group info |
| `tabGroups` | Read tab group names and colors |
| `activeTab` | Access the currently active tab |
| `scripting` | Inject overlay and rename dialog into pages |
| `storage` | Persist custom tab names across restarts |
| `<all_urls>` | Required by `scripting` API to inject into any page |

## Limitations

- Cannot inject into `edge://`, `chrome://`, or `about:` pages (browser restriction)
- Cannot inject into pages that haven't finished loading
- Screenshots are only captured for tabs you visit while the extension is active

## License

MIT
