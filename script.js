// script.js

// 0. Display names for all SKUs — edit here to rename items game-wide
const ITEM_DISPLAY_NAMES = {
  chips:           "Bánh mì",
  sodas:           "Bánh bao",
  toiletries:      "Oreos",
  coffee:          "Ca Phe Sua",
  energyDrinks:    "Coconut",
  organicSnacks:   "Mango",
  hotDogs:         "Bánh xèo",
  lotteryTickets:  "Lottery Ticket"
};

// 1. Store tier definitions
const STORE_TIERS = [
  { id: 'small',  name: 'Small Store',  cost: 1000, inventoryScale: 0.5 },
  { id: 'medium', name: 'Medium Store', cost: 3000, inventoryScale: 1.0 },
  { id: 'large',  name: 'Large Store',  cost: 5000, inventoryScale: 1.5 }
];

// 2. Store location definitions
const STORE_LOCATIONS = [
  { id: 'downtown', name: 'Downtown', rent: 15, trafficMod: 2.0, open: 8,  close: 22 },
  { id: 'suburb',   name: 'Suburb',   rent: 5,  trafficMod: 1.0, open: 6,  close: 20 },
  { id: 'mall',     name: 'Mall',     rent: 10, trafficMod: 1.5, open: 10, close: 22 },
  { id: 'airport',  name: 'Airport',  rent: 20, trafficMod: 2.5, open: 0,  close: 24 }
];

// 3. Store-specific upgrades
const STORE_UPGRADES = [
  { id:'automated',       name:'Automated Restocker',    cost:2000, description:'Auto-restocks 1 unit/sec.',            effect: s => s.upgrades.automated = true },
  { id:'premiumCoffee',   name:'Ca Phe Lady', cost:500, description:'Unlocks coffee SKU.',                 effect: s => {
      s.upgrades.premiumCoffee = true;
      s.inventory.coffee       = s.inventory.coffee       || 0;
      s.purchasePrices.coffee  = s.purchasePrices.coffee  || 3.0;
    }
  },
  { id:'energyDrink',     name:'Coconut man', cost:1000, description:'Unlocks energy drinks.',              effect: s => {
      s.upgrades.energyDrink         = true;
      s.inventory.energyDrinks       = s.inventory.energyDrinks       || 0;
      s.purchasePrices.energyDrinks  = s.purchasePrices.energyDrinks  || 2.0;
    }
  },
  { id:'organicSnacks',   name:'Mango Upgradez',    cost:2000, description:'Unlocks organic snacks.',             effect: s => {
      s.upgrades.organicSnacks         = true;
      s.inventory.organicSnacks        = s.inventory.organicSnacks        || 0;
      s.purchasePrices.organicSnacks   = s.purchasePrices.organicSnacks   || 1.5;
    }
  },
  { id:'hotDogRoller',    name:'Bánh Xèo Lady',         cost:2200, description:'Unlocks hot dogs.',                    effect: s => {
      s.upgrades.hotDogRoller      = true;
      s.inventory.hotDogs          = s.inventory.hotDogs          || 0;
      s.purchasePrices.hotDogs     = s.purchasePrices.hotDogs     || 1.0;
    }
  },
  { id:'lotteryTerminal', name:'Lotto Street Seller',       cost:4000, description:'Sells lottery tickets.',               effect: s => {
      s.upgrades.lotteryTerminal       = true;
      s.inventory.lotteryTickets       = s.inventory.lotteryTickets       || 0;
      s.purchasePrices.lotteryTickets  = s.purchasePrices.lotteryTickets  || 1.0;
    }
  }
];

// 4. Global upgrades
const GLOBAL_UPGRADES = [
  { id:'marketing', name:'Marketing Campaign', cost:1000, description:'+10% foot traffic.',     effect: g => g.marketing = true },
  { id:'bulk',      name:'Bulk Purchasing',    cost:3000, description:'-10% restock cost.',       effect: g => g.bulkPurchase = true },
  { id:'franchise', name:'Franchise Model',    cost:5000, description:'Unlock extra store slot.', effect: g => g.maxStores++ }
];

// 5. Utility to pick random element
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 6. Store class
class Store {
  constructor(name, tier = STORE_TIERS[1], location = STORE_LOCATIONS[1]) {
    this.name            = name;
    this.tier            = tier;
    this.location        = location;
    this.cash            = 5000;
    const s = tier.inventoryScale;
    this.inventory       = {
      chips:      Math.floor(50 * s),
      sodas:      Math.floor(50 * s),
      toiletries: Math.floor(20 * s)
    };
    this.purchasePrices  = { chips:0.8, sodas:1.2, toiletries:2.0 };
    this.maintenanceCost = Math.ceil(2 * s);
    this.staff           = { cashiers:1 };
    this.status          = { brokenMachine:false };
    this.reputation      = 0;
    this.upgrades        = {};
    STORE_UPGRADES.forEach(u => this.upgrades[u.id] = false);
  }

