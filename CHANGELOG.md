# Changelog

## v1.0.0 — Initial Release

### Features
- Full-screen Alt+Tab style overlay with blurred backdrop
- MRU (most recently used) tab ordering
- Tab group filtering with auto-detection of active group
- Group cycling with ←/→ arrow keys
- Custom tab renaming (`Alt+R`) with ✎ indicator
- Name persistence across browser restarts (URL + group + index scored matching)
- Zoom-independent UI — consistent size at any page zoom level
- RTL page support — overlay always renders left-to-right
- Sort order setting: recently focused or tab bar order
- Options page with auto light/dark theme
- Cross-browser: works on Chrome and Edge
- Keyboard navigation: ↑/↓ tabs, ←/→ groups, Shift to go back, Enter or release modifier to confirm, Escape to cancel
- Click extension icon to open overlay
- Graceful handling of extension context invalidation
- Serialized storage writes to prevent data loss from concurrent saves
- Retry-based name restore for tabs still loading on startup
