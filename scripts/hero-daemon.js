// scripts/hero-daemon.js

import { DAEMON_WIZARD_SCENARIOS } from "./utils/scenarioRules.js";

class HeroDaemonWizard extends FormApplication {
  constructor(actor, options = {}) {
    super(actor, options);
    this.actor = actor;

    this.wizardData = {
      campaignKey: null,
      backstory: {
        name: this.actor.name === "Novo Personagem" ? "" : this.actor.name,
        age: this.actor.system.details.age.value || 30,
        biography: this.actor.system.details.biography.value || ""
      },
      attributes: {},
      aprimoramentos: [],
      pericias: [],
      equipamentos: [], // {name, type, system}
      extras: this.actor.system.details.extras || ""
    };
    
    this._loadInitialData();

    this.steps = [
      { id: "campaign", title: game.i18n.localize("DAEMON_WIZARD.Steps.Campaign") },
      { id: "backstory", title: game.i18n.localize("DAEMON_WIZARD.Steps.Backstory") },
      { id: "attributes", title: game.i18n.localize("DAEMON_WIZARD.Steps.Attributes") },
      { id: "aprimoramentos", title: game.i18n.localize("DAEMON_WIZARD.Steps.Aprimoramentos") },
      { id: "pericias", title: game.i18n.localize("DAEMON_WIZARD.Steps.Pericias") },
      { id: "pericias-combate", title: game.i18n.localize("DAEMON_WIZARD.Steps.PericiasCombate") },
      { id: "pvs-ip", title: game.i18n.localize("DAEMON_WIZARD.Steps.PVsIP") },
      { id: "pontos-heroicos", title: game.i18n.localize("DAEMON_WIZARD.Steps.PontosHeroicos") },
      { id: "equipamentos", title: game.i18n.localize("DAEMON_WIZARD.Steps.Equipamentos") },
      { id: "extras", title: game.i18n.localize("DAEMON_WIZARD.Steps.Extras") },
    ];
    this.currentStepIndex = 0;
  }

