figma.showUI(__html__, { width: 320, height: 280 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'extract') return;

  try {
    const doc = figma.root;
    const fileName = doc.name || 'untitled';

    figma.ui.postMessage({ type: 'progress', message: 'Extracting colors...' });
    const colors = extractColors();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting typography...' });
    const typography = extractTypography();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting effects...' });
    const effects = extractEffects();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting styles...' });
    const styles = extractStyles();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting variables...' });
    const variables = extractVariables();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting components...' });
    const components = extractComponents();

    figma.ui.postMessage({ type: 'progress', message: 'Extracting frames...' });
    const frames = extractFrames();

    const data = {
      fileName,
      extractedAt: new Date().toISOString(),
      stats: {
        colors: colors.length,
        textStyles: typography.length,
        components: components.length,
        variables: variables.length,
        effects: effects.length,
        frames: frames.length
      },
      colors,
      typography,
      effects,
      styles,
      variables,
      components,
      frames
    };

    figma.ui.postMessage({ type: 'extracted', data });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
  }
};

// --- Color extraction ---
function extractColors() {
  const colors = [];
  const seen = new Set();

  // From paint styles
  const paintStyles = figma.getLocalPaintStyles();
  for (const style of paintStyles) {
    for (const paint of style.paints) {
      const c = paintToColor(paint, style.name);
      if (c && !seen.has(c.hex)) {
        seen.add(c.hex);
        colors.push(c);
      }
    }
  }

  // Walk document for fills/strokes not captured by styles
  walkNodes(figma.root, (node) => {
    const paints = [
      ...('fills' in node && Array.isArray(node.fills) ? node.fills : []),
      ...('strokes' in node && Array.isArray(node.strokes) ? node.strokes : [])
    ];
    for (const paint of paints) {
      const c = paintToColor(paint);
      if (c && !seen.has(c.hex)) {
        seen.add(c.hex);
        colors.push(c);
      }
    }
  }, 500);

  return colors;
}

function paintToColor(paint, name) {
  if (!paint.visible && paint.visible !== undefined) return null;
  if (paint.type === 'SOLID') {
    const { r, g, b } = paint.color;
    const a = paint.opacity !== undefined ? paint.opacity : 1;
    const hex = rgbToHex(r, g, b);
    return { name: name || null, hex, rgba: { r: round(r), g: round(g), b: round(b), a: round(a) }, type: 'solid' };
  }
  if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
    const stops = (paint.gradientStops || []).map(s => ({
      color: rgbToHex(s.color.r, s.color.g, s.color.b),
      position: round(s.position)
    }));
    return { name: name || null, hex: stops[0]?.color || '#000000', type: paint.type.toLowerCase(), stops };
  }
  return null;
}

// --- Typography extraction ---
function extractTypography() {
  const styles = [];
  const seen = new Set();

  // From text styles
  const textStyles = figma.getLocalTextStyles();
  for (const style of textStyles) {
    const key = `${style.fontName.family}-${style.fontSize}-${style.fontName.style}`;
    if (seen.has(key)) continue;
    seen.add(key);
    styles.push({
      name: style.name,
      fontFamily: style.fontName.family,
      fontWeight: style.fontName.style,
      fontSize: style.fontSize,
      lineHeight: resolveLineHeight(style.lineHeight),
      letterSpacing: resolveLetterSpacing(style.letterSpacing),
      textDecoration: style.textDecoration || 'NONE',
      textCase: style.textCase || 'ORIGINAL'
    });
  }

  // Walk for text nodes
  walkNodes(figma.root, (node) => {
    if (node.type !== 'TEXT') return;
    const fontName = node.fontName;
    if (typeof fontName === 'symbol') return; // mixed
    const key = `${fontName.family}-${node.fontSize}-${fontName.style}`;
    if (seen.has(key)) return;
    seen.add(key);
    styles.push({
      name: null,
      fontFamily: fontName.family,
      fontWeight: fontName.style,
      fontSize: typeof node.fontSize === 'number' ? node.fontSize : null,
      lineHeight: resolveLineHeight(node.lineHeight),
      letterSpacing: resolveLetterSpacing(node.letterSpacing),
      textDecoration: node.textDecoration || 'NONE',
      textCase: node.textCase || 'ORIGINAL'
    });
  }, 300);

  return styles;
}

function resolveLineHeight(lh) {
  if (!lh || typeof lh === 'symbol') return 'auto';
  if (lh.unit === 'AUTO') return 'auto';
  if (lh.unit === 'PIXELS') return lh.value;
  if (lh.unit === 'PERCENT') return round(lh.value) + '%';
  return 'auto';
}

function resolveLetterSpacing(ls) {
  if (!ls || typeof ls === 'symbol') return 0;
  if (ls.unit === 'PIXELS') return ls.value;
  if (ls.unit === 'PERCENT') return round(ls.value) + '%';
  return 0;
}

// --- Effects extraction ---
function extractEffects() {
  const effects = [];
  const effectStyles = figma.getLocalEffectStyles();
  for (const style of effectStyles) {
    effects.push({
      name: style.name,
      effects: style.effects.map(serializeEffect)
    });
  }
  return effects;
}

function serializeEffect(e) {
  const base = { type: e.type, visible: e.visible !== false };
  if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
    base.color = e.color ? rgbToHex(e.color.r, e.color.g, e.color.b) : '#000';
    base.opacity = e.color ? round(e.color.a) : 1;
    base.offset = { x: e.offset?.x || 0, y: e.offset?.y || 0 };
    base.radius = e.radius || 0;
    base.spread = e.spread || 0;
  }
  if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
    base.radius = e.radius || 0;
  }
  return base;
}