  simulateTick(game) {
    // Weekly rent & maintenance
    if (game.time % 168 === 0) {
      const deduction = this.location.rent + this.maintenanceCost;
      this.cash -= deduction;
      game.notify(
        `${this.name} paid rent $${this.location.rent} + maintenance $${this.maintenanceCost}.`
      );
    }
    // Operating hours
    if (game.hour < this.location.open || game.hour >= this.location.close) {
      return;
    }
    // Shoplifting
    const stealChance = this.upgrades.securityCameras ? 0.01 : 0.05;
    if (Math.random() < stealChance) {
      const item = pickRandom(Object.keys(this.inventory));
      if (this.inventory[item] > 0) {
        this.inventory[item]--;
        game.notify(`${this.name}: shoplifter stole 1 ${ITEM_DISPLAY_NAMES[item]}!`);
        this.reputation = Math.max(-100, this.reputation - 1);
      }
    }
    // Equipment breakdown
    if (!this.status.brokenMachine && Math.random() < 0.002) {
      this.status.brokenMachine = true;
      game.notify(`${this.name}: equipment broke!`);
      this.reputation = Math.max(-100, this.reputation - 2);
    }
    if (this.status.brokenMachine) return;
    // Automated restock
    if (this.upgrades.automated) {
      Object.keys(this.inventory).forEach(item => this.inventory[item]++);
    }
    // Customers
    let base = (3 + this.staff.cashiers) * this.location.trafficMod;
    if (game.marketing) base *= 1.1;
    if (game.trend && this.inventory[game.trend] > 0) base *= 2;
    base *= 1 + (this.reputation / 100);
    const customers = Array.from({ length: Math.floor(base) }, () => ({
      want: (game.trend && Math.random() < 0.5)
        ? game.trend
        : pickRandom(Object.keys(this.inventory))
    }));
    let soldTrend = false;
    customers.forEach(c => {
      const item = c.want;
      const sell = game.globalPrices[item] || 0;
      const cost = this.purchasePrices[item] * game.economyFactor;
      const mult = 2.5 + Math.random();
      if (sell > cost * mult) return;
      if (this.inventory[item] > 0) {
        this.inventory[item]--;
        this.cash += sell;
        if (item === game.trend) soldTrend = true;
      }
    });
    if (game.trend) {
      if (soldTrend) this.reputation = Math.min(100, this.reputation + 1);
      else if (this.inventory[game.trend] === 0)
        this.reputation = Math.max(-100, this.reputation - 1);
    }
  }

  fixMachine() {
    this.status.brokenMachine = false;
  }

  restockItem(item, qty, game) {
    if (qty <= 0) return;
    let unitCost = this.purchasePrices[item] * game.economyFactor;
    if (game.bulkPurchase) unitCost *= 0.9;
    const total = qty * unitCost;
    const totalCash = game.stores.reduce((sum, s) => sum + s.cash, 0);
    if (totalCash - total < -1000) {
      game.notify("Debt limit reached—cannot restock that much.");
      return;
    }
    if (this.cash < total) {
      game.notify(`${this.name} needs $${total.toFixed(2)}, has $${this.cash.toFixed(2)}.`);
      return;
    }
    this.inventory[item] += qty;
    this.cash -= total;
  }
}

// 7. Main Game class
class Game {
  constructor() {
    this.stores        = [ new Store("Main Street", STORE_TIERS[1], STORE_LOCATIONS[0]) ];
    this.trend         = null;
    this.economyFactor = 1.0;
    this.maxStores     = 1;
    this.marketing     = false;
    this.bulkPurchase  = false;
    this.globalPrices  = { chips:1.5, sodas:2.0, toiletries:3.5 };
    this.time          = 0;    // hours
    this.hour          = 8;
    this.day           = 1;
    this.debtStartTime = null;
    this.bankrupt      = false;
  }