  _loadInitialData() {
    const currentAttributes = foundry.utils.deepClone(this.actor.system.attributes);
    this.wizardData.attributes = Object.entries(currentAttributes).reduce((acc, [key, attr]) => {
        acc[key] = attr.value;
        return acc;
    }, {});

    this.actor.items.filter(i => i.type === 'aprimoramento').forEach(item => {
        this.wizardData.aprimoramentos.push({ name: item.name, cost: item.system.cost });
    });
    
    this.actor.items.filter(i => i.type === 'pericia' || i.type === 'pericia-combate').forEach(item => {
        this.wizardData.pericias.push({
            name: item.name, type: item.type, attribute: item.system.attribute,
            gasto: item.system.gasto, gasto_atk: item.system.gasto_atk, gasto_def: item.system.gasto_def
        });
    });
    
    if (!this.wizardData.pericias.find(p => p.name === "Briga")) {
        this.wizardData.pericias.unshift({
            name: "Briga", type: "pericia-combate", attribute: "dex", gasto_atk: 0, gasto_def: 0
        });
    }

    // Carrega equipamentos existentes
    this.actor.items.filter(i => ['arma', 'armadura', 'item'].includes(i.type)).forEach(item => {
        this.wizardData.equipamentos.push({
            name: item.name,
            type: item.type,
            system: foundry.utils.deepClone(item.system)
        });
    });
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "daemon-hero-wizard",
      classes: ["daemonrpg", "daemon-hero-wizard"],
      title: game.i18n.localize("DAEMON_WIZARD.WizardTitle"),
      template: "modules/sistema-daemon-wizard/templates/layout.hbs",
      width: 720,
      height: 600,
      resizable: true,
    });
  }

  async getData(options) {
    const data = super.getData(options);
    const currentStep = this.steps[this.currentStepIndex];

    data.actor = this.actor;
    data.wizardData = this.wizardData;
    data.currentStep = this.currentStepIndex + 1;
    data.totalSteps = this.steps.length;
    data.stepTitle = currentStep.title;
    data.config = CONFIG;

    if (currentStep.id === 'campaign') {
        data.scenarios = DAEMON_WIZARD_SCENARIOS;
        data.selectedScenario = this.wizardData.campaignKey ? DAEMON_WIZARD_SCENARIOS[this.wizardData.campaignKey] : null;
        data.configPoints = {
            attributes: game.settings.get('sistema-daemon-wizard', 'attributePoints'),
            aprimoramentosPositivos: game.settings.get('sistema-daemon-wizard', 'aprimoramentosPositivos'),
            aprimoramentosNegativos: game.settings.get('sistema-daemon-wizard', 'aprimoramentosNegativos')
        };
    }

    if (currentStep.id === 'attributes') {
        const totalPoints = game.settings.get('sistema-daemon-wizard', 'attributePoints');
        const spentPoints = Object.values(this.wizardData.attributes).reduce((sum, val) => sum + Number(val), 0);
        data.attributePoints = { total: totalPoints, spent: spentPoints, remaining: totalPoints - spentPoints };
    }

    if (currentStep.id === 'aprimoramentos') {
        data.positivos = this.wizardData.aprimoramentos.filter(a => a.cost >= 0);
        data.negativos = this.wizardData.aprimoramentos.filter(a => a.cost < 0);
        const basePos = game.settings.get('sistema-daemon-wizard', 'aprimoramentosPositivos');
        const baseNeg = game.settings.get('sistema-daemon-wizard', 'aprimoramentosNegativos');
        const fromNegatives = data.negativos.reduce((sum, a) => sum + Math.abs(a.cost), 0);
        const spentOnPositivos = data.positivos.reduce((sum, a) => sum + a.cost, 0);
        const gainedFromNeg = Math.min(fromNegatives, baseNeg);
        const remainingPos = basePos + gainedFromNeg - spentOnPositivos;
        const remainingNeg = baseNeg - fromNegatives;
        data.aprimoramentoPoints = {
            basePos,
            baseNeg,
            gainedFromNeg,
            spentPos: spentOnPositivos,
            remainingPos,
            remainingNeg
        };
    }

    if (currentStep.id === 'pericias') {
        data.periciasComuns = this.wizardData.pericias.filter(p => p.type === 'pericia');
        data.periciaPoints = this._calculateSkillPoints();
    }
    
    if (currentStep.id === 'pericias-combate') {
        data.periciasCombate = this.wizardData.pericias.filter(p => p.type === 'pericia-combate');
        data.periciaPoints = this._calculateSkillPoints();
    }

    if (currentStep.id === 'pvs-ip') {
        const fr = this.wizardData.attributes.fr || 0;
        const con = this.wizardData.attributes.con || 0;
        const agi = this.wizardData.attributes.agi || 0;
        data.calculatedStats = {
            pv: Math.ceil((fr + con) / 2) + 1,
            ip: 0,
            iniciativa: agi
        };
    }

    if (currentStep.id === 'pontos-heroicos') {
        let ph = 0;
        const phAprimoramento = this.wizardData.aprimoramentos.find(a => a.name.toLowerCase().includes("pontos heroicos"));
        if (phAprimoramento) {
            ph = phAprimoramento.cost;
        }
        data.pontosHeroicos = ph;
    }

    if (currentStep.id === 'equipamentos') {
        this.wizardData.equipamentos.forEach(item => {
            switch(item.type) {
                case 'arma': item.icon = 'fa-gavel'; break;
                case 'armadura': item.icon = 'fa-shield-alt'; break;
                default: item.icon = 'fa-box';
            }
        });
    }
    
    data.stepTemplate = `modules/sistema-daemon-wizard/templates/step-${this.currentStepIndex + 1}-${currentStep.id}.hbs`;
    return data;
  }
  
  _calculateSkillPoints() {
    const age = this.wizardData.backstory.age || 0;
    const intelligence = this.wizardData.attributes.int || 0;
    const totalPoints = (10 * age) + (5 * intelligence);
    
    let spentPoints = 0;
    this.wizardData.pericias.forEach(p => {
        const baseValue = p.attribute ? (this.wizardData.attributes[p.attribute] || 0) : 0;
        if (p.type === 'pericia-combate') {
            spentPoints += (p.gasto_atk || 0) + (p.gasto_def || 0);
            p.total = `${(p.gasto_atk || 0) + baseValue}/${(p.gasto_def || 0) + baseValue}`;
        } else {
            spentPoints += (p.gasto || 0);
            p.total = (p.gasto || 0) + baseValue;
        }
    });
    
    return { total: totalPoints, spent: spentPoints, remaining: totalPoints - spentPoints };
  }

  async _updateObject(event, formData) {
    // 1. Aprimoramentos
    const aprimoramentoIdsToDelete = this.actor.items.filter(i => i.type === 'aprimoramento').map(i => i.id);
    if (aprimoramentoIdsToDelete.length > 0) await this.actor.deleteEmbeddedDocuments("Item", aprimoramentoIdsToDelete);

    const aprimoramentosToCreate = this.wizardData.aprimoramentos.map(ap => ({ name: ap.name, type: 'aprimoramento', system: { cost: ap.cost } }));
    if (aprimoramentosToCreate.length > 0) await this.actor.createEmbeddedDocuments("Item", aprimoramentosToCreate);

    // 2. Perícias
    const periciaIdsToDelete = this.actor.items.filter(i => i.type === 'pericia' || i.type === 'pericia-combate').map(i => i.id);
    if (periciaIdsToDelete.length > 0) await this.actor.deleteEmbeddedDocuments("Item", periciaIdsToDelete);

    const periciasToCreate = this.wizardData.pericias.map(p => {
        const itemData = {
            name: p.name, type: p.type, system: { attribute: p.attribute }
        };
        if (p.type === 'pericia-combate') {
            itemData.system.gasto_atk = p.gasto_atk;
            itemData.system.gasto_def = p.gasto_def;
        } else {
            itemData.system.gasto = p.gasto;
        }
        return itemData;
    });
    if (periciasToCreate.length > 0) await this.actor.createEmbeddedDocuments("Item", periciasToCreate);

    // 3. Equipamentos
    const equipmentIdsToDelete = this.actor.items.filter(i => ['arma', 'armadura', 'item'].includes(i.type)).map(i => i.id);
    if (equipmentIdsToDelete.length > 0) await this.actor.deleteEmbeddedDocuments("Item", equipmentIdsToDelete);
    
    const equipmentToCreate = this.wizardData.equipamentos.map(eq => ({
        name: eq.name,
        type: eq.type,
        system: eq.system
    }));
    if (equipmentToCreate.length > 0) await this.actor.createEmbeddedDocuments("Item", equipmentToCreate);

    // 4. Atributos, Backstory, PH e os novos campos de texto
    const attributesUpdate = {};
    for (const [key, value] of Object.entries(this.wizardData.attributes)) {
        attributesUpdate[`system.attributes.${key}.value`] = value;
    }
    
    let ph = 0;
    const phAprimoramento = this.wizardData.aprimoramentos.find(a => a.name.toLowerCase().includes("pontos heroicos"));
    if (phAprimoramento) ph = phAprimoramento.cost;

    await this.actor.update({
        'name': this.wizardData.backstory.name,
        'system.details.age.value': this.wizardData.backstory.age,
        'system.details.biography.value': this.wizardData.backstory.biography,
        'system.resources.ph.value': ph,
        'system.resources.ph.max': ph,
        'system.details.equipment': this.wizardData.equipment,
        'system.details.extras': this.wizardData.extras,
        ...attributesUpdate
    });
    ui.notifications.info(`Personagem ${this.actor.name} atualizado com sucesso!`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.next-step').on('click', this._onNextStep.bind(this));
    html.find('.prev-step').on('click', this._onPrevStep.bind(this));

    const currentStepId = this.steps[this.currentStepIndex].id;

    if (currentStepId === 'campaign') {
        html.find('#campaign-type').on('change', this._onCampaignChange.bind(this));
    }
    if (currentStepId === 'backstory') {
        html.find('input, textarea').on('change', this._onBackstoryChange.bind(this));
    }
    if (currentStepId === 'attributes') {
        html.find('.attribute-input').on('change', this._onAttributeChange.bind(this));
    }
    if (currentStepId === 'aprimoramentos') {
        html.find('.add-aprimoramento').on('click', this._onAddAprimoramento.bind(this));
        html.find('.remove-item').on('click', this._onRemoveAprimoramento.bind(this));
    }
    if (currentStepId === 'pericias') {
        html.find('.add-pericia').on('click', this._onAddPericiaManual.bind(this));
        html.find('.remove-pericia').on('click', this._onRemovePericia.bind(this));
        html.find('.pericia-gasto').on('change', this._onUpdatePericiaGasto.bind(this));
    }
    if (currentStepId === 'pericias-combate') {
        html.find('.add-pericia-combate').on('click', this._onAddPericiaCombateManual.bind(this));
        html.find('.remove-pericia').on('click', this._onRemovePericia.bind(this));
        html.find('.pericia-gasto').on('change', this._onUpdatePericiaGasto.bind(this));
    }
    if (currentStepId === 'equipamentos') {
        html.find('#equipment-type-select').on('change', this._onEquipmentTypeChange.bind(this));
        html.find('.add-equipment').on('click', this._onAddEquipment.bind(this));
        html.find('.remove-item').on('click', this._onRemoveEquipment.bind(this));
    }
    if (currentStepId === 'extras') {
        html.find('#char-extras').on('change', event => { this.wizardData.extras = event.currentTarget.value; });
    }
  }
  
  _onCampaignChange(event) { this.wizardData.campaignKey = event.currentTarget.value; this.render(); }
  
  _onBackstoryChange(event) { this.wizardData.backstory[event.currentTarget.name] = event.currentTarget.value; }
  
  _onAttributeChange(event) { this.wizardData.attributes[event.currentTarget.name] = Number(event.currentTarget.value); this.render(); }

  _onAddAprimoramento(event) {
    const type = $(event.currentTarget).data('type');
    const nameInput = $(`#${type}-name`);
    const costInput = $(`#${type}-cost`);
    const name = nameInput.val();
    const cost = parseInt(costInput.val());
    if (!name || isNaN(cost)) {
        ui.notifications.warn("Por favor, preencha o nome e o custo do aprimoramento."); return;
    }
    this.wizardData.aprimoramentos.push({ name, cost });
    this.render();
  }

  _onRemoveAprimoramento(event) {
    const index = $(event.currentTarget).data('index');
    const type = $(event.currentTarget).data('type');
    const itemsOfType = this.wizardData.aprimoramentos.filter(a => (a.cost >= 0 && type === 'vantagem') || (a.cost < 0 && type === 'desvantagem'));
    const itemToRemove = itemsOfType[index];
    this.wizardData.aprimoramentos = this.wizardData.aprimoramentos.filter(a => a !== itemToRemove);
    this.render();
  }

  _onAddPericiaManual(event) {
    const name = $('#pericia-name').val();
    const attribute = $('#pericia-attribute').val();
    const gasto = parseInt($('#pericia-gasto').val());
    if (!name) {
        ui.notifications.warn("Por favor, insira o nome da perícia."); return;
    }
    if (this.wizardData.pericias.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        ui.notifications.warn(`A perícia '${name}' já foi adicionada.`); return;
    }
    this.wizardData.pericias.push({
        name: name, type: 'pericia', attribute: attribute || null, gasto: Math.max(10, gasto || 10)
    });
    this.render();
  }
  
  _onAddPericiaCombateManual(event) {
    const name = $('#pericia-combate-name').val();
    const attribute = $('#pericia-combate-attribute').val();
    if (!name) {
        ui.notifications.warn("Por favor, insira o nome da perícia de combate."); return;
    }
    if (this.wizardData.pericias.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        ui.notifications.warn(`A perícia '${name}' já foi adicionada.`); return;
    }
    this.wizardData.pericias.push({
        name: name, type: 'pericia-combate', attribute: attribute || 'dex', gasto_atk: 0, gasto_def: 0
    });
    this.render();
  }

  _onRemovePericia(event) {
    const type = $(event.currentTarget).data('type');
    let itemToRemove;
    if (type === 'combate') {
        const index = $(event.currentTarget).data('index');
        const itemsOfType = this.wizardData.pericias.filter(p => p.type === 'pericia-combate');
        itemToRemove = itemsOfType[index];
    } else {
        const index = $(event.currentTarget).data('index');
        const itemsOfType = this.wizardData.pericias.filter(p => p.type === 'pericia');
        itemToRemove = itemsOfType[index];
    }
    this.wizardData.pericias = this.wizardData.pericias.filter(a => a !== itemToRemove);
    this.render();
  }

  _onUpdatePericiaGasto(event) {
    const input = event.currentTarget;
    const index = $(input).data('index');
    const field = $(input).data('field');
    const value = parseInt(input.value) || 0;
    const currentStepId = this.steps[this.currentStepIndex].id;
    let pericia;
    if (currentStepId === 'pericias-combate') {
        const itemsOfType = this.wizardData.pericias.filter(p => p.type === 'pericia-combate');
        pericia = itemsOfType[index];
    } else {
        const itemsOfType = this.wizardData.pericias.filter(p => p.type === 'pericia');
        pericia = itemsOfType[index];
    }
    if (pericia) {
        if (pericia.type === 'pericia' && field === 'gasto') {
            pericia.gasto = Math.max(10, value);
        } else {
            pericia[field] = Math.max(0, value);
        }
    }
    this.render();
  }

  _onEquipmentTypeChange(event) {
    const selectedType = $(event.currentTarget).val();
    this.element.find('.equipment-form').hide();
    this.element.find(`#form-${selectedType}`).show();
  }

  _onAddEquipment(event) {
    const type = $(event.currentTarget).data('type');
    const form = this.element.find(`#form-${type}`);
    const name = form.find('input[name="name"]').val();

    if (!name) {
        ui.notifications.warn("Por favor, insira o nome do item.");
        return;
    }

    const newEquipment = { name, type, system: {} };
    switch(type) {
        case 'item':
            newEquipment.system.quantity = parseInt(form.find('input[name="quantity"]').val()) || 1;
            break;
        case 'arma':
            newEquipment.system.damage = form.find('input[name="damage"]').val() || "1d6";
            newEquipment.system.weaponType = form.find('select[name="weaponType"]').val();
            break;
        case 'armadura':
            newEquipment.system.ip = { cinetico: parseInt(form.find('input[name="ip.cinetico"]').val()) || 0 };
            newEquipment.system.penalties = {
                dex: parseInt(form.find('input[name="penalties.dex"]').val()) || 0,
                agi: parseInt(form.find('input[name="penalties.agi"]').val()) || 0,
            };
            break;
    }

    this.wizardData.equipamentos.push(newEquipment);
    this.render();
  }

  _onRemoveEquipment(event) {
    const index = $(event.currentTarget).data('index');
    this.wizardData.equipamentos.splice(index, 1);
    this.render();
  }

  _onNextStep(event) {
    event.preventDefault();
    const currentStepId = this.steps[this.currentStepIndex].id;
    if (currentStepId === 'campaign' && !this.wizardData.campaignKey) {
        ui.notifications.warn("Por favor, selecione uma campanha antes de prosseguir.");
        return;
    }
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.render(true);
    }
  }

  _onPrevStep(event) {
    event.preventDefault();
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.render(true);
    }
  }
}

