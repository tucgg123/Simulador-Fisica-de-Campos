/**
 * Página: Clima en Barranquilla.
 *
 * Consulta el pronóstico en vivo de Open-Meteo (gratis, sin clave).
 * Con la radiación solar diaria calcula las horas de sol pico y la energía
 * que generaría cada sistema. Si el servicio no responde, muestra el
 * pronóstico guardado en el informe y lo indica claramente.
 */
(function () {
  'use strict';

  const { PROJECT, Solar, App } = window;
  const { fmt, el } = App;
  const { location, weatherSnapshot, panel, site } = PROJECT;

  const TIMEOUT_MS = 8000;

  /* ---------- Códigos de clima de la OMM (WMO) ---------- */
  const ICONS = {
    sun: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="9" fill="#F5A524"/><g stroke="#F5A524" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2"/></g></svg>',
    partly: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="18" r="8" fill="#F5A524"/><path d="M15 38h20a8 8 0 0 0 0-16 11 11 0 0 0-20 4 6 6 0 0 0 0 12z" fill="#C9D3DE" stroke="#7A8896" stroke-width="2"/></svg>',
    cloud: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 36h22a9 9 0 0 0 0-18 12 12 0 0 0-22 4 7 7 0 0 0 0 14z" fill="#C9D3DE" stroke="#7A8896" stroke-width="2"/></svg>',
    rain: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 30h22a9 9 0 0 0 0-18 12 12 0 0 0-22 4 7 7 0 0 0 0 14z" fill="#C9D3DE" stroke="#7A8896" stroke-width="2"/><g stroke="#1F5FAE" stroke-width="3" stroke-linecap="round"><path d="M16 35l-2 6M24 35l-2 6M32 35l-2 6"/></g></svg>',
    storm: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 30h22a9 9 0 0 0 0-18 12 12 0 0 0-22 4 7 7 0 0 0 0 14z" fill="#9AA7B5" stroke="#4A5868" stroke-width="2"/><path d="M25 31l-5 8h5l-3 7 9-10h-5l3-5z" fill="#F5A524"/></svg>'
  };

  function describe(code) {
    if (code === 0) return { label: 'Despejado', icon: 'sun' };
    if (code === 1) return { label: 'Mayormente despejado', icon: 'sun' };
    if (code === 2) return { label: 'Parcialmente nublado', icon: 'partly' };
    if (code === 3 || code === 45 || code === 48) return { label: code === 3 ? 'Nublado' : 'Niebla', icon: 'cloud' };
    if (code >= 51 && code <= 57) return { label: 'Llovizna', icon: 'rain' };
    if (code >= 61 && code <= 67) return { label: 'Lluvia', icon: 'rain' };
    if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'rain' };
    if (code >= 95) return { label: 'Tormenta', icon: 'storm' };
    return { label: 'Variable', icon: 'cloud' };
  }

  /** Inserta uno de los íconos fijos de arriba (nunca datos externos) */
  function iconNode(name) {
    const holder = document.createElement('span');
    holder.innerHTML = ICONS[name] || ICONS.cloud;
    return holder.firstChild;
  }

  /* ---------- Fechas ---------- */
  function parseDate(isoDate) {
    const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const dayName = (isoDate) => parseDate(isoDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' });
  const longDate = (isoDate) => parseDate(isoDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- Datos ---------- */

  async function fetchForecast() {
    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      forecast_days: 5,
      current: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,precipitation_probability_max,shortwave_radiation_sum'
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const daily = data.daily;
      return {
        live: true,
        updated: data.current.time,
        current: { temperatureC: data.current.temperature_2m, code: data.current.weather_code },
        days: daily.time.map((date, i) => ({
          date,
          maxC: daily.temperature_2m_max[i],
          rainProbability: daily.precipitation_probability_max[i],
          code: daily.weather_code[i],
          radiationMJm2: daily.shortwave_radiation_sum[i]
        }))
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function snapshot() {
    return { live: false, updated: weatherSnapshot.date, current: weatherSnapshot.current, days: weatherSnapshot.days };
  }

  /* ---------- Pantalla ---------- */

  function dailyGeneration(panels, peakSunHours) {
    return (panel.watts * panels * peakSunHours) / 1000;
  }

  function render(forecast) {
    const source = document.getElementById('source');
    if (forecast.live) {
      const time = new Date(forecast.updated).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
      source.textContent = 'Pronóstico en vivo de Open-Meteo (actualizado hoy a las ' + time + ').';
      source.classList.remove('is-fallback');
    } else {
      source.textContent = 'No se pudo consultar el pronóstico en vivo. Se muestran los datos guardados en el informe (' + longDate(forecast.updated) + ').';
      source.classList.add('is-fallback');
    }

    const now = describe(forecast.current.code);
    document.getElementById('now-temp').textContent = fmt.num(forecast.current.temperatureC) + ' °C';
    document.getElementById('now-cond').textContent = now.label;
    document.getElementById('now-date').textContent = longDate(forecast.days[0].date);
    document.getElementById('now-icon').replaceChildren(iconNode(now.icon));

    const [s1, s2] = App.systems;
    document.getElementById('days').replaceChildren(...forecast.days.map((day) => {
      const info = describe(day.code);
      const hasRadiation = typeof day.radiationMJm2 === 'number';
      const psh = hasRadiation ? Solar.peakSunHoursFromRadiation(day.radiationMJm2) : null;

      const li = el('li');
      const card = el('article', 'day');
      const details = el('dl');
      const addRow = (label, value) => {
        const row = el('div');
        row.append(el('dt', '', label), el('dd', '', value));
        details.append(row);
      };
      addRow('Lluvia', fmt.num(day.rainProbability) + ' %');
      addRow('Sol pico', hasRadiation ? fmt.num(psh, 1) + ' h' : '—');
      addRow(s1.name, hasRadiation ? fmt.num(dailyGeneration(s1.panels, psh)) + ' kWh' : '—');
      addRow(s2.name, hasRadiation ? fmt.num(dailyGeneration(s2.panels, psh)) + ' kWh' : '—');

      card.append(el('h3', '', dayName(day.date)), iconNode(info.icon), el('p', 'cond', info.label), el('p', 'max', fmt.num(day.maxC, 1) + ' °C'), details);
      li.append(card);
      return li;
    }));

    const summary = document.getElementById('solar-summary');
    const hours = forecast.days.filter((d) => typeof d.radiationMJm2 === 'number').map((d) => Solar.peakSunHoursFromRadiation(d.radiationMJm2));
    if (hours.length) {
      summary.textContent = 'En los próximos ' + hours.length + ' días se esperan en promedio ' + fmt.num(Solar.average(hours), 1) +
        ' horas de sol pico por día. El simulador usa el promedio del informe: ' + site.peakSunHours + ' horas.';
    } else {
      summary.textContent = 'El simulador usa un promedio de ' + site.peakSunHours +
        ' horas de sol pico por día. Los días lluviosos generan menos y los soleados más; ese promedio ya contempla la variación.';
    }
  }

  async function init() {
    try {
      render(await fetchForecast());
    } catch (error) {
      console.warn('Pronóstico no disponible:', error.message);
      render(snapshot());
    }
  }

  init();
})();
