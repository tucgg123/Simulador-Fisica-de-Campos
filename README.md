# Simulador de un sistema fotovoltaico distribuido – Barrio Galán

Aplicación web del informe de **Física de Campos** sobre la instalación de paneles solares en la zona comercial del Barrio Galán, Barranquilla. Calcula en cuántos meses se recupera la inversión, compara los locales analizados, aplica las leyes de la física de campos a los sistemas propuestos y muestra el pronóstico del clima con la energía que generaría cada sistema.

**Autores:** Araujo, Ovalle, Romero y Pinto · 2026

## Páginas

| Página | Qué hace |
| ------ | -------- |
| `index.html` | Simulador de recuperación de la inversión (Sistema 1, Sistema 2 o personalizado) |
| `locales.html` | Consumo, techo, generación, presupuesto y retorno de los 5 locales |
| `fisica.html` | Ley de Watt, ley de Ampère, campo eléctrico, efecto Joule y verificación de límites OMS / ICNIRP |
| `clima.html` | Pronóstico de 5 días en vivo (Open-Meteo) y energía estimada según el sol de cada día |
| `modelos.html` | Modelos 3D de los locales en Tinkercad |

## Fórmulas

| Cálculo | Fórmula |
| ------- | ------- |
| Generación mensual | `(450 W × N × 6 h × 30 días) / 1000` |
| Carga sobre el techo | `(N × 30 kg) / (N × 2 m²) = 15 kg/m²`, debe ser `≤ capacidad / 2` |
| Retorno de la inversión | `Presupuesto / ((Generado − Consumo) × tarifa)` |
| Corriente | `I = P / V` |
| Campo magnético | `B = μ₀ · I / (2π · r)` |
| Campo eléctrico | `E = V / d` |
| Pérdidas por efecto Joule | `P = I² · R` |
| Horas de sol pico | `radiación diaria (MJ/m²) / 3,6` |

## Estructura del proyecto

```
├── index.html, locales.html, fisica.html, clima.html, modelos.html
├── assets/
│   ├── css/styles.css             # Estilos de todo el sitio
│   ├── img/favicon.svg
│   ├── js/
│   │   ├── data/project.js        # DATOS del informe (precios, locales, techos…)
│   │   ├── core/solar.js          # CÁLCULOS: funciones puras, sin acceso a la página
│   │   ├── common.js              # Utilidades compartidas (formato, gráficas)
│   │   └── pages/                 # Lógica de cada página
│   │       ├── simulator.js
│   │       ├── locales.js
│   │       ├── physics.js
│   │       ├── weather.js
│   │       └── models.js
│   └── vendor/chartjs/            # Chart.js 4.4.0 (licencia MIT)
├── tests/solar.test.js            # Pruebas automáticas de los cálculos
├── package.json
├── .editorconfig
└── .gitignore
```

El código está separado en tres capas:

1. **Datos** (`data/project.js`): todos los valores del informe en un solo lugar. Si cambia un precio o un consumo, se edita aquí y el sitio entero se actualiza.
2. **Cálculos** (`core/solar.js`): funciones puras que reciben números y devuelven números. No tocan la página, así que se pueden probar solas.
3. **Interfaz** (`pages/*.js`): leen el formulario, llaman a los cálculos y muestran los resultados.

## Pruebas

Las pruebas comprueban que el código reproduce los resultados del informe (generación, presupuestos, retorno, corriente, campos y pérdidas). Requieren [Node.js](https://nodejs.org) 18 o superior; no hay que instalar nada más.

```bash
npm test
```

## Cómo probar la página

- **En línea:** abre el sitio publicado en GitHub Pages.
- **En tu computador:** abre la carpeta con la extensión Live Server de VS Code, o ejecuta `python3 -m http.server` y entra a `http://localhost:8000`.

## Créditos

- Gráficas: [Chart.js](https://www.chartjs.org) (MIT).
- Pronóstico del clima: [Open-Meteo](https://open-meteo.com) (CC BY 4.0).
- Modelos 3D: [Tinkercad](https://www.tinkercad.com).

## Grupo ABP - *Fisica de campos - 2026-1*
- Santiago Araujo
- Andres Ovalle
- Jose Pinto
- Santiago Romero

