/**
 * Página: Modelos 3D.
 * Completa la ficha de cada modelo con los datos del local (data/project.js).
 * Cada tarjeta indica su local con el atributo data-local="Nombre del local".
 */
(function () {
  'use strict';

  const { PROJECT, Solar, App } = window;
  const { fmt, el } = App;

  document.querySelectorAll('[data-local]').forEach((card) => {
    const local = PROJECT.locales.find((item) => item.name === card.dataset.local);
    if (!local) return;

    const system = App.systemById(local.system);
    const months = Solar.paybackMonths({
      budgetCop: system.budgetCop,
      generatedKwh: system.generatedKwh,
      consumptionKwh: local.consumptionKwh,
      tariffCopPerKwh: PROJECT.site.tariffCopPerKwh
    });

    const facts = [
      ['Techo', local.roof.material + ', ' + local.roof.slope + ', ' + fmt.num(local.roof.areaM2) + ' m²'],
      ['Consumo', fmt.num(local.consumptionKwh) + ' kWh/mes'],
      ['Sistema', system.name + ', ' + system.panels + ' paneles'],
      ['Generación', fmt.num(system.generatedKwh) + ' kWh/mes (× ' + fmt.num(system.generatedKwh / local.consumptionKwh, 2) + ' su consumo)'],
      ['Retorno estimado', fmt.num(months, 1) + ' meses']
    ];

    card.querySelector('dl').replaceChildren(...facts.map(([label, value]) => {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
      return row;
    }));
  });
})();
