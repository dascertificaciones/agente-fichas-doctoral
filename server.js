/**
 * Servidor web — Agente de Fichas Bibliográficas
 * Erandi Carrasco Alcantara · UDEMEX 2026
 */

import { createServer } from "http";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { extname, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const CORPUS_JSON    = join(__dirname, "corpus_estado_del_arte.json");
const RECHAZADOS_JSON = join(__dirname, "rechazados.json");
const SESIONES_JSON  = join(__dirname, "sesiones.json");

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const EMAIL   = "erandi.carrasco@udemex.edu.mx";
const MODELO  = "claude-sonnet-4-20250514";

const DIMS = {
  D1: { label: "Gobernanza y ética de la IA en educación",
    queries: ["AI governance higher education ethics transparency","artificial intelligence academic integrity university policy","responsible AI education institutional governance","AI ethics higher education accountability","algorithmic accountability academic institutions policy","generative AI governance university Mexico"],
    tesis:   ["gobernanza inteligencia artificial educacion superior","etica inteligencia artificial universidad Mexico","uso responsable IA educacion superior posgrado","politicas institucionales inteligencia artificial universidad"] },
  D2: { label: "Transparencia y etiquetado de IA en contenidos",
    queries: ["AI disclosure labeling academic content transparency","artificial intelligence transparency labeling education","algorithmic transparency content authorship higher education","AI generated content labeling standards","machine learning content disclosure academic writing","generative AI authorship transparency university"],
    tesis:   ["transparencia inteligencia artificial contenidos educativos","etiquetado IA materiales educativos universidad","declaracion autoria inteligencia artificial academia Mexico","sistema etiquetado contenidos generados IA educacion"] },
  D3: { label: "Diseño participativo en tecnología educativa",
    queries: ["participatory design educational technology usability","co-design learning materials higher education","heuristic evaluation usability educational materials Nielsen","user centered design learning tools students","participatory action research educational technology","co-creation digital learning resources university"],
    tesis:   ["diseno participativo tecnologia educativa universidad","co-diseno materiales educativos digitales posgrado","usabilidad recursos educativos digitales Mexico","evaluacion heuristica materiales aprendizaje"] },
  D4: { label: "Perspectiva crítica IA educación latinoamericana",
    queries: ["critical educational technology AI Latin America","critical digital literacy higher education AI","AI education inequality critical perspective Mexico","technology education power critical pedagogy","digital colonialism education artificial intelligence","critical algorithm studies education equity"],
    tesis:   ["tecnologia educativa critica America Latina inteligencia artificial","pedagogia critica inteligencia artificial Mexico universidad","alfabetizacion digital critica educacion superior","desigualdad tecnologica educacion superior Mexico"] },
};

const SYS_AUTO = `Eres asistente de investigacion doctoral. Datos REALES de OpenAlex/Crossref/SemanticScholar.
PROYECTO: Sistema grafico etiquetado IA en contenidos educativos. Erandi Carrasco UDEMEX 2026.
REGLAS: 1)Datos exactos del JSON 2)Hallazgos del resumen, si no hay: "Sin resumen - verificar en fuente" 3)Sin URLs propias 4)Prioriza 2020-2025 y mayor citas 5)Max 60 palabras/campo 6)SOLO JSON sin markdown
JSON:{"fichas":[{"folio":"D1-A01","tipo":"Articulo cientifico","referencia_apa":"Apellido N. (2023). Titulo. Revista, vol(num), pp.","doi":"10.xxx/xxx","dimension":"D1","revista_repositorio":"Nombre revista - API origen","pais_contexto":"Internacional","anio":"2023","paradigma":"Critico","metodologia":"Revision sistematica","objeto_estudio":"Que estudia.","hallazgos":["H1.","H2.","H3."],"aportacion":"Aportacion al etiquetado de IA.","brecha":"Que no resuelve.","marco_teorico":"Si","archivo":"D1-A01_Apellido2023.pdf"}]}`;

// ── helpers ─────────────────────────────────────────────────────────────────
const loadJSON = (f, def) => { try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : def; } catch { return def; } };

function limpiarJSON(txt) {
  let s = txt.replace(/```json|```/g, "").trim();
  const ini = s.indexOf("{"), fin = s.lastIndexOf("}");
  if (ini < 0) throw new Error("Sin JSON.");
  s = s.slice(ini, fin + 1);
  try { return JSON.parse(s); } catch { }
  s = s.replace(/[\x00-\x1F\x7F]/g, " ").replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(s); } catch { }
  throw new Error("JSON inválido.");
}

