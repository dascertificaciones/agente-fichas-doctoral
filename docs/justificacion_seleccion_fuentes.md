# Justificación del procedimiento de búsqueda y selección de fuentes: la herramienta Fichas UDEMEX Doctorado v11

**Proyecto:** Sistema gráfico de etiquetado del nivel de intervención de IA en contenidos educativos
**Estudiante:** Erandi Carrasco Alcántara · UDX112510016 · Seminario de Tesis Doctoral II
**Asesor:** Dr. Luciano Martínez Balbuena
**Propósito de este documento:** responder a las observaciones del Avance 1 (retroalimentación del asesor, comentarios en el PDF y sesión 4) describiendo con precisión la herramienta con la que se construyó el corpus del estado del arte, el procedimiento que ejecuta y las evidencias que deja, de modo que la búsqueda sea reconstruible por un revisor.

---

## 1. Qué observaciones responde este documento

La retroalimentación del Avance 1 señaló tres problemas que este documento atiende directamente:

| Observación del asesor | Dónde aparece | Cómo se responde aquí |
|---|---|---|
| La declaración de IA debe nombrar cada herramienta; «asistentes conversacionales» no permite reconstruir el proceso. Conviene conservar una bitácora con prompts, resultados aceptados o descartados, verificaciones y modificaciones. | Retroalimentación, p. 1; comentario a la p. 2 del Avance | §2 nombra la herramienta, su versión, el modelo de lenguaje, las bases consultadas y los *prompts* de sistema literales. §5 presenta la bitácora que el agente genera. |
| La búsqueda no es reproducible: mezcla bases, editoriales y repositorios; las ecuaciones son demasiado amplias; no registra sintaxis por base, fechas, campos, conteos, duplicados, cribado ni exclusiones. | Rúbrica, criterio «Estrategia de búsqueda y selección» (1.60/2.0); comentario al Cuadro 12 y al Anexo C | §3 distingue la naturaleza de cada base; §4 documenta ecuación literal, campos, filtros, tamaño de página, paginación, regla de deduplicación, ordenamiento y corte. §6 reconoce lo que el agente aún no registra. |
| Debe distinguirse evidencia directa (etiquetado de IA) de evidencia analógica (etiquetado alimentario) y la matriz debe ampliarse a quince fuentes con los campos exigidos. | Retroalimentación §3 y §5; comentario a la p. 16 | §7 explica cómo el corpus del agente (41 fichas en cuatro dimensiones) se relaciona con la matriz del artículo y qué ajustes del agente se derivan para el Avance 2. |

La sesión 4 fijó además el criterio transversal: «antes de ampliar el borrador, hay que cerrar los eslabones pendientes y mostrar la evidencia que justifica cada decisión», y exige trazabilidad entendida como «evidencia de la ejecución y documentación adecuada de la búsqueda: bases, cadenas, filtros, fechas, conteos, exclusiones y colección final». Este documento está organizado para que cada uno de esos elementos sea localizable.

---

## 2. Identificación precisa de la herramienta

**Nombre:** Fichas UDEMEX Doctorado, versión 11 (repositorio `agente-fichas-doctoral`).
**Autoría:** desarrollado por el estudiante para este proyecto doctoral; el código fuente es propio y está versionado en Git, de modo que cada cambio en el procedimiento de búsqueda queda fechado y es auditable.
**Lenguaje y entorno:** Node.js 18 o superior. Tiene dos interfaces que comparten la misma lógica de búsqueda: una de línea de comandos (`agente.js`) y una interfaz web local (`server.js` + `public/index.html`) que muestra el corpus, las fuentes rechazadas y el progreso por dimensión.
**Modelo de lenguaje empleado:** Claude Sonnet 4 (identificador de API `claude-sonnet-4-20250514`, Anthropic), invocado mediante la API de mensajes. Su función está acotada: no busca ni decide; recibe metadatos reales recuperados de las bases y redacta la ficha estructurada. Las reglas que se le imponen se transcriben en §4.4.
**Bases bibliográficas consultadas (todas abiertas, sin inicio de sesión ni *scraping*):**

