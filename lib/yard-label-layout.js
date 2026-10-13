/**
 * Place screen-space callouts without moving their world-projected anchors.
 * Larger priorities claim space first. Callers measure labels in CSS pixels,
 * provide occupied UI rectangles, and hide projections behind the camera.
 * This helper only controls presentation; it has no course/shot dependencies.
 */
export function layoutYardLabels(labels, viewport, obstacles = [], options = {}) {
  const margin = nonnegative(options.margin, 8);
  const padding = nonnegative(options.padding, 6);
  const gap = nonnegative(options.gap, 10);
  const maxDisplacement = nonnegative(options.maxDisplacement, 128);
  const width = viewport.width;
  const height = viewport.height;
  const occupied = obstacles.filter(validRect).map(rect => ({ ...rect }));
  const results = labels.map(label => ({
    id: label.id, x: label.x - label.width / 2, y: label.y - label.height - gap,
    width: label.width, height: label.height,
    anchorX: label.x, anchorY: label.y, visible: false,
  }));
  // Identity breaks priority ties, so unrelated input-array ordering cannot
  // make two equally important callouts exchange their allotted spaces.
  const ordered = labels.map((label, index) => ({ label, index })).sort((a, b) =>
    (finitePriority(b.label.priority) - finitePriority(a.label.priority)) ||
    String(a.label.id).localeCompare(String(b.label.id)) || a.index - b.index);

  if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) return results;

  for (const { label, index } of ordered) {
    const { x, y, width: w, height: h } = label;
    // A label for something outside the image would invent an onscreen object.
    // In particular, never clamp offscreen source anchors onto a screen edge.
    if (!validRect(label) || x < 0 || x > width || y < 0 || y > height ||
        w > width - margin * 2 || h > height - margin * 2) continue;

    const xs = new Set([x - w / 2, x + gap, x - w - gap, margin, width - margin - w]);
    const ys = new Set([y - h - gap, y + gap, y - h / 2, margin, height - margin - h]);
    // Nearby rows and lateral lanes resolve clusters while bounding the
    // distance between an object and its callout. Exact UI/label edges below
    // avoid needless hiding when a usable slot falls between these samples.
    for (const step of [-3, -2, -1, 1, 2, 3]) {
      xs.add(x - w / 2 + step * 24);
      ys.add(y - h - gap + step * (h + padding));
    }
    for (const rect of occupied) {
      xs.add(rect.x - w - padding);
      xs.add(rect.x + rect.width + padding);
      ys.add(rect.y - h - padding);
      ys.add(rect.y + rect.height + padding);
    }

    let best = null;
    let bestScore = Infinity;
    for (const cy of ys) {
      if (cy < margin || cy + h > height - margin) continue;
      for (const cx of xs) {
        if (cx < margin || cx + w > width - margin) continue;
        const rect = { x: cx, y: cy, width: w, height: h };
        const displacement = distanceSquared(x, y, rect);
        if (displacement < gap * gap || displacement > maxDisplacement * maxDisplacement) continue;
        if (occupied.some(other => overlaps(rect, other, padding))) continue;
        const centerDistance = (cx + w / 2 - x) ** 2 + (cy + h / 2 - y) ** 2;
        const side = label.side || 'above';
        const preferred = side === 'left' ? cx + w <= x : side === 'right' ? cx >= x :
          side === 'below' ? cy >= y : cy + h <= y;
        const score = displacement + centerDistance * 0.12 + (preferred ? 0 : 144);
        if (score < bestScore) {
          best = rect;
          bestScore = score;
        }
      }
    }
    if (best) {
      occupied.push(best);
      results[index] = { ...results[index], ...best, visible: true };
    }
  }
  return results;
}

function nonnegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function finitePriority(value) {
  return Number.isFinite(value) ? value : 0;
}

function validRect(rect) {
  return rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 && rect.height > 0;
}

function distanceSquared(x, y, rect) {
  const dx = Math.max(rect.x - x, 0, x - rect.x - rect.width);
  const dy = Math.max(rect.y - y, 0, y - rect.y - rect.height);
  return dx * dx + dy * dy;
}

function overlaps(a, b, padding) {
  return a.x < b.x + b.width + padding && a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding && a.y + a.height + padding > b.y;
}
