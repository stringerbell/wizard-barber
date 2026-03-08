// Screen rendering functions

import { TOOLS, getUnlockedTools, getShopTools } from './tools.js';
import { UPGRADES, getShopUpgrades, getUpgradePrice } from './upgrades.js';
import { getCustomersForDay } from './customers.js';

export function renderTitleScreen(app, onStart, onContinue, hasSave) {
  app.innerHTML = `
    <div class="title-screen">
      <div class="wizard-art">🧙‍♂️</div>
      <h1>Wizard Barber</h1>
      <p class="subtitle">Where magic meets grooming</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        <button class="btn" id="btn-new">New Game</button>
        ${hasSave ? '<button class="btn" id="btn-continue">Continue</button>' : ''}
      </div>
      <p style="margin-top:30px; color:#666; font-size:0.8rem;">
        Trim wizard beards to match their desired style.<br>
        Earn gold, buy tools, and build your barbershop empire!
      </p>
    </div>
  `;

  app.querySelector('#btn-new').addEventListener('click', onStart);
  if (hasSave) {
    app.querySelector('#btn-continue').addEventListener('click', onContinue);
  }
}

export function renderDayIntro(app, day, customersCount, money, onReady) {
  app.innerHTML = `
    <div class="title-screen">
      <h1>Day ${day}</h1>
      <p class="subtitle">${customersCount} wizard${customersCount > 1 ? 's' : ''} in the queue</p>
      <p style="color: var(--gold); font-family: 'MedievalSharp', cursive; font-size:1.3rem; margin: 10px 0;">
        Gold: ${money} 🪙
      </p>
      <button class="btn" id="btn-ready" style="margin-top:20px;">Open Shop</button>
    </div>
  `;
  app.querySelector('#btn-ready').addEventListener('click', onReady);
}