| Base | Naturaleza (según la distinción pedida por el asesor) | Uso en el agente |
|---|---|---|
| DOAJ (Directory of Open Access Journals) | Directorio de revistas arbitradas de acceso abierto | Primera consulta para artículos; garantiza texto completo disponible |
| OpenAlex | Índice bibliográfico abierto (sucesor de Microsoft Academic Graph) | Artículos y tesis (`type:dissertation`); verificación de DOI, conteo de citas y estado de acceso abierto |
| Crossref | Agencia de registro de DOI; metadatos depositados por las editoriales | Artículos de revista; verificación de DOI de respaldo cuando OpenAlex no lo localiza |
| Semantic Scholar | Grafo académico con resúmenes e identificadores externos | Artículos y tesis; aporta conteo de citas y PDF de acceso abierto cuando existe |

Esta distinción corrige el Cuadro 12 del Avance 1, donde se enlistaron Scopus, Springer Nature, Elsevier, MDPI, PLoS y PubMed Central como «repositorios». Springer, Elsevier, MDPI y PLoS son las editoriales de los artículos recuperados, no las bases donde se ejecutó la búsqueda; en el Avance 2 deben reportarse como procedencia editorial de los resultados y no como fuentes de consulta.

**Otras herramientas de IA usadas en el proceso y que deben declararse por nombre:**
- Claude Code (Anthropic) como asistente de programación durante el desarrollo del agente; los mensajes de confirmación del repositorio registran esa coautoría en el código.
- Los asistentes conversacionales empleados para contrastar la redacción del Avance 1 deben nombrarse individualmente en la declaración (por ejemplo, «Claude, versión web» o el producto que corresponda); este documento no puede identificarlos por el estudiante.

### 2.1 Evolución de las versiones: cómo se llegó a la versión 11

El agente no se diseñó de una vez; se calibró a lo largo de varias versiones en función de los problemas que aparecían al usarlo. La reconstrucción siguiente se apoya en lo que queda documentado en el repositorio (el README conserva la versión 6, el encabezado del código describe los cambios de la 11 y el historial de Git fecha las modificaciones posteriores). Las versiones intermedias no están en el repositorio y deben completarse con los registros propios de el estudiante.

| Versión | Qué hacía | Problema que motivó el cambio siguiente |
|---|---|---|
| v6 | Consultaba OpenAlex y Crossref con un término sugerido por dimensión; generaba 3 fichas por sesión en archivos `.txt` y `.json` por día; verificación por DOI; «sin *scraping*, sin inicio de sesión» como principio de diseño | Cada sesión repetía los mismos primeros resultados y el estudiante volvía a ver fuentes ya evaluadas; no había memoria entre sesiones |
| v7 a v10 (intermedias) | [Completar con registros propios: por ejemplo, incorporación de Semantic Scholar como tercera base, mejoras al formato de ficha, manejo de errores de JSON] | — |
| v11 (línea base del repositorio, 26/10/2026) | Paginación automática (tres páginas por ecuación); rotación de seis ecuaciones por dimensión; lista de rechazadas permanentes; modo manual para tesis de TESIUNAM, BUAP y UAEM; Semantic Scholar como tercera base; ordenamiento por citas y corte en 20 | El asesor pidió mostrar el corpus y las decisiones; la terminal no era un medio adecuado |
| v11 + interfaz web (26/10/2026) | Servidor local con panel de progreso por dimensión, corpus aprobado con decisiones, lista de rechazadas y búsqueda en tiempo real | Muchos candidatos eran de pago o sin texto completo accesible |
| v11 + DOAJ como cuarta base y luego como primera (26/10/2026) | Se añadió DOAJ y se colocó al inicio del orden de consulta para que, en caso de duplicado entre bases, prevalezca la versión de acceso abierto | La rúbrica exige justificar cada inclusión y la ficha no traía esa justificación |
| v11 + justificación de inclusión y resumen preliminar (26/10/2026) | Dos campos obligatorios nuevos en cada ficha; la interfaz muestra los 20 candidatos en lugar de 8; `max_tokens` elevado a 8000 para que el modelo complete los campos largos | Versión vigente |

Este recorrido es relevante para la justificación porque muestra que las reglas de filtrado no son arbitrarias: cada una responde a un problema observado en el uso y queda fechada.

---

## 3. Lógica general del procedimiento

El agente ejecuta un ciclo de cinco etapas por sesión. Las cuatro primeras son automáticas y la quinta es siempre humana.

```
 (1) Recuperación        (2) Depuración          (3) Redacción de fichas       (4) Verificación         (5) Decisión humana
 DOAJ → OpenAlex →       Deduplicación por        Claude Sonnet 4 recibe        DOI consultado en        A = aprobar al corpus
 Crossref → Semantic     DOI y por título;        los 20 candidatos con         OpenAlex; si no existe   R = rechazar (bloqueo
 Scholar, con la         exclusión de fuentes     título, autores, revista,     ahí, en Crossref.        permanente)
 ecuación y página       ya aprobadas o ya        año, citas, DOI y resumen;    Devuelve estado, título  S = saltar
 que toca a la sesión    rechazadas; orden por    selecciona N y redacta        real, citas y acceso     + comentario + fecha
                         citas; corte en 20       campos fijos                  abierto                  y hora
```

