/**
 * Pruebas de los cálculos del simulador.
 * Ejecutar con:  npm test   (o  node --test)
 *
 * Comprueban que el código reproduce los resultados del informe.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const Solar = require('../assets/js/core/solar.js');
const PROJECT = require('../assets/js/data/project.js');

/** Compara dos números con una tolerancia */
function near(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `se esperaba ${expected} ± ${tolerance}, se obtuvo ${actual}`
  );
}

const { panel, site } = PROJECT;
const system = (id) => PROJECT.systems.find((s) => s.id === id);
const generation = (panels) => Solar.monthlyGeneration({
  panelWatts: panel.watts, panels, peakSunHours: site.peakSunHours, daysPerMonth: site.daysPerMonth
});

test('generación mensual: 25 paneles = 2025 kWh y 20 paneles = 1620 kWh', () => {
  assert.equal(generation(25), 2025);
  assert.equal(generation(20), 1620);
});

test('carga estructural: siempre 15 kg/m² con el panel del informe', () => {
  assert.equal(Solar.structuralLoad({ panelMassKg: panel.massKg, panelAreaM2: panel.areaM2 }), 15);
});

test('revisión del techo: concreto aguanta y el límite de la lámina es 15 kg/m²', () => {
  assert.deepEqual(Solar.roofCheck(15, 150, 2), { limitKgM2: 75, ok: true });
  assert.deepEqual(Solar.roofCheck(15, 30, 2), { limitKgM2: 15, ok: true });
  assert.equal(Solar.roofCheck(16, 30, 2).ok, false);
});

test('presupuestos de la Tabla 5: $20.250.000 y $15.100.000', () => {
  assert.equal(Solar.sum(system('sistema-1').budgetCop), 20250000);
  assert.equal(Solar.sum(system('sistema-2').budgetCop), 15100000);
});

test('un sistema personalizado de 25 paneles cuesta lo mismo que el Sistema 1', () => {
  const { perPanelCop, fixedCop } = PROJECT.customCost;
  assert.equal(Solar.customBudget(25, perPanelCop, fixedCop), 20250000);
});

test('consumo del Sistema 2 = promedio de sus 4 locales = 500,25 kWh', () => {
  const values = PROJECT.locales.filter((l) => l.system === 'sistema-2').map((l) => l.consumptionKwh);
  assert.equal(Solar.average(values), 500.25);
});

test('retorno de inversión: Sistema 1 ≈ 35,55 meses y Sistema 2 ≈ 16,86 meses', () => {
  const tariff = site.tariffCopPerKwh;
  near(Solar.paybackMonths({ budgetCop: 20250000, generatedKwh: 2025, consumptionKwh: 1313, tariffCopPerKwh: tariff }), 35.55);
  near(Solar.paybackMonths({ budgetCop: 15100000, generatedKwh: 1620, consumptionKwh: 500.25, tariffCopPerKwh: tariff }), 16.86);
});

test('sin excedente no hay retorno (Infinity)', () => {
  assert.equal(Solar.paybackMonths({ budgetCop: 1, generatedKwh: 100, consumptionKwh: 100, tariffCopPerKwh: 800 }), Infinity);
});

test('corriente por ley de Watt: 51,14 A y 40,91 A', () => {
  near(Solar.current(11250, 220), 51.136);
  near(Solar.current(9000, 220), 40.909);
});

test('campo magnético a 5 cm: 204,5 µT (Sistema 1) y 163,6 µT (Sistema 2)', () => {
  near(Solar.magneticField(11250 / 220, 0.05) * 1e6, 204.5, 0.1);
  near(Solar.magneticField(9000 / 220, 0.05) * 1e6, 163.6, 0.1);
});

test('el campo del Sistema 1 baja a 200 µT a unos 5,1 cm del conductor', () => {
  near(Solar.distanceForField(11250 / 220, 200e-6) * 100, 5.11, 0.01);
});

test('campo eléctrico: 220 V a 5 cm = 4400 V/m', () => {
  assert.equal(Solar.electricField(220, 0.05), 4400);
});

test('pérdidas por efecto Joule con R = 0,2 Ω: ≈ 523 W y ≈ 335 W (36 % menos)', () => {
  const p1 = Solar.jouleLoss(11250 / 220, 0.2);
  const p2 = Solar.jouleLoss(9000 / 220, 0.2);
  near(p1, 522.98);
  near(p2, 334.71);
  near(1 - p2 / p1, 0.36);
});

test('horas de sol pico: 21,6 MJ/m² = 6 h', () => {
  near(Solar.peakSunHoursFromRadiation(21.6), 6);
});

test('proyección mes a mes: termina en el mes en que se recupera', () => {
  const rows = Solar.paybackSchedule(1000, 300, 72);
  assert.equal(rows.length, 4);
  assert.equal(rows.at(-1).recovered, true);
  assert.equal(rows.at(-2).recovered, false);
  assert.equal(rows.at(-1).percent, 100);
  assert.deepEqual(Solar.paybackSchedule(1000, 0, 72), []);
});
