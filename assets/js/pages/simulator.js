/**
 * Página: Simulador de recuperación de la inversión.
 * Lee el formulario, valida, calcula con Solar y muestra resultados.
 */
(function () {
  'use strict';

  const { PROJECT, Solar, App } = window;
  const { fmt, el } = App;
  const { panel, site, customCost } = PROJECT;

  const MAX_MONTHS = 120; // horizonte de la proyección (10 años)
  const CUSTOM = 'custom';

  /* ---------- Elementos ---------- */
  const presetsBox = document.getElementById('presets');
  const inputs = {
    panels: document.getElementById('panels'),
    consumption: document.getElementById('consumption'),
    tariff: document.getElementById('tariff'),
    roof: document.getElementById('roof'),
    voltage: document.getElementById('voltage'),
    resistance: document.getElementById('resistance')
  };
  const panelsHint = document.getElementById('panels-hint');
  const errorBox = document.getElementById('error');
  const warningBox = document.getElementById('warning');
  const results = document.getElementById('results');
  const projection = document.getElementById('projection');
  const out = {
    payback: document.getElementById('payback-value'),
    paybackSub: document.getElementById('payback-sub'),
    budget: document.getElementById('m-budget'),
    generation: document.getElementById('m-generation'),
    surplus: document.getElementById('m-surplus'),
    saving: document.getElementById('m-saving'),
    current: document.getElementById('m-current'),
    joule: document.getElementById('m-joule'),
    chartSummary: document.getElementById('chart-summary'),
    scheduleBody: document.getElementById('schedule-body')
  };

  let chart = null;

  /* ---------- Opciones iniciales ---------- */

  function buildRoofOptions() {
    PROJECT.roofs.forEach((roof) => {
      const option = el('option', '', roof.label + ' (' + roof.capacityKgM2 + ' kg/m²)');
      option.value = roof.id;
      inputs.roof.append(option);
    });
  }

  function buildPresets() {
    const options = App.systems.map((system) => ({
      value: system.id,
      title: system.name,
      detail: system.panels + ' paneles · ' + App.roofById(system.roof).label.split(' /')[0]
    }));
    options.push({ value: CUSTOM, title: 'Personalizado', detail: 'Elige tus propios valores' });

    options.forEach((option, index) => {
      const wrapper = el('div', 'preset');
      const input = el('input');
      input.type = 'radio';
      input.name = 'preset';
      input.id = 'preset-' + option.value;
      input.value = option.value;
      input.checked = index === 0;
      const label = el('label');
      label.htmlFor = input.id;
      label.append(el('strong', '', option.title), el('span', '', option.detail));
      wrapper.append(input, label);
      presetsBox.append(wrapper);
    });

    presetsBox.addEventListener('change', (event) => applyPreset(event.target.value));
  }

  function selectedPreset() {
    return presetsBox.querySelector('input[name="preset"]:checked').value;
  }

  /** Llena el formulario con los valores de un sistema del informe */
  function applyPreset(value) {
    const isCustom = value === CUSTOM;
    inputs.panels.disabled = !isCustom;
    panelsHint.textContent = isCustom
      ? 'Entre 1 y 200 paneles.'
      : 'Fijo para este sistema. Elige Personalizado para cambiarlo.';

    if (!isCustom) {
      const system = App.systemById(value);
      inputs.panels.value = system.panels;
      inputs.consumption.value = system.consumptionKwh;
      inputs.roof.value = system.roof;
    }
    calculate();
  }

  /* ---------- Validación ---------- */

  const RULES = [
    { key: 'panels', label: 'Cantidad de paneles', min: 1, max: 200, integer: true },
    { key: 'consumption', label: 'Consumo mensual', min: 1 },
    { key: 'tariff', label: 'Tarifa eléctrica', min: 1 },
    { key: 'voltage', label: 'Voltaje del sistema', min: 1 },
    { key: 'resistance', label: 'Resistencia de los conductores', min: 0 }
  ];

  /** Devuelve { values, errors } sin usar valores por defecto ocultos */
  function readForm() {
    const values = {};
    const errors = [];

    RULES.forEach((rule) => {
      const input = inputs[rule.key];
      const value = Number(input.value);
      let problem = null;

      if (input.value.trim() === '' || Number.isNaN(value)) problem = 'escribe un número';
      else if (value < rule.min) problem = 'debe ser mayor o igual a ' + fmt.num(rule.min);
      else if (rule.max !== undefined && value > rule.max) problem = 'debe ser menor o igual a ' + fmt.num(rule.max);
      else if (rule.integer && !Number.isInteger(value)) problem = 'debe ser un número entero';

      input.setAttribute('aria-invalid', String(problem !== null));
      if (problem) errors.push(rule.label + ': ' + problem + '.');
      values[rule.key] = value;
    });

    values.roof = App.roofById(inputs.roof.value);
    return { values, errors };
  }

  /* ---------- Cálculo ---------- */

  /** Muestra u oculta juntos los resultados y la proyección, para no dejar datos viejos en pantalla */
  function setResultsVisible(visible) {
    results.hidden = !visible;
    projection.hidden = !visible;
  }

  function showMessage(box, text) {
    box.textContent = text;
    box.hidden = !text;
  }

  function calculate() {
    const { values, errors } = readForm();
    showMessage(warningBox, '');

    if (errors.length) {
      showMessage(errorBox, errors.join(' '));
      setResultsVisible(false);
      return;
    }

    const preset = selectedPreset();
    const generatedKwh = App.generationFor(values.panels);
    const budgetCop = preset === CUSTOM
      ? Solar.customBudget(values.panels, customCost.perPanelCop, customCost.fixedCop)
      : App.systemById(preset).budgetCop;

    // 1. ¿El techo aguanta?
    const load = Solar.structuralLoad({ panelMassKg: panel.massKg, panelAreaM2: panel.areaM2 });
    const roof = Solar.roofCheck(load, values.roof.capacityKgM2, site.roofSafetyFactor);
    if (!roof.ok) {
      showMessage(errorBox, 'El techo de ' + values.roof.label.toLowerCase() + ' soporta hasta ' +
        fmt.num(roof.limitKgM2, 1) + ' kg/m² con el factor de seguridad, y los paneles cargan ' +
        fmt.num(load) + ' kg/m². Elige otro tipo de techo.');
      setResultsVisible(false);
      return;
    }

    // 2. ¿Hay excedente de energía?
    if (generatedKwh <= values.consumption) {
      showMessage(errorBox, 'Con ' + values.panels + ' paneles el sistema genera ' + fmt.num(generatedKwh) +
        ' kWh al mes, pero el consumo es de ' + fmt.num(values.consumption) +
        ' kWh. Agrega paneles para que haya excedente.');
      setResultsVisible(false);
      return;
    }

    showMessage(errorBox, '');

    if (load === roof.limitKgM2) {
      showMessage(warningBox, 'La carga de los paneles (' + fmt.num(load) + ' kg/m²) queda justo en el límite de este techo. Conviene revisarlo con un ingeniero estructural.');
    }

    // 3. Retorno de la inversión
    const surplusKwh = generatedKwh - values.consumption;
    const monthlySaving = surplusKwh * values.tariff;
    const months = Solar.paybackMonths({
      budgetCop, generatedKwh, consumptionKwh: values.consumption, tariffCopPerKwh: values.tariff
    });
    const schedule = Solar.paybackSchedule(budgetCop, monthlySaving, MAX_MONTHS);
    const recovered = schedule.length > 0 && schedule[schedule.length - 1].recovered;

    if (!recovered) {
      showMessage(warningBox, 'La inversión no se recupera en los primeros ' + MAX_MONTHS / 12 +
        ' años con estos valores. La gráfica muestra solo ese periodo.');
    }

    // 4. Electricidad: corriente y pérdidas por efecto Joule
    const powerW = Solar.installedPower(panel.watts, values.panels);
    const currentA = Solar.current(powerW, values.voltage);
    const lossW = Solar.jouleLoss(currentA, values.resistance);

    setResultsVisible(true); // primero se muestra, para que la gráfica mida bien su espacio
    renderResults({ months, budgetCop, generatedKwh, surplusKwh, monthlySaving, currentA, lossW, powerW });
    renderChart(schedule, budgetCop);
    renderSchedule(schedule);
    out.chartSummary.textContent = recovered
      ? 'La línea verde alcanza la inversión en el mes ' + schedule.length + '.'
      : 'Con estos valores, la inversión no se alcanza en ' + MAX_MONTHS + ' meses.';
  }

  /* ---------- Resultados ---------- */

  function renderResults(r) {
    out.payback.replaceChildren(fmt.num(r.months, 1), el('small', '', 'meses'));
    out.paybackSub.textContent = 'Alrededor de ' + fmt.num(r.months / 12, 1) + ' años. La inversión se recupera en el mes ' + Math.ceil(r.months) + '.';
    out.budget.textContent = fmt.cop(r.budgetCop);
    out.generation.textContent = fmt.num(r.generatedKwh) + ' kWh';
    out.surplus.textContent = fmt.num(r.surplusKwh) + ' kWh';
    out.saving.textContent = fmt.cop(r.monthlySaving);
    out.current.textContent = fmt.num(r.currentA, 1) + ' A';
    out.joule.replaceChildren(
      fmt.num(r.lossW) + ' W',
      el('span', 'note', fmt.num((r.lossW / r.powerW) * 100, 1) + ' % de la potencia')
    );
  }

  function renderChart(schedule, budgetCop) {
    const labels = schedule.map((row) => 'Mes ' + row.month);
    const accumulated = schedule.map((row) => Math.round(row.accumulatedCop));
    const investment = schedule.map(() => budgetCop);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = accumulated;
      chart.data.datasets[1].data = investment;
      chart.update();
      return;
    }

    chart = new Chart(document.getElementById('chart-payback'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Dinero recuperado', data: accumulated, borderColor: App.colors.green, backgroundColor: 'rgba(30, 122, 76, 0.12)', fill: true, tension: 0.2, pointRadius: 0, borderWidth: 3 },
          { label: 'Inversión total', data: investment, borderColor: App.colors.navy, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }
        ]
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxTicksLimit: 12 } },
          y: { beginAtZero: true, ticks: { callback: (value) => fmt.cop(value) } }
        },
        plugins: { tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmt.cop(ctx.parsed.y) } } }
      }
    });
  }

  function renderSchedule(schedule) {
    out.scheduleBody.replaceChildren(...schedule.map((row) => {
      const tr = el('tr');
      const fill = el('span', 'fill');
      fill.style.width = row.percent.toFixed(1) + '%';
      const track = el('span', 'track');
      track.append(fill);
      const bar = el('div', 'bar-cell');
      bar.append(track, el('span', 'pct', fmt.num(row.percent) + ' %'));

      const progress = el('td');
      progress.append(bar);
      const status = el('td');
      status.append(el('span', row.recovered ? 'pill pill-ok' : 'pill pill-wait', row.recovered ? 'Recuperado' : 'Pendiente'));

      const month = el('th', 'num', row.month);
      month.scope = 'row';
      tr.append(month, el('td', 'num', fmt.cop(row.savingCop)), el('td', 'num', fmt.cop(row.accumulatedCop)), progress, status);
      return tr;
    }));
  }

  /* ---------- Inicio ---------- */

  buildRoofOptions();
  buildPresets();
  inputs.tariff.value = site.tariffCopPerKwh;
  inputs.voltage.value = site.voltageV;
  inputs.resistance.value = site.conductorResistanceOhm;
  Object.values(inputs).forEach((input) => input.addEventListener('input', calculate));
  applyPreset(selectedPreset());
})();