Tres propiedades de diseño responden a las exigencias de trazabilidad de la sesión 4:

1. **Ninguna fuente entra al corpus sin decisión humana.** El modelo redacta; el estudiante aprueba o rechaza cada ficha con un comentario y el agente registra fecha y hora. El corpus es, por construcción, la lista de decisiones tomadas.
2. **Ninguna fuente se evalúa dos veces.** Las aprobadas y las rechazadas se excluyen de las búsquedas siguientes por DOI (o por los primeros 60 caracteres del título cuando no hay DOI). Así el conteo de rechazadas es un registro real de exclusiones y no se infla por repetición.
3. **La búsqueda avanza de forma determinista entre sesiones.** El archivo `sesiones.json` guarda, por dimensión y tipo documental, qué ecuación y qué página se consultó por última vez. Cada ecuación se recorre tres páginas antes de rotar a la siguiente. Una revisor que conozca el índice de ecuación y la página puede repetir la consulta.

---

## 4. Especificación reproducible de la búsqueda

### 4.1 Dimensiones y ecuaciones literales

El corpus del estado del arte se organiza en las cuatro dimensiones definidas en Seminario de Tesis I. Para cada una, el agente tiene seis ecuaciones en inglés para artículos y cuatro en español para tesis. Se transcriben tal como están codificadas; el agente las envía literalmente a cada base.

**D1 · Gobernanza y ética de la IA en educación**
- Artículos: `AI governance higher education ethics transparency` · `artificial intelligence academic integrity university policy` · `responsible AI education institutional governance` · `AI ethics higher education accountability` · `algorithmic accountability academic institutions policy` · `generative AI governance university Mexico`
- Tesis: `gobernanza inteligencia artificial educacion superior` · `etica inteligencia artificial universidad Mexico` · `uso responsable IA educacion superior posgrado` · `politicas institucionales inteligencia artificial universidad`

**D2 · Transparencia y etiquetado de IA en contenidos**
- Artículos: `AI disclosure labeling academic content transparency` · `artificial intelligence transparency labeling education` · `algorithmic transparency content authorship higher education` · `AI generated content labeling standards` · `machine learning content disclosure academic writing` · `generative AI authorship transparency university`
- Tesis: `transparencia inteligencia artificial contenidos educativos` · `etiquetado IA materiales educativos universidad` · `declaracion autoria inteligencia artificial academia Mexico` · `sistema etiquetado contenidos generados IA educacion`

**D3 · Diseño participativo en tecnología educativa**
- Artículos: `participatory design educational technology usability` · `co-design learning materials higher education` · `heuristic evaluation usability educational materials Nielsen` · `user centered design learning tools students` · `participatory action research educational technology` · `co-creation digital learning resources university`
- Tesis: `diseno participativo tecnologia educativa universidad` · `co-diseno materiales educativos digitales posgrado` · `usabilidad recursos educativos digitales Mexico` · `evaluacion heuristica materiales aprendizaje`

**D4 · Perspectiva crítica de la IA en la educación latinoamericana**
- Artículos: `critical educational technology AI Latin America` · `critical digital literacy higher education AI` · `AI education inequality critical perspective Mexico` · `technology education power critical pedagogy` · `digital colonialism education artificial intelligence` · `critical algorithm studies education equity`
- Tesis: `tecnologia educativa critica America Latina inteligencia artificial` · `pedagogia critica inteligencia artificial Mexico universidad` · `alfabetizacion digital critica educacion superior` · `desigualdad tecnologica educacion superior Mexico`

Las ecuaciones son cadenas de términos en lenguaje natural, no expresiones booleanas: las cuatro bases operan con motores de relevancia que no requieren operadores. Esto responde a la observación de que la fórmula booleana del Anexo C arroja más de 14 mil registros en Scopus: el agente no la usa; trabaja con cadenas cortas y recupera únicamente las primeras páginas ordenadas por relevancia.

### 4.2 Sintaxis, campos y filtros por base