// ── APIs ────────────────────────────────────────────────────────────────────
async function openalex(query, tipo, pagina) {
  const p = new URLSearchParams({ search: query, filter: `publication_year:2018-2025,type:${tipo}`, sort: "relevance_score:desc", per_page: "10", page: String(pagina), select: "id,doi,title,authorships,publication_year,primary_location,abstract_inverted_index,cited_by_count", mailto: EMAIL });
  const res = await fetch(`https://api.openalex.org/works?${p}`, { headers: { "User-Agent": `Agente/11.0 (mailto:${EMAIL})` } });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(w => {
    let resumen = "";
    if (w.abstract_inverted_index) { try { const m = {}; Object.entries(w.abstract_inverted_index).forEach(([p, pos]) => pos.forEach(i => { m[i] = p; })); resumen = Object.keys(m).sort((a, b) => a - b).map(i => m[i]).join(" ").slice(0, 500); } catch { } }
    const autores = (w.authorships || []).slice(0, 3).map(a => a.author?.display_name || "").filter(Boolean).join("; ");
    const doi = w.doi?.replace("https://doi.org/", "") || null;
    const esTesis = tipo === "dissertation";
    return { titulo: w.title || "", autores, revista: esTesis ? ((w.authorships || [])[0]?.institutions?.[0]?.display_name || "Repositorio") : w.primary_location?.source?.display_name || "", anio: w.publication_year || "s.f.", resumen: resumen || "Sin resumen", doi, citas: w.cited_by_count || 0, api: "OpenAlex", tipo: esTesis ? "Tesis" : "Artículo", url_fuente: doi ? `https://doi.org/${doi}` : `https://openalex.org` };
  }).filter(w => w.titulo.length > 5);
}

async function crossref(query, pagina) {
  const offset = (pagina - 1) * 8;
  const p = new URLSearchParams({ query, filter: "from-pub-date:2018,type:journal-article", sort: "relevance", order: "desc", rows: "8", offset: String(offset), select: "DOI,title,author,published,container-title,abstract", mailto: EMAIL });
  const res = await fetch(`https://api.crossref.org/works?${p}`, { headers: { "User-Agent": `Agente/11.0 (mailto:${EMAIL})` } });
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = await res.json();
  return (data.message?.items || []).map(w => {
    const titulo = Array.isArray(w.title) ? w.title[0] : w.title || "";
    const revista = Array.isArray(w["container-title"]) ? w["container-title"][0] : w["container-title"] || "";
    const autores = (w.author || []).slice(0, 3).map(a => [a.family, a.given ? a.given.charAt(0) + "." : ""].filter(Boolean).join(", ")).join("; ");
    const resumen = (w.abstract || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
    return { titulo, autores, revista, anio: w.published?.["date-parts"]?.[0]?.[0] || "s.f.", resumen: resumen || "Sin resumen", doi: w.DOI || null, citas: 0, api: "Crossref", tipo: "Artículo", url_fuente: w.DOI ? `https://doi.org/${w.DOI}` : "" };
  }).filter(w => w.titulo.length > 5);
}

async function semanticScholar(query, pagina) {
  const offset = (pagina - 1) * 8;
  const p = new URLSearchParams({ query, limit: "8", offset: String(offset), fields: "title,authors,year,venue,abstract,externalIds,citationCount,isOpenAccess,openAccessPdf,publicationTypes" });
  const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${p}`, { headers: { "User-Agent": "Agente/11.0" } });
  if (!res.ok) throw new Error(`SemanticScholar ${res.status}`);
  const data = await res.json();
  return (data.data || []).map(w => {
    const autores = (w.authors || []).slice(0, 3).map(a => a.name || "").filter(Boolean).join("; ");
    const doi = w.externalIds?.DOI || null;
    const esTesis = (w.publicationTypes || []).includes("Thesis");
    return { titulo: w.title || "", autores, revista: w.venue || "Semantic Scholar", anio: w.year || "s.f.", resumen: (w.abstract || "Sin resumen").slice(0, 500), doi, citas: w.citationCount || 0, api: "SemanticScholar", tipo: esTesis ? "Tesis" : "Artículo", url_fuente: w.openAccessPdf?.url || `https://www.semanticscholar.org` };
  }).filter(w => w.titulo.length > 5);
}

