╔══════════════════════════════════════════════════════╗
║   AGENTE DE FICHAS BIBLIOGRÁFICAS v6                 ║
║   Erandi Carrasco Alcantara · UDEMEX 2026            ║
║   OpenAlex + Crossref · Sin scraping · Sin login     ║
╚══════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTALACIÓN DESDE CERO — PASO A PASO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1 — Instala Node.js
─────────────────────────
Descarga desde: https://nodejs.org
Elige la versión LTS (botón verde grande).
Ejecuta el instalador y acepta todo.
Cuando termine, CIERRA y vuelve a abrir la terminal.

Verifica que quedó instalado:
  node --version
Debe mostrar: v20.x.x o superior


PASO 2 — Coloca los archivos
──────────────────────────────
Copia la carpeta fichas_v6 a tu escritorio.
Debe contener:
  agente.js
  package.json
  README.txt  (este archivo)


PASO 3 — Abre la terminal en la carpeta
─────────────────────────────────────────
1. Abre la carpeta fichas_v6 en el Explorador de archivos
2. Haz clic en la barra de direcciones
3. Escribe:  cmd
4. Presiona Enter

Se abre una ventana negra ya dentro de la carpeta.


PASO 4 — Instala las dependencias
───────────────────────────────────
En la terminal escribe:
  npm install

Espera a que termine (30-60 segundos).
Debe aparecer: added X packages


PASO 5 — Configura tu clave de Anthropic
──────────────────────────────────────────
Obtén tu clave en: https://console.anthropic.com
  → API Keys → Create Key → ponle nombre → copia la clave

En la terminal escribe (en la MISMA ventana donde correrás el agente):

  Windows cmd:
    set ANTHROPIC_API_KEY=sk-ant-TU_CLAVE_AQUI

  Windows PowerShell:
    $env:ANTHROPIC_API_KEY="sk-ant-TU_CLAVE_AQUI"

IMPORTANTE: Esta clave solo dura mientras la terminal está abierta.
Si cierras y abres una terminal nueva, debes repetir este paso.


PASO 6 — Ejecuta el agente
────────────────────────────
  node agente.js

El agente te preguntará:
  1. ¿Qué dimensión? → escribe D1, D2, D3 o D4
  2. ¿Cuántas fichas? → escribe 3
  3. Término de búsqueda → presiona Enter para usar el sugerido

En 30-60 segundos genera las fichas desde OpenAlex y Crossref.
NO necesita abrir el navegador. Todo va por internet directo.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÓNDE SE GUARDAN LAS FICHAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se crean automáticamente dentro de la carpeta fichas_v6:

  fichas_v6\
    fichas_generadas\
      D1\
        fichas_D1_2025-04-19.json   ← datos estructurados
        fichas_D1_2025-04-19.txt    ← abre este en Word ✓
      D2\
        fichas_D2_2025-04-19.txt    ← abre este en Word ✓

El archivo .txt tiene el formato completo listo para pegar en Word.
El archivo .json acumula todas las sesiones del mismo día.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CÓMO VERIFICAR LAS FICHAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Todas las fichas vienen de OpenAlex o Crossref, que son bases
de datos con 250 millones de artículos verificados con DOI.

Para confirmar una ficha:
  1. Copia el DOI que aparece en la ficha
  2. Abre: https://doi.org/EL_DOI
  3. Te lleva al artículo original
  4. Verifica título y autores

Si no hay DOI:
  1. Copia el título exacto
  2. Busca en Google Scholar: scholar.google.com
  3. Debe aparecer el artículo


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRATEGIA DE USO PARA EL ESTADO DEL ARTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para completar 15-20 fichas por dimensión:

Sesión 1: D2 con término sugerido → 3 fichas
Sesión 2: D2 con término: "AI transparency content authorship" → 3 fichas
Sesión 3: D1 con término sugerido → 3 fichas
Sesión 4: D3 con término sugerido → 3 fichas
Sesión 5: D4 con término sugerido → 3 fichas
...y así hasta completar el corpus

Las fichas del mismo día en la misma dimensión se acumulan
automáticamente en el mismo archivo .txt y .json.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOLUCIÓN DE PROBLEMAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"node no se reconoce"
→ Node.js no está instalado o la terminal no se reinició.
  Reinstala Node.js y abre una terminal nueva.

"npm no se reconoce"
→ Mismo problema. Reinstala Node.js.

"Falta la clave de Anthropic"
→ Ejecuta:  set ANTHROPIC_API_KEY=sk-ant-TU_CLAVE
  en la misma terminal donde corres node agente.js

"Sin resultados. Intenta con términos más simples"
→ Usa términos en inglés, más cortos.
  Ejemplo: en vez de "gobernanza inteligencia artificial educacion superior mexico"
  usa: "AI governance higher education"

"JSON invalido"
→ Corre de nuevo con 2 fichas en lugar de 3.
