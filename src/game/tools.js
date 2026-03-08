// Barber tools - each has unique cutting mechanics

export const TOOLS = {
  scissors: {
    id: 'scissors',
    name: 'Basic Scissors',
    icon: '✂️',
    description: 'Circular snip. Your trusty starter.',
    size: 2,
    maxSize: 4,
    price: 0,
    unlocked: true,
    type: 'cut',
    shape: 'circle',
  },
  razor: {
    id: 'razor',
    name: 'Straight Razor',
    icon: '🪒',
    description: 'Thin horizontal blade. Perfect for clean lines.',
    size: 2,
    maxSize: 5,
    price: 50,
    unlocked: false,
    type: 'cut',
    shape: 'horizontal', // wide but thin
  },
  clippers: {
    id: 'clippers',
    name: 'Enchanted Clippers',
    icon: '⚡',
    description: 'Zaps a big square. Fast but imprecise.',
    size: 4,
    maxSize: 8,
    price: 200,
    unlocked: false,
    type: 'cut',
    shape: 'square',
  },
  trimmer: {
    id: 'trimmer',
    name: 'Precision Trimmer',
    icon: '🔧',
    description: 'Single-pixel exacto blade. Surgical precision.',
    size: 1,
    maxSize: 1,
    price: 150,
    unlocked: false,
    type: 'cut',
    shape: 'pixel',
  },
  comb: {
    id: 'comb',
    name: 'Styling Comb',
    icon: '🪮',
    description: 'Reveals a ghostly guide of the target style.',
    size: 0,
    maxSize: 0,
    price: 75,
    unlocked: false,
    type: 'utility',
    shape: 'none',
  },
  wand: {
    id: 'wand',
    name: 'Regrowth Wand',
    icon: '🪄',
    description: 'Magically regrow hair. 15 uses per customer.',
    size: 2,
    maxSize: 4,
    price: 300,
    unlocked: false,
    type: 'grow',
    shape: 'circle',
    usesPerCustomer: 15,
  },
  fireSpell: {
    id: 'fireSpell',
    name: 'Fire Trim Spell',
    icon: '🔥',
    description: 'Burns a vertical column. Dramatic and devastating.',
    size: 2,
    maxSize: 4,
    price: 500,
    unlocked: false,
    type: 'cut',
    shape: 'vertical', // tall thin column
  },
  iceSpell: {
    id: 'iceSpell',
    name: 'Frost Shears',
    icon: '❄️',
    description: 'Freezes and shatters a diamond-shaped area.',
    size: 3,
    maxSize: 6,
    price: 400,
    unlocked: false,
    type: 'cut',
    shape: 'diamond',
  },
};

export function getUnlockedTools(ownedToolIds) {
  return Object.values(TOOLS).filter(t => t.unlocked || ownedToolIds.includes(t.id));
}

export function getShopTools(ownedToolIds) {
  return Object.values(TOOLS).filter(t => !t.unlocked && !ownedToolIds.includes(t.id));
}

// Each tool shape produces a different set of cells to affect
function getCellsForShape(shape, gridX, gridY, toolSize) {
  const cells = [];
  const half = Math.floor(toolSize / 2);

  switch (shape) {
    case 'circle':
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          if (dx * dx + dy * dy <= half * half + half) {
            cells.push([gridX + dx, gridY + dy]);
          }
        }
      }
      break;

    case 'horizontal':
      // Wide and thin: width = toolSize*2, height = 1
      for (let dx = -toolSize; dx <= toolSize; dx++) {
        cells.push([gridX + dx, gridY]);
      }
      break;

    case 'vertical':
      // Tall and thin: width = 1, height = toolSize*2
      for (let dy = -toolSize; dy <= toolSize; dy++) {
        cells.push([gridX, gridY + dy]);
      }
      break;

    case 'square':
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          cells.push([gridX + dx, gridY + dy]);
        }
      }
      break;

    case 'diamond':
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= half) {
            cells.push([gridX + dx, gridY + dy]);
          }
        }
      }
      break;

    case 'pixel':
      cells.push([gridX, gridY]);
      break;

    default:
      cells.push([gridX, gridY]);
  }

  return cells;
}

// Apply tool at grid position
export function applyTool(beard, toolId, gridX, gridY, toolSize) {
  const tool = TOOLS[toolId];
  if (!tool) return false;

  const cells = getCellsForShape(tool.shape, gridX, gridY, toolSize);
  let changed = false;

  const targetVal = tool.type === 'grow' ? 1 : 0;
  const sourceVal = tool.type === 'grow' ? 0 : 1;

  for (const [x, y] of cells) {
    if (beard.get(x, y) === sourceVal) {
      beard.set(x, y, targetVal);
      changed = true;
    }
  }

  return changed;
}