| Base | Punto de acceso | Campo consultado | Filtros fijos | Orden | Registros por página |
|---|---|---|---|---|---|
| DOAJ | `/api/v3/search/articles/{ecuación}` | Búsqueda general del registro (título, resumen, palabras clave) | Ninguno (todo DOAJ es acceso abierto y arbitrado) | Relevancia de DOAJ | 8 |
| OpenAlex (artículos) | `/works?search=` | Título, resumen y texto completo indexado | `publication_year:2018-2025`, `type:article` | `relevance_score:desc` | 10 |
| OpenAlex (tesis) | `/works?search=` | Ídem | `publication_year:2018-2025`, `type:dissertation` | `relevance_score:desc` | 10 |
| Crossref | `/works?query=` | Metadatos bibliográficos depositados | `from-pub-date:2018`, `type:journal-article` | `relevance desc` | 8 |
| Semantic Scholar | `/graph/v1/paper/search?query=` | Título y resumen | Ninguno (para tesis se añade `thesis dissertation` a la ecuación y se filtra por tipo o por la palabra «thesis/tesis/dissert» en el título) | Relevancia de S2 | 8 |

Campos recuperados de cada registro: título, hasta tres autores, revista o institución, año, resumen (truncado a 500 caracteres), DOI, conteo de citas y base de origen. Entre consultas se espera 0.7 s para respetar los límites de uso de cada servicio; las peticiones se identifican con el correo institucional de el estudiante, como piden OpenAlex y Crossref.

### 4.3 Paginación, deduplicación, orden y corte

- **Paginación.** Cada sesión consulta una sola ecuación y una sola página por tipo documental. Se recorren las páginas 1, 2 y 3; al agotar la tercera, el agente pasa a la siguiente ecuación de la lista y vuelve a la página 1. El estado queda persistido en `sesiones.json`.
- **Deduplicación entre bases.** Dos registros se consideran el mismo si comparten DOI o si coinciden los primeros 50 caracteres del título en minúsculas. Se conserva el primero recuperado (el orden de consulta es DOAJ, OpenAlex, Crossref, Semantic Scholar, por lo que prevalece la versión de acceso abierto cuando existe).
- **Exclusión de ya revisadas.** Se descartan los registros cuyo DOI figura en el corpus aprobado o en `rechazados.json`, o cuyo título (60 caracteres) figura en la lista de rechazadas sin DOI. El agente informa cuántos registros omitió por esta regla.
- **Orden y corte.** Los candidatos restantes se ordenan por número de citas descendente y se conservan los veinte primeros. Ese es el conjunto que ve el modelo de lenguaje.

Alcance de una sesión completa (artículos + tesis): hasta 34 registros de artículos (8 + 10 + 8 + 8) y hasta 18 de tesis (10 + 8) antes de deduplicar, lo que da una cota superior de 52 registros por sesión y un conjunto presentado de 20.

### 4.4 Redacción de fichas por el modelo de lenguaje

El modelo recibe la dimensión, el número de fichas solicitado (2 a 5) y la lista numerada de los veinte candidatos con título, autores, fuente, año, citas, DOI, base y resumen. La instrucción de sistema es la siguiente (transcripción literal de la versión 11):

> Eres asistente de investigacion doctoral. Datos REALES de OpenAlex/Crossref/SemanticScholar/DOAJ. PROYECTO: Sistema grafico etiquetado IA en contenidos educativos. Erandi Carrasco UDEMEX 2026. REGLAS: 1) Datos exactos del JSON 2) Hallazgos del resumen, si no hay: "Sin resumen - verificar en fuente" 3) Sin URLs propias 4) Prioriza 2020-2025 y mayor citas 5) Max 60 palabras/campo excepto resumen_preliminar 6) SOLO JSON sin markdown. CAMPOS NUEVOS OBLIGATORIOS: justificacion_inclusion (por que esta fuente debe incluirse en el estado del arte, relacion directa con el tema, 2-3 oraciones); resumen_preliminar (parrafo de 4-5 oraciones listo para insertar en la seccion de estado del arte, tercera persona academica, citando al autor).

Y la instrucción de usuario: «Dimension: {D} - {etiqueta}. Fichas a generar: {N}. FUENTES REALES: {lista}. Selecciona las {N} MAS RELEVANTES para el proyecto.»

Campos que produce cada ficha: folio, tipo, referencia APA, DOI, dimensión, revista o repositorio con la base de origen, país o contexto, año, paradigma, metodología, objeto de estudio, tres hallazgos, aportación al etiquetado de IA, brecha que no resuelve, pertinencia para el marco teórico, nombre de archivo, justificación de inclusión y resumen preliminar. Estos campos coinciden en buena parte con los que la actividad exige para la matriz (enfoque, diseño, muestra, técnicas, instrumentos, variables, hallazgos); los que faltan se señalan en §6.