// --- HOOKS ---

Hooks.once('init', async () => {
  console.log('Sistema Daemon Wizard | Inicializando...');

  Handlebars.registerHelper('upcase', function(str) {
      if (typeof str === 'string') { return str.toUpperCase(); } return str;
  });

  game.settings.register('sistema-daemon-wizard', 'attributePoints', {
      name: game.i18n.localize('DAEMON_WIZARD.Settings.AttributePoints'),
      hint: game.i18n.localize('DAEMON_WIZARD.Settings.AttributePointsHint'),
      scope: 'world',
      config: true,
      type: Number,
      default: 80
  });

  game.settings.register('sistema-daemon-wizard', 'aprimoramentosPositivos', {
      name: game.i18n.localize('DAEMON_WIZARD.Settings.PositiveEnhancements'),
      hint: game.i18n.localize('DAEMON_WIZARD.Settings.PositiveEnhancementsHint'),
      scope: 'world',
      config: true,
      type: Number,
      default: 5
  });

  game.settings.register('sistema-daemon-wizard', 'aprimoramentosNegativos', {
      name: game.i18n.localize('DAEMON_WIZARD.Settings.NegativeEnhancements'),
      hint: game.i18n.localize('DAEMON_WIZARD.Settings.NegativeEnhancementsHint'),
      scope: 'world',
      config: true,
      type: Number,
      default: 5
  });

  const templatePaths = [
    'modules/sistema-daemon-wizard/templates/step-1-campaign.hbs',
    'modules/sistema-daemon-wizard/templates/step-2-backstory.hbs',
    'modules/sistema-daemon-wizard/templates/step-3-attributes.hbs',
    'modules/sistema-daemon-wizard/templates/step-4-aprimoramentos.hbs',
    'modules/sistema-daemon-wizard/templates/step-5-pericias.hbs',
    'modules/sistema-daemon-wizard/templates/step-6-pericias-combate.hbs',
    'modules/sistema-daemon-wizard/templates/step-7-pvs-ip.hbs',
    'modules/sistema-daemon-wizard/templates/step-8-pontos-heroicos.hbs',
    'modules/sistema-daemon-wizard/templates/step-9-equipamentos.hbs',
    'modules/sistema-daemon-wizard/templates/step-10-extras.hbs'
  ];

  CONFIG.DAEMON = {
      attributes: {
          fr: "Força", con: "Constituição", dex: "Destreza", agi: "Agilidade",
          int: "Inteligência", will: "Força de Vontade", per: "Percepção", car: "Carisma"
      }
  };

  await loadTemplates(templatePaths);
});

Hooks.on('renderActorSheet', (app, html, data) => {
  if (game.system.id !== 'daemonrpg' || data.actor.type !== 'personagem') return;
  const header = html.find('.window-header .window-title');
  if (header.length > 0 && html.find('.open-daemon-wizard').length === 0) {
    const button = $(`<a class="open-daemon-wizard" title="${game.i18n.localize("DAEMON_WIZARD.ButtonTitle")}"><i class="fas fa-magic"></i> ${game.i18n.localize("DAEMON_WIZARD.ButtonLabel")}</a>`);
    button.on('click', () => { new HeroDaemonWizard(app.actor).render(true); });
    header.after(button);
  }
});
