/**
 * Utilidades compartidas por todas las páginas.
 * Depende de: data/project.js (PROJECT) y core/solar.js (Solar).
 */
(function () {
  'use strict';

  const { PROJECT, Solar } = window;
  const { panel, site } = PROJECT;

  /* ---------- Formato (español de Colombia) ---------- */

  const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const fmt = {
    cop: (value) => copFormatter.format(Math.round(value)),
    /** Número con decimales fijos: fmt.num(35.551, 1) → "35,6" */
    num: (value, decimals = 0) => new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(value)
  };

  /* ---------- DOM ---------- */

  /** Crea un elemento con texto seguro (nunca interpreta HTML) */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /* ---------- Datos derivados de los sistemas ---------- */

  function roofById(id) {
    return PROJECT.roofs.find((roof) => roof.id === id);
  }

  function generationFor(panels) {
    return Solar.monthlyGeneration({
      panelWatts: panel.watts,
      panels,
      peakSunHours: site.peakSunHours,
      daysPerMonth: site.daysPerMonth
    });
  }

  /**
   * Para cada sistema del informe calcula: potencia, generación, consumo de
   * referencia (promedio de los locales que lo usan), presupuesto, retorno y corriente.
   */
  const systems = PROJECT.systems.map((system) => {
    const locales = PROJECT.locales.filter((local) => local.system === system.id);
    const consumptionKwh = Solar.average(locales.map((local) => local.consumptionKwh));
    const powerW = Solar.installedPower(panel.watts, system.panels);
    const generatedKwh = generationFor(system.panels);
    const budgetCop = Solar.sum(system.budgetCop);
    const currentA = Solar.current(powerW, site.voltageV);

    return {
      ...system,
      locales,
      consumptionKwh,
      powerW,
      generatedKwh,
      budgetCop,
      currentA,
      paybackMonths: Solar.paybackMonths({
        budgetCop, generatedKwh, consumptionKwh, tariffCopPerKwh: site.tariffCopPerKwh
      })
    };
  });

  function systemById(id) {
    return systems.find((system) => system.id === id);
  }

  /* ---------- Gráficas (Chart.js) ---------- */

  const colors = {
    navy: '#0B1F3A',
    amber: '#F5A524',
    green: '#1E7A4C',
    blue: '#1F5FAE',
    red: '#B42318',
    grid: '#E3E8EE',
    text: '#4A5868'
  };

  if (window.Chart) {
    Chart.defaults.font.family = "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif";
    Chart.defaults.font.size = 14;
    Chart.defaults.color = colors.text;
    Chart.defaults.borderColor = colors.grid;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.position = 'top';
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
  }

  window.App = { fmt, el, roofById, generationFor, systems, systemById, colors };
})();
