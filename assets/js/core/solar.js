/**
 * Cálculos del sistema fotovoltaico.
 *
 * Todas las funciones son "puras": reciben números y devuelven números,
 * sin leer ni modificar la página. Por eso se pueden probar de forma
 * automática (ver tests/solar.test.js) y reutilizar en cualquier vista.
 *
 * Unidades: W, kWh, V, A, Ω, m, T (tesla), kg, m², COP.
 * Funciona en el navegador (window.Solar) y en Node.js (pruebas).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Solar = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Permeabilidad magnética del vacío μ₀ (T·m/A) */
  const MU0 = 4 * Math.PI * 1e-7;

  /* ---------- Energía ---------- */

  /** Potencia instalada (W) = potencia por panel × número de paneles */
  function installedPower(panelWatts, panels) {
    return panelWatts * panels;
  }

  /**
   * Generación mensual (kWh) = (W × N × horas de sol pico × días) / 1000
   */
  function monthlyGeneration({ panelWatts, panels, peakSunHours, daysPerMonth }) {
    return (panelWatts * panels * peakSunHours * daysPerMonth) / 1000;
  }

  /**
   * Horas de sol pico a partir de la radiación diaria.
   * 1 kWh/m² = 3,6 MJ/m², y 1 hora de sol pico = 1 kWh/m².
   */
  function peakSunHoursFromRadiation(radiationMJm2) {
    return radiationMJm2 / 3.6;
  }

  /* ---------- Estructura ---------- */

  /**
   * Carga del sistema sobre el techo (kg/m²) = (N × masa) / (N × área).
   * No depende del número de paneles: con el panel del informe siempre es 15 kg/m².
   */
  function structuralLoad({ panelMassKg, panelAreaM2 }) {
    return panelMassKg / panelAreaM2;
  }

  /** Revisa si el techo aguanta: la carga debe ser ≤ capacidad / factor de seguridad */
  function roofCheck(loadKgM2, capacityKgM2, safetyFactor) {
    const limitKgM2 = capacityKgM2 / safetyFactor;
    return { limitKgM2, ok: loadKgM2 <= limitKgM2 };
  }

  /* ---------- Electricidad y campos ---------- */

  /** Corriente (A) por la ley de Watt: I = P / V */
  function current(powerW, voltageV) {
    return powerW / voltageV;
  }

  /** Campo magnético de un conductor recto (T) por la ley de Ampère: B = μ₀·I / (2π·r) */
  function magneticField(currentA, distanceM) {
    return (MU0 * currentA) / (2 * Math.PI * distanceM);
  }

  /** Distancia (m) a la que el campo magnético baja a un valor dado (T) */
  function distanceForField(currentA, fieldT) {
    return (MU0 * currentA) / (2 * Math.PI * fieldT);
  }

  /** Campo eléctrico (V/m): E = V / d */
  function electricField(voltageV, distanceM) {
    return voltageV / distanceM;
  }

  /** Pérdidas por efecto Joule (W): P = I² · R */
  function jouleLoss(currentA, resistanceOhm) {
    return currentA * currentA * resistanceOhm;
  }

  /* ---------- Dinero ---------- */

  /** Suma los valores de un objeto { rubro: valor } */
  function sum(values) {
    return Object.values(values).reduce((total, value) => total + value, 0);
  }

  /** Presupuesto (COP) = costo por panel × N + costos fijos */
  function customBudget(panels, perPanelCop, fixedCop) {
    return sum(perPanelCop) * panels + sum(fixedCop);
  }

  /**
   * Meses para recuperar la inversión, según el modelo del informe:
   * Presupuesto / ((Generado − Consumo) × tarifa).
   * Devuelve Infinity si no hay excedente.
   */
  function paybackMonths({ budgetCop, generatedKwh, consumptionKwh, tariffCopPerKwh }) {
    const surplusKwh = generatedKwh - consumptionKwh;
    if (surplusKwh <= 0) return Infinity;
    return budgetCop / (surplusKwh * tariffCopPerKwh);
  }

  /**
   * Proyección mes a mes del dinero recuperado.
   * Se detiene en el mes en que se recupera la inversión o en maxMonths.
   */
  function paybackSchedule(budgetCop, monthlySavingCop, maxMonths) {
    const rows = [];
    if (monthlySavingCop <= 0) return rows;

    let accumulated = 0;
    for (let month = 1; month <= maxMonths; month++) {
      accumulated += monthlySavingCop;
      const recovered = accumulated >= budgetCop;
      rows.push({
        month,
        savingCop: monthlySavingCop,
        accumulatedCop: accumulated,
        percent: Math.min((accumulated / budgetCop) * 100, 100),
        recovered
      });
      if (recovered) break;
    }
    return rows;
  }

  /** Promedio de una lista de números */
  function average(values) {
    return values.length ? sum(values) / values.length : 0;
  }

  return {
    MU0,
    installedPower,
    monthlyGeneration,
    peakSunHoursFromRadiation,
    structuralLoad,
    roofCheck,
    current,
    magneticField,
    distanceForField,
    electricField,
    jouleLoss,
    sum,
    customBudget,
    paybackMonths,
    paybackSchedule,
    average
  };
});
