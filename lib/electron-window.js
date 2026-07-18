export const FULL_SIZE = Object.freeze({ width: 430, height: 220 });
export const COMPACT_SIZE = Object.freeze({ width: 230, height: 150 });

export function windowOptions({ compact = false, x, y } = {}) {
  const size = compact ? COMPACT_SIZE : FULL_SIZE;
  return {
    ...size,
    ...(Number.isInteger(x) ? { x } : {}),
    ...(Number.isInteger(y) ? { y } : {}),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    acceptFirstMouse: true,
    show: false,
    type: 'panel',
  };
}

export function clampBounds(bounds, workArea) {
  const width = Math.max(180, Math.min(bounds.width, workArea.width));
  const height = Math.max(120, Math.min(bounds.height, workArea.height));
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));
  return { x, y, width, height };
}

export function resizeBounds(start, edge, dx, dy, compact = false) {
  const minimum = compact ? COMPACT_SIZE : { width: 350, height: 180 };
  let { x, y, width, height } = start;
  if (edge.includes('w')) { x += dx; width -= dx; }
  if (edge.includes('e')) width += dx;
  if (edge.includes('n')) { y += dy; height -= dy; }
  if (edge.includes('s')) height += dy;
  if (width < minimum.width) {
    if (edge.includes('w')) x -= minimum.width - width;
    width = minimum.width;
  }
  if (height < minimum.height) {
    if (edge.includes('n')) y -= minimum.height - height;
    height = minimum.height;
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
