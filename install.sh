#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Design System Extractor Setup ==="
echo ""

# Create storage dir
mkdir -p ~/.design-systems
echo "✓ Created ~/.design-systems/"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Install the /design-system skill in Claude Code:"
echo "     /plugin install design-system@kuodis/claude-plugins"
echo "  2. Start server:  node $DIR/server.js"
echo "  3. In Figma:       Plugins → Development → Import plugin from manifest"
echo "     Select:         $DIR/plugin/manifest.json"
echo "  4. Open a Figma file, run the plugin, click Extract"
echo "  5. In any project: /design-system"
