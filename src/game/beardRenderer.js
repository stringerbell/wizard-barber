// Beard rendering using a pixel grid approach
// Each beard is a grid of cells that can be "hairy" or "shaved"

const BEARD_COLORS = [
  '#4a3728', // brown
  '#2c2c2c', // black
  '#8b6914', // golden
  '#a0522d', // auburn
  '#c0c0c0', // silver/grey
  '#f5f5dc', // white/platinum
  '#8b0000', // deep red
];

export class BeardGrid {
  constructor(cols, rows, cellSize) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.width = cols * cellSize;
    this.height = rows * cellSize;
    // Each cell: 0 = empty, 1 = beard hair
    this.cells = new Array(cols * rows).fill(0);
    this.color = BEARD_COLORS[0];
    this.highlightColor = '#5a4738';
  }

  clone() {
    const copy = new BeardGrid(this.cols, this.rows, this.cellSize);
    copy.cells = [...this.cells];
    copy.color = this.color;
    copy.highlightColor = this.highlightColor;
    return copy;
  }

  get(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
    return this.cells[y * this.cols + x];
  }

  set(x, y, val) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.cells[y * this.cols + x] = val;
  }

  // Count total filled cells
  countFilled() {
    return this.cells.reduce((sum, v) => sum + v, 0);
  }

  // Sever disconnected beard using flood-fill from the face/chin anchor zone.
  // The anchor zone is an elliptical region matching the wizard's jaw — cells
  // there are "rooted" to the face and can never fall. Everything reachable
  // from an anchor stays; everything else drops.
  severDisconnected() {
    const connected = new Uint8Array(this.cols * this.rows);
    const stack = [];

    // Anchor zone: ellipse matching the chin/jaw area.
    // The face ellipse is centered horizontally, and its bottom edge overlaps
    // the first ~5 rows of the beard grid. We use a generous zone so trimming
    // the top of the beard never detaches the whole thing.
    const cx = Math.floor(this.cols / 2);
    const anchorRows = Math.max(4, Math.floor(this.rows * 0.18));
    const anchorHalfW = Math.floor(this.cols * 0.38);

    for (let y = 0; y < anchorRows; y++) {
      // Elliptical width narrows toward the bottom of the anchor
      const t = y / anchorRows;
      const halfW = Math.floor(anchorHalfW * (1 - t * 0.3));
      for (let x = cx - halfW; x <= cx + halfW; x++) {
        if (x >= 0 && x < this.cols && this.get(x, y) === 1) {
          const idx = y * this.cols + x;
          if (!connected[idx]) {
            connected[idx] = 1;
            stack.push(x, y);
          }
        }
      }
    }

    // Flood-fill (4-directional) through filled cells from anchors
    while (stack.length > 0) {
      const y = stack.pop();
      const x = stack.pop();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        const idx = ny * this.cols + nx;
        if (connected[idx] === 0 && this.cells[idx] === 1) {
          connected[idx] = 1;
          stack.push(nx, ny);
        }
      }
    }

    // Any filled cell not reached by the flood is disconnected
    const fallen = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x;
        if (this.cells[idx] === 1 && connected[idx] === 0) {
          fallen.push({ x, y });
          this.cells[idx] = 0;
        }
      }
    }
    return fallen;
  }

  // Draw beard onto a canvas context
  draw(ctx, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.get(x, y) === 1) {
          const px = offsetX + x * this.cellSize;
          const py = offsetY + y * this.cellSize;

          // Main hair color
          ctx.fillStyle = this.color;
          ctx.fillRect(px, py, this.cellSize, this.cellSize);

          // Add some texture/highlights
          if ((x + y) % 3 === 0) {
            ctx.fillStyle = this.highlightColor;
            ctx.fillRect(px, py, this.cellSize, this.cellSize * 0.4);
          }

          // Wispy edges - draw small lines for hair texture
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 0.5;
          const hairLen = this.cellSize * 0.6;
          // Only draw wisps on bottom/side edges
          if (this.get(x, y + 1) === 0) {
            ctx.beginPath();
            ctx.moveTo(px + this.cellSize * 0.3, py + this.cellSize);
            ctx.lineTo(px + this.cellSize * 0.3 + (Math.random() - 0.5) * 3, py + this.cellSize + hairLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px + this.cellSize * 0.7, py + this.cellSize);
            ctx.lineTo(px + this.cellSize * 0.7 + (Math.random() - 0.5) * 3, py + this.cellSize + hairLen);
            ctx.stroke();
          }
        }
      }
    }
  }
}

