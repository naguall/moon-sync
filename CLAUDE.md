# Moon Sync — Proyecto PWA Lunar/Solar/Astrológico

## Qué es Moon Sync
PWA de una sola página (`index.html`, ~23000 líneas) para seguimiento lunar, solar y astrológico. Incluye calendarios, brújula lunar, mapas 2D/3D, aspectos planetarios, integración con Google Calendar, diario personal y lecturas de IA.

## Reglas críticas del proyecto

### Antes de cualquier cambio
1. **Siempre leer el código relevante** antes de editar — la app es un solo archivo enorme y el contexto es vital
2. **Mostrar los prompts de IA** al usuario antes de modificarlos (son los personas en `_aiPersonas`)
3. **Preguntar antes de cambiar** la brújula/compass — el usuario ha calibrado manualmente muchos valores

### Versionado
- `APP_VERSION` en `index.html` y `CACHE_NAME` en `sw.js` **deben coincidir siempre**
- Formato: `'v382'` en index.html, `'moon-sync-v382'` en sw.js
- Incrementar en cada commit

### Git
- Push no funciona desde la VM de Cowork (proxy bloquea). Decirle al usuario que haga push desde su máquina:
  ```
  cd ~/Dropbox/SILENT\ RIVER/MOON\ TRACKER\ CLAUDE\ SPACE/moon_tracker_complete && git push
  ```

## Arquitectura

### Archivos principales
- `index.html` — TODO el código (HTML + CSS + JS, ~23000 líneas). No hay archivos separados de JS o CSS
- `sw.js` — Service Worker, solo cachea assets. `CACHE_NAME` debe coincidir con `APP_VERSION`
- `lunar-data.js` — Datos lunares opcionales (override de nuevas lunas)
- `manifest.json` — PWA manifest
- `prompts/` — Prompts de IA históricos (v1, v2-energy, v3-shadow)
- `ai-proxy/` — Proxy para llamadas a APIs de IA

### Estructura dentro de index.html (secciones importantes por línea aprox)

| Sección | Línea aprox | Descripción |
|---------|-------------|-------------|
| Manifest/meta | 1-20 | Head, título, manifest |
| CSS styles | 20-680 | Todos los estilos inline |
| Header/nav HTML | 680-720 | Botones de modo (Lunar, Solar, Gregorian, S.S.) |
| astronomy-engine | 684 | CDN script para cálculos astronómicos |
| Lunas nuevas builtin | 1846-1862 | `_newMoonDatesBuiltin` array UTC |
| Google Calendar fetch | 4334-4430 | `gcalFetchEvents()` — parsea eventos de GCal |
| AI Interpretations | 6060-6400 | `fetchAIInterpretation()`, `openInterpretationChat()`, `deleteInterpChat()` |
| Compass/Brújula | 6958-7470 | Variables, `_startCompass()`, `_renderCompass()`, mapas 2D/3D |
| Solar signs 2026 | 9027-9040 | `solarSigns2026[]` array con fechas, colores, símbolos |
| switchToSolarMode | 9724-9751 | Cambia a modo solar |
| Banner HOY | 11196-11330 | `updateCurrentDayInfoForMode()` — banner superior con eventos, HOY, aspectos |
| renderSolarCalendar | 16296-16343 | Genera grid del calendario solar |
| renderSolarInfoPanel | 16345-16629 | Panel info solar con mapa SVG (PESADO — ya optimizado v382) |
| Full moon dates | 16686-16693 | `_fullMoonDates2026[]` array UTC |
| getMoonEventForDate | 16696-16710 | Detecta si un día es luna llena o nueva |
| generateSolarWeeks | 16712+ | Genera las semanas/decanos del calendario solar |
| refreshAllLiveData | 17632 | Refresca posición sublunar |
| AI Persona Registry | ~22319 | `_aiPersonas[]` — `energy-reader` y `shadow-mirror` con `buildPrompt()` |
| APP_VERSION | ~21080 | `const APP_VERSION = 'vXXX'` |

### Librerías externas
- **astronomy-engine** v2.1.19 (CDN) — Cálculos astronómicos: `Astronomy.MakeTime()`, `.Illumination()`, `.Equator()`, `.SearchRiseSet()`, `.Horizon()`, `.EclipticGeoMoon()`
- No hay frameworks JS — todo es vanilla JavaScript

### Modos de calendario
1. **Lunar** — Semanas lunares de luna nueva a luna nueva, días 1-29
2. **Solar** — Signos zodiacales con 3 decanos de ~10 días
3. **Gregoriano** — Calendario estándar mensual
4. **Sistema Solar** — Vista del sistema solar

### Brújula lunar (sección crítica ~6958-7470)
- **Heading**: iOS usa `webkitCompassHeading`, Android usa `deviceorientationabsolute` para norte magnético real
- **Tilt**: `beta` directamente, smoothing 0.15
- **Heading smoothing**: Factor 0.2, maneja wraparound 0°/360°
- **Barra de altitud**: 0° = teléfono plano = CENTRO de la barra. Escala -90° a +90°
- **Mapa 2D**: Equirectangular con punto sublunar animado
- **Mapa 3D**: Globo ortográfico rotado hacia punto sublunar, con continentes SVG
- **NO cambiar la calibración** de la brújula sin confirmación del usuario — fue calibrada en 5+ iteraciones

### Google Calendar
- Fetch via `gcalFetchEvents()` línea ~4334
- **Bug resuelto v379**: Fechas all-day se parsean como local (no UTC) para evitar off-by-one en zonas UTC-negativas
- Eventos se guardan en `gcalEvents{}` indexados por `getDateKey(date)`

### Interpretaciones IA
- 2 personas: `energy-reader` (lecturas energéticas) y `shadow-mirror` (sombra/espejo)
- Chats guardados en localStorage con `getInterpChatKey(chatId)`
- Botones de borrar en 3 lugares: ventana inicial, vista cached del banner, y chat expandido
- `deleteInterpChat(chatId)` borra del localStorage y remueve el DOM

### Panel solar (rendimiento)
- `renderSolarInfoPanel()` es la función más pesada — genera SVG con continentes, terminator día/noche, trayectoria solar
- **Optimizado en v382**: terminator 5° bandas (antes 2°), trayectoria 30min steps (antes 10min), closest approach 30min (antes 15min)
- Se ejecuta con `setTimeout 80ms` para dejar que la grid del calendario se pinte primero

## Datos astronómicos hardcoded
- Lunas nuevas 2024-2027: `_newMoonDatesBuiltin` (línea 1846)
- Lunas llenas 2026: `_fullMoonDates2026` (línea 16686)
- Signos solares 2026: `solarSigns2026` (línea 9027) — con fechas exactas de inicio/fin
- Eventos astronómicos 2026: `astronomicalEvents2026` (línea 9046) — equinoccios y solsticios

## Preferencias del usuario
- Idioma principal: español (Costa Rica)
- Zona horaria: UTC-6 (Costa Rica)
- Ubicación default: lat 9.93, lon -84 (Costa Rica)
- El usuario prueba en Android — tener en cuenta `deviceorientationabsolute`
- Pide ver prompts de IA antes de cambiarlos
- Prefiere iteraciones pequeñas y probar en el teléfono entre cambios
