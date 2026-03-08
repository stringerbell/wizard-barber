// Shop upgrades — passive buffs with multiple upgrade levels

export const UPGRADES = {
  comfyChair: {
    id: 'comfyChair',
    name: 'Comfy Chair',
    icon: '💺',
    category: 'shop',
    maxLevel: 3,
    basePrice: 100,
    priceScale: 1.8,
    levels: [
      { description: '+10s patience' },
      { description: '+20s patience' },
      { description: '+30s patience' },
    ],
    effect: (lvl) => ({ extraPatience: lvl * 10 }),
  },
  tipJar: {
    id: 'tipJar',
    name: 'Golden Tip Jar',
    icon: '🏺',
    category: 'shop',
    maxLevel: 3,
    basePrice: 200,
    priceScale: 2.0,
    levels: [
      { description: 'Tips +25%' },
      { description: 'Tips +50%' },
      { description: 'Tips +75%' },
    ],
    effect: (lvl) => ({ tipMultiplier: 1 + lvl * 0.25 }),
  },
  goldPlating: {
    id: 'goldPlating',
    name: 'Gold-Plated Scissors',
    icon: '🥇',
    category: 'shop',
    maxLevel: 5,
    basePrice: 200,
    priceScale: 1.6,
    levels: [
      { description: 'Base pay +10' },
      { description: 'Base pay +20' },
      { description: 'Base pay +30' },
      { description: 'Base pay +40' },
      { description: 'Base pay +50' },
    ],
    effect: (lvl) => ({ extraBasePay: lvl * 10 }),
  },
  hourglass: {
    id: 'hourglass',
    name: 'Enchanted Hourglass',
    icon: '⏳',
    category: 'shop',
    maxLevel: 3,
    basePrice: 400,
    priceScale: 2.0,
    levels: [
      { description: '+15s patience' },
      { description: '+30s patience' },
      { description: '+45s patience' },
    ],
    effect: (lvl) => ({ extraPatience: lvl * 15 }),
  },
  enchantedApron: {
    id: 'enchantedApron',
    name: 'Enchanted Apron',
    icon: '🧥',
    category: 'defense',
    maxLevel: 3,
    basePrice: 350,
    priceScale: 2.0,
    levels: [
      { description: 'Curse duration -1' },
      { description: 'Curse duration -2' },
      { description: 'Curse duration -3 (most curses gone instantly!)' },
    ],
    effect: (lvl) => ({ curseDurationReduction: lvl }),
  },
  luckyCharm: {
    id: 'luckyCharm',
    name: 'Lucky Charm',
    icon: '🍀',
    category: 'defense',
    maxLevel: 3,
    basePrice: 400,
    priceScale: 2.2,
    levels: [
      { description: '20% chance to dodge curses' },
      { description: '40% chance to dodge curses' },
      { description: '60% chance to dodge curses' },
    ],
    effect: (lvl) => ({ curseDodgeChance: lvl * 0.2 }),
  },
  runeShield: {
    id: 'runeShield',
    name: 'Rune Shield',
    icon: '🛡️',
    category: 'defense',
    maxLevel: 2,
    basePrice: 700,
    priceScale: 2.5,
    levels: [
      { description: 'Blocks curses from "upset" wizards' },
      { description: 'Blocks curses from "upset" and "angry" wizards' },
    ],
    effect: (lvl) => ({ curseBlockLevel: lvl }),
  },
  potionKit: {
    id: 'potionKit',
    name: 'Curse Remedy Kit',
    icon: '🧪',
    category: 'defense',
    maxLevel: 3,
    basePrice: 600,
    priceScale: 2.0,
    levels: [
      { description: 'Remove 1 curse at start of each day' },
      { description: 'Remove 2 curses at start of each day' },
      { description: 'Remove ALL curses at start of each day' },
    ],
    effect: (lvl) => ({ cursesRemovedPerDay: lvl >= 3 ? 99 : lvl }),
  },
  wandCharger: {
    id: 'wandCharger',
    name: 'Wand Recharger',
    icon: '🔋',
    category: 'tool-boost',
    maxLevel: 3,
    basePrice: 450,
    priceScale: 1.8,
    requires: 'wand',
    levels: [
      { description: '+10 wand uses per customer' },
      { description: '+20 wand uses per customer' },
      { description: '+30 wand uses per customer' },
    ],
    effect: (lvl) => ({ extraWandUses: lvl * 10 }),
  },
  dragonScales: {
    id: 'dragonScales',
    name: 'Dragon Scale Polish',
    icon: '🐉',
    category: 'tool-boost',
    maxLevel: 3,
    basePrice: 600,
    priceScale: 2.5,
    levels: [
      { description: 'All tools +1 cell wider' },
      { description: 'All tools +2 cells wider' },
      { description: 'All tools +3 cells wider' },
    ],
    effect: (lvl) => ({ extraToolSize: lvl }),
  },
  phoenixFeather: {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    icon: '🪶',
    category: 'special',
    maxLevel: 3,
    basePrice: 800,
    priceScale: 2.0,
    levels: [
      { description: '1 beard redo per day' },
      { description: '2 beard redos per day' },
      { description: '3 beard redos per day' },
    ],
    effect: (lvl) => ({ redosPerDay: lvl }),
  },
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice',
    icon: '🧑‍🎓',
    category: 'special',
    maxLevel: 5,
    basePrice: 1000,
    priceScale: 1.8,
    levels: [
      { description: '1 apprentice: trims 1 stray hair/sec' },
      { description: '2 apprentices: trim 2 stray hairs/sec' },
      { description: '3 apprentices: trim 3 stray hairs/sec' },
      { description: '4 apprentices: trim 4 stray hairs/sec' },
      { description: '5 apprentices! Trim 5 stray hairs/sec' },
    ],
    effect: (lvl) => ({ apprenticeCount: lvl }),
  },
  timeWarp: {
    id: 'timeWarp',
    name: 'Time Warp Scroll',
    icon: '📜',
    category: 'special',
    maxLevel: 3,
    basePrice: 750,
    priceScale: 2.0,
    levels: [
      { description: 'Freeze timer for 8s, once per customer' },
      { description: 'Freeze timer for 12s, once per customer' },
      { description: 'Freeze timer for 16s, once per customer' },
    ],
    effect: (lvl) => ({ freezeDuration: 4 + lvl * 4 }),
  },
  crystalBall: {
    id: 'crystalBall',
    name: 'Crystal Ball',
    icon: '🔮',
    category: 'shop',
    maxLevel: 1,
    basePrice: 300,
    priceScale: 1,
    levels: [
      { description: 'Preview next customer\'s desired style' },
    ],
    effect: () => ({ previewNext: true }),
  },
  magicMirror: {
    id: 'magicMirror',
    name: 'Magic Mirror',
    icon: '🪞',
    category: 'shop',
    maxLevel: 1,
    basePrice: 250,
    priceScale: 1,
    levels: [
      { description: 'Wizards see themselves and relax. Extra patience +5s.' },
    ],
    effect: () => ({ extraPatience: 5 }),
  },
};

// Get price for next level of an upgrade
export function getUpgradePrice(upgrade, currentLevel) {
  return Math.floor(upgrade.basePrice * Math.pow(upgrade.priceScale, currentLevel));
}

// Get effect values for a given upgrade at a given level
export function getUpgradeEffect(upgradeId, level) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade || level <= 0) return {};
  return upgrade.effect(level);
}

// Get all upgrades available in the shop (not yet maxed, requirements met)
export function getShopUpgrades(upgradeLevels, ownedToolIds) {
  return Object.values(UPGRADES).filter(u => {
    const currentLvl = upgradeLevels[u.id] || 0;
    if (currentLvl >= u.maxLevel) return false;
    if (u.requires && !ownedToolIds.includes(u.requires)) return false;
    return true;
  });
}