// Generate a full long beard (starting state for customers)
export function generateFullBeard(cols, rows, cellSize, colorIndex = -1) {
  const beard = new BeardGrid(cols, rows, cellSize);
  const ci = colorIndex >= 0 ? colorIndex : Math.floor(Math.random() * BEARD_COLORS.length);
  beard.color = BEARD_COLORS[ci];
  // Slightly lighter highlight
  beard.highlightColor = lightenColor(BEARD_COLORS[ci], 30);

  const centerX = Math.floor(cols / 2);

  for (let y = 0; y < rows; y++) {
    // Beard gets wider then tapers
    const progress = y / rows;
    let halfWidth;
    if (progress < 0.3) {
      // Upper beard - starts from face width
      halfWidth = Math.floor(centerX * (0.6 + progress * 1.0));
    } else if (progress < 0.7) {
      // Mid beard - full width
      halfWidth = Math.floor(centerX * 0.9);
    } else {
      // Lower beard - tapers to point
      const taper = (progress - 0.7) / 0.3;
      halfWidth = Math.floor(centerX * 0.9 * (1 - taper * 0.7));
    }

    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < cols) {
        // Add some randomness to edges
        const distFromCenter = Math.abs(x - centerX);
        const edgeDist = halfWidth - distFromCenter;
        if (edgeDist === 0 && Math.random() > 0.6) continue;
        beard.set(x, y, 1);
      }
    }
  }

  return beard;
}

// Generate a target beard shape (what the wizard wants)
export function generateTargetBeard(cols, rows, cellSize, style, colorIndex) {
  const beard = new BeardGrid(cols, rows, cellSize);
  beard.color = BEARD_COLORS[colorIndex >= 0 ? colorIndex : 0];
  beard.highlightColor = lightenColor(beard.color, 30);

  const centerX = Math.floor(cols / 2);

  const generators = {
    'goatee': generateGoatee,
    'vandyke': generateVandyke,
    'full-short': generateFullShort,
    'pointed': generatePointed,
    'forked': generateForked,
    'wizard-classic': generateWizardClassic,
    'mutton-chops': generateMuttonChops,
    'braided': generateBraided,
    'chin-strap': generateChinStrap,
    'soul-patch': generateSoulPatch,
    'handlebar': generateHandlebar,
    'anchor': generateAnchor,
    'ducktail': generateDucktail,
    'balbo': generateBalbo,
    'spiral': generateSpiral,
    'lightning': generateLightning,
    'clean-shave': generateCleanShave,
    'asymmetric': generateAsymmetric,
    'rune-carved': generateRuneCarved,
  };

  const gen = generators[style] || generateFullShort;
  gen(beard, centerX, cols, rows);

  return beard;
}

