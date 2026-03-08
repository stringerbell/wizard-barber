// Main game controller

import { GameState } from './gameState.js';
import { generateCustomer, calculateTip, getConsequence, getCustomersForDay } from './customers.js';
import { getUnlockedTools, applyTool, TOOLS } from './tools.js';
import { compareBeards } from './beardRenderer.js';
import { drawWizardFace, getEmotionFromScore, getEmotionEmoji, getReactionText } from './wizardRenderer.js';
import {
  renderTitleScreen,
  renderDayIntro,
  renderGameScreen,
  renderToolList,
  renderResultOverlay,
  renderDaySummary,
  renderShop,
} from './screens.js';
import { ShavingAudio } from './audio.js';
import { CurseManager } from './curses.js';

const BEARD_COLS = 32;
const BEARD_ROWS = 28;
const CELL_SIZE = 5;
const BEARD_OFFSET_Y = 120; // Where beard starts on the canvas (below face)

export class Game {
  constructor(appElement) {
    this.app = appElement;
    this.state = new GameState();
    this.currentCustomer = null;
    this.playerBeard = null;
    this.activeTool = 'scissors';
    this.toolSize = 2;
    this.showOverlay = false;
    this.isDrawing = false;
    this.timer = null;
    this.timeLeft = 60;
    this.animFrame = null;
    this.wandUses = 0;
    this.customerIndex = 0;
    this.totalCustomers = 0;
    this.shavingAudio = new ShavingAudio();
    this.curses = new CurseManager();
    // Curse effect state
    this.curseJitter = { x: 0, y: 0 };
    this.curseDrift = { x: 0, y: 0 };
    this.sneezeTimer = null;
    this.regrowthTimer = null;

    this.init();
  }

  init() {
    const hasSave = this.state.load();
    renderTitleScreen(
      this.app,
      () => this.startNewGame(),
      () => this.continueGame(),
      hasSave
    );
  }

  startNewGame() {
    this.state.reset();
    this.curses.reset();
    this.startDay();
  }

  continueGame() {
    this.startDay();
  }

  startDay() {
    const day = this.state.get('day');
    this.totalCustomers = getCustomersForDay(day);
    this.customerIndex = 0;
    this.state.set('dayEarnings', 0);
    this.state.set('dayCustomersServed', 0);
    this.state.set('dayScores', []);

    // Upgrade: Curse Remedy Kit — remove curses at start of day (scales with level)
    const cursesRemoved = this.state.upgradeEffect('potionKit').cursesRemovedPerDay || 0;
    for (let i = 0; i < cursesRemoved && this.curses.active.length > 0; i++) {
      const idx = Math.floor(Math.random() * this.curses.active.length);
      this.curses.active.splice(idx, 1);
    }

    renderDayIntro(
      this.app,
      day,
      this.totalCustomers,
      this.state.get('money'),
      () => this.nextCustomer()
    );
  }

  nextCustomer() {
    if (this.customerIndex >= this.totalCustomers) {
      this.endDay();
      return;
    }

    this.customerIndex++;
    const day = this.state.get('day');
    this.currentCustomer = generateCustomer(day, BEARD_COLS, BEARD_ROWS, CELL_SIZE);
    this.playerBeard = this.currentCustomer.fullBeard.clone();
    this.activeTool = 'scissors';
    this.toolSize = 2;
    this.showOverlay = false;
    this.wandUses = TOOLS.wand.usesPerCustomer || 15;
    this.wandUses += (this.state.upgradeEffect('wandCharger').extraWandUses || 0);
    this.phoenixUsed = false;

    this.setupGameScreen();
    this.startTimer();
    this.startRenderLoop();
  }