Las reglas 1, 2 y 3 son las salvaguardas contra la invención de datos: el modelo solo puede usar los metadatos entregados, debe marcar «verificar en fuente» cuando el resumen no existe y no puede generar URL. Las fichas del corpus que contienen la marca «Verificar en fuente» son evidencia de que esa regla operó.

### 4.5 Verificación de DOI

Para cada ficha el agente consulta `https://api.openalex.org/works/https://doi.org/{DOI}`; si responde 404, consulta `https://api.crossref.org/works/{DOI}`. El resultado se guarda en la ficha con cuatro valores: estado (VERIFICADA, NO ENCONTRADA, SIN DOI, ERROR), título real según la base, número de citas y si hay versión de acceso abierto con su URL. En la revisión en pantalla, el estado se muestra en color y se ofrece abrir la fuente en el navegador antes de decidir.

### 4.6 Modo manual para tesis de repositorios nacionales

Las tesis mexicanas de TESIUNAM, BUAP o UAEM no están indexadas con DOI en las bases anteriores. El agente tiene un modo manual en el que el estudiante pega la URL o el texto del registro del repositorio; el modelo redacta la ficha con una instrucción más restrictiva («solo información del texto, sin inventar, sin URL que no esté en el texto») y la ficha queda marcada con origen «Manual» y estado «SIN DOI – fuente manual». En el corpus hay cuatro tesis incorporadas por esta vía (UNAM, BUAP ×2 y TESIUNAM).

### 4.7 Discriminación automática: lo que el agente descarta antes de que el estudiante decida

Las 19 fuentes rechazadas con DOI (23 entradas por título) son solo la última etapa de un embudo. La mayor parte de la discriminación la hace el agente por defecto, y fue calibrada precisamente para ahorrar tiempo de revisión. Conviene distinguir con honestidad tres niveles de criterio, porque el asesor verificará cuál está en el código y cuál se aplicó en la revisión:

**Nivel 1. Filtros codificados (se aplican siempre, sin intervención).**

| Filtro | Cómo está implementado | Efecto |
|---|---|---|
| Ventana temporal | OpenAlex: `publication_year:2018-2025`; Crossref: `from-pub-date:2018`; la instrucción al modelo prioriza 2020–2025 | Nada anterior a 2018 llega a la revisión; lo de 2018–2019 llega solo si tiene muchas citas |
| Tipo documental | OpenAlex `type:article` o `type:dissertation`; Crossref `type:journal-article` | Quedan fuera capítulos, actas sin DOI de revista, preprints, notas de prensa y blogs (criterio E3 del Avance 1) |
| Acceso abierto preferente | DOAJ se consulta primero; en los duplicados entre bases prevalece la versión DOAJ; OpenAlex reporta si existe versión de acceso abierto y su URL | De las 41 aprobadas, 34 tienen versión de acceso abierto |
| Identificador verificable | Deduplicación por DOI; verificación en OpenAlex y Crossref; las fuentes sin DOI se marcan «SIN DOI» y solo pueden entrar por modo manual | Toda fuente automática del corpus tiene DOI; las 4 sin DOI son tesis mexicanas incorporadas a mano |
| Ya revisadas | Exclusión por DOI o título de todo lo aprobado o rechazado | Ninguna fuente se vuelve a ver |
| Corte por relevancia y citas | Solo las tres primeras páginas de cada ecuación; orden por citas; 20 candidatos por sesión | Miles de registros por ecuación nunca llegan a la revisión |
| Selección del modelo | De los 20 candidatos, el modelo redacta solo las N más relevantes (2 a 5; por defecto 3) | Entre 15 y 18 candidatos por sesión se descartan sin ficha |

**Nivel 2. Criterios de calibración aplicados en la revisión humana (no están codificados como exclusión dura).** El estudiante adoptó tres reglas de descarte rápido: fuente sin DOI, fuente sin versión descargable (de pago), y fuente con más de tres años desde la publicación salvo que fuese referencia obligada del campo. Estas reglas explican parte de las 23 rechazadas y de las saltadas. Debe declararse que operaron como criterios de revisor y no como filtros del programa, porque el corpus mismo lo demuestra: contiene 4 tesis sin DOI (modo manual), 7 fuentes sin versión de acceso abierto y 11 fuentes de 2018–2021. Si en el Avance 2 se quiere afirmar que esos tres criterios son filtros automáticos, deben codificarse en la versión 12 (ventana `2023-2026`, filtro `has_doi:true` y `is_oa:true` en OpenAlex) y rehacer la búsqueda; de lo contrario, se reportan como «criterios de preferencia» aplicados en el cribado.