function generateGoatee(beard, cx, cols, rows) {
  const height = Math.floor(rows * 0.4);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const halfW = Math.floor(3 * (1 - progress * 0.5));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generateVandyke(beard, cx, cols, rows) {
  // Mustache part (top rows, gap in middle)
  for (let y = 0; y < 3; y++) {
    for (let x = cx - 5; x <= cx + 5; x++) {
      if (x >= 0 && x < beard.cols && Math.abs(x - cx) > 1) {
        beard.set(x, y, 1);
      }
    }
  }
  // Pointed chin part
  const height = Math.floor(rows * 0.5);
  for (let y = 3; y < height; y++) {
    const progress = (y - 3) / (height - 3);
    const halfW = Math.floor(3 * (1 - progress * 0.7));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
  }
}

function generateFullShort(beard, cx, cols, rows) {
  const height = Math.floor(rows * 0.35);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    let halfW = Math.floor(cx * (0.6 + progress * 0.3));
    if (progress > 0.7) {
      halfW = Math.floor(halfW * (1 - (progress - 0.7) / 0.3 * 0.5));
    }
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generatePointed(beard, cx, cols, rows) {
  const height = Math.floor(rows * 0.7);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    let halfW;
    if (progress < 0.2) {
      halfW = Math.floor(cx * 0.5);
    } else {
      halfW = Math.max(1, Math.floor(cx * 0.5 * (1 - (progress - 0.2) / 0.8)));
    }
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generateForked(beard, cx, cols, rows) {
  const height = Math.floor(rows * 0.65);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    if (progress < 0.35) {
      // Upper unified part
      const halfW = Math.floor(cx * 0.5);
      for (let x = cx - halfW; x <= cx + halfW; x++) {
        if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
      }
    } else {
      // Forked - two prongs
      const forkProgress = (progress - 0.35) / 0.65;
      const spread = Math.floor(3 + forkProgress * 4);
      const prongWidth = Math.max(1, Math.floor(3 * (1 - forkProgress * 0.5)));
      // Left prong
      for (let x = cx - spread - prongWidth; x <= cx - spread + prongWidth; x++) {
        if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
      }
      // Right prong
      for (let x = cx + spread - prongWidth; x <= cx + spread + prongWidth; x++) {
        if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
      }
    }
  }
}

function generateWizardClassic(beard, cx, cols, rows) {
  // Long flowing beard that's wider in middle, tapers at end
  const height = Math.floor(rows * 0.85);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    let halfW;
    if (progress < 0.15) {
      halfW = Math.floor(cx * (0.4 + progress * 2));
    } else if (progress < 0.5) {
      halfW = Math.floor(cx * 0.7);
    } else {
      const taper = (progress - 0.5) / 0.5;
      halfW = Math.max(2, Math.floor(cx * 0.7 * (1 - taper * 0.6)));
    }
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) {
        // Add waviness
        const wave = Math.sin(y * 0.3 + x * 0.1) > 0.7 ? 0 : 1;
        if (wave || Math.abs(x - cx) < halfW - 1) {
          beard.set(x, y, 1);
        }
      }
    }
  }
}