// --- Styles extraction ---
function extractStyles() {
  const gridStyles = figma.getLocalGridStyles();
  return {
    grids: gridStyles.map(s => ({
      name: s.name,
      grids: s.layoutGrids.map(g => ({
        pattern: g.pattern,
        sectionSize: g.sectionSize,
        gutterSize: g.gutterSize,
        count: g.count,
        alignment: g.alignment,
        offset: g.offset
      }))
    }))
  };
}

// --- Variables extraction ---
function extractVariables() {
  const vars = [];
  try {
    const collections = figma.variables.getLocalVariableCollections();
    for (const collection of collections) {
      for (const id of collection.variableIds) {
        const v = figma.variables.getVariableById(id);
        if (!v) continue;
        const modes = {};
        for (const modeId of Object.keys(v.valuesByMode)) {
          const modeName = collection.modes.find(m => m.modeId === modeId)?.name || modeId;
          const raw = v.valuesByMode[modeId];
          modes[modeName] = resolveVariableValue(raw, v.resolvedType);
        }
        vars.push({
          name: v.name,
          collection: collection.name,
          type: v.resolvedType,
          modes
        });
      }
    }
  } catch (e) {
    // Variables API may not be available
  }
  return vars;
}

function resolveVariableValue(val, type) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val;
  if (val.type === 'VARIABLE_ALIAS') return { alias: val.id };
  if (type === 'COLOR' && val.r !== undefined) return rgbToHex(val.r, val.g, val.b);
  return val;
}

// --- Components extraction ---
function extractComponents() {
  const components = [];
  const processComponent = (node) => {
    const comp = {
      name: node.name,
      description: node.description || '',
      type: node.type,
      width: round(node.width),
      height: round(node.height)
    };

    if (node.type === 'COMPONENT_SET') {
      comp.variants = node.children.map(child => ({
        name: child.name,
        properties: parseVariantName(child.name),
        width: round(child.width),
        height: round(child.height),
        children: extractChildStructure(child, 2)
      }));
    } else {
      if (node.componentPropertyDefinitions) {
        comp.properties = {};
        for (const [key, def] of Object.entries(node.componentPropertyDefinitions)) {
          comp.properties[key] = {
            type: def.type,
            defaultValue: def.defaultValue,
            variantOptions: def.variantOptions || undefined
          };
        }
      }
      comp.children = extractChildStructure(node, 2);
    }

    // Layout info
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
      comp.layout = extractAutoLayout(node);
    }

    components.push(comp);
  };

  walkNodes(figma.root, (node) => {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      processComponent(node);
    }
  }, 200);

  return components;
}

function parseVariantName(name) {
  const props = {};
  name.split(',').forEach(pair => {
    const [key, val] = pair.split('=').map(s => s.trim());
    if (key && val) props[key] = val;
  });
  return props;
}

function extractChildStructure(node, depth) {
  if (depth <= 0 || !('children' in node)) return undefined;
  return node.children.slice(0, 20).map(child => {
    const info = {
      name: child.name,
      type: child.type,
      visible: child.visible !== false
    };
    if (child.type === 'TEXT') {
      info.characters = child.characters?.substring(0, 100);
    }
    if ('layoutMode' in child && child.layoutMode !== 'NONE') {
      info.layout = extractAutoLayout(child);
    }
    if ('fills' in child && Array.isArray(child.fills)) {
      const solid = child.fills.find(f => f.type === 'SOLID' && f.visible !== false);
      if (solid) info.fill = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
    }
    if ('cornerRadius' in child && child.cornerRadius) {
      info.cornerRadius = typeof child.cornerRadius === 'number' ? child.cornerRadius : 'mixed';
    }
    info.children = extractChildStructure(child, depth - 1);
    return info;
  });
}

// --- Frames extraction ---
function extractFrames() {
  const frames = [];
  for (const page of figma.root.children) {
    for (const node of page.children) {
      if (node.type !== 'FRAME') continue;
      frames.push({
        name: node.name,
        page: page.name,
        width: round(node.width),
        height: round(node.height),
        layout: ('layoutMode' in node && node.layoutMode !== 'NONE') ? extractAutoLayout(node) : null,
        fills: extractNodeFills(node),
        cornerRadius: 'cornerRadius' in node ? node.cornerRadius : 0,
        children: extractChildStructure(node, 2)
      });
      if (frames.length >= 50) break;
    }
  }
  return frames;
}

function extractNodeFills(node) {
  if (!('fills' in node) || !Array.isArray(node.fills)) return [];
  return node.fills.filter(f => f.visible !== false).map(f => {
    if (f.type === 'SOLID') return { type: 'solid', color: rgbToHex(f.color.r, f.color.g, f.color.b) };
    return { type: f.type.toLowerCase() };
  });
}

function extractAutoLayout(node) {
  return {
    direction: node.layoutMode,
    spacing: node.itemSpacing,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    primaryAlign: node.primaryAxisAlignItems,
    counterAlign: node.counterAxisAlignItems,
    wrap: node.layoutWrap || 'NO_WRAP'
  };
}

// --- Helpers ---
function walkNodes(root, fn, limit) {
  let count = 0;
  const stack = [root];
  while (stack.length && count < limit) {
    const node = stack.pop();
    fn(node);
    count++;
    if ('children' in node) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }
}

function rgbToHex(r, g, b) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function round(v) {
  if (typeof v !== 'number') return v;
  return Math.round(v * 100) / 100;
}