export function renderGameScreen(app) {
  app.innerHTML = `
    <div class="game-screen">
      <div class="game-header">
        <div class="money">🪙 <span id="money-display">0</span></div>
        <div class="day-info">
          <span id="day-display">Day 1</span> •
          Customer <span id="customer-num">1</span>/<span id="customer-total">3</span>
        </div>
        <div class="customers-left">
          <span id="timer-display">⏳ 60s</span>
        </div>
      </div>
      <div class="game-main">
        <div class="reference-panel">
          <h3>✨ Desired Style</h3>
          <div class="reference-canvas-wrap">
            <canvas id="reference-canvas" width="180" height="260"></canvas>
          </div>
          <div id="style-name" style="color:#aaa; font-size:0.85rem; margin-top:4px;"></div>
          <div id="wizard-name" style="color:var(--purple-light); font-size:0.9rem; font-family:'MedievalSharp',cursive;"></div>
          <div id="karma-display" style="margin-top:8px; font-size:0.8rem;"></div>
          <div id="curse-list" style="margin-top:4px; font-size:0.7rem; color:#aaa;"></div>
        </div>
        <div class="barber-area">
          <div class="wizard-emotion" id="wizard-emotion">😐</div>
          <div class="barber-canvas-wrap" id="barber-wrap">
            <canvas id="barber-canvas" width="400" height="500"></canvas>
          </div>
          <div id="cursor-indicator" class="cursor-indicator" style="display:none;"></div>
        </div>
        <div class="tool-panel">
          <h3>🛠️ Tools</h3>
          <div id="tool-list"></div>
          <div style="margin-top:10px;">
            <label style="font-size:0.8rem; color:#888;">Size</label>
            <input type="range" id="tool-size" class="tool-size-slider" min="1" max="6" value="2">
            <div style="font-size:0.75rem; color:#666; text-align:center;" id="size-label">2</div>
          </div>
          <div id="special-buttons" style="margin-top:8px; display:flex; flex-direction:column; gap:4px;"></div>
          <div style="margin-top: auto; padding-top: 10px;">
            <button class="btn btn-small" id="btn-done" style="width:100%;">✅ Done!</button>
          </div>
          <div id="wand-uses" style="font-size:0.75rem; color:var(--purple-light); text-align:center; margin-top:4px;"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderToolList(container, tools, activeTool, onSelect) {
  container.innerHTML = '';
  tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = `tool-btn ${activeTool === tool.id ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="tool-icon">${tool.icon}</span>
      <span>${tool.name}</span>
    `;
    btn.addEventListener('click', () => onSelect(tool.id));
    container.appendChild(btn);
  });
}

export function renderResultOverlay(app, { score, emotion, emoji, reactionText, basePay, tip, speedBonus, consequence, newCurse, onNext }) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const barColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--gold)' : 'var(--red)';

  let curseHtml = '';
  if (newCurse) {
    curseHtml = `
      <div style="margin:12px 0; padding:10px; background:rgba(142,68,173,0.2); border:1px solid #8e44ad; border-radius:8px;">
        <div style="font-size:1.5rem;">${newCurse.icon}</div>
        <div style="color:#c39bd3; font-family:'MedievalSharp',cursive; font-size:1.1rem;">Cursed! ${newCurse.name}</div>
        <div style="color:#aaa; font-size:0.85rem;">${newCurse.description}</div>
        <div style="color:#666; font-size:0.75rem;">Lasts ${newCurse.duration} customers</div>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="result-card">
      <h2>${score >= 70 ? 'Well Done!' : score >= 40 ? 'Not Bad...' : 'Oh No...'}</h2>
      <div class="wizard-reaction">${emoji}</div>
      <p class="score-text">"${reactionText}"</p>
      <div class="score-bar-wrap">
        <div class="score-bar" id="score-bar" style="width: 0%; background: ${barColor};"></div>
      </div>
      <p style="color:#aaa;">Match: <strong style="color:#fff;">${score}%</strong></p>
      <p class="tip-text">
        Base: ${basePay} 🪙${tip > 0 ? ` + Tip: ${tip} 🪙` : ''}${speedBonus > 0 ? ` + Speed: ${speedBonus} 🪙` : ''}
      </p>
      ${consequence ? `<p class="consequence-text">${consequence.text}</p>` : ''}
      ${curseHtml}
      <button class="btn" id="btn-next" style="margin-top:15px;">
        ${score >= 70 ? 'Next Customer!' : 'Move On...'}
      </button>
    </div>
  `;

  app.appendChild(overlay);

  // Animate score bar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const bar = document.getElementById('score-bar');
      if (bar) bar.style.width = `${score}%`;
    });
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    overlay.remove();
    onNext();
  });
}

export function renderDaySummary(app, { day, earnings, avgScore, customersServed, money, onShop, onNextDay }) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  overlay.innerHTML = `
    <div class="result-card day-summary">
      <h2>Day ${day} Complete!</h2>
      <div style="font-size:3rem; margin:10px 0;">🌙</div>
      <div class="stat-line">Customers Served: <span>${customersServed}</span></div>
      <div class="stat-line">Average Score: <span>${avgScore}%</span></div>
      <div class="stat-line">Day Earnings: <span>${earnings} 🪙</span></div>
      <div class="stat-line" style="font-size:1.3rem; margin-top:10px;">
        Total Gold: <span>${money} 🪙</span>
      </div>
      <div style="display:flex; gap:12px; margin-top:20px; justify-content:center;">
        <button class="btn btn-small" id="btn-shop">🛒 Shop</button>
        <button class="btn btn-small" id="btn-next-day">Next Day →</button>
      </div>
    </div>
  `;

  app.appendChild(overlay);
  document.getElementById('btn-shop').addEventListener('click', () => { overlay.remove(); onShop(); });
  document.getElementById('btn-next-day').addEventListener('click', () => { overlay.remove(); onNextDay(); });
}

export function renderShop(app, { money, ownedTools, upgradeLevels, onBuyTool, onBuyUpgrade, onBack }) {
  const shopTools = getShopTools(ownedTools);
  const shopUpgrades = getShopUpgrades(upgradeLevels, ownedTools);

  app.innerHTML = `
    <div class="shop-screen">
      <h1>✨ Ye Olde Wizard Barber Shoppe ✨</h1>
      <div class="shop-money">Gold: ${money} 🪙</div>
      <h2 style="color:var(--purple-light); font-size:1.1rem; margin:15px 0 8px; width:100%; max-width:900px;">🛠️ Tools</h2>
      <div class="shop-grid" id="shop-tools"></div>
      <h2 style="color:var(--purple-light); font-size:1.1rem; margin:20px 0 8px; width:100%; max-width:900px;">✨ Upgrades & Enchantments</h2>
      <div class="shop-grid" id="shop-upgrades"></div>
      <div class="shop-buttons">
        <button class="btn" id="btn-back">Continue →</button>
      </div>
    </div>
  `;

  // Tools section
  const toolGrid = document.getElementById('shop-tools');

  shopTools.forEach(tool => {
    const canAfford = money >= tool.price;
    const item = document.createElement('div');
    item.className = `shop-item ${!canAfford ? 'locked' : ''}`;
    item.innerHTML = `
      <div class="item-icon">${tool.icon}</div>
      <div class="item-name">${tool.name}</div>
      <div class="item-desc">${tool.description}</div>
      <div class="item-price">${tool.price} 🪙</div>
      ${canAfford ? '<button class="btn btn-small" style="margin-top:8px;">Buy</button>' : '<div style="color:#666; font-size:0.8rem; margin-top:4px;">Not enough gold</div>'}
    `;
    if (canAfford) {
      item.querySelector('.btn').addEventListener('click', () => onBuyTool(tool.id, tool.price));
    }
    toolGrid.appendChild(item);
  });

  ownedTools.forEach(id => {
    const tool = TOOLS[id];
    if (!tool) return;
    const item = document.createElement('div');
    item.className = 'shop-item owned';
    item.innerHTML = `
      <div class="item-icon">${tool.icon}</div>
      <div class="item-name">${tool.name}</div>
      <div class="item-desc">${tool.description}</div>
      <div style="color:var(--green); font-size:0.9rem;">✓ Owned</div>
    `;
    toolGrid.appendChild(item);
  });

  if (shopTools.length === 0 && ownedTools.length <= 1) {
    toolGrid.innerHTML = '<p style="color:#888; grid-column:1/-1; text-align:center;">All tools purchased!</p>';
  }

  // Upgrades section
  const upgradeGrid = document.getElementById('shop-upgrades');
  const categoryColors = { shop: '#3498db', defense: '#9b59b6', 'tool-boost': '#e67e22', special: '#e74c3c' };
  const catLabels = { shop: 'Shop', defense: 'Defense', 'tool-boost': 'Tool Boost', special: 'Special' };

  // Show all upgrades (available for upgrade + maxed)
  Object.values(UPGRADES).forEach(upgrade => {
    if (upgrade.requires && !ownedTools.includes(upgrade.requires)) return;
    const currentLvl = upgradeLevels[upgrade.id] || 0;
    const isMaxed = currentLvl >= upgrade.maxLevel;
    const nextLvl = currentLvl; // 0-indexed for levels array
    const price = isMaxed ? 0 : getUpgradePrice(upgrade, currentLvl);
    const canAfford = money >= price;
    const catColor = categoryColors[upgrade.category] || '#888';
    const catLabel = catLabels[upgrade.category] || '';

    const item = document.createElement('div');
    item.className = `shop-item ${isMaxed ? 'owned' : !canAfford ? 'locked' : ''}`;

    // Level pips
    let pips = '';
    for (let i = 0; i < upgrade.maxLevel; i++) {
      pips += `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; margin:0 2px; border:1px solid ${catColor}; background:${i < currentLvl ? catColor : 'transparent'};"></span>`;
    }

    const desc = isMaxed
      ? upgrade.levels[currentLvl - 1].description
      : upgrade.levels[nextLvl].description;

    const btnLabel = currentLvl === 0 ? 'Buy' : 'Upgrade';

    item.innerHTML = `
      <div class="item-icon">${upgrade.icon}</div>
      <div class="item-name">${upgrade.name}</div>
      <div style="font-size:0.65rem; color:${catColor}; text-transform:uppercase; letter-spacing:1px;">${catLabel}</div>
      <div style="margin:4px 0;">${pips}</div>
      <div class="item-desc">${isMaxed ? '✨ ' : '→ '}${desc}</div>
      ${isMaxed
        ? '<div style="color:var(--gold); font-size:0.85rem; font-family:\'MedievalSharp\',cursive;">MAX</div>'
        : `<div class="item-price">${price} 🪙</div>
           ${canAfford
             ? `<button class="btn btn-small" style="margin-top:8px;">${btnLabel}</button>`
             : '<div style="color:#666; font-size:0.8rem; margin-top:4px;">Not enough gold</div>'
           }`
      }
    `;

    if (!isMaxed && canAfford) {
      item.querySelector('.btn').addEventListener('click', () => onBuyUpgrade(upgrade.id));
    }
    upgradeGrid.appendChild(item);
  });

  document.getElementById('btn-back').addEventListener('click', onBack);
}