function generateMuttonChops(beard, cx, cols, rows) {
  const height = Math.floor(rows * 0.4);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const outerW = Math.floor(cx * 0.8);
    const innerW = Math.floor(cx * 0.25 + progress * cx * 0.15);
    // Left chop
    for (let x = cx - outerW; x <= cx - innerW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
    // Right chop
    for (let x = cx + innerW; x <= cx + outerW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generateBraided(beard, cx, cols, rows) {
  // Short top that leads into three braids
  const topHeight = Math.floor(rows * 0.2);
  for (let y = 0; y < topHeight; y++) {
    const halfW = Math.floor(cx * 0.5);
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
  }
  // Three braids
  const braidHeight = Math.floor(rows * 0.6);
  for (let y = topHeight; y < topHeight + braidHeight; y++) {
    const by = y - topHeight;
    const braidWidth = 2;
    // Center braid
    for (let x = cx - braidWidth; x <= cx + braidWidth; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
    // Left braid (with wave)
    const leftOff = cx - 6 + Math.floor(Math.sin(by * 0.4) * 1.5);
    for (let x = leftOff - braidWidth; x <= leftOff + braidWidth; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
    // Right braid (with wave)
    const rightOff = cx + 6 + Math.floor(Math.sin(by * 0.4 + Math.PI) * 1.5);
    for (let x = rightOff - braidWidth; x <= rightOff + braidWidth; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
  }
}

function generateChinStrap(beard, cx, cols, rows) {
  // Thin beard following the jawline
  const height = Math.floor(rows * 0.25);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const outerW = Math.floor(cx * (0.65 - progress * 0.3));
    const innerW = Math.max(0, outerW - 2);
    for (let x = cx - outerW; x <= cx + outerW; x++) {
      if (x >= 0 && x < cols) {
        const dist = Math.abs(x - cx);
        // Only edges and bottom
        if (dist >= innerW || progress > 0.75) {
          beard.set(x, y, 1);
        }
      }
    }
  }
}

function generateSoulPatch(beard, cx, cols, rows) {
  // Tiny patch just below the lower lip
  const height = Math.floor(rows * 0.2);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const halfW = Math.max(1, Math.floor(2 * (1 - progress * 0.5)));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generateHandlebar(beard, cx, cols, rows) {
  // Wide mustache that curls up at the ends, no chin beard
  for (let y = 0; y < 4; y++) {
    const baseW = Math.floor(cx * 0.7);
    for (let x = cx - baseW; x <= cx + baseW; x++) {
      if (x >= 0 && x < cols && Math.abs(x - cx) > 1) {
        beard.set(x, y, 1);
      }
    }
    // Curled tips go upward
    if (y < 2) {
      const tipX1 = cx - baseW - 1 - y;
      const tipX2 = cx + baseW + 1 + y;
      if (tipX1 >= 0) beard.set(tipX1, Math.max(0, y - 1), 1);
      if (tipX2 < cols) beard.set(tipX2, Math.max(0, y - 1), 1);
    }
  }
}

function generateAnchor(beard, cx, cols, rows) {
  // Pointed chin beard + thin strip along jaw + no cheek connection (anchor shape)
  // Vertical strip
  const height = Math.floor(rows * 0.55);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const halfW = Math.max(1, Math.floor(3 * (1 - progress * 0.6)));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
  // Horizontal bar across top (jawline)
  for (let x = cx - 8; x <= cx + 8; x++) {
    if (x >= 0 && x < cols) {
      beard.set(x, 0, 1);
      beard.set(x, 1, 1);
    }
  }
  // Small hooks at ends of bar
  for (let y = 0; y < 3; y++) {
    if (cx - 8 >= 0) beard.set(cx - 8, y, 1);
    if (cx + 8 < cols) beard.set(cx + 8, y, 1);
  }
}

function generateDucktail(beard, cx, cols, rows) {
  // Full beard that tapers to a sharp ducktail point
  const height = Math.floor(rows * 0.6);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    let halfW;
    if (progress < 0.3) {
      halfW = Math.floor(cx * 0.6);
    } else if (progress < 0.5) {
      halfW = Math.floor(cx * 0.6 * (1 - (progress - 0.3) / 0.2 * 0.2));
    } else {
      // Sharp taper
      const t = (progress - 0.5) / 0.5;
      halfW = Math.max(0, Math.floor(cx * 0.48 * (1 - t)));
    }
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
}

function generateBalbo(beard, cx, cols, rows) {
  // Disconnected mustache + chin beard with no sideburns
  // Mustache (floating, gap from chin part)
  for (let y = 0; y < 3; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      if (x >= 0 && x < beard.cols && Math.abs(x - cx) > 1) {
        beard.set(x, y, 1);
      }
    }
  }
  // Chin beard (starts a couple rows below mustache)
  const chinStart = 5;
  const chinH = Math.floor(rows * 0.35);
  for (let y = chinStart; y < chinStart + chinH; y++) {
    const progress = (y - chinStart) / chinH;
    let halfW = Math.floor(5 * (1 - progress * 0.4));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < beard.cols) beard.set(x, y, 1);
    }
  }
}

function generateSpiral(beard, cx, cols, rows) {
  // Beard that spirals outward from center — very tricky to match
  const height = Math.floor(rows * 0.7);
  const maxRadius = Math.min(cx - 1, height - 1);
  // Draw a spiral
  for (let angle = 0; angle < Math.PI * 6; angle += 0.05) {
    const r = angle / (Math.PI * 6) * maxRadius;
    const x = Math.floor(cx + Math.cos(angle) * r);
    const y = Math.floor(r * 0.8 + Math.sin(angle) * r * 0.3);
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      beard.set(x, y, 1);
      // Thicken the line
      if (x + 1 < cols) beard.set(x + 1, y, 1);
      if (y + 1 < rows) beard.set(x, y + 1, 1);
    }
  }
}

function generateLightning(beard, cx, cols, rows) {
  // Lightning bolt shape carved into the beard
  // Start with a medium full beard
  const height = Math.floor(rows * 0.55);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const halfW = Math.floor(cx * (0.5 - progress * 0.15));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
  // Carve lightning bolt gap through it
  const boltPoints = [
    [cx + 2, 2], [cx - 3, 6], [cx + 1, 8], [cx - 4, 12],
    [cx, 14], [cx - 2, Math.floor(height * 0.9)],
  ];
  for (let i = 0; i < boltPoints.length - 1; i++) {
    const [x1, y1] = boltPoints[i];
    const [x2, y2] = boltPoints[i + 1];
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const bx = Math.floor(x1 + (x2 - x1) * t);
      const by = Math.floor(y1 + (y2 - y1) * t);
      // Clear a 2-wide gap
      for (let dx = -1; dx <= 1; dx++) {
        if (bx + dx >= 0 && bx + dx < cols && by >= 0 && by < rows) {
          beard.set(bx + dx, by, 0);
        }
      }
    }
  }
}

function generateCleanShave(beard, cx, cols, rows) {
  // Nothing! The wizard wants it ALL off.
}

function generateAsymmetric(beard, cx, cols, rows) {
  // Left side: long flowing, right side: short trim
  const height = Math.floor(rows * 0.7);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    // Left side goes long
    const leftW = Math.floor(cx * 0.6 * (1 - progress * 0.3));
    for (let x = cx - leftW; x < cx; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
    // Right side is short — cut off after 35%
    if (progress < 0.35) {
      const rightW = Math.floor(cx * 0.6 * (1 - progress * 0.5));
      for (let x = cx; x <= cx + rightW; x++) {
        if (x < cols) beard.set(x, y, 1);
      }
    }
  }
}

function generateRuneCarved(beard, cx, cols, rows) {
  // Full medium beard with rune symbols carved out
  const height = Math.floor(rows * 0.55);
  for (let y = 0; y < height; y++) {
    const progress = y / height;
    const halfW = Math.floor(cx * (0.55 - progress * 0.1));
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      if (x >= 0 && x < cols) beard.set(x, y, 1);
    }
  }
  // Carve rune: vertical line with diamond
  const runeX = cx;
  for (let y = 3; y < Math.min(height - 2, 16); y++) {
    beard.set(runeX, y, 0);
  }
  // Diamond shape in middle
  const diamondY = Math.floor(height * 0.4);
  for (let r = 1; r <= 3; r++) {
    for (let dx = -r; dx <= r; dx++) {
      const dy = r - Math.abs(dx);
      const x1 = runeX + dx;
      const y1 = diamondY + dy;
      const y2 = diamondY - dy;
      if (x1 >= 0 && x1 < cols) {
        if (y1 >= 0 && y1 < rows) beard.set(x1, y1, 0);
        if (y2 >= 0 && y2 < rows) beard.set(x1, y2, 0);
      }
    }
  }
  // Horizontal bars above and below diamond
  for (let dx = -4; dx <= 4; dx++) {
    const x = runeX + dx;
    if (x >= 0 && x < cols) {
      if (diamondY - 5 >= 0) beard.set(x, diamondY - 5, 0);
      if (diamondY + 5 < rows) beard.set(x, diamondY + 5, 0);
    }
  }
}

