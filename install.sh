#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Design System Extractor Setup ==="
echo ""

# Create storage dir
mkdir -p ~/.design-systems
echo "✓ Created ~/.design-systems/"

# Install Claude Code skill
mkdir -p ~/.claude/commands
cp "$DIR/skill/design-system.md" ~/.claude/commands/design-system.md
echo "✓ Installed /design-system skill"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Start server:  node $DIR/server.js"
echo "  2. In Figma:       Plugins → Development → Import plugin from manifest"
echo "     Select:         $DIR/plugin/manifest.json"
echo "  3. Open a Figma file, run the plugin, click Extract"
echo "  4. In any project: /design-system"