**Nivel 3. Decisión final con comentario.** Aprobar, rechazar de forma permanente o saltar.

**Embudo de una sesión típica (cotas fijadas por el código).**

| Etapa | Registros | Quién descarta |
|---|---|---|
| Hits totales de la ecuación en las cuatro bases | Miles (no se visitan) | Corte de paginación |
| Recuperados en la página de la sesión | Hasta 52 (34 artículos + 18 tesis) | — |
| Tras deduplicar y excluir ya revisadas | Variable; se informa en pantalla | Agente |
| Presentados al modelo | 20 | Agente (orden por citas) |
| Fichas redactadas | 2 a 5 (por defecto 3) | Modelo |
| Aprobadas | 0 a 3 | Estudiante |

**Embudo acumulado del corpus actual (estimación declarada).** El agente no persiste el número de sesiones ni los conteos por sesión, así que la cifra acumulada debe presentarse como estimación con supuestos explícitos: 64 decisiones registradas (41 aprobadas + 23 rechazadas), a razón de 3 fichas por sesión, implican unas 21 sesiones; a 20 candidatos por sesión, unos 420 candidatos fueron presentados al modelo, de los cuales unos 356 se descartaron sin ficha; y hasta unos 1,100 registros brutos se recuperaron de las bases antes de deduplicar. Frente a ese volumen, las 23 rechazadas a mano representan menos del 6 % de lo que se descartó: la discriminación fue, en su gran mayoría, automática y por reglas declaradas. Para sustituir la estimación por cifras reales, el repositorio incluye el script `scripts/conteos_por_base.mjs`, que consulta el total de registros por ecuación y por base con los mismos filtros del agente; debe correrse desde una conexión que alcance las cuatro bases y su salida se anexa como «registros recuperados por base» en el reporte PRISMA-S. (Desde el entorno donde se redactó este documento esas bases no eran accesibles, por lo que no se incluyen los totales.)

---

## 5. Evidencias que deja el agente (bitácora)

| Archivo | Contenido | Función probatoria |
|---|---|---|
| `corpus_estado_del_arte.json` | Las 41 fichas aprobadas con todos sus campos, el resultado de verificación del DOI, la decisión, el comentario de el estudiante y la fecha y hora | Colección final y justificación de cada inclusión |
| `corpus_estado_del_arte.txt` | La misma información en formato legible para Word, agrupada por dimensión | Anexo para el asesor |
| `rechazados.json` | DOI y título truncado de cada fuente rechazada (19 con DOI; 23 entradas por título) | Registro de exclusiones; impide que reaparezcan |
| `sesiones.json` | Índice de ecuación y página por dimensión y tipo documental | Reconstrucción del punto exacto de la búsqueda |
| Historial de Git | Fecha y contenido de cada cambio al procedimiento (por ejemplo, la incorporación de DOAJ el 26/10/2026 y de los campos de justificación e inclusión el mismo día) | Trazabilidad de las modificaciones del método |
| `docs/bitacora_corpus.md` y `.tex` | Tabla generada automáticamente con dimensión, fuente, DOI, base de origen, estado de verificación, citas, acceso abierto, metodología, comentario y fecha de cada decisión | Tabla lista para anexar al Avance 2 |
| `scripts/conteos_por_base.mjs` | Consulta el total de registros por ecuación y base con los filtros del agente | Produce la columna «registros recuperados» del reporte PRISMA-S |

Resumen cuantitativo del corpus al 27 de octubre de 2026 (generado con `scripts/generar_bitacora.py`):

| Indicador | Valor |
|---|---|
| Fichas aprobadas | 41 |
| D1 Gobernanza y ética | 11 |
| D2 Transparencia y etiquetado | 10 |
| D3 Diseño participativo | 11 |
| D4 Perspectiva crítica latinoamericana | 9 |
| Rechazadas con DOI | 19 |
| Rechazadas registradas por título (incluye sin DOI) | 23 |
| DOI verificado en OpenAlex o Crossref | 35 |
| DOI no localizado | 2 |
| Sin DOI (tesis de repositorio, modo manual) | 4 |
| Con versión de acceso abierto | 34 |
| Tesis o tesinas | 7 |
| Publicadas en 2022–2026 | 28 |
| Sesiones de decisión | 19 y 22 de abril de 2026 |