  start() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initUI();
      this.simTimer   = setInterval(() => this.simulate(), 1000);
      this.eventTimer = setInterval(() => this.worldEvents(), 30000);
    });
  }

  notify(msg) {
    const c = document.getElementById("notifications");
    Array.from(c.children).forEach(el => el.classList.remove("latest"));
    const el = document.createElement("div");
    el.className   = "notification latest";
    el.textContent = `[Day ${this.day}, ${String(this.hour).padStart(2,'0')}:00] ${msg}`;
    c.prepend(el);
    while (c.children.length > 5) c.removeChild(c.lastChild);
  }

  gameOver() {
    this.bankrupt = true;
    clearInterval(this.simTimer);
    clearInterval(this.eventTimer);
    const c = document.getElementById("game-container");
    c.innerHTML = `
      <div class="game-over">Game Over: You failed to repay debt in time.</div>
      <button id="try-again">Try Again</button>
    `;
    document.getElementById("try-again").onclick = () => location.reload();
  }

  initUI() {
    const c = document.getElementById("game-container");
    c.innerHTML = `
      <div id="header">
        <div id="notifications" class="notifications"></div>
        <div id="status-bar">
          <span id="current-day">Day: ${this.day}</span>
          <span id="current-hour">Hour: ${this.hour}:00</span>
          <span id="total-profit">Total P/L: $0.00</span>
          <span id="trend">Trend: ${this.trend || "None"}</span>
          <span id="econ">Economy: ${this.economyFactor.toFixed(2)}</span>
        </div>
      </div>
      <div id="layout">
        <aside id="sidebar">
          <h3>Sell Prices</h3>
          ${Object.keys(this.globalPrices).map(item => `
            <div class="global-price">
              <label>${ITEM_DISPLAY_NAMES[item]}:</label>
              <input type="number" step="0.1" id="price-${item}" value="${this.globalPrices[item]}" min="0">
            </div>
          `).join('')}
          <h3>Global Upgrades</h3>
          <div id="global-upgrades"></div>
          <button id="add-store">Open New Store</button>
        </aside>
        <section id="main">
          <div id="stores"></div>
        </section>
      </div>
    `;

    Object.keys(this.globalPrices).forEach(item => {
      document.getElementById(`price-${item}`).oninput = e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 0) this.globalPrices[item] = v;
      };
    });

    this.renderGlobalUpgrades();
    document.getElementById("add-store").onclick = () => this.handleAddStore();
    this.stores.forEach((_, i) => this.addStoreUI(i));
    this.updateUI();
  }

  handleAddStore() {
    if (this.bankrupt) return;
    if (this.stores.length >= this.maxStores) {
      this.notify("Max stores reached.");
      return;
    }
    this.showAddStoreModal();
  }

  // —— Modal flow for adding a store ——
  showAddStoreModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    Object.assign(overlay.style, {
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:2000
    });
    const modal = document.createElement('div');
    modal.id = 'modal';
    Object.assign(modal.style, {
      background:'#fff', padding:'1rem', borderRadius:'8px',
      maxWidth:'90%', width:'300px', boxSizing:'border-box'
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.buildTierSelection(modal);
  }

  buildTierSelection(modal) {
    modal.innerHTML = `<h3>Select Store Size</h3>`;
    STORE_TIERS.forEach((tier,i) => {
      const btn = document.createElement('button');
      btn.textContent = `${tier.name} ($${tier.cost})`;
      Object.assign(btn.style, { display:'block', width:'100%', margin:'0.5rem 0' });
      btn.onclick = () => {
        this._selectedTier = i;
        this.buildLocationSelection(modal);
      };
      modal.appendChild(btn);
    });
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    Object.assign(cancel.style, { display:'block', width:'100%', marginTop:'1rem', background:'#ccc' });
    cancel.onclick = () => this.hideModal();
    modal.appendChild(cancel);
  }

  buildLocationSelection(modal) {
    modal.innerHTML = `<h3>Select Location</h3>`;
    STORE_LOCATIONS.forEach((loc,i) => {
      const btn = document.createElement('button');
      btn.textContent = `${loc.name} (rent $${loc.rent}/wk)`;
      Object.assign(btn.style, { display:'block', width:'100%', margin:'0.5rem 0' });
      btn.onclick = () => {
        this._selectedLoc = i;
        this.confirmAddStore();
      };
      modal.appendChild(btn);
    });
    const back = document.createElement('button');
    back.textContent = 'Back';
    Object.assign(back.style, { display:'block', width:'100%', marginTop:'1rem', background:'#ccc' });
    back.onclick = () => this.buildTierSelection(modal);
    modal.appendChild(back);
  }

  confirmAddStore() {
    const tier = STORE_TIERS[this._selectedTier];
    const loc  = STORE_LOCATIONS[this._selectedLoc];
    const totalCash = this.stores.reduce((sum,s) => sum + s.cash, 0);
    if (totalCash < tier.cost) {
      this.notify(`Need $${tier.cost}, have $${totalCash.toFixed(2)}.`);
      this.hideModal();
      return;
    }
    this.stores[0].cash -= tier.cost;
    this.notify(`Opened ${tier.name} in ${loc.name} for $${tier.cost}.`);
    const name = prompt('Name your store:', `${loc.name} Branch`);
    this.stores.push(new Store(name||loc.name, tier, loc));
    this.addStoreUI(this.stores.length - 1);
    this.updateUI();
    this.hideModal();
  }

  hideModal() {
    const ov = document.getElementById('modal-overlay');
    if (ov) ov.remove();
  }
  // —— end modal flow ——

  purchaseGlobalUpgrade(id) {
    if (this.bankrupt) return;
    const upg   = GLOBAL_UPGRADES.find(u => u.id === id);
    const payer = this.stores[0];
    if (!this[id] && payer.cash >= upg.cost) {
      payer.cash -= upg.cost;
      upg.effect(this);
      this.notify(`Purchased global upgrade: ${upg.name}`);
      this.renderGlobalUpgrades();
      this.updateUI();
    } else {
      this.notify("Cannot purchase upgrade.");
    }
  }

  addStoreUI(idx) {
    const s  = this.stores[idx];
    const sd = document.getElementById("stores");
    const card = document.createElement("div");
    card.id = `store-${idx}`;
    card.className = "store-card";
    card.innerHTML = `
      <h3>${s.name} (${s.tier.name}, ${s.location.name})</h3>
      <p>Cash: $<span id="cash-${idx}">0.00</span></p>
      <p>Status: <span id="status-${idx}">Operational</span></p>
      <button id="fix-${idx}">Fix Machine</button>
      <h4>Items & Restock</h4>
      <div class="item-row header">
        <span>Item</span><span>Inv</span><span>Cost</span><span>Qty</span><span>Action</span>
      </div>
      ${Object.keys(s.inventory).map(item => `
        <div class="item-row">
          <span>${ITEM_DISPLAY_NAMES[item]}</span>
          <span><span id="inv-${idx}-${item}">${s.inventory[item]}</span></span>
          <span>$<span id="pp-${idx}-${item}">${
            (s.purchasePrices[item] * this.economyFactor * (this.bulkPurchase ? 0.9 : 1)).toFixed(2)
          }</span></span>
          <input type="number" id="restock-${idx}-${item}" value="0" min="0">
          <button id="btn-restock-${idx}-${item}">Restock</button>
        </div>
      `).join('')}
      <div id="upgrades-${idx}"><h4>Store Upgrades</h4></div>
    `;
    sd.appendChild(card);

    document.getElementById(`fix-${idx}`).onclick = () => {
      s.fixMachine();
      this.notify(`${s.name} equipment fixed.`);
      this.updateUI();
    };

    Object.keys(s.inventory).forEach(item => {
      document.getElementById(`btn-restock-${idx}-${item}`).onclick = () => {
        const qty = parseInt(document.getElementById(`restock-${idx}-${item}`).value, 10);
        s.restockItem(item, qty, this);
        this.updateUI();
      };
    });

    STORE_UPGRADES.forEach(upg => {
      const btn = document.createElement("button");
      btn.id = `upg-${idx}-${upg.id}`;
      btn.innerText = `${upg.name} ($${upg.cost})`;
      btn.onclick = () => {
        if (!s.upgrades[upg.id] && s.cash >= upg.cost) {
          s.cash -= upg.cost;
          upg.effect(s);
          const skuMap = {
            premiumCoffee:   'coffee',
            energyDrink:     'energyDrinks',
            organicSnacks:   'organicSnacks',
            hotDogRoller:    'hotDogs',
            lotteryTerminal: 'lotteryTickets'
          };
          const sku = skuMap[upg.id];
          if (sku) {
            const defaultSell = (s.purchasePrices[sku] || 1) * 2;
            this.globalPrices[sku] = this.globalPrices[sku] || defaultSell;
          }
          this.notify(`${s.name} purchased: ${upg.name}`);
          this.renderGlobalUpgrades();
          this.renderStoreUI(idx);
          this.updateUI();
        } else {
          this.notify("Cannot purchase store upgrade.");
        }
      };
      document.getElementById(`upgrades-${idx}`).appendChild(btn);
    });
  }

  simulate() {
    if (this.bankrupt) return;
    this.time++;
    this.hour = (this.hour + 1) % 24;
    if (this.hour === 0) {
      this.day++;
      document.getElementById("current-day").textContent = `Day: ${this.day}`;
    }
    document.getElementById("current-hour").textContent = `Hour: ${this.hour}:00`;
    document.getElementById("trend").textContent = `Trend: ${this.trend || "None"}`;
    document.getElementById("econ").textContent  = `Economy: ${this.economyFactor.toFixed(2)}`;
    this.stores.forEach(s => s.simulateTick(this));
    this.checkDebt();
    this.updateUI();
  }

  worldEvents() {
    if (this.bankrupt) return;
    if (Math.random() < 0.3) {
      this.trend = pickRandom(Object.keys(this.stores[0].inventory));
      game.notify(`Trend Alert: ${ITEM_DISPLAY_NAMES[this.trend]}!`);
    }
    if (Math.random() < 0.1) {
      this.economyFactor = Math.max(
        0.5,
        this.economyFactor + (Math.random() * 0.4 - 0.2)
      );
      this.notify(`Economy factor: ${this.economyFactor.toFixed(2)}`);
    }
    document.getElementById("trend").textContent = `Trend: ${this.trend ? ITEM_DISPLAY_NAMES[this.trend] : "None"}`;
    document.getElementById("econ").textContent  = `Economy: ${this.economyFactor.toFixed(2)}`;
  }

  checkDebt() {
    const totalCash = this.stores.reduce((sum, s) => sum + s.cash, 0);
    if (totalCash <= -1000 && this.debtStartTime === null) {
      this.debtStartTime = this.time;
      this.notify("Debt max reached! You have one day to recover before bankruptcy.");
    }
    if (this.debtStartTime !== null && totalCash >= 0) {
      this.debtStartTime = null;
      this.notify("Debt cleared.");
    }
    if (this.debtStartTime !== null && this.time - this.debtStartTime >= 24) {
      this.gameOver();
    }
  }

  updateUI() {
    this.stores.forEach((s, idx) => {
      const cashEl = document.getElementById(`cash-${idx}`);
      const statEl = document.getElementById(`status-${idx}`);
      const fixBtn = document.getElementById(`fix-${idx}`);
      if (cashEl) cashEl.textContent = s.cash.toFixed(2);
      if (statEl) statEl.textContent = s.status.brokenMachine ? "Broken" : "Operational";
      if (fixBtn) fixBtn.disabled = !s.status.brokenMachine;

      Object.keys(s.inventory).forEach(item => {
        const invEl = document.getElementById(`inv-${idx}-${item}`);
        const ppEl  = document.getElementById(`pp-${idx}-${item}`);
        if (invEl) invEl.textContent = s.inventory[item];
        if (ppEl)  ppEl.textContent  = (
          s.purchasePrices[item] * this.economyFactor * (this.bulkPurchase ? 0.9 : 1)
        ).toFixed(2);
      });
    });

    const total = this.stores.reduce((sum, s) => sum + s.cash, 0);
    const totEl = document.getElementById("total-profit");
    if (totEl) totEl.textContent = `Total P/L: $${total.toFixed(2)}`;

    GLOBAL_UPGRADES.forEach(upg => {
      const btn = document.getElementById(`upg-global-${upg.id}`);
      if (btn) btn.disabled = this.stores[0].cash < upg.cost || this[upg.id];
    });

    this.stores.forEach((s, idx) => {
      STORE_UPGRADES.forEach(upg => {
        const btn = document.getElementById(`upg-${idx}-${upg.id}`);
        if (btn) btn.disabled = s.cash < upg.cost || s.upgrades[upg.id];
      });
    });

    const addBtn = document.getElementById("add-store");
    if (addBtn) addBtn.disabled = this.stores.length >= this.maxStores || this.bankrupt;
  }

  renderGlobalUpgrades() {
    const container = document.getElementById("global-upgrades");
    container.innerHTML = "";
    GLOBAL_UPGRADES.forEach(upg => {
      const btn = document.createElement("button");
      btn.id = `upg-global-${upg.id}`;
      btn.innerText = `${upg.name} ($${upg.cost})`;
      btn.onclick = () => this.purchaseGlobalUpgrade(upg.id);
      btn.disabled = this.stores[0].cash < upg.cost || this[upg.id];
      container.appendChild(btn);
    });
  }

  renderStoreUI(idx) {
    const old = document.getElementById(`store-${idx}`);
    if (old) old.remove();
    this.addStoreUI(idx);
  }
}

// 8. Launch the game
new Game().start();
