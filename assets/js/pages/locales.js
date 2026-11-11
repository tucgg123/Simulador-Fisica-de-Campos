/**
 * Página: Locales del Barrio Galán.
 * Todo se calcula a partir de data/project.js: generación, relación
 * generación/consumo, presupuestos y retorno de cada local.
 */
(function () {
  'use strict';

  const { PROJECT, Solar, App } = window;
  const { fmt, el } = App;
  const tariff = PROJECT.site.tariffCopPerKwh;

  const rows = PROJECT.locales.map((local) => {
    const system = App.systemById(local.system);
    return {
      ...local,
      systemData: system,
      generatedKwh: system.generatedKwh,
      ratio: system.generatedKwh / local.consumptionKwh,
      paybackMonths: Solar.paybackMonths({
        budgetCop: system.budgetCop,
        generatedKwh: system.generatedKwh,
        consumptionKwh: local.consumptionKwh,
        tariffCopPerKwh: tariff
      })
    };
  });

  /* ---------- Gráfica ---------- */
  new Chart(document.getElementById('chart-locales'), {
    type: 'bar',
    data: {
      labels: rows.map((row) => row.shortName),
      datasets: [
        { label: 'Consumo (kWh/mes)', data: rows.map((row) => row.consumptionKwh), backgroundColor: App.colors.blue, borderRadius: 4 },
        { label: 'Generado por el sistema solar (kWh/mes)', data: rows.map((row) => row.generatedKwh), backgroundColor: App.colors.amber, borderRadius: 4 }
      ]
    },
    options: {
      scales: { y: { beginAtZero: true, ticks: { callback: (value) => fmt.num(value) + ' kWh' } } },
      plugins: { tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmt.num(ctx.parsed.y) + ' kWh' } } }
    }
  });

  /* ---------- Tabla de locales ---------- */
  document.getElementById('locales-body').replaceChildren(...rows.map((row) => {
    const tr = el('tr');
    const name = el('th', '', row.name);
    name.scope = 'row';

    const systemCell = el('td');
    const pillClass = row.system === 'sistema-1' ? 'pill pill-1' : 'pill pill-2';
    systemCell.append(el('span', pillClass, row.systemData.name + ' · ' + row.systemData.panels + ' paneles'));

    tr.append(
      name,
      el('td', 'num', fmt.num(row.consumptionKwh)),
      el('td', '', row.roof.material + ', ' + row.roof.slope + ', ' + fmt.num(row.roof.areaM2) + ' m²'),
      systemCell,
      el('td', 'num', fmt.num(row.generatedKwh)),
      el('td', 'num', '× ' + fmt.num(row.ratio, 2)),
      el('td', 'num', fmt.num(row.paybackMonths, 1) + ' meses')
    );
    return tr;
  }));

  /* ---------- Presupuesto ---------- */
  const [system1, system2] = App.systems;
  document.getElementById('budget-head-1').textContent = system1.name + ' (' + system1.panels + ' paneles)';
  document.getElementById('budget-head-2').textContent = system2.name + ' (' + system2.panels + ' paneles)';

  document.getElementById('budget-body').replaceChildren(...Object.entries(PROJECT.budgetLabels).map(([key, label]) => {
    const tr = el('tr');
    const head = el('th', '', label);
    head.scope = 'row';
    tr.append(head, el('td', 'num', fmt.cop(system1.budgetCop[key])), el('td', 'num', fmt.cop(system2.budgetCop[key])));
    return tr;
  }));
  document.getElementById('budget-total-1').textContent = fmt.cop(system1.budgetCop);
  document.getElementById('budget-total-2').textContent = fmt.cop(system2.budgetCop);

  /* ---------- Retorno de cada sistema ---------- */
  document.getElementById('roi-cards').replaceChildren(...App.systems.map((system) => {
    const card = el('div', 'stat');
    const where = system.locales.length === 1
      ? system.locales[0].name
      : 'promedio de ' + system.locales.length + ' locales';
    card.append(
      el('p', 'label', 'Retorno del ' + system.name + ' (' + where + ')'),
      el('p', 'value', fmt.num(system.paybackMonths, 1) + ' meses'),
      el('p', 'sub', 'Alrededor de ' + fmt.num(system.paybackMonths / 12, 1) + ' años, con un consumo de ' + fmt.num(system.consumptionKwh, Number.isInteger(system.consumptionKwh) ? 0 : 2) + ' kWh/mes.')
    );
    return card;
  }));
})();
