/**
 * Datos del informe de Física de Campos – Barrio Galán, Barranquilla.
 *
 * Este archivo solo contiene DATOS (sin cálculos ni código de la página).
 * Si cambia un precio, un consumo o un local, se edita aquí y todo el
 * sitio (simulador, tablas y gráficas) se actualiza solo.
 *
 * Funciona en el navegador (window.PROJECT) y en Node.js (pruebas).
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.PROJECT = data;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    /** Panel Jinko Solar Tiger Neo JKM450N-54HL4R-V */
    panel: {
      model: 'Jinko Solar Tiger Neo JKM450N-54HL4R-V',
      watts: 450,
      areaM2: 2,
      massKg: 30
    },

    /** Condiciones del sitio y supuestos del informe */
    site: {
      peakSunHours: 6,          // horas de sol pico por día en Barranquilla
      daysPerMonth: 30,
      tariffCopPerKwh: 800,
      voltageV: 220,
      conductorResistanceOhm: 0.2,
      fieldDistanceM: 0.05,     // distancia al conductor usada en el informe (5 cm)
      roofSafetyFactor: 2       // la carga debe ser ≤ capacidad del techo / 2
    },

    /** Límites de referencia OMS / ICNIRP usados en el informe */
    limits: {
      magneticFieldUT: 200,
      electricFieldVm: 5000
    },

    /** Tipos de techo y su capacidad de carga (kg/m²) */
    roofs: [
      { id: 'fibrocemento', label: 'Fibrocemento / teja ternil', capacityKgM2: 45 },
      { id: 'lamina', label: 'Lámina metálica', capacityKgM2: 30 },
      { id: 'concreto', label: 'Concreto', capacityKgM2: 150 }
    ],

    /**
     * Costo por panel para el modo "Personalizado".
     * Se obtiene del presupuesto del Sistema 1 dividido entre sus 25 paneles,
     * así un sistema personalizado de 25 paneles cuesta lo mismo que el Sistema 1.
     */
    customCost: {
      perPanelCop: {
        panel: 350000,
        inverter: 240000,
        structure: 72000,
        wiring: 48000,
        installation: 80000
      },
      fixedCop: { maintenance: 500000 }
    },

    /** Etiquetas de los rubros del presupuesto (Tabla 5 del informe) */
    budgetLabels: {
      panels: 'Paneles Jinko Solar 450 W ($350.000 c/u)',
      inverter: 'Inversor',
      structure: 'Estructura de soporte',
      wiring: 'Cableado y protecciones',
      installation: 'Instalación',
      maintenance: 'Mantenimiento'
    },

    /** Sistemas propuestos en el informe */
    systems: [
      {
        id: 'sistema-1',
        name: 'Sistema 1',
        panels: 25,
        roof: 'concreto',
        budgetCop: {
          panels: 8750000,
          inverter: 6000000,
          structure: 1800000,
          wiring: 1200000,
          installation: 2000000,
          maintenance: 500000
        }
      },
      {
        id: 'sistema-2',
        name: 'Sistema 2',
        panels: 20,
        roof: 'fibrocemento',
        budgetCop: {
          panels: 7000000,
          inverter: 4000000,
          structure: 1200000,
          wiring: 900000,
          installation: 1500000,
          maintenance: 500000
        }
      }
    ],

    /** Locales analizados (Tablas 2 y 4 del informe) */
    locales: [
      { name: 'Ferretería la 4', shortName: 'Ferretería la 4', consumptionKwh: 120, roof: { material: 'Fibrocemento', slope: '1 agua', areaM2: 144 }, system: 'sistema-2', model3d: 'ferreteria' },
      { name: 'Restaurante Don Pedro', shortName: 'Rest. Don Pedro', consumptionKwh: 1313, roof: { material: 'Concreto', slope: 'plano', areaM2: 180 }, system: 'sistema-1', model3d: 'don-pedro' },
      { name: 'Miscelánea la Mano de Dios', shortName: 'Misc. Mano de Dios', consumptionKwh: 456, roof: { material: 'Fibrocemento', slope: '2 aguas', areaM2: 200 }, system: 'sistema-2' },
      { name: 'Restaurante Feng Ze Yuan', shortName: 'Rest. Feng Ze Yuan', consumptionKwh: 774, roof: { material: 'Fibrocemento', slope: '2 aguas', areaM2: 200 }, system: 'sistema-2' },
      { name: 'Droguería la Rebaja', shortName: 'Droguería la Rebaja', consumptionKwh: 651, roof: { material: 'Fibrocemento', slope: '2 aguas', areaM2: 200 }, system: 'sistema-2' }
    ],

    /** Ubicación para el pronóstico del clima (Barranquilla) */
    location: { name: 'Barranquilla, Atlántico', latitude: 10.9685, longitude: -74.7813, timezone: 'America/Bogota' },

    /**
     * Pronóstico guardado en el informe (19 de mayo de 2026).
     * Se muestra solo si no se puede consultar el pronóstico en vivo.
     * code: código de clima de la OMM (WMO) – 2 parcialmente nublado, 1 mayormente despejado, 61 lluvia.
     */
    weatherSnapshot: {
      date: '2026-05-19',
      current: { temperatureC: 30, code: 2 },
      days: [
        { date: '2026-05-19', maxC: 31.5, rainProbability: 10, code: 2 },
        { date: '2026-05-20', maxC: 31.3, rainProbability: 10, code: 2 },
        { date: '2026-05-21', maxC: 31.7, rainProbability: 40, code: 80 },
        { date: '2026-05-22', maxC: 31.1, rainProbability: 50, code: 61 },
        { date: '2026-05-23', maxC: 31.2, rainProbability: 20, code: 1 }
      ]
    }
  };
});
