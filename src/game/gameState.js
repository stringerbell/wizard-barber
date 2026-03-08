// Central game state management

import { UPGRADES, getUpgradePrice, getUpgradeEffect } from './upgrades.js';

const SAVE_KEY = 'wizard-barber-save';

const DEFAULT_STATE = {
  money: 0,
  day: 1,
  reputation: 5, // 0-10 scale
  ownedTools: ['scissors'],
  upgradeLevels: {}, // { upgradeId: level }
  ownedShops: 1,
  totalCustomersServed: 0,
  totalMoneyEarned: 0,
  bestScore: 0,
  franchisees: 0,
  // Per-day tracking
  dayEarnings: 0,
  dayCustomersServed: 0,
  dayScores: [],
};

export class GameState {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.listeners = [];
  }

  load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...DEFAULT_STATE, ...parsed };
        // Migrate old ownedUpgrades array to upgradeLevels
        if (parsed.ownedUpgrades && !parsed.upgradeLevels) {
          this.state.upgradeLevels = {};
          for (const id of parsed.ownedUpgrades) {
            this.state.upgradeLevels[id] = 1;
          }
          delete this.state.ownedUpgrades;
        }
        return true;
      }
    } catch (e) {
      console.warn('Failed to load save:', e);
    }
    return false;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  reset() {
    this.state = { ...DEFAULT_STATE, upgradeLevels: {} };
    localStorage.removeItem(SAVE_KEY);
    this.notify();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.notify();
  }

  addMoney(amount) {
    this.state.money += amount;
    this.state.dayEarnings += amount;
    this.state.totalMoneyEarned += amount;
    this.notify();
  }

  spendMoney(amount) {
    if (this.state.money < amount) return false;
    this.state.money -= amount;
    this.notify();
    return true;
  }

  buyTool(toolId, price) {
    if (this.state.money < price) return false;
    if (this.state.ownedTools.includes(toolId)) return false;
    this.state.money -= price;
    this.state.ownedTools.push(toolId);
    this.save();
    this.notify();
    return true;
  }

  // Buy next level of an upgrade
  buyUpgrade(upgradeId) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return false;
    const currentLevel = this.state.upgradeLevels[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;
    const price = getUpgradePrice(upgrade, currentLevel);
    if (this.state.money < price) return false;
    this.state.money -= price;
    this.state.upgradeLevels[upgradeId] = currentLevel + 1;
    this.save();
    this.notify();
    return true;
  }

  hasUpgrade(id) {
    return (this.state.upgradeLevels[id] || 0) > 0;
  }

  upgradeLevel(id) {
    return this.state.upgradeLevels[id] || 0;
  }

  // Get the combined effect value for an upgrade
  upgradeEffect(id) {
    return getUpgradeEffect(id, this.upgradeLevel(id));
  }

  recordCustomer(score) {
    this.state.totalCustomersServed++;
    this.state.dayCustomersServed++;
    this.state.dayScores.push(score);
    if (score > this.state.bestScore) {
      this.state.bestScore = score;
    }
    this.notify();
  }

  adjustReputation(amount) {
    this.state.reputation = Math.max(0, Math.min(10, this.state.reputation + amount));
    this.notify();
  }

  startNewDay() {
    this.state.day++;
    this.state.dayEarnings = 0;
    this.state.dayCustomersServed = 0;
    this.state.dayScores = [];
    this.save();
    this.notify();
  }

  getDayAvgScore() {
    const scores = this.state.dayScores;
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  canAfford(price) {
    return this.state.money >= price;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }
}
