// Curse system: angry wizards hex the barber with persistent debuffs

export const CURSE_TYPES = {
  shakyhands: {
    id: 'shakyhands',
    name: 'Trembling Hands',
    icon: '🫨',
    description: 'Your hands shake! Cursor jitters randomly while cutting.',
    duration: 3, // lasts N customers
    minAnger: 'upset', // minimum emotion to trigger
  },
  reversed: {
    id: 'reversed',
    name: 'Mirror Hex',
    icon: '🪞',
    description: 'Controls are horizontally reversed!',
    duration: 2,
    minAnger: 'angry',
  },
  foggy: {
    id: 'foggy',
    name: 'Fog of Confusion',
    icon: '🌫️',
    description: 'A fog obscures parts of the beard. Hard to see what you\'re cutting.',
    duration: 3,
    minAnger: 'upset',
  },
  butterfingers: {
    id: 'butterfingers',
    name: 'Butterfingers Jinx',
    icon: '🧈',
    description: 'Tools slip! Your cuts are 50% bigger than intended.',
    duration: 2,
    minAnger: 'angry',
  },
  sneezy: {
    id: 'sneezy',
    name: 'Sneezing Spell',
    icon: '🤧',
    description: 'Random sneezes jolt your hand mid-cut!',
    duration: 3,
    minAnger: 'upset',
  },
  slowmo: {
    id: 'slowmo',
    name: 'Time Drag',
    icon: '🐌',
    description: 'Time moves faster! Timer runs at 1.5x speed.',
    duration: 2,
    minAnger: 'angry',
  },
  blindspot: {
    id: 'blindspot',
    name: 'Blind Spot Curse',
    icon: '🙈',
    description: 'A dark patch follows your cursor, hiding what\'s underneath.',
    duration: 2,
    minAnger: 'angry',
  },
  regrowth: {
    id: 'regrowth',
    name: 'Wild Regrowth',
    icon: '🌱',
    description: 'The beard slowly grows back as you cut!',
    duration: 2,
    minAnger: 'furious',
  },
  tinytools: {
    id: 'tinytools',
    name: 'Shrinking Charm',
    icon: '🔬',
    description: 'All tools are half their normal size.',
    duration: 3,
    minAnger: 'upset',
  },
  drunk: {
    id: 'drunk',
    name: 'Dizziness Draft',
    icon: '🍺',
    description: 'Your cursor drifts with momentum. Hard to stop precisely.',
    duration: 2,
    minAnger: 'furious',
  },
};

const ANGER_LEVELS = ['ecstatic', 'happy', 'neutral', 'upset', 'angry', 'furious'];

function angerAtLeast(emotion, minAnger) {
  return ANGER_LEVELS.indexOf(emotion) >= ANGER_LEVELS.indexOf(minAnger);
}

export class CurseManager {
  constructor() {
    // Active curses: { id, remainingCustomers }
    this.active = [];
  }

  // Get a random curse based on how angry the wizard is
  rollCurse(emotion) {
    const eligible = Object.values(CURSE_TYPES).filter(c => {
      // Must be angry enough
      if (!angerAtLeast(emotion, c.minAnger)) return false;
      // Don't stack the same curse
      if (this.active.find(a => a.id === c.id)) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    // Weight toward harsher curses for angrier wizards
    const angerIdx = ANGER_LEVELS.indexOf(emotion);
    // Furious = more likely to get the nasty ones
    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    return picked;
  }

  applyCurse(curseType) {
    this.active.push({
      id: curseType.id,
      remainingCustomers: curseType.duration,
    });
  }

  // Call after each customer — tick down durations
  tickCustomer() {
    this.active = this.active
      .map(c => ({ ...c, remainingCustomers: c.remainingCustomers - 1 }))
      .filter(c => c.remainingCustomers > 0);
  }

  hasCurse(id) {
    return this.active.some(c => c.id === id);
  }

  getActiveCurses() {
    return this.active.map(c => ({
      ...CURSE_TYPES[c.id],
      remainingCustomers: c.remainingCustomers,
    }));
  }

  // Reset all curses (new game)
  reset() {
    this.active = [];
  }

  // Get karma level: 0 = pure, higher = more cursed
  getKarmaLevel() {
    return this.active.length;
  }

  getKarmaText() {
    const level = this.getKarmaLevel();
    if (level === 0) return { text: 'Pure', color: '#27ae60' };
    if (level === 1) return { text: 'Hexed', color: '#f39c12' };
    if (level === 2) return { text: 'Cursed', color: '#e67e22' };
    if (level === 3) return { text: 'Damned', color: '#e74c3c' };
    return { text: 'Doomed', color: '#8e44ad' };
  }
}