// Compare two beard grids and return a similarity score 0-100
export function compareBeards(playerBeard, targetBeard) {
  if (playerBeard.cols !== targetBeard.cols || playerBeard.rows !== targetBeard.rows) {
    throw new Error('Beard grids must be same size to compare');
  }

  const total = playerBeard.cols * playerBeard.rows;
  let extraHair = 0;
  let missingHair = 0;
  let correctHair = 0;

  for (let i = 0; i < total; i++) {
    const p = playerBeard.cells[i];
    const t = targetBeard.cells[i];
    if (p === 1 && t === 1) correctHair++;
    else if (p === 1 && t === 0) extraHair++;
    else if (p === 0 && t === 1) missingHair++;
  }

  const targetFilled = targetBeard.countFilled();
  const playerFilled = playerBeard.countFilled();

  // Target is clean shaven — score based on how much hair is left
  if (targetFilled === 0) {
    return playerFilled === 0 ? 100 : Math.max(0, Math.round(100 - (playerFilled / total) * 200));
  }

  // Recall: what fraction of the target hair did the player keep?
  // If you shave everything off, this is 0%.
  const recall = correctHair / targetFilled;

  // Precision: of the hair the player has, how much is correct?
  // If player has no hair, precision is 0 (they shaved it all).
  const precision = playerFilled > 0 ? correctHair / playerFilled : 0;

  // F1-like score — both recall and precision must be high
  // This means shaving everything gives 0 (recall=0), and leaving
  // everything gives a low score too (precision is low due to extra hair).
  const f1 = (recall + precision > 0)
    ? 2 * recall * precision / (recall + precision)
    : 0;

  return Math.max(0, Math.min(100, Math.round(f1 * 100)));
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
