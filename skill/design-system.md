You are generating a `.designrules` file from an extracted Figma design system.

## Input

Read the design system JSON from one of these locations (in order of priority):
1. If an argument is provided: `$ARGUMENTS`
2. `./design-system.json` in the current working directory
3. The most recently modified file in `~/.design-systems/`

If no file is found, tell the user to run the Figma plugin first and start the local server (`node figma-design-extract/server.js`).

## Process

1. Read the JSON file completely
2. Analyze all extracted data: colors, typography, spacing, effects, components, variables, styles, frames
3. Generate a `.designrules` file in the current working directory

## Output Format: `.designrules`

Generate the file with this exact structure:

```
# Design System: {fileName}
# Extracted: {date}
# Source: Figma

## Tokens

### Colors
For each color, output:
  color {name-or-hex} = {hex}
    rgba({r}, {g}, {b}, {a})
Group by naming convention if names exist (e.g., primary/, neutral/, semantic/).
For gradients, include stops.

### Typography
For each text style:
  type {name-or-description} = {fontFamily} {fontWeight} {fontSize}px
    line-height: {lineHeight}
    letter-spacing: {letterSpacing}
    text-transform: {textCase if not ORIGINAL}

### Spacing
Extract spacing scale from auto-layout values (itemSpacing, padding).
Deduplicate and sort:
  spacing {label} = {value}px

### Effects
For each effect style:
  effect {name}
    {type}: {properties}
    css: {CSS equivalent}

### Variables
For each variable, grouped by collection:
  var {collection}/{name} = {value}
    modes: {mode1}: {value1}, {mode2}: {value2}

## Components

For each component, output pseudo-XML that describes structure and styling:

<ComponentName description="{description}">
  <element type="{nodeType}" layout="{direction}" spacing="{spacing}" padding="{t} {r} {b} {l}">
    <child type="{type}" fill="{color}" corner-radius="{r}" />
    <text style="{closest-typography-token}" content="{sample}" />
  </element>
</ComponentName>

For component sets, show each variant:
<ComponentName>
  <variant name="{property=value, ...}">
    {structure}
  </variant>
</ComponentName>

Include component properties:
  prop {name}: {type} = {defaultValue} [options: {variantOptions}]

## Frames

For key frames (screens/pages), output layout structure:

<Frame name="{name}" page="{page}" width="{w}" height="{h}">
  <layout direction="{dir}" spacing="{spacing}" padding="{padding}" align="{align}">
    {nested children summary}
  </layout>
</Frame>

## Platform Mapping

At the end, include a reference table:

### CSS
Map tokens to CSS custom properties:
  --color-{name}: {hex};
  --font-{name}: {fontSize}px/{lineHeight} {fontFamily};
  --spacing-{name}: {value}px;

### Swift (iOS)
Map to SwiftUI conventions:
  Color("{name}", hex: {hex})
  Font.custom("{family}", size: {size}).weight(.{weight})

### Kotlin (Android)
Map to Compose conventions:
  Color(0xFF{hex})
  TextStyle(fontFamily = {family}, fontSize = {size}.sp)

### Flutter
Map to Flutter conventions:
  Color(0xFF{hex})
  TextStyle(fontFamily: '{family}', fontSize: {size})
```

## Rules

- Be thorough — include EVERY token, component, and frame from the JSON
- Deduplicate intelligently (same hex = same color, merge)
- Infer spacing scale from all padding/spacing values found
- Use the closest typography token when describing component text
- Keep the file readable by both humans and AI agents
- For components, focus on structure and styling, not pixel-perfect layout
- The pseudo-XML should be enough for any AI to recreate the component on any platform
- Write the file as `.designrules` in the current working directory
- After writing, report a summary of what was generated