  setupGameScreen() {
    renderGameScreen(this.app);

    // Update header
    document.getElementById('money-display').textContent = this.state.get('money');
    document.getElementById('day-display').textContent = `Day ${this.state.get('day')}`;
    document.getElementById('customer-num').textContent = this.customerIndex;
    document.getElementById('customer-total').textContent = this.totalCustomers;
    document.getElementById('wizard-name').textContent = this.currentCustomer.name;
    document.getElementById('style-name').textContent = `"${this.currentCustomer.style.name}"`;

    // Draw reference
    this.drawReference();

    // Setup tools
    this.refreshToolList();

    // Tool size slider
    const slider = document.getElementById('tool-size');
    const tool = TOOLS[this.activeTool];
    slider.max = tool ? tool.maxSize || 6 : 6;
    slider.value = this.toolSize;
    slider.addEventListener('input', (e) => {
      this.toolSize = parseInt(e.target.value);
      document.getElementById('size-label').textContent = this.toolSize;
    });

    // Overlay checkbox
    // If player owns the comb, always show the guide overlay
    this.showOverlay = this.state.get('ownedTools').includes('comb');

    // Done button
    document.getElementById('btn-done').addEventListener('click', () => this.finishCustomer());

    // Special ability buttons
    const specialContainer = document.getElementById('special-buttons');
    if (this.state.upgradeLevel('phoenixFeather') > 0 && !this.phoenixUsed) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.innerHTML = '<span class="tool-icon">🪶</span><span>Redo Beard</span>';
      btn.addEventListener('click', () => {
        this.playerBeard = this.currentCustomer.fullBeard.clone();
        this.phoenixUsed = true;
        btn.remove();
        this.spawnParticles('🪶', 3);
      });
      specialContainer.appendChild(btn);
    }
    const freezeDuration = this.state.upgradeEffect('timeWarp').freezeDuration || 0;
    if (freezeDuration > 0) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.id = 'btn-timewarp';
      btn.innerHTML = `<span class="tool-icon">📜</span><span>Freeze ${freezeDuration}s</span>`;
      btn.addEventListener('click', () => {
        this.freezeTimer(freezeDuration);
        btn.remove();
      });
      specialContainer.appendChild(btn);
    }

    // Show active curses
    this.updateCurseDisplay();

    // Start curse effects
    this.startCurseEffects();

    // Canvas interaction
    this.setupCanvasInput();
  }

  setupCanvasInput() {
    const canvas = document.getElementById('barber-canvas');
    const wrap = document.getElementById('barber-wrap');
    const cursor = document.getElementById('cursor-indicator');

    const getGridPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let canvasX = (e.clientX - rect.left) * scaleX;
      let canvasY = (e.clientY - rect.top) * scaleY;

      // Curse: Mirror Hex — reverse horizontal
      if (this.curses.hasCurse('reversed')) {
        canvasX = canvas.width - canvasX;
      }

      // Curse: Shaky Hands — jitter
      if (this.curses.hasCurse('shakyhands')) {
        canvasX += (Math.random() - 0.5) * CELL_SIZE * 4;
        canvasY += (Math.random() - 0.5) * CELL_SIZE * 4;
      }

      // Curse: Sneezing Spell — applied via jitter state
      canvasX += this.curseJitter.x;
      canvasY += this.curseJitter.y;

      // Curse: Dizziness Draft — momentum drift
      if (this.curses.hasCurse('drunk')) {
        canvasX += this.curseDrift.x;
        canvasY += this.curseDrift.y;
        // Update drift toward random direction
        this.curseDrift.x += (Math.random() - 0.5) * 3;
        this.curseDrift.y += (Math.random() - 0.5) * 3;
        this.curseDrift.x *= 0.92;
        this.curseDrift.y *= 0.92;
      }

      const beardStartX = (canvas.width - BEARD_COLS * CELL_SIZE) / 2;
      const gridX = Math.floor((canvasX - beardStartX) / CELL_SIZE);
      const gridY = Math.floor((canvasY - BEARD_OFFSET_Y) / CELL_SIZE);
      return { gridX, gridY };
    };

    const updateCursor = (e) => {
      const rect = canvas.getBoundingClientRect();
      const unit = CELL_SIZE * (rect.width / canvas.width);
      const tool = TOOLS[this.activeTool];
      const shape = tool ? tool.shape : 'circle';

      let w, h, radius;
      switch (shape) {
        case 'horizontal':
          w = this.toolSize * unit * 4;
          h = unit * 1.5;
          radius = '3px';
          break;
        case 'vertical':
          w = unit * 1.5;
          h = this.toolSize * unit * 4;
          radius = '3px';
          break;
        case 'square':
          w = h = this.toolSize * unit * 2;
          radius = '2px';
          break;
        case 'diamond':
          w = h = this.toolSize * unit * 2;
          radius = '2px';
          break;
        case 'pixel':
          w = h = unit;
          radius = '0';
          break;
        default: // circle
          w = h = this.toolSize * unit * 2;
          radius = '50%';
      }

      cursor.style.display = 'block';
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      cursor.style.width = `${w}px`;
      cursor.style.height = `${h}px`;
      cursor.style.borderRadius = radius;

      if (shape === 'diamond') {
        cursor.style.transform = 'translate(-50%, -50%) rotate(45deg)';
      } else {
        cursor.style.transform = 'translate(-50%, -50%)';
      }

      if (tool && tool.type === 'grow') {
        cursor.style.borderColor = 'rgba(100, 255, 100, 0.6)';
      } else {
        cursor.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      }
    };

    const handleDraw = (e) => {
      if (!this.isDrawing) return;
      const { gridX, gridY } = getGridPos(e);

      const tool = TOOLS[this.activeTool];
      if (tool && tool.type === 'utility') return;
      if (tool && tool.type === 'grow' && this.wandUses <= 0) return;

      // Apply size modifiers (upgrades + curses)
      let effectiveSize = this.toolSize;
      effectiveSize += (this.state.upgradeEffect('dragonScales').extraToolSize || 0);
      if (this.curses.hasCurse('butterfingers')) {
        effectiveSize = Math.ceil(effectiveSize * 1.5);
      }
      if (this.curses.hasCurse('tinytools')) {
        effectiveSize = Math.max(1, Math.floor(effectiveSize * 0.5));
      }

      const changed = applyTool(this.playerBeard, this.activeTool, gridX, gridY, effectiveSize);

      if (changed && tool && tool.type === 'cut') {
        const fallen = this.playerBeard.severDisconnected();
        if (fallen.length > 0) {
          this.spawnFallingHair(fallen);
        }
      }

      if (changed && tool && tool.type === 'grow') {
        this.wandUses--;
        this.updateWandDisplay();
        if (this.wandUses <= 0) {
          this.isDrawing = false;
          this.activeTool = 'scissors';
          this.refreshToolList();
          this.updateToolUI();
        }
      }
    };

    canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      const tool = TOOLS[this.activeTool];
      if (tool && tool.type === 'cut') this.shavingAudio.play();
      handleDraw(e);
    });

    canvas.addEventListener('mousemove', (e) => {
      updateCursor(e);
      // Track position for blindspot curse
      const rect = canvas.getBoundingClientRect();
      this._lastCanvasMousePos = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
      handleDraw(e);
    });

    canvas.addEventListener('mouseup', () => {
      this.isDrawing = false;
      this.shavingAudio.stop();
    });
    canvas.addEventListener('mouseleave', () => {
      this.isDrawing = false;
      this.shavingAudio.stop();
      cursor.style.display = 'none';
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const tool = TOOLS[this.activeTool];
      if (tool && tool.type === 'cut') this.shavingAudio.play();
      const touch = e.touches[0];
      handleDraw({ clientX: touch.clientX, clientY: touch.clientY, target: canvas });
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleDraw({ clientX: touch.clientX, clientY: touch.clientY, target: canvas });
    });

    canvas.addEventListener('touchend', () => {
      this.isDrawing = false;
      this.shavingAudio.stop();
    });
  }

  refreshToolList() {
    const container = document.getElementById('tool-list');
    if (!container) return;
    // Filter out depleted tools and passive items
    const tools = getUnlockedTools(this.state.get('ownedTools')).filter(t => {
      if (t.id === 'wand' && this.wandUses <= 0) return false;
      if (t.type === 'utility') return false; // comb is passive
      return true;
    });
    // If active tool was removed, fall back to scissors
    if (!tools.find(t => t.id === this.activeTool)) {
      this.activeTool = 'scissors';
    }
    renderToolList(container, tools, this.activeTool, (id) => {
      this.activeTool = id;
      this.updateToolUI();
      this.refreshToolList();
    });
  }

  updateToolUI() {
    const tool = TOOLS[this.activeTool];
    const slider = document.getElementById('tool-size');
    if (tool && slider) {
      slider.max = tool.maxSize || 6;
      if (this.toolSize > tool.maxSize) {
        this.toolSize = tool.maxSize;
        slider.value = this.toolSize;
        document.getElementById('size-label').textContent = this.toolSize;
      }
    }
    this.updateWandDisplay();
  }

  updateWandDisplay() {
    const el = document.getElementById('wand-uses');
    if (el) {
      if (this.activeTool === 'wand' && this.wandUses > 0) {
        el.textContent = `Wand uses: ${this.wandUses}`;
      } else {
        el.textContent = '';
      }
    }
  }

  drawReference() {
    const canvas = document.getElementById('reference-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw mini wizard face
    drawWizardFace(ctx, canvas.width, canvas.height, 80, 'happy');

    // Draw target beard
    const beardStartX = (canvas.width - BEARD_COLS * CELL_SIZE) / 2;
    this.currentCustomer.targetBeard.draw(ctx, beardStartX, 80);
  }

  startRenderLoop() {
    const render = () => {
      this.drawBarberCanvas();
      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  stopRenderLoop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  drawBarberCanvas() {
    const canvas = document.getElementById('barber-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Barber shop wallpaper pattern
    ctx.fillStyle = '#e8d4a8';
    for (let y = 0; y < canvas.height; y += 20) {
      for (let x = (y % 40 === 0 ? 0 : 10); x < canvas.width; x += 20) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Calculate current score for emotion
    const score = compareBeards(this.playerBeard, this.currentCustomer.targetBeard);
    const emotion = getEmotionFromScore(score);

    // Draw wizard face
    drawWizardFace(ctx, canvas.width, canvas.height, BEARD_OFFSET_Y, emotion);

    // Draw player beard
    const beardStartX = (canvas.width - BEARD_COLS * CELL_SIZE) / 2;
    this.playerBeard.draw(ctx, beardStartX, BEARD_OFFSET_Y);

    // Draw guide overlay on top of beard (if player owns comb)
    if (this.showOverlay) {
      const target = this.currentCustomer.targetBeard;

      // Draw target outline — a dashed border around the target shape
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      for (let y = 0; y < BEARD_ROWS; y++) {
        for (let x = 0; x < BEARD_COLS; x++) {
          if (target.get(x, y) !== 1) continue;
          const px = beardStartX + x * CELL_SIZE;
          const py = BEARD_OFFSET_Y + y * CELL_SIZE;
          // Draw edge segments where target borders empty
          if (target.get(x, y - 1) !== 1) { ctx.moveTo(px, py); ctx.lineTo(px + CELL_SIZE, py); }
          if (target.get(x, y + 1) !== 1) { ctx.moveTo(px, py + CELL_SIZE); ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE); }
          if (target.get(x - 1, y) !== 1) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL_SIZE); }
          if (target.get(x + 1, y) !== 1) { ctx.moveTo(px + CELL_SIZE, py); ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE); }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Tint: extra hair that needs cutting gets a subtle red overlay
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ff2200';
      for (let y = 0; y < BEARD_ROWS; y++) {
        for (let x = 0; x < BEARD_COLS; x++) {
          if (target.get(x, y) === 0 && this.playerBeard.get(x, y) === 1) {
            ctx.fillRect(
              beardStartX + x * CELL_SIZE,
              BEARD_OFFSET_Y + y * CELL_SIZE,
              CELL_SIZE, CELL_SIZE
            );
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Curse: Fog of Confusion — semi-transparent patches
    if (this.curses.hasCurse('foggy')) {
      ctx.fillStyle = 'rgba(100, 80, 120, 0.4)';
      const time = Date.now() * 0.001;
      for (let i = 0; i < 5; i++) {
        const fx = canvas.width * 0.2 + Math.sin(time * 0.7 + i * 1.8) * canvas.width * 0.3;
        const fy = BEARD_OFFSET_Y + Math.cos(time * 0.5 + i * 2.1) * BEARD_ROWS * CELL_SIZE * 0.4;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 40 + Math.sin(time + i) * 10, 25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Curse: Blind Spot — dark circle follows last mouse position
    if (this.curses.hasCurse('blindspot') && this._lastCanvasMousePos) {
      const bp = this._lastCanvasMousePos;
      const gradient = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, 35);
      gradient.addColorStop(0, 'rgba(20, 10, 30, 0.95)');
      gradient.addColorStop(1, 'rgba(20, 10, 30, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(bp.x - 40, bp.y - 40, 80, 80);
    }

    // Update emotion display
    const emotionEl = document.getElementById('wizard-emotion');
    if (emotionEl) {
      emotionEl.textContent = `${getEmotionEmoji(emotion)} ${score}%`;
    }
  }

  startTimer() {
    let patience = this.currentCustomer.patience;
    // Upgrade: Comfy Chair, Enchanted Hourglass, Magic Mirror — all add patience
    patience += (this.state.upgradeEffect('comfyChair').extraPatience || 0);
    patience += (this.state.upgradeEffect('hourglass').extraPatience || 0);
    patience += (this.state.upgradeEffect('magicMirror').extraPatience || 0);
    this.timeLeft = patience;
    this.timeMax = patience;
    this.timeFrozen = false;
    this.updateTimerDisplay();

    // Curse: Time Drag — timer ticks faster
    const interval = this.curses.hasCurse('slowmo') ? 667 : 1000;

    this.timer = setInterval(() => {
      if (this.timeFrozen) return;
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) {
        this.finishCustomer();
      }
    }, interval);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  freezeTimer(duration = 10) {
    if (this.timeFrozen) return;
    this.timeFrozen = true;
    this.spawnParticles('⏸️', 1);
    setTimeout(() => { this.timeFrozen = false; }, duration * 1000);
  }

  updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (el) {
      const pct = this.timeMax > 0 ? this.timeLeft / this.timeMax : 1;
      const color = pct <= 0.2 ? '#e74c3c' : pct <= 0.4 ? '#f39c12' : '#27ae60';
      const size = pct <= 0.2 ? '2rem' : pct <= 0.4 ? '1.6rem' : '1.3rem';
      const shake = pct <= 0.15 ? 'animation: timerShake 0.3s infinite;' : '';
      el.innerHTML = `<span style="color:${color}; font-size:${size}; font-family:'MedievalSharp',cursive; ${shake}">${this.timeFrozen ? '⏸️' : '⏳'} ${this.timeLeft}s</span>`;
    }
  }

  finishCustomer() {
    this.stopTimer();
    this.stopRenderLoop();
    this.stopCurseEffects();
    this.isDrawing = false;
    this.shavingAudio.kill();

    const score = compareBeards(this.playerBeard, this.currentCustomer.targetBeard);
    const emotion = getEmotionFromScore(score);
    const emoji = getEmotionEmoji(emotion);
    const reactionText = getReactionText(emotion);

    // Upgrade: Gold-Plated Scissors — scales with level
    let basePay = this.currentCustomer.basePay;
    basePay += (this.state.upgradeEffect('goldPlating').extraBasePay || 0);

    let tip = calculateTip(score, basePay);
    // Upgrade: Tip Jar — scales with level
    const tipMult = this.state.upgradeEffect('tipJar').tipMultiplier || 1;
    tip = Math.floor(tip * tipMult);

    // Speed bonus: reward finishing quickly with a good score
    // timeLeft / timeMax = fraction of time remaining (0 to 1)
    // Multiply by score so only accurate + fast gets the bonus
    const timeRatio = this.timeMax > 0 ? Math.max(0, this.timeLeft) / this.timeMax : 0;
    const speedBonus = score >= 30 ? Math.floor(basePay * timeRatio * (score / 100)) : 0;

    const consequence = getConsequence(score, this.state.get('day'));

    // Apply rewards/consequences
    this.state.addMoney(basePay + tip + speedBonus);
    this.state.recordCustomer(score);

    if (consequence) {
      if (consequence.severity >= 2) {
        this.state.adjustReputation(-1);
      }
    } else if (score >= 80) {
      this.state.adjustReputation(0.5);
    }

    // Roll for curse if wizard is angry enough
    let newCurse = null;
    const curseBlockLevel = this.state.upgradeEffect('runeShield').curseBlockLevel || 0;
    let curseEmotions = ['upset', 'angry', 'furious'];
    if (curseBlockLevel >= 2) curseEmotions = ['furious'];
    else if (curseBlockLevel >= 1) curseEmotions = ['angry', 'furious'];

    if (curseEmotions.includes(emotion)) {
      // Upgrade: Lucky Charm — dodge chance scales with level
      const dodgeChance = this.state.upgradeEffect('luckyCharm').curseDodgeChance || 0;
      const dodged = dodgeChance > 0 && Math.random() < dodgeChance;
      if (!dodged) {
        const curseType = this.curses.rollCurse(emotion);
        if (curseType) {
          // Upgrade: Enchanted Apron — reduce duration (scales with level)
          const durationReduce = this.state.upgradeEffect('enchantedApron').curseDurationReduction || 0;
          if (durationReduce > 0) {
            curseType.duration = Math.max(1, curseType.duration - durationReduce);
          }
          this.curses.applyCurse(curseType);
          newCurse = curseType;
        }
      }
    }

    // Tick down existing curses
    this.curses.tickCustomer();

    document.getElementById('money-display').textContent = this.state.get('money');

    // Spawn gold particles if good tip
    if (tip > 0) {
      this.spawnParticles('🪙', 5 + Math.floor(tip / 20));
    }
    if (emotion === 'furious') {
      this.spawnParticles('💢', 5);
    }

    renderResultOverlay(this.app, {
      score,
      emotion,
      emoji,
      reactionText,
      basePay,
      tip,
      speedBonus,
      consequence,
      newCurse,
      onNext: () => this.nextCustomer(),
    });
  }

  endDay() {
    const day = this.state.get('day');
    const earnings = this.state.get('dayEarnings');
    const avgScore = this.state.getDayAvgScore();
    const served = this.state.get('dayCustomersServed');

    this.state.save();

    renderDaySummary(this.app, {
      day,
      earnings,
      avgScore,
      customersServed: served,
      money: this.state.get('money'),
      onShop: () => this.openShop(),
      onNextDay: () => {
        this.state.startNewDay();
        this.startDay();
      },
    });
  }

  openShop() {
    renderShop(this.app, {
      money: this.state.get('money'),
      ownedTools: this.state.get('ownedTools'),
      upgradeLevels: this.state.get('upgradeLevels'),
      onBuyTool: (toolId, price) => {
        if (this.state.buyTool(toolId, price)) {
          const scroll = this.app.querySelector('.shop-screen')?.scrollTop || 0;
          this.openShop();
          const shop = this.app.querySelector('.shop-screen');
          if (shop) shop.scrollTop = scroll;
        }
      },
      onBuyUpgrade: (upgradeId) => {
        if (this.state.buyUpgrade(upgradeId)) {
          const scroll = this.app.querySelector('.shop-screen')?.scrollTop || 0;
          this.openShop();
          const shop = this.app.querySelector('.shop-screen');
          if (shop) shop.scrollTop = scroll;
        }
      },
      onBack: () => {
        this.state.startNewDay();
        this.startDay();
      },
    });
  }

  updateCurseDisplay() {
    const karmaEl = document.getElementById('karma-display');
    const listEl = document.getElementById('curse-list');
    if (!karmaEl || !listEl) return;

    const karma = this.curses.getKarmaText();
    const curses = this.curses.getActiveCurses();

    if (curses.length === 0) {
      karmaEl.innerHTML = `Karma: <span style="color:${karma.color}">${karma.text}</span>`;
      listEl.innerHTML = '';
    } else {
      karmaEl.innerHTML = `Karma: <span style="color:${karma.color}">${karma.text}</span>`;
      listEl.innerHTML = curses.map(c =>
        `<div style="margin:2px 0;">${c.icon} ${c.name} <span style="color:#666;">(${c.remainingCustomers} left)</span></div>`
      ).join('');
    }
  }

  startCurseEffects() {
    // Curse: Sneezing Spell — random jolt
    if (this.curses.hasCurse('sneezy')) {
      this.sneezeTimer = setInterval(() => {
        if (!this.isDrawing) return;
        // Simulate a sneeze: temporarily apply a big random offset
        const origJitter = { ...this.curseJitter };
        this.curseJitter.x = (Math.random() - 0.5) * CELL_SIZE * 8;
        this.curseJitter.y = (Math.random() - 0.5) * CELL_SIZE * 6;
        // Flash a sneeze emoji
        this.spawnParticles('🤧', 1);
        setTimeout(() => {
          this.curseJitter = origJitter;
        }, 150);
      }, 2500 + Math.random() * 2000);
    }

    // Curse: Wild Regrowth — beard slowly grows back
    if (this.curses.hasCurse('regrowth')) {
      this.regrowthTimer = setInterval(() => {
        // Grow back a few random cells adjacent to existing hair
        let grown = 0;
        for (let attempts = 0; attempts < 20 && grown < 3; attempts++) {
          const x = Math.floor(Math.random() * BEARD_COLS);
          const y = Math.floor(Math.random() * BEARD_ROWS);
          if (this.playerBeard.get(x, y) === 0) {
            // Check if adjacent to existing hair
            const hasNeighbor =
              this.playerBeard.get(x-1, y) === 1 ||
              this.playerBeard.get(x+1, y) === 1 ||
              this.playerBeard.get(x, y-1) === 1 ||
              this.playerBeard.get(x, y+1) === 1;
            if (hasNeighbor) {
              this.playerBeard.set(x, y, 1);
              grown++;
            }
          }
        }
      }, 800);
    }
  }

  stopCurseEffects() {
    if (this.sneezeTimer) {
      clearInterval(this.sneezeTimer);
      this.sneezeTimer = null;
    }
    if (this.regrowthTimer) {
      clearInterval(this.regrowthTimer);
      this.regrowthTimer = null;
    }
    this.curseJitter = { x: 0, y: 0 };
    this.curseDrift = { x: 0, y: 0 };
  }

  spawnFallingHair(fallenCells) {
    // Render falling hair clumps on a temporary overlay canvas
    const canvas = document.getElementById('barber-canvas');
    if (!canvas || fallenCells.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const beardStartX = (canvas.width - BEARD_COLS * CELL_SIZE) / 2;

    // Group fallen cells into clumps by proximity for fewer DOM elements
    const clumpSize = 4;
    for (let i = 0; i < fallenCells.length; i += clumpSize) {
      const chunk = fallenCells.slice(i, i + clumpSize);
      const avgX = chunk.reduce((s, c) => s + c.x, 0) / chunk.length;
      const avgY = chunk.reduce((s, c) => s + c.y, 0) / chunk.length;

      const px = rect.left + (beardStartX + avgX * CELL_SIZE) * scaleX;
      const py = rect.top + (BEARD_OFFSET_Y + avgY * CELL_SIZE) * scaleY;

      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; left:${px}px; top:${py}px;
        width:${CELL_SIZE * scaleX * 2}px; height:${CELL_SIZE * scaleY * 2}px;
        background:${this.currentCustomer.fullBeard.color};
        border-radius:40%; pointer-events:none; z-index:60;
        transition: transform 0.6s ease-in, opacity 0.6s ease-in;
      `;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        const drift = (Math.random() - 0.5) * 30;
        el.style.transform = `translateY(${80 + Math.random() * 60}px) translateX(${drift}px) rotate(${Math.random() * 180}deg)`;
        el.style.opacity = '0';
      });

      setTimeout(() => el.remove(), 700);
    }
  }

  spawnParticles(emoji, count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = emoji;
        particle.style.fontSize = `${16 + Math.random() * 16}px`;
        particle.style.left = `${40 + Math.random() * 20}%`;
        particle.style.top = `${30 + Math.random() * 30}%`;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
      }, i * 80);
    }
  }
}