async function doaj(query, pagina) {
  const p = new URLSearchParams({ page: String(pagina), pageSize: "8" });
  const url = `https://doaj.org/api/v3/search/articles/${encodeURIComponent(query)}?${p}`;
  const res = await fetch(url, { headers: { "User-Agent": "Agente/11.0" } });
  if (!res.ok) throw new Error(`DOAJ ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(w => {
    const b = w.bibjson || {};
    const titulo = b.title || "";
    const autores = (b.author || []).slice(0, 3).map(a => a.name || "").filter(Boolean).join("; ");
    const revista = b.journal?.title || "DOAJ";
    const anio = b.year || "s.f.";
    const resumen = (b.abstract || "Sin resumen").slice(0, 500);
    const doiObj = (b.identifier || []).find(i => i.type === "doi");
    const doi = doiObj?.id || null;
    const urlFuente = (b.link || []).find(l => l.type === "fulltext")?.url || (doi ? `https://doi.org/${doi}` : `https://doaj.org`);
    return { titulo, autores, revista: `${revista} (DOAJ)`, anio, resumen, doi, citas: 0, api: "DOAJ", tipo: "Artículo", url_fuente: urlFuente, acceso_abierto: true };
  }).filter(w => w.titulo.length > 5);
}

async function buscarFuentes(dim, tipo) {
  const corpus = loadJSON(CORPUS_JSON, []);
  const rechazados = loadJSON(RECHAZADOS_JSON, { dois: [], titulos: [] });
  const sesiones = loadJSON(SESIONES_JSON, {});

  const excluirDois = new Set([...corpus.map(f => f.doi).filter(Boolean), ...(rechazados.dois || [])]);
  const excluirTit  = new Set([...corpus.map(f => (f.referencia_apa || "").slice(0, 60).toLowerCase()).filter(Boolean), ...(rechazados.titulos || [])]);

  const todos = [], vistos = new Set();
  const agregar = lista => {
    for (const a of lista) {
      const k = a.titulo.slice(0, 50).toLowerCase();
      const ex = excluirDois.has(a.doi) || (a.doi == null && excluirTit.has(a.titulo.slice(0, 60).toLowerCase()));
      if (!vistos.has(k) && !ex) { vistos.add(k); todos.push(a); }
    }
  };

  const claveA = `arts_${dim}`;
  const claveT = `tesis_${dim}`;
  if (!sesiones[claveA]) sesiones[claveA] = { queryIdx: 0, pagina: 1 };
  if (!sesiones[claveT]) sesiones[claveT] = { queryIdx: 0, pagina: 1 };

  const sA = sesiones[claveA];
  const sT = sesiones[claveT];
  const log = [];

  if (tipo === "1" || tipo === "3") {
    const q = DIMS[dim].queries[sA.queryIdx % DIMS[dim].queries.length];
    const p = sA.pagina;
    log.push(`Artículos — query ${sA.queryIdx + 1}: "${q.slice(0, 50)}" (pág. ${p})`);
    try { const r = await openalex(q, "article", p); agregar(r); log.push(`OpenAlex: ${r.length} artículos`); } catch (e) { log.push(`OpenAlex: ${e.message}`); }
    await new Promise(r => setTimeout(r, 700));
    try { const r = await crossref(q, p); agregar(r); log.push(`Crossref: ${r.length} artículos`); } catch (e) { log.push(`Crossref: ${e.message}`); }
    await new Promise(r => setTimeout(r, 700));
    try { const r = await semanticScholar(q, p); agregar(r); log.push(`Semantic Scholar: ${r.length}`); } catch (e) { log.push(`SemanticScholar: ${e.message}`); }
    await new Promise(r => setTimeout(r, 700));
    try { const r = await doaj(q, p); agregar(r); log.push(`DOAJ: ${r.length} (acceso abierto)`); } catch (e) { log.push(`DOAJ: ${e.message}`); }
    await new Promise(r => setTimeout(r, 700));
    if (sA.pagina < 3) sA.pagina++; else { sA.pagina = 1; sA.queryIdx++; }
  }

  if (tipo === "2" || tipo === "3") {
    const qt = DIMS[dim].tesis[sT.queryIdx % DIMS[dim].tesis.length];
    const pt = sT.pagina;
    log.push(`Tesis — query ${sT.queryIdx + 1}: "${qt.slice(0, 45)}" (pág. ${pt})`);
    try { const r = await openalex(qt, "dissertation", pt); agregar(r); log.push(`OpenAlex tesis: ${r.length}`); } catch (e) { log.push(`OpenAlex tesis: ${e.message}`); }
    await new Promise(r => setTimeout(r, 700));
    if (sT.pagina < 3) sT.pagina++; else { sT.pagina = 1; sT.queryIdx++; }
  }

  writeFileSync(SESIONES_JSON, JSON.stringify(sesiones, null, 2), "utf8");
  return { fuentes: todos.sort((a, b) => (b.citas || 0) - (a.citas || 0)).slice(0, 20), log };
}