Dos de las cinco fuentes de la matriz inicial del artículo provienen de este corpus: Seeger et al. (2026), folio D2-A02, recuperada por Crossref con DOI verificado, y Axelsson et al. (2021), folio D3-A02, recuperada por OpenAlex. Las otras tres (Reyes et al., 2019; Vargas-Meza et al., 2019a, 2019b) y Jáuregui et al. (2020) no provienen del agente: se localizaron por revisión de listas de referencias, como se declaró en §6 del Avance 1. Esta distinción debe mantenerse explícita en el Avance 2 porque corresponde a los dos estratos que pide el asesor: el agente alimentó el estrato de evidencia directa y contextual (D1–D4); el estrato analógico del etiquetado alimentario se construyó por bola de nieve.

---

## 6. Lo que el agente todavía no registra y cómo se reporta honestamente

La rúbrica exige, por recurso, «registros recuperados y duplicados eliminados, registros examinados por título y resumen, textos completos evaluados y motivos de exclusión». El agente cubre parte de ese flujo y deja huecos que deben declararse, no disimularse:

| Requisito | Estado en la versión 11 | Qué hacer en el Avance 2 |
|---|---|---|
| Ecuación literal, campos, filtros, orden | Codificados y fijos; se transcriben en §4 | Reportar tal cual |
| Fecha de cada consulta | No se guarda por consulta; solo la fecha de la decisión sobre cada ficha | Reportar las fechas de sesión (19 y 22/04/2026) y, en adelante, registrar la fecha de búsqueda en `sesiones.json` |
| Total de registros que devuelve cada base | No se guarda; el agente solo recupera las primeras páginas | Declarar que la estrategia es de muestreo por relevancia (primeras 3 páginas por ecuación) y no de exhaustividad; esto es coherente con una revisión de alcance, no con una revisión sistemática completa |
| Duplicados eliminados entre bases | Se eliminan, y el conteo se imprime en pantalla, pero no se persiste | Añadir el conteo al registro de sesión |
| Cribado por título y resumen | Lo realiza el modelo al elegir N de 20 y el estudiante al aprobar o rechazar; el motivo de rechazo se escribe en consola pero no se guarda en `rechazados.json` | Modificar el agente para persistir el comentario de rechazo; reconstruir los motivos de las 23 rechazadas actuales a partir de la lista |
| Lectura de texto completo | Fuera del agente. Las fichas se redactan a partir del resumen (máximo 500 caracteres); el asesor advierte que verificar DOI y acceso «no sustituye la lectura del texto completo» | Declarar que la ficha automática es un cribado y que los campos de diseño, muestra, instrumentos y hallazgos de la matriz final se extraen de la lectura completa |
| Evaluación de calidad o riesgo de sesgo | No la hace | Aplicar un instrumento de calidad (por ejemplo, la lista de verificación del tipo de estudio) sobre las fuentes que pasen a la matriz |
| Ventana temporal | OpenAlex está fijado a 2018–2025 y la instrucción al modelo prioriza 2020–2025; Crossref y Semantic Scholar no tienen límite superior, por eso entró Seeger (2026) | Ajustar a 2022–2026 para evidencia directa y conservar 2018–2021 solo como antecedentes, según la indicación del asesor |

Tres limitaciones adicionales de la bitácora actual deben corregirse antes de anexarla:

- Varios comentarios de decisión son insuficientes como justificación («ok», «a», «d2») o contienen URL temporales; deben reescribirse como motivo sustantivo de inclusión. Los campos nuevos de la versión 11 (justificación de inclusión y resumen preliminar) existen precisamente para eso, pero las 41 fichas se generaron antes de ese cambio y no los tienen.
- Hay folios duplicados (tres fichas con folio D1-A01, por ejemplo) porque el modelo numera desde A01 en cada sesión; el identificador fiable es el DOI. Conviene renumerar.
- Dos fichas tienen autor o año marcado «Verificar en fuente»; deben completarse o retirarse del corpus.

---

## 7. Qué revela el corpus sobre la selección y qué ajustes se derivan

