# Development Tools

This directory contains utility scripts and tools used during development of the Chatwork Thread Tool project.

## Scripts

### Icon Generation Tools

These scripts were used to generate icons for the Chrome Extension:

#### `create-simple-icons.js`
- **Purpose**: Creates simple PNG icons using Canvas API
- **Usage**: `node create-simple-icons.js`
- **Output**: Generates icon16.png, icon32.png, icon48.png, icon128.png
- **Dependencies**: Requires `canvas` npm package
- **Features**: 
  - Thread emoji (🧵) with colored background
  - Multiple sizes for different use cases
  - Auto-creates icons directory

#### `create-png-icons.js`
- **Purpose**: Alternative PNG icon generator
- **Usage**: `node create-png-icons.js`
- **Output**: PNG icons with different styling
- **Features**: Different design approach from simple icons

#### `create-icons.js`
- **Purpose**: Advanced icon generator with multiple formats
- **Usage**: `node create-icons.js`
- **Output**: Icons in various formats and sizes
- **Features**: More comprehensive icon generation

## Usage Notes

1. **Historical Context**: These tools were created to resolve Chrome Extension manifest issues
2. **Dependency**: Some scripts require `npm install canvas` in the project root
3. **Output Location**: Icons are typically generated in `src/chrome/icons/`
4. **Platform Compatibility**: Canvas package may require build tools on Windows

## Development Workflow

These tools were part of the Chrome Extension development phase:

```bash
# Example usage (from project root)
cd src/tools
node create-simple-icons.js

# Icons generated in src/chrome/icons/
ls ../chrome/icons/
```

## Migration Notes

- **Chrome Extension**: Used these icons for browser extension
- **Desktop App**: Desktop app uses different icon formats (.ico, .icns, .png)
- **Future**: May create similar tools for desktop app icon generation

## File Organization

```
src/tools/
├── README.md                 # This documentation
├── create-simple-icons.js    # Primary icon generator
├── create-png-icons.js       # Alternative icon generator
└── create-icons.js           # Advanced icon generator
```

## Dependencies

```json
{
  "canvas": "^2.11.2"  // Required for icon generation
}
```

Note: These are development-time tools, not runtime dependencies of the main application.

