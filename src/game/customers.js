// Customer/wizard generation system

import { generateFullBeard, generateTargetBeard } from './beardRenderer.js';

const WIZARD_NAMES = [
  'Gandolphus the Grey',
  'Merlin McBeardface',
  'Alazar the Ancient',
  'Bramblethorne',
  'Cedric Spellweaver',
  'Dumblesworth',
  'Eldric Firemane',
  'Fizzlebang the Wise',
  'Grimwald Stonebeard',
  'Hagsworth the Hairy',
  'Ignatius Longwhisker',
  'Jareth Moonbeard',
  'Kragg the Unkempt',
  'Luminos Silverbeard',
  'Mortimer Tangletress',
  'Norbert Bushybrow',
  'Ozwald Curlbeard',
  'Prospero Goldmane',
  'Quillon Thickbeard',
  'Rumblesnort the Elder',
  'Silas Twistwhisker',
  'Thaddeus Braidbeard',
  'Ulric Frostmane',
  'Volstagg Ironbeard',
  'Wendell Puffbeard',
];

const BEARD_STYLES = [
  { id: 'goatee', name: 'The Mystic Goatee', difficulty: 1 },
  { id: 'full-short', name: 'The Scholar Trim', difficulty: 1 },
  { id: 'chin-strap', name: 'The Chin Strap', difficulty: 1 },
  { id: 'vandyke', name: 'The Van Dyke', difficulty: 2 },
  { id: 'pointed', name: 'The Sorcerer Point', difficulty: 2 },
  { id: 'mutton-chops', name: 'Enchanted Chops', difficulty: 2 },
  { id: 'soul-patch', name: 'The Soul Rune', difficulty: 2 },
  { id: 'handlebar', name: 'The Handlebar Hex', difficulty: 2 },
  { id: 'forked', name: 'The Bifrost Fork', difficulty: 3 },
  { id: 'wizard-classic', name: 'Classic Wizard', difficulty: 3 },
  { id: 'anchor', name: 'The Anchor Ward', difficulty: 3 },
  { id: 'ducktail', name: 'The Phoenix Tail', difficulty: 3 },
  { id: 'balbo', name: 'The Balbo Enchantment', difficulty: 3 },
  { id: 'braided', name: 'Triple Braid of Power', difficulty: 4 },
  { id: 'spiral', name: 'The Arcane Spiral', difficulty: 4 },
  { id: 'lightning', name: 'The Thunderbolt', difficulty: 4 },
  { id: 'clean-shave', name: 'The Humble Monk', difficulty: 1 },
  { id: 'asymmetric', name: 'The Chaos Mage', difficulty: 5 },
  { id: 'rune-carved', name: 'Rune-Carved Beard', difficulty: 5 },
];

export function generateCustomer(day, beardCols, beardRows, cellSize) {
  const name = WIZARD_NAMES[Math.floor(Math.random() * WIZARD_NAMES.length)];

  // Higher days unlock harder styles
  const maxDifficulty = Math.min(5, 1 + Math.floor(day / 2));
  const availableStyles = BEARD_STYLES.filter(s => s.difficulty <= maxDifficulty);
  const style = availableStyles[Math.floor(Math.random() * availableStyles.length)];

  const colorIndex = Math.floor(Math.random() * 7);

  const fullBeard = generateFullBeard(beardCols, beardRows, cellSize, colorIndex);
  const targetBeard = generateTargetBeard(beardCols, beardRows, cellSize, style.id, colorIndex);

  // Base pay scales with difficulty
  const basePay = 20 + style.difficulty * 15 + day * 5;
  // Patience (time limit in seconds) - shorter and tighter
  const patience = Math.max(15, 45 - style.difficulty * 5 - Math.floor(day / 3) * 3);

  return {
    name,
    style,
    colorIndex,
    fullBeard,
    targetBeard,
    basePay,
    patience,
  };
}

export function calculateTip(score, basePay) {
  if (score >= 95) return Math.floor(basePay * 2.0);
  if (score >= 85) return Math.floor(basePay * 1.5);
  if (score >= 70) return Math.floor(basePay * 1.0);
  if (score >= 50) return Math.floor(basePay * 0.5);
  if (score >= 30) return Math.floor(basePay * 0.2);
  return 0;
}

export function getConsequence(score, day) {
  if (score >= 50) return null;

  if (score < 10) {
    return {
      text: 'The wizard curses your scissors! -1 tool durability!',
      type: 'curse',
      severity: 3,
    };
  } else if (score < 20) {
    return {
      text: 'The wizard hexes your shop sign! Reputation -2',
      type: 'hex',
      severity: 2,
    };
  } else if (score < 35) {
    return {
      text: 'The wizard leaves a bad review on WizardYelp!',
      type: 'review',
      severity: 1,
    };
  }
  return {
    text: 'The wizard grumbles but pays the minimum.',
    type: 'grumble',
    severity: 0,
  };
}

export function getCustomersForDay(day) {
  // More customers as days progress
  return Math.min(8, 2 + Math.floor(day / 2));
}