**La dimensión D2 recuperó poco etiquetado y mucha explicabilidad.** Las ecuaciones de D2 contienen «transparency» y «disclosure», términos que en los índices atraen la literatura de inteligencia artificial explicable (XAI). De las diez fichas de D2, cuatro son marcos de ética o explicabilidad (Barredo Arrieta et al., 2019; Ali et al., 2023; Floridi et al., 2018; Hagendorff, 2020) y solo una, Seeger et al. (2026), estudia una etiqueta de contenido generado con IA. Eso explica por qué el Avance 1 afirmó que Seeger era «el único antecedente directo»: era el único dentro de lo que las ecuaciones podían alcanzar. El asesor demostró con cuatro referencias (Gamage et al., 2025; Wittenberg et al., 2025; Pérez-Pérez et al., 2026; Micallef y Petrovska, 2026) que la literatura directa existe. La afirmación de escasez debe retirarse y sustituirse por el hallazgo correcto: las ecuaciones de D2 no incluían el vocabulario de esa literatura.

**Ajuste de ecuaciones para el Avance 2.** Se propone un nuevo bloque D2 orientado al diseño y la evaluación de etiquetas, con los términos que usan esas cuatro referencias: `AI-generated content label design user perception` · `labeling synthetic content disclosure experiment` · `AI disclosure framework higher education writing` · `generative AI declaration assessment transparency mechanisms` · `content credentials provenance label comprehension` · `AI label trust credibility randomized`. Con ventana 2022–2026 y las cuatro bases actuales. Las referencias en arXiv (Micallef y Petrovska) entran por modo manual, ya que arXiv no está entre las bases del agente.

**Relación entre el corpus de 41 fichas y la matriz de quince fuentes.** El corpus del agente es el estado del arte general de la tesis en cuatro dimensiones; la matriz del artículo es un subconjunto temático. La regla para pasar de uno a otra debe ser explícita y distinta del criterio I3 del Avance 1 (disponibilidad del instrumento), que el asesor identificó como sesgo. Se propone: entran a la matriz las fuentes del corpus que respondan a la pregunta del artículo (qué dimensiones de la intervención humana e IA se comunican, cómo se representan y con qué criterios se evalúa su comprensión), estratificadas en directas y analógicas; la disponibilidad del instrumento se usa después, solo para elegir qué adaptar.

---

## 8. Texto propuesto para la Declaración de Uso de IA del Avance 2

> **Herramientas utilizadas.** (1) Fichas UDEMEX Doctorado v11, programa propio en Node.js que consulta DOAJ, OpenAlex, Crossref y Semantic Scholar y usa el modelo Claude Sonnet 4 (Anthropic, `claude-sonnet-4-20250514`) para redactar fichas estructuradas a partir de los metadatos recuperados. (2) Claude Code (Anthropic) como asistente de programación en el desarrollo del agente. (3) [Nombre y versión del asistente conversacional usado para contrastar la redacción].
> **Prompts y alcance.** Las instrucciones de sistema y de usuario del agente se transcriben en el Anexo [X]. Al asistente conversacional se le solicitó [describir].
> **Manejo de resultados y autoría.** Toda ficha fue aprobada o rechazada por el autor con comentario fechado; el modelo no decide la inclusión. Los campos de diseño, muestra, instrumentos y hallazgos de la matriz se extrajeron de la lectura del texto completo, no de la ficha automática.
> **Verificación de integridad.** Cada DOI se verificó contra OpenAlex o Crossref (35 de 41 verificados; 4 tesis sin DOI incorporadas desde repositorios institucionales; 2 DOI no localizados que se revisarán). La bitácora completa se anexa.
> **Distribución de la producción.** [Estimar por separado: búsqueda y fichado asistido; redacción propia].

---

## 9. Referencias de este documento

- Carrasco Alcántara, E. (2026). *Avance 1. Mapeo epistémico, estrategia de búsqueda y matriz inicial de literatura*, con comentarios del asesor. Seminario de Tesis Doctoral II, UDEMEX.
- Martínez Balbuena, L. (2026). *Retroalimentación del Avance de Proyecto 1*. Seminario de Tesis Doctoral II, UDEMEX.
- Martínez Balbuena, L. (2026, 12 de octubre). *Análisis crítico para entregar en el AP2* [presentación de la sesión 4]. UDEMEX.
- UDEMEX (2026). *Unidad 3. Concepción o diseño de la investigación*. Seminario de Tesis Doctoral II.
- Rethlefsen, M. L. et al. (2021). PRISMA-S: An extension to the PRISMA statement for reporting literature searches in systematic reviews. *Systematic Reviews*, 10(1), 39. (Citada en la sesión 4; es el estándar que fija los campos de reporte por base que este documento sigue.)
