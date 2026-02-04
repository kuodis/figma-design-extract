# Design System Extractor

Extract complete design systems from Figma locally and convert them into a universal `.designrules` file that any AI agent can use to build for any platform.

**Zero external APIs.** The Figma plugin extracts data locally, a tiny Node.js server saves it to disk, and Claude Code processes it into a platform-agnostic format.

## How It Works

```
Figma Plugin → localhost:9876 → ~/.design-systems/file.json → /design-system → .designrules
```

1. **Figma plugin** scans the open file and extracts every design token, component, and layout
2. **Local server** receives the JSON and saves it to disk
3. **`/design-system` skill** (from the [kuodis/claude-plugins](https://github.com/kuodis/claude-plugins) marketplace) reads the JSON and generates a `.designrules` file

## What Gets Extracted

| Category | Details |
|----------|---------|
| Colors | Solid fills, gradients (linear/radial), strokes, opacity |
| Typography | Font family, size, weight, line height, letter spacing, text case |
| Spacing | Auto-layout gaps, padding (top/right/bottom/left) |
| Effects | Drop shadows, inner shadows, layer/background blurs |
| Components | Name, description, properties, variants, child structure |
| Variables | All variable collections with mode values (light/dark, etc.) |
| Styles | Paint, text, effect, and grid styles |
| Frames | Top-level frames with layout structure (up to 2 levels deep) |

## Setup

### Prerequisites

- [Figma Desktop](https://www.figma.com/downloads/) (plugin uses localhost network access)
- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

### Install

```bash
git clone https://github.com/kuodis/figma-design-extract.git
cd figma-design-extract
./install.sh
```

This creates `~/.design-systems/` for storage.

### Install the `/design-system` skill

The `/design-system` skill is distributed via the [kuodis/claude-plugins](https://github.com/kuodis/claude-plugins) marketplace. Install it in Claude Code:

```
/plugin install design-system@kuodis/claude-plugins
```

This makes `/design-system` available globally in any project directory.

### Load the Figma Plugin

1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest**
3. Select `plugin/manifest.json` from this repo

## Usage

### 1. Start the server

```bash
node server.js
```

Listens on `http://localhost:9876`. Saves extracted JSON to both `~/.design-systems/<name>.json` and `./design-system.json` in the server's working directory.

### 2. Extract from Figma

1. Open any Figma file
2. Run **Plugins → Development → Design System Extractor**
3. Click **Extract Design System**
4. Wait for the success message with stats

### 3. Generate `.designrules`

In any project directory with Claude Code:

```
/design-system
```

Or point to a specific file:

```
/design-system ~/.design-systems/my-design-system.json
```

This generates a `.designrules` file containing:
- Design tokens (colors, typography, spacing, effects, variables)
- Component pseudo-XML with structure and styling
- Frame layouts
- Platform mappings for CSS, SwiftUI, Jetpack Compose, and Flutter

## `.designrules` Format

The output is a human-readable, AI-parseable file that describes your entire design system. Any AI coding agent can read it to build UI that matches your designs.

```
# Design System: My App
# Source: Figma

## Tokens

### Colors
  color primary/500 = #7c3aed
    rgba(124, 58, 237, 1)

### Typography
  type heading/h1 = Inter Bold 32px
    line-height: 40px
    letter-spacing: -0.02em

## Components

<Button description="Primary action button">
  <frame layout="HORIZONTAL" spacing="8" padding="12 24 12 24">
    <text style="heading/h1" content="Click me" />
  </frame>
</Button>

## Platform Mapping

### CSS
  --color-primary-500: #7c3aed;
  --font-heading-h1: 32px/40px Inter;

### Swift (iOS)
  Color("primary-500", hex: 7c3aed)
  Font.custom("Inter", size: 32).weight(.bold)
```

## File Structure

```
figma-design-extract/
├── plugin/
│   ├── manifest.json    # Figma plugin config
│   ├── code.js          # Extraction logic
│   └── ui.html          # Plugin UI
├── server.js            # Local HTTP receiver (zero deps)
├── install.sh           # One-command setup
└── package.json
```

The `/design-system` skill lives in the [kuodis/claude-plugins](https://github.com/kuodis/claude-plugins) marketplace as a separate plugin.

## How the Pieces Connect

**Plugin** (`plugin/code.js`) — Runs inside Figma's sandbox. Walks the document tree with depth limits to stay fast. Extracts everything listed above and sends structured JSON to the local server via `fetch`.

**Server** (`server.js`) — ~50 lines, zero dependencies (just Node.js `http`). Receives POST on `/extract`, saves JSON with CORS headers so the Figma plugin iframe can reach it.

**Skill** ([kuodis/claude-plugins/design-system](https://github.com/kuodis/claude-plugins)) — A Claude Code slash command installed via the plugin marketplace. Reads the extracted JSON and generates the `.designrules` output. Available globally in any project directory.

## License

MIT