async function generarFichas(dim, fuentes, n) {
  if (!API_KEY) throw new Error("Falta ANTHROPIC_API_KEY");
  const lista = fuentes.map((a, i) => [`[${i + 1}] Tipo: ${a.tipo}`, `    Titulo: ${a.titulo}`, `    Autores: ${a.autores || "--"}`, `    Fuente: ${a.revista} | Año: ${a.anio} | Citas: ${a.citas}`, `    DOI: ${a.doi || "--"} | API: ${a.api}`, `    Resumen: ${a.resumen}`].join("\n")).join("\n\n");
  const prompt = `Dimension: ${dim} - ${DIMS[dim].label}\nFichas a generar: ${n}\n\nFUENTES REALES:\n\n${lista}\n\nSelecciona las ${n} MAS RELEVANTES para el proyecto.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODELO, max_tokens: 5000, system: SYS_AUTO, messages: [{ role: "user", content: prompt }] }) });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `API ${res.status}`); }
  const data = await res.json();
  const txt = data.content?.find(b => b.type === "text")?.text || "";
  return limpiarJSON(txt).fichas || [];
}

// ── HTTP server ──────────────────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ico": "image/x-icon" };

async function handleAPI(method, url, body) {
  const path = url.split("?")[0];

  if (method === "GET" && path === "/api/corpus") {
    const corpus = loadJSON(CORPUS_JSON, []);
    return { status: 200, body: JSON.stringify(corpus) };
  }

  if (method === "GET" && path === "/api/rechazados") {
    const r = loadJSON(RECHAZADOS_JSON, { dois: [], titulos: [], total: 0 });
    return { status: 200, body: JSON.stringify(r) };
  }

  if (method === "GET" && path === "/api/stats") {
    const corpus = loadJSON(CORPUS_JSON, []);
    const r = loadJSON(RECHAZADOS_JSON, { dois: [] });
    const pd = { D1: 0, D2: 0, D3: 0, D4: 0 };
    corpus.forEach(f => { if (pd[f.dimension] !== undefined) pd[f.dimension]++; });
    return { status: 200, body: JSON.stringify({ total: corpus.length, dims: pd, rechazadas: r.dois?.length || 0, meta: 60 }) };
  }

  if (method === "POST" && path === "/api/buscar") {
    const { dim, tipo } = JSON.parse(body);
    if (!DIMS[dim]) return { status: 400, body: JSON.stringify({ error: "Dimensión inválida" }) };
    const result = await buscarFuentes(dim, tipo || "3");
    return { status: 200, body: JSON.stringify(result) };
  }

  if (method === "POST" && path === "/api/generar") {
    const { dim, fuentes, n } = JSON.parse(body);
    if (!API_KEY) return { status: 400, body: JSON.stringify({ error: "No hay API Key configurada en el servidor." }) };
    const fichas = await generarFichas(dim, fuentes, n || 3);
    return { status: 200, body: JSON.stringify({ fichas }) };
  }

  if (method === "POST" && path === "/api/decision") {
    const { ficha, decision, comentario } = JSON.parse(body);
    const corpus = loadJSON(CORPUS_JSON, []);
    const rechazados = loadJSON(RECHAZADOS_JSON, { dois: [], titulos: [], total: 0 });
    const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const fichaFinal = { ...ficha, decision, comentario: comentario || "--", fecha_decision: fecha };
    if (decision === "APROBADA") {
      const idx = corpus.findIndex(f => f.doi && f.doi === ficha.doi);
      if (idx >= 0) corpus[idx] = fichaFinal; else corpus.push(fichaFinal);
      writeFileSync(CORPUS_JSON, JSON.stringify(corpus, null, 2), "utf8");
    } else if (decision === "RECHAZADA") {
      if (ficha.doi) rechazados.dois.push(ficha.doi);
      rechazados.titulos.push((ficha.referencia_apa || "").slice(0, 60).toLowerCase());
      rechazados.total = rechazados.dois.length;
      writeFileSync(RECHAZADOS_JSON, JSON.stringify(rechazados, null, 2), "utf8");
    }
    return { status: 200, body: JSON.stringify({ ok: true }) };
  }

  return null;
}

const server = createServer(async (req, res) => {
  let body = "";
  req.on("data", d => { body += d; });
  req.on("end", async () => {
    try {
      // API
      if (req.url.startsWith("/api/")) {
        const result = await handleAPI(req.method, req.url, body);
        if (result) {
          res.writeHead(result.status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          return res.end(result.body);
        }
      }

      // Static files
      let filePath = req.url === "/" ? "/index.html" : req.url;
      filePath = join(__dirname, "public", filePath.split("?")[0]);
      if (existsSync(filePath)) {
        const ext = extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
        return res.end(readFileSync(filePath));
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
