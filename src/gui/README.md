# Chatwork Thread Tool - Desktop Application

A desktop application built with Electron for managing Chatwork conversation threads.

## Features

- 🖥️ **Desktop Native**: Cross-platform desktop application (Windows, macOS, Linux)
- 💾 **SQLite Database**: Local data storage with better-sqlite3
- 🎨 **Modern UI**: Beautiful interface with light/dark theme support
- ⌨️ **Keyboard Shortcuts**: Efficient workflow with hotkeys
- 📤 **Import/Export**: Backup and restore your threads
- 🔒 **Secure**: All data stored locally on your machine

## Prerequisites

- Node.js 18 or higher (20+ LTS recommended)
- npm or yarn

## CLI database (`.env`)

The GUI reads the **same SQLite file** as the CLI when it can find a `.env` with `DATABASE_PATH` (searching upward from the current working directory and from the `src/gui` tree). If the file exists, the sidebar lists those threads and loads messages from `messages` / `thread_messages`.

If no database file is found, the app falls back to the old **electron-store** JSON store (empty until you add data there).

Creating threads or adding messages in the GUI still targets the store only when SQLite is **not** active; when SQLite **is** active, use the CLI for writes (or delete thread in the GUI, which updates the SQLite file via sql.js).

## Installation

1. **Navigate to GUI directory:**
   ```bash
   cd src/gui
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Development

1. **Start in development mode:**
   ```bash
   npm run dev
   ```
   
   This will open the app with DevTools enabled.

2. **Start in production mode:**
   ```bash
   npm start
   ```

## Building

1. **Build for current platform:**
   ```bash
   npm run build
   ```

2. **Build for specific platform:**
   ```bash
   # Windows
   npm run build:win
   
   # macOS
   npm run build:mac
   
   # Linux
   npm run build:linux
   ```

3. **Package without installer:**
   ```bash
   npm run pack
   ```

Built applications will be in `../../dist/gui/`

## Project Structure

```
src/gui/
├── main/                   # Electron main process
│   └── main.js            # Application entry point
├── preload/               # Preload scripts
│   └── preload.cjs        # IPC bridge (CommonJS — required for reliable preload loading)
├── renderer/              # Frontend application
│   ├── index.html         # Main HTML
│   ├── styles/
│   │   └── main.css       # Application styles
│   ├── scripts/
│   │   └── app.js         # Application logic
│   └── assets/            # Images, icons, etc.
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Features Overview

### Main Interface

- **Sidebar**: List of saved threads with search and refresh
- **Main Panel**: Thread details and message list
- **Message Management**: Add, view, and delete messages
- **Thread Management**: Create, edit, and delete threads

### Keyboard Shortcuts

- `Ctrl/Cmd + N`: New Thread
- `Ctrl/Cmd + R`: Refresh All Threads  
- `Ctrl/Cmd + ,`: Open Settings
- `Ctrl/Cmd + I`: Import Threads
- `Ctrl/Cmd + E`: Export Threads
- `Escape`: Close Modals

### Menu Features

- **File Menu**: New thread, import/export, preferences
- **Edit Menu**: Standard edit operations
- **View Menu**: Zoom, reload, toggle DevTools
- **Window Menu**: Minimize, close
- **Help Menu**: About, documentation

### Settings

- **API Token**: Configure Chatwork API token
- **Theme**: Light, dark, or auto theme
- **Auto-save**: Automatic saving of changes

## Database

The application uses SQLite for local data storage:

- **Location**: `%APPDATA%/chatwork-thread-gui/chatwork-threads.db` (Windows)
- **Tables**: 
  - `threads`: Thread metadata and data
  - `messages`: Individual messages (future use)
- **Backup**: Use Export feature to backup your data

## Development Notes

### Architecture

- **Main Process**: Handles application lifecycle, menus, database
- **Renderer Process**: UI logic, user interactions
- **Preload Script**: Secure bridge between main and renderer
- **IPC Communication**: Async message passing for database operations

### Adding Features

1. **Database Operations**: Add handlers in `main/main.js`
2. **UI Components**: Update `renderer/index.html` and `renderer/styles/main.css`
3. **Application Logic**: Extend `renderer/scripts/app.js`
4. **IPC Bridge**: Update `preload/preload.cjs` for new APIs

### Debugging

- Development mode automatically opens DevTools
- Check console for errors and debug information
- Use `console.log()` for debugging in both main and renderer processes

## Migration from Chrome Extension

This desktop app provides all the functionality of the Chrome Extension plus:

- ✅ **No Browser Dependency**: Works independently
- ✅ **Better Performance**: Native desktop performance
- ✅ **More Storage**: Unlimited local storage with SQLite
- ✅ **Better UI**: Resizable windows, native menus
- ✅ **Keyboard Shortcuts**: System-wide hotkeys
- ✅ **Import/Export**: Backup and restore capabilities

## Troubleshooting

### Common Issues

1. **App won't start:**
   - Check Node.js version (16+)
   - Run `npm install` to ensure dependencies
   - Check console for error messages

2. **Database errors:**
   - Check write permissions in app data directory
   - Delete database file to reset (will lose data)

3. **Build errors:**
   - Check `electron-builder` requirements for target platform
   - Ensure all dependencies are installed

### Support

- Check console output for error messages
- Review application logs in developer tools
- Open GitHub issues for bugs and feature requests

## Future Enhancements

- [ ] Real Chatwork API integration
- [ ] Thread templates
- [ ] Message search and filtering
- [ ] Notification system
- [ ] Plugin system
- [ ] Cloud sync
- [ ] Mobile companion app

## License

MIT License - See LICENSE file for details.
