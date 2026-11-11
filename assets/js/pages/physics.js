/**
 * Página: Física de campos aplicada.
 * Todos los valores se calculan con core/solar.js a partir de los datos
 * del informe, así la tabla, las tarjetas y el simulador siempre coinciden.
 */
(function () {
  'use strict';

  const { PROJECT, Solar, App } = window;
  const { fmt, el } = App;
  const { site, limits } = PROJECT;
  const [s1, s2] = App.systems;

  const toMicroTesla = (tesla) => tesla * 1e6;
  const fieldAt = (currentA, distanceM) => toMicroTesla(Solar.magneticField(currentA, distanceM));
  const isUnder = (value, limit) => value <= limit;

  const d = site.fieldDistanceM;
  const b1 = fieldAt(s1.currentA, d);
  const b2 = fieldAt(s2.currentA, d);
  const b1At1m = fieldAt(s1.currentA, 1);
  const b2At1m = fieldAt(s2.currentA, 1);
  const e = Solar.electricField(site.voltageV, d);
  const j1 = Solar.jouleLoss(s1.currentA, site.conductorResistanceOhm);
  const j2 = Solar.jouleLoss(s2.currentA, site.conductorResistanceOhm);
  const safeDistanceCm = (system) => Solar.distanceForField(system.currentA, limits.magneticFieldUT * 1e-6) * 100;

  function set(id, text) {
    document.getElementById(id).textContent = text;
  }

  /* ---------- Tarjetas ---------- */
  set('p-1', s1.name + ', P = ' + fmt.num(s1.powerW) + ' W');
  set('p-2', s2.name + ', P = ' + fmt.num(s2.powerW) + ' W');
  set('i-1', fmt.num(s1.currentA, 2) + ' A');
  set('i-2', fmt.num(s2.currentA, 2) + ' A');

  set('b-1', fmt.num(b1, 1) + ' µT');
  set('b-2', fmt.num(b2, 1) + ' µT');

  set('e-value', fmt.num(e) + ' V/m');
  set('e-limit', fmt.num(limits.electricFieldVm) + ' V/m');

  set('j-1', fmt.num(j1, 1) + ' W');
  set('j-2', fmt.num(j2, 1) + ' W');
  set('j-diff', fmt.num((1 - j2 / j1) * 100) + ' % menos calor');

  /* ---------- Verificación de límites ---------- */
  function statusPill(ok, textOk, textBad) {
    const td = el('td');
    td.append(el('span', ok ? 'pill pill-ok' : 'pill pill-bad', ok ? textOk : textBad));
    return td;
  }

  const limitRows = [
    { label: 'Campo magnético a 5 cm', v1: b1, v2: b2, unit: 'µT', decimals: 1, limit: limits.magneticFieldUT },
    { label: 'Campo magnético a 1 m', v1: b1At1m, v2: b2At1m, unit: 'µT', decimals: 1, limit: limits.magneticFieldUT },
    { label: 'Campo eléctrico', v1: e, v2: e, unit: 'V/m', decimals: 0, limit: limits.electricFieldVm }
  ];

  document.getElementById('limits-body').replaceChildren(...limitRows.map((row) => {
    const tr = el('tr');
    const head = el('th', '', row.label);
    head.scope = 'row';
    const ok1 = isUnder(row.v1, row.limit);
    const ok2 = isUnder(row.v2, row.limit);
    const statusText = ok1 && ok2 ? 'Ambos bajo el límite' : (ok2 ? 'Sistema 1 lo supera' : 'Lo superan');
    tr.append(
      head,
      el('td', 'num', fmt.num(row.v1, row.decimals) + ' ' + row.unit),
      el('td', 'num', fmt.num(row.v2, row.decimals) + ' ' + row.unit),
      el('td', 'num', fmt.num(row.limit) + ' ' + row.unit),
      statusPill(ok1 && ok2, statusText, statusText)
    );
    return tr;
  }));

  set('limits-note',
    'A 5 cm del conductor, el Sistema 1 produce ' + fmt.num(b1, 1) + ' µT, un poco más que el límite de ' +
    fmt.num(limits.magneticFieldUT) + ' µT; queda por debajo desde unos ' + fmt.num(safeDistanceCm(s1), 1) +
    ' cm. El Sistema 2 queda por debajo desde unos ' + fmt.num(safeDistanceCm(s2), 1) +
    ' cm, y a 1 m los dos sistemas producen menos de ' + fmt.num(Math.ceil(b1At1m)) + ' µT.');

  /* ---------- Deslizador: campo magnético vs. distancia ---------- */
  const slider = document.getElementById('distance');
  const sliderOut = document.getElementById('distance-out');

  function showField(id, value) {
    const box = document.getElementById(id + '-box');
    const ok = isUnder(value, limits.magneticFieldUT);
    box.classList.toggle('is-over', !ok);
    box.classList.toggle('is-under', ok);
    const dd = document.getElementById(id);
    dd.replaceChildren(fmt.num(value, 1) + ' µT', el('span', '', ok ? 'Bajo el límite' : 'Supera el límite'));
  }

  function updateSlider() {
    const cm = Number(slider.value);
    sliderOut.textContent = cm + ' cm';
    showField('b1-out', fieldAt(s1.currentA, cm / 100));
    showField('b2-out', fieldAt(s2.currentA, cm / 100));
  }

  slider.addEventListener('input', updateSlider);
  set('b1-name', 'Campo del ' + s1.name + ' (' + fmt.num(s1.currentA, 1) + ' A)');
  set('b2-name', 'Campo del ' + s2.name + ' (' + fmt.num(s2.currentA, 1) + ' A)');
  updateSlider();

  /* ---------- Gráfica (escala logarítmica en ambos ejes) ----------
     Como B es proporcional a 1/r, en escala log-log se ve como una línea recta. */
  const distancesCm = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200];
  const curve = (system) => distancesCm.map((cm) => ({ x: cm, y: fieldAt(system.currentA, cm / 100) }));

  new Chart(document.getElementById('chart-field'), {
    type: 'line',
    data: {
      datasets: [
        { label: s1.name + ' (' + fmt.num(s1.currentA, 1) + ' A)', data: curve(s1), borderColor: App.colors.navy, backgroundColor: App.colors.navy, pointRadius: 3, borderWidth: 3 },
        { label: s2.name + ' (' + fmt.num(s2.currentA, 1) + ' A)', data: curve(s2), borderColor: App.colors.amber, backgroundColor: App.colors.amber, pointRadius: 3, borderWidth: 3 },
        { label: 'Límite OMS / ICNIRP (' + limits.magneticFieldUT + ' µT)', data: [{ x: 1, y: limits.magneticFieldUT }, { x: 200, y: limits.magneticFieldUT }], borderColor: App.colors.red, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }
      ]
    },
    options: {
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { type: 'logarithmic', min: 1, max: 200, title: { display: true, text: 'Distancia al cable (cm, escala logarítmica)' }, ticks: { callback: (value) => ([1, 2, 5, 10, 20, 50, 100, 200].includes(value) ? value + ' cm' : '') } },
        y: { type: 'logarithmic', title: { display: true, text: 'Campo magnético (µT, escala logarítmica)' }, ticks: { callback: (value) => ([1, 10, 100, 1000].includes(value) || value === 200 ? fmt.num(value) + ' µT' : '') } }
      },
      plugins: { tooltip: { callbacks: {
        title: (items) => fmt.num(items[0].parsed.x) + ' cm',
        label: (ctx) => ctx.dataset.label + ': ' + fmt.num(ctx.parsed.y, 1) + ' µT'
      } } }
    }
  });
})();
