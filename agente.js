/**
 * AGENTE DE FICHAS BIBLIOGRÁFICAS v11
 * Erandi Carrasco Alcantara · UDEMEX 2026
 *
 * SOLUCIONES:
 * - Paginación automática: cada sesión avanza a la siguiente página
 * - Rotación de queries: cada sesión usa términos distintos  
 * - Rechazados permanentes: nunca vuelven a aparecer
 * - Modo manual: pegar link o texto de TESIUNAM/repositorios
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { createInterface } from "readline";
import { exec } from "child_process";
import ora from "ora";
import chalk from "chalk";

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const EMAIL        = "erandi.carrasco@udemex.edu.mx";
const MODELO       = "claude-sonnet-4-20250514";
const CORPUS_JSON  = "./corpus_estado_del_arte.json";
const CORPUS_TXT   = "./corpus_estado_del_arte.txt";
const RECHAZADOS_JSON = "./rechazados.json";
const SESIONES_JSON   = "./sesiones.json";  // paginación por dimensión

const DIMS = {
  D1:{label:"Gobernanza y ética de la IA en educación",
    queries:[
      "AI governance higher education ethics transparency",
      "artificial intelligence academic integrity university policy",
      "responsible AI education institutional governance",
      "AI ethics higher education accountability",
      "algorithmic accountability academic institutions policy",
      "generative AI governance university Mexico",
    ],
    tesis:[
      "gobernanza inteligencia artificial educacion superior",
      "etica inteligencia artificial universidad Mexico",
      "uso responsable IA educacion superior posgrado",
      "politicas institucionales inteligencia artificial universidad",
    ]},
  D2:{label:"Transparencia y etiquetado de IA en contenidos",
    queries:[
      "AI disclosure labeling academic content transparency",
      "artificial intelligence transparency labeling education",
      "algorithmic transparency content authorship higher education",
      "AI generated content labeling standards",
      "machine learning content disclosure academic writing",
      "generative AI authorship transparency university",
    ],
    tesis:[
      "transparencia inteligencia artificial contenidos educativos",
      "etiquetado IA materiales educativos universidad",
      "declaracion autoria inteligencia artificial academia Mexico",
      "sistema etiquetado contenidos generados IA educacion",
    ]},
  D3:{label:"Diseño participativo en tecnología educativa",
    queries:[
      "participatory design educational technology usability",
      "co-design learning materials higher education",
      "heuristic evaluation usability educational materials Nielsen",
      "user centered design learning tools students",
      "participatory action research educational technology",
      "co-creation digital learning resources university",
    ],
    tesis:[
      "diseno participativo tecnologia educativa universidad",
      "co-diseno materiales educativos digitales posgrado",
      "usabilidad recursos educativos digitales Mexico",
      "evaluacion heuristica materiales aprendizaje",
    ]},
  D4:{label:"Perspectiva crítica IA educación latinoamericana",
    queries:[
      "critical educational technology AI Latin America",
      "critical digital literacy higher education AI",
      "AI education inequality critical perspective Mexico",
      "technology education power critical pedagogy",
      "digital colonialism education artificial intelligence",
      "critical algorithm studies education equity",
    ],
    tesis:[
      "tecnologia educativa critica America Latina inteligencia artificial",
      "pedagogia critica inteligencia artificial Mexico universidad",
      "alfabetizacion digital critica educacion superior",
      "desigualdad tecnologica educacion superior Mexico",
    ]},
};

const SYS_AUTO=`Eres asistente de investigacion doctoral. Datos REALES de OpenAlex/Crossref/SemanticScholar.
PROYECTO: Sistema grafico etiquetado IA en contenidos educativos. Erandi Carrasco UDEMEX 2026.
REGLAS: 1)Datos exactos del JSON 2)Hallazgos del resumen, si no hay: "Sin resumen - verificar en fuente" 3)Sin URLs propias 4)Prioriza 2020-2025 y mayor citas 5)Max 60 palabras/campo 6)SOLO JSON sin markdown
JSON:{"fichas":[{"folio":"D1-A01","tipo":"Articulo cientifico","referencia_apa":"Apellido N. (2023). Titulo. Revista, vol(num), pp.","doi":"10.xxx/xxx","dimension":"D1","revista_repositorio":"Nombre revista - API origen","pais_contexto":"Internacional","anio":"2023","paradigma":"Critico","metodologia":"Revision sistematica","objeto_estudio":"Que estudia.","hallazgos":["H1.","H2.","H3."],"aportacion":"Aportacion al etiquetado de IA.","brecha":"Que no resuelve.","marco_teorico":"Si","archivo":"D1-A01_Apellido2023.pdf"}]}`;

const SYS_MANUAL=`Eres asistente de investigacion doctoral. Texto/datos de fuente proporcionada manualmente.
PROYECTO: Sistema grafico etiquetado IA en contenidos educativos. Erandi Carrasco UDEMEX 2026.
REGLAS: 1)Solo info del texto - faltante: "Verificar en fuente" 2)Sin inventar 3)No generes URLs que no esten en el texto 4)Max 60 palabras/campo 5)SOLO JSON sin markdown
JSON:{"fichas":[{"folio":"D1-T01","tipo":"Tesis doctoral","referencia_apa":"Apellido N. (2023). Titulo. [Tesis doctoral]. Universidad.","doi":null,"dimension":"D1","revista_repositorio":"Universidad/repositorio","pais_contexto":"Mexico","anio":"2023","paradigma":"Critico","metodologia":"Cualitativa","objeto_estudio":"Que estudia.","hallazgos":["H1.","H2.","H3."],"aportacion":"Aportacion al etiquetado de IA.","brecha":"Que no resuelve.","marco_teorico":"Si","archivo":"D1-T01_Apellido2023.pdf"}]}`;

// ─── INPUT ────────────────────────────────────────────────────────────────────
function ask(q){return new Promise(r=>{const i=createInterface({input:process.stdin,output:process.stdout,terminal:true});i.question(q,a=>{i.close();r(a.trim());});});}
async function askValido(q,vals){while(true){const r=(await ask(q)).toUpperCase();if(vals.includes(r))return r;if(r!=="")process.stdout.write(chalk.yellow("  Escribe "+vals.join("/")+": "));}}
async function askML(txt){console.log(chalk.dim(txt));console.log(chalk.dim("  (Escribe FIN y presiona Enter cuando termines)\n"));const ls=[];while(true){const l=await ask("  > ");if(l.toUpperCase()==="FIN")break;ls.push(l);}return ls.join("\n");}
const log=(m,t="info")=>{const p={ok:chalk.green("✓"),err:chalk.red("✗"),warn:chalk.yellow("⚠"),info:chalk.blue("→")}[t]||chalk.blue("→");console.log(`  ${p}  ${m}`);};
const abrirURL=url=>{exec(process.platform==="win32"?`start "" "${url}"`:process.platform==="darwin"?`open "${url}"`:`xdg-open "${url}"`,()=>{});};

// ─── PERSISTENCIA ─────────────────────────────────────────────────────────────
const cargarJSON=(f,def)=>{if(!existsSync(f))return def;try{return JSON.parse(readFileSync(f,"utf8"));}catch(_){return def;}};

function cargarSesiones(){return cargarJSON(SESIONES_JSON,{});}
function guardarSesiones(s){writeFileSync(SESIONES_JSON,JSON.stringify(s,null,2),"utf8");}

function cargarRechazados(){
  const d=cargarJSON(RECHAZADOS_JSON,{dois:[],titulos:[]});
  return{dois:new Set(d.dois||[]),titulos:new Set(d.titulos||[])};
}
function guardarRechazados(r){writeFileSync(RECHAZADOS_JSON,JSON.stringify({dois:[...r.dois],titulos:[...r.titulos],total:r.dois.size},null,2),"utf8");}

function cargarCorpus(){return cargarJSON(CORPUS_JSON,[]);}

function guardarCorpus(corpus){
  writeFileSync(CORPUS_JSON,JSON.stringify(corpus,null,2),"utf8");
  const pd={D1:[],D2:[],D3:[],D4:[]};
  corpus.forEach(f=>{if(pd[f.dimension])pd[f.dimension].push(f);});
  let txt=`CORPUS DEL ESTADO DEL ARTE\nErandi Carrasco Alcantara - UDEMEX 2026\nActualizado: ${new Date().toLocaleString("es-MX")}\nTotal fichas aprobadas: ${corpus.length}\n${"=".repeat(65)}\n\n`;
  Object.entries(pd).forEach(([dim,fichas])=>{
    if(!fichas.length)return;
    txt+=`\n${"=".repeat(65)}\n  ${dim} - ${DIMS[dim]?.label||dim}  (${fichas.length} fichas)\n${"=".repeat(65)}\n\n`;
    txt+=fichas.map(f=>[
      `FICHA ${f.folio}  [${f.decision}]`,"-".repeat(65),
      `Tipo:         ${f.tipo}`,
      `Revista/Repo: ${f.revista_repositorio||"--"}`,
      `DOI:          ${f.doi||"No disponible"}`,
      `URL:          ${f.url_fuente||f.verificacion?.url||"--"}`,
      `Pais:         ${f.pais_contexto}  |  Año: ${f.anio}`,
      `Paradigma:    ${f.paradigma}  |  Metodologia: ${f.metodologia}`,"",
      `REFERENCIA APA:`,`  ${f.referencia_apa}`,"",
      `OBJETO:`,`  ${f.objeto_estudio}`,"",
      `HALLAZGOS:`,
      ...(f.hallazgos||[]).map((h,i)=>`  ${i+1}. ${h}`),"",
      `APORTACION:`,`  ${f.aportacion}`,"",
      `BRECHA:`,`  ${f.brecha}`,"",
      `Marco: ${f.marco_teorico}  |  Archivo: ${f.archivo}`,"",
      `VERIFICACION: ${f.verificacion?.estado||"--"}  Citas: ${f.verificacion?.citas||"--"}  Acceso abierto: ${f.verificacion?.acceso_abierto?"Si":"No"}`,"",
      `DECISION: ${f.decision}  |  ${f.comentario||"--"}`,`Fecha: ${f.fecha_decision||"--"}`,
    ].join("\n")).join("\n\n"+"-".repeat(65)+"\n\n");
    txt+="\n\n";
  });
  writeFileSync(CORPUS_TXT,txt,"utf8");
}

function limpiarJSON(txt){
  let s=txt.replace(/```json|```/g,"").trim();
  const ini=s.indexOf("{"),fin=s.lastIndexOf("}");
  if(ini<0)throw new Error("Sin JSON.");
  s=s.slice(ini,fin+1);
  try{return JSON.parse(s);}catch(_){}
  s=s.replace(/[\x00-\x1F\x7F]/g," ").replace(/,(\s*[}\]])/g,"$1");
  try{return JSON.parse(s);}catch(_){}
  const ub=s.lastIndexOf('"}');
  if(ub>0){try{return JSON.parse(s.slice(0,ub+2)+"]}");}catch(_){}}
  throw new Error("JSON invalido.");
}

// ─── VERIFICAR DOI ────────────────────────────────────────────────────────────
async function verificarDOI(doi){
  if(!doi)return{estado:"SIN DOI",titulo_real:"--",citas:0,acceso_abierto:false,url:"--"};
  try{
    const res=await fetch(`https://api.openalex.org/works/https://doi.org/${doi}?mailto=${EMAIL}`,{headers:{"User-Agent":"Agente/11.0"}});
    if(res.status===404){
      const r2=await fetch(`https://api.crossref.org/works/${doi}`);
      if(r2.ok){const d=await r2.json();const t=Array.isArray(d.message.title)?d.message.title[0]:d.message.title||"--";return{estado:"VERIFICADA",titulo_real:t.slice(0,100),citas:0,acceso_abierto:false,url:`https://doi.org/${doi}`};}
      return{estado:"NO ENCONTRADA",titulo_real:"DOI no existe",citas:0,acceso_abierto:false,url:`https://scholar.google.com/scholar?q=${encodeURIComponent(doi)}`};
    }
    if(!res.ok)return{estado:"ERROR",titulo_real:"--",citas:0,acceso_abierto:false,url:"--"};
    const w=await res.json();
    return{estado:"VERIFICADA",titulo_real:(w.title||"--").slice(0,100),citas:w.cited_by_count||0,acceso_abierto:w.open_access?.is_oa||false,url:w.open_access?.oa_url||w.primary_location?.landing_page_url||`https://doi.org/${doi}`};
  }catch(e){return{estado:"ERROR",titulo_real:e.message.slice(0,50),citas:0,acceso_abierto:false,url:"--"};}
}

// ─── APIs ─────────────────────────────────────────────────────────────────────
async function openalex(query,tipo,pagina){
  const p=new URLSearchParams({search:query,filter:`publication_year:2018-2025,type:${tipo}`,sort:"relevance_score:desc",per_page:"10",page:String(pagina),select:"id,doi,title,authorships,publication_year,primary_location,abstract_inverted_index,cited_by_count",mailto:EMAIL});
  const res=await fetch(`https://api.openalex.org/works?${p}`,{headers:{"User-Agent":`Agente/11.0 (mailto:${EMAIL})`}});
  if(!res.ok)throw new Error(`OpenAlex ${res.status}`);
  const data=await res.json();
  return (data.results||[]).map(w=>{
    let resumen="";
    if(w.abstract_inverted_index){try{const m={};Object.entries(w.abstract_inverted_index).forEach(([p,pos])=>pos.forEach(i=>{m[i]=p;}));resumen=Object.keys(m).sort((a,b)=>a-b).map(i=>m[i]).join(" ").slice(0,500);}catch(_){}}
    const autores=(w.authorships||[]).slice(0,3).map(a=>a.author?.display_name||"").filter(Boolean).join("; ");
    const inst=(w.authorships||[])[0]?.institutions?.[0]?.display_name||"";
    const doi=w.doi?.replace("https://doi.org/","")||null;
    const esTesis=tipo==="dissertation";
    return{titulo:w.title||"",autores,revista:esTesis?(inst||"Repositorio institucional"):w.primary_location?.source?.display_name||"",anio:w.publication_year||"s.f.",resumen:resumen||"Sin resumen",doi,citas:w.cited_by_count||0,api:"OpenAlex",tipo:esTesis?"Tesis doctoral":"Artículo",url_fuente:doi?`https://doi.org/${doi}`:`https://openalex.org`};
  }).filter(w=>w.titulo.length>5);
}

async function crossref(query,pagina){
  const offset=(pagina-1)*8;
  const p=new URLSearchParams({query,filter:"from-pub-date:2018,type:journal-article",sort:"relevance",order:"desc",rows:"8",offset:String(offset),select:"DOI,title,author,published,container-title,abstract",mailto:EMAIL});
  const res=await fetch(`https://api.crossref.org/works?${p}`,{headers:{"User-Agent":`Agente/11.0 (mailto:${EMAIL})`}});
  if(!res.ok)throw new Error(`Crossref ${res.status}`);
  const data=await res.json();
  return (data.message?.items||[]).map(w=>{
    const titulo=Array.isArray(w.title)?w.title[0]:w.title||"";
    const revista=Array.isArray(w["container-title"])?w["container-title"][0]:w["container-title"]||"";
    const autores=(w.author||[]).slice(0,3).map(a=>[a.family,a.given?a.given.charAt(0)+".":""].filter(Boolean).join(", ")).join("; ");
    const resumen=(w.abstract||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,500);
    return{titulo,autores,revista,anio:w.published?.["date-parts"]?.[0]?.[0]||"s.f.",resumen:resumen||"Sin resumen",doi:w.DOI||null,citas:0,api:"Crossref",tipo:"Artículo",url_fuente:w.DOI?`https://doi.org/${w.DOI}`:""};
  }).filter(w=>w.titulo.length>5);
}

async function semanticScholar(query,pagina){
  const offset=(pagina-1)*8;
  const p=new URLSearchParams({query,limit:"8",offset:String(offset),fields:"title,authors,year,venue,abstract,externalIds,citationCount,isOpenAccess,openAccessPdf,publicationTypes"});
  const res=await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${p}`,{headers:{"User-Agent":"Agente/11.0"}});
  if(!res.ok)throw new Error(`SemanticScholar ${res.status}`);
  const data=await res.json();
  return (data.data||[]).map(w=>{
    const autores=(w.authors||[]).slice(0,3).map(a=>a.name||"").filter(Boolean).join("; ");
    const doi=w.externalIds?.DOI||null;
    const esTesis=(w.publicationTypes||[]).includes("Thesis");
    return{titulo:w.title||"",autores,revista:w.venue||"Semantic Scholar",anio:w.year||"s.f.",resumen:(w.abstract||"Sin resumen").slice(0,500),doi,citas:w.citationCount||0,api:"SemanticScholar",tipo:esTesis?"Tesis":"Artículo",url_fuente:w.openAccessPdf?.url||`https://www.semanticscholar.org`};
  }).filter(w=>w.titulo.length>5);
}

// ─── BÚSQUEDA PRINCIPAL CON PAGINACIÓN ───────────────────────────────────────
async function buscarFuentes(dim,tipo,spinner,corpus,rechazados,sesiones){

  const todos=[],vistos=new Set();
  const excluirDois=new Set([...corpus.map(f=>f.doi).filter(Boolean),...rechazados.dois]);
  const excluirTit =new Set([...corpus.map(f=>(f.referencia_apa||"").slice(0,60).toLowerCase()).filter(Boolean),...rechazados.titulos]);
  let excl=0;

  const agregar=lista=>{
    for(const a of lista){
      const k=a.titulo.slice(0,50).toLowerCase();
      const ex=excluirDois.has(a.doi)||(a.doi==null&&excluirTit.has(a.titulo.slice(0,60).toLowerCase()));
      if(!vistos.has(k)&&!ex){vistos.add(k);todos.push(a);}
      else if(ex)excl++;
    }
  };

  // Calcular qué query y página usar esta sesión (rotación automática)
  const claveArts=`arts_${dim}`;
  const claveTesis=`tesis_${dim}`;
  if(!sesiones[claveArts])sesiones[claveArts]={queryIdx:0,pagina:1};
  if(!sesiones[claveTesis])sesiones[claveTesis]={queryIdx:0,pagina:1};

  const sArts=sesiones[claveArts];
  const sTesis=sesiones[claveTesis];

  // ── Artículos ──
  if(tipo==="1"||tipo==="3"){
    const queriesArts=DIMS[dim].queries;
    const q=queriesArts[sArts.queryIdx%queriesArts.length];
    const p=sArts.pagina;
    log(`Artículos — query ${sArts.queryIdx+1}/${queriesArts.length}: "${q.slice(0,45)}"  página ${p}`,"info");

    try{spinner.text=`OpenAlex p${p}: "${q.slice(0,40)}..."`;const r=await openalex(q,"article",p);agregar(r);if(r.length)log(`OpenAlex: ${r.length} artículos`,"ok");}catch(e){log(`OpenAlex: ${e.message}`,"warn");}
    await new Promise(r=>setTimeout(r,700));

    try{spinner.text=`Crossref p${p}: "${q.slice(0,40)}..."`;const r=await crossref(q,p);agregar(r);if(r.length)log(`Crossref: ${r.length} artículos`,"ok");}catch(e){log(`Crossref: ${e.message}`,"warn");}
    await new Promise(r=>setTimeout(r,700));

    try{spinner.text=`Semantic Scholar p${p}: "${q.slice(0,35)}..."`;const r=await semanticScholar(q,p);agregar(r);if(r.length)log(`Semantic Scholar: ${r.length}`,"ok");}catch(e){log(`Semantic Scholar: ${e.message}`,"warn");}
    await new Promise(r=>setTimeout(r,700));

    // Avanzar: si página < 3 incrementar página, si no rotar query y resetear página
    if(sArts.pagina<3){sArts.pagina++;}else{sArts.pagina=1;sArts.queryIdx++;}
    guardarSesiones(sesiones);
  }

  // ── Tesis ──
  if(tipo==="2"||tipo==="3"){
    const queriesTesis=DIMS[dim].tesis;
    const qt=queriesTesis[sTesis.queryIdx%queriesTesis.length];
    const pt=sTesis.pagina;
    log(`Tesis — query ${sTesis.queryIdx+1}/${queriesTesis.length}: "${qt.slice(0,45)}"  página ${pt}`,"info");

    try{spinner.text=`OpenAlex tesis p${pt}: "${qt.slice(0,38)}..."`;const r=await openalex(qt,"dissertation",pt);agregar(r);if(r.length)log(`OpenAlex tesis: ${r.length}`,"ok");else log(`OpenAlex tesis: 0 en esta página (normal)`,"warn");}catch(e){log(`OpenAlex tesis: ${e.message}`,"warn");}
    await new Promise(r=>setTimeout(r,700));

    // Semantic Scholar también para tesis
    try{spinner.text=`SemanticScholar tesis p${pt}: "${qt.slice(0,35)}..."`;const r=await semanticScholar(qt+" thesis dissertation",pt);const tesis=r.filter(a=>a.tipo==="Tesis"||a.titulo.toLowerCase().includes("thesis")||a.titulo.toLowerCase().includes("tesis")||a.titulo.toLowerCase().includes("dissert"));agregar(tesis);if(tesis.length)log(`Semantic Scholar tesis: ${tesis.length}`,"ok");}catch(e){log(`Semantic Scholar tesis: ${e.message}`,"warn");}
    await new Promise(r=>setTimeout(r,700));

    if(sTesis.pagina<3){sTesis.pagina++;}else{sTesis.pagina=1;sTesis.queryIdx++;}
    guardarSesiones(sesiones);
  }

  if(excl>0)log(`${excl} ya revisadas (aprobadas o rechazadas) — omitidas`,"info");
  return todos.sort((a,b)=>(b.citas||0)-(a.citas||0)).slice(0,20);
}

// ─── CLAUDE ───────────────────────────────────────────────────────────────────
async function llamarClaude(prompt,sys){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:MODELO,max_tokens:5000,system:sys,messages:[{role:"user",content:prompt}]})});
  if(!res.ok){const e=await res.json();throw new Error(e.error?.message||`API ${res.status}`);}
  const data=await res.json();
  const txt=data.content?.find(b=>b.type==="text")?.text||"";
  if(!txt)throw new Error("Sin respuesta.");
  return limpiarJSON(txt);
}

// ─── REVISIÓN ─────────────────────────────────────────────────────────────────
async function revisarFicha(f,idx,total,corpus){
  const v=f.verificacion||{};
  console.log("\n"+chalk.bold.cyan(`  ┌─ FICHA ${f.folio}  (${idx}/${total})  [${f.tipo||""}] ${"─".repeat(22)}┐`));
  console.log(chalk.bold.cyan("  └"+"─".repeat(62)+"┘\n"));

  const vC=v.estado==="VERIFICADA"?chalk.green:v.estado==="NO ENCONTRADA"?chalk.red:chalk.yellow;
  log(`DOI: ${vC(v.estado||"Pendiente")}${v.citas>0?`  Citas: ${v.citas}`:""}${v.acceso_abierto?"  "+chalk.green("Acceso abierto"):""}`);
  if(v.titulo_real&&v.titulo_real!=="--")log(`Confirmado: ${v.titulo_real.slice(0,60)}`);

  const urlMostrar=f.url_fuente||f.url_manual||(v.url&&v.url!=="--"?v.url:null);
  if(urlMostrar)log(`URL: ${chalk.blue(urlMostrar.slice(0,80))}`);
  if(f.api)log(`Origen: ${chalk.dim(f.api)}`);
  console.log();

  console.log(`  ${chalk.italic(f.referencia_apa)}`);
  if(f.doi)console.log(chalk.dim(`  DOI: ${f.doi}`));
  console.log();
  log(`Objeto:    ${f.objeto_estudio}`);
  console.log(`\n  ${chalk.bold("Hallazgos:")}`);
  (f.hallazgos||[]).forEach((h,i)=>console.log(`  ${chalk.cyan(i+1+".")} ${h}`));
  console.log();
  log(`Aportación: ${chalk.green(f.aportacion)}`);
  log(`Brecha:     ${chalk.yellow(f.brecha)}`);
  console.log();

  if(urlMostrar&&urlMostrar!=="--"){
    const ab=await askValido("  ¿Abrir fuente en navegador? (S/N): ",["S","N"]);
    if(ab==="S"){abrirURL(urlMostrar);await new Promise(r=>setTimeout(r,1500));}
    console.log();
  }

  console.log(chalk.bold("  A = Aprobar para el estado del arte"));
  console.log(chalk.bold("  R = Rechazar permanentemente"));
  console.log(chalk.bold("  S = Saltar\n"));

  const d=await askValido("  Decisión (A/R/S): ",["A","R","S"]);
  const decision=d==="A"?"APROBADA":d==="R"?"RECHAZADA":"PENDIENTE";

  let comentario="";
  if(decision!=="PENDIENTE"){
    if(decision==="APROBADA")console.log(chalk.dim("\n  Ej: 'Clave para D2 — aporta marco de transparencia algorítmica'"));
    else console.log(chalk.dim("\n  Ej: 'Contexto diferente al mexicano'"));
    comentario=await ask("  Comentario: ");
  }
  return{...f,decision,comentario:comentario||"--",fecha_decision:new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})};
}

async function procesarFichas(fichas,corpus,rechazados){
  let aprobadas=0,rechazadasN=0;
  for(let i=0;i<fichas.length;i++){
    const r=await revisarFicha(fichas[i],i+1,fichas.length,corpus);
    if(r.decision==="APROBADA"){
      aprobadas++;
      const idx=corpus.findIndex(f=>f.doi&&f.doi===r.doi);
      if(idx>=0)corpus[idx]=r;else corpus.push(r);
      guardarCorpus(corpus);
      console.log(chalk.green(`\n  ✓ Aprobada. Corpus total: ${corpus.length}\n`));
    }else if(r.decision==="RECHAZADA"){
      rechazadasN++;
      if(r.doi)rechazados.dois.add(r.doi);
      rechazados.titulos.add((r.referencia_apa||r.titulo||"").slice(0,60).toLowerCase());
      guardarRechazados(rechazados);
      console.log(chalk.red(`\n  ✗ Rechazada y bloqueada.\n`));
    }else{
      console.log(chalk.yellow(`\n  ~ Saltada.\n`));
    }
  }
  return{aprobadas,rechazadasN};
}

// ─── MODO MANUAL ─────────────────────────────────────────────────────────────
async function modoManual(dim,corpus,rechazados){
  console.log(chalk.bold.yellow("\n  ── MODO MANUAL ──\n"));
  console.log(`  Usa este modo para tesis de TESIUNAM, repositorio UAEM\n  o cualquier fuente que no aparezca en la búsqueda automática.\n`);
  console.log(`  ${chalk.cyan("1")}  Pegar URL (se abre en navegador, copias el texto)`);
  console.log(`  ${chalk.cyan("2")}  Pegar texto directamente`);
  console.log(`  ${chalk.cyan("3")}  Ingresar datos campo por campo\n`);
  const op=await askValido("  Opción (1/2/3): ",["1","2","3"]);

  let texto="",urlM="";

  if(op==="1"){
    urlM=await ask("  URL de la tesis/artículo: ");
    if(urlM.startsWith("http")){
      abrirURL(urlM);
      console.log(chalk.yellow("\n  Se abrió el sitio en tu navegador."));
      console.log(chalk.yellow("  Copia el texto relevante (título, autor, año, institución, resumen)"));
      console.log(chalk.yellow("  y pégalo aquí abajo. Escribe FIN cuando termines:\n"));
    }
    texto=await askML("  Texto copiado:");
    texto=`URL: ${urlM}\n\n${texto}`;
  }else if(op==="2"){
    texto=await askML("  Pega el texto de la fuente:");
  }else{
    console.log(chalk.dim("\n  Ingresa los datos (Enter para omitir):\n"));
    const titulo=await ask("  Título completo: ");
    const autor=await ask("  Autor(es): ");
    const anio=await ask("  Año: ");
    const inst=await ask("  Universidad/Institución: ");
    const tipo=await ask("  Tipo (Tesis doctoral / Tesis maestría / Artículo): ");
    const resumen=await ask("  Resumen o descripción breve: ");
    urlM=await ask("  URL o dónde encontrarla: ");
    texto=[titulo&&`Título: ${titulo}`,autor&&`Autor: ${autor}`,anio&&`Año: ${anio}`,inst&&`Institución: ${inst}`,tipo&&`Tipo: ${tipo}`,resumen&&`Resumen: ${resumen}`,urlM&&`URL: ${urlM}`].filter(Boolean).join("\n");
  }

  if(!texto.trim()){log("Sin datos. Cancelado.","warn");return;}

  const sp=ora({text:"Claude generando ficha...",indent:2}).start();
  let fichas=[];
  try{
    const prompt=`Dimension: ${dim} - ${DIMS[dim].label}\n\nFUENTE PROPORCIONADA MANUALMENTE:\n\n${texto}\n\nGenera 1 ficha bibliografica.`;
    const parsed=await llamarClaude(prompt,SYS_MANUAL);
    fichas=parsed.fichas||[];
    if(!fichas.length)throw new Error("Sin fichas.");
    if(urlM)fichas[0].url_fuente=fichas[0].url_fuente||urlM;
    fichas[0].api="Manual";
    sp.succeed("Ficha generada desde fuente manual");
  }catch(e){sp.fail("Error: "+e.message);return;}

  for(const f of fichas){
    if(f.doi)f.verificacion=await verificarDOI(f.doi);
    else f.verificacion={estado:"SIN DOI - fuente manual",titulo_real:"--",citas:0,acceso_abierto:false,url:urlM||"--"};
  }

  await procesarFichas(fichas,corpus,rechazados);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main(){
  console.log();
  console.log(chalk.bold.cyan("  ╔"+"═".repeat(56)+"╗"));
  console.log(chalk.bold.cyan("  ║")+chalk.bold("  AGENTE DE FICHAS BIBLIOGRÁFICAS v11                ")+chalk.bold.cyan("  ║"));
  console.log(chalk.bold.cyan("  ║")+chalk.dim("  Paginación automática · Sin repetidos · Modo manual ")+chalk.bold.cyan("  ║"));
  console.log(chalk.bold.cyan("  ║")+chalk.dim("  Erandi Carrasco Alcantara · UDEMEX 2026             ")+chalk.bold.cyan("  ║"));
  console.log(chalk.bold.cyan("  ╚"+"═".repeat(56)+"╝\n"));

  if(!API_KEY||API_KEY==="PON_AQUI_TU_API_KEY"){log("Abre agente.js con Bloc de notas y reemplaza PON_AQUI_TU_API_KEY","err");process.exit(1);}

  const corpus=cargarCorpus();
  const rechazados=cargarRechazados();
  const sesiones=cargarSesiones();

  const pd={D1:0,D2:0,D3:0,D4:0};
  corpus.forEach(f=>{if(pd[f.dimension]!==undefined)pd[f.dimension]++;});
  log(`Corpus: ${corpus.length} aprobadas  [D1:${pd.D1} D2:${pd.D2} D3:${pd.D3} D4:${pd.D4}]`,"ok");
  log(`Rechazadas permanentes: ${rechazados.dois.size}`,"info");

  console.log(chalk.bold("\n  Dimensiones:\n"));
  Object.entries(DIMS).forEach(([k,v])=>console.log(`  ${chalk.cyan.bold(k)}  ${v.label}`));
  const dimRaw=(await ask("\n  ¿Qué dimensión? (D1/D2/D3/D4): ")).toUpperCase();
  const dim=DIMS[dimRaw]?dimRaw:"D1";
  log(`Dimensión: ${dim} - ${DIMS[dim].label}`,"ok");

  // Mostrar estado de paginación para esta dimensión
  const sA=sesiones[`arts_${dim}`]||{queryIdx:0,pagina:1};
  const sT=sesiones[`tesis_${dim}`]||{queryIdx:0,pagina:1};
  log(`Próxima búsqueda artículos: query ${sA.queryIdx+1} página ${sA.pagina} de ${DIMS[dim].queries.length} queries disponibles`,"info");
  log(`Próxima búsqueda tesis:     query ${sT.queryIdx+1} página ${sT.pagina} de ${DIMS[dim].tesis.length} queries disponibles`,"info");

  console.log(chalk.bold("\n  Tipo de búsqueda:\n"));
  console.log(`  ${chalk.cyan("1")}  Solo artículos (OpenAlex + Crossref + Semantic Scholar)`);
  console.log(`  ${chalk.cyan("2")}  Solo tesis (OpenAlex dissertations + Semantic Scholar)`);
  console.log(`  ${chalk.cyan("3")}  Artículos + tesis (recomendado)`);
  console.log(`  ${chalk.cyan("4")}  ${chalk.yellow("Manual — pegar link o texto (TESIUNAM, UAEM, etc.)")}`);
  const tipoRaw=await ask("\n  Tipo (1/2/3/4, default 3): ");
  const tipo=["1","2","3","4"].includes(tipoRaw)?tipoRaw:"3";

  if(tipo==="4"){
    await modoManual(dim,corpus,rechazados);
    const pd2={D1:0,D2:0,D3:0,D4:0};corpus.forEach(f=>{if(pd2[f.dimension]!==undefined)pd2[f.dimension]++;});
    log(`Corpus: ${corpus.length}  [D1:${pd2.D1} D2:${pd2.D2} D3:${pd2.D3} D4:${pd2.D4}]`,"ok");
    log(`${CORPUS_TXT}  <- abre en Word`,"ok");
    return;
  }

  const nRaw=await ask("  ¿Cuántas fichas? (2-5, default 3): ");
  const n=Math.min(5,Math.max(2,parseInt(nRaw)||3));

  console.log(chalk.bold("\n  ── Buscando fuentes nuevas ──\n"));
  const sp1=ora({text:"Conectando...",indent:2}).start();
  let fuentes=[];
  try{
    fuentes=await buscarFuentes(dim,tipo,sp1,corpus,rechazados,sesiones);
    const nt=fuentes.filter(f=>f.tipo?.includes("Tesis")).length;
    sp1.succeed(`${fuentes.length} fuentes nuevas: ${fuentes.length-nt} artículos, ${nt} tesis`);
  }catch(e){sp1.fail("Error: "+e.message);return;}

  if(!fuentes.length){
    log("Sin resultados nuevos en esta página.","warn");
    log("El agente avanzará a la siguiente página en la próxima sesión.","info");
    log("Mientras tanto usa Modo 4 (Manual) para agregar tesis de TESIUNAM.","info");
    return;
  }

  console.log(chalk.bold("\n  ── Fuentes encontradas ──\n"));
  fuentes.slice(0,6).forEach((f,i)=>{
    const ico=f.tipo?.includes("Tesis")?"📕":"📄";
    console.log(`  ${chalk.cyan.bold(i+1+".")} ${ico} ${chalk.bold((f.titulo||"").slice(0,60))}${(f.titulo||"").length>60?"…":""}`);
    console.log(chalk.dim(`     ${(f.autores||"--").slice(0,35)} | ${(f.revista||"").slice(0,28)} | ${f.anio} | ${f.citas} citas | ${f.api}`));
    console.log();
  });

  const sp2=ora({text:"Claude generando fichas...",indent:2}).start();
  let fichas=[];
  try{
    const lista=fuentes.map((a,i)=>[`[${i+1}] Tipo: ${a.tipo}`,`    Titulo: ${a.titulo}`,`    Autores: ${a.autores||"--"}`,`    Fuente: ${a.revista} | Año: ${a.anio} | Citas: ${a.citas}`,`    DOI: ${a.doi||"--"} | API: ${a.api}`,`    Resumen: ${a.resumen}`].join("\n")).join("\n\n");
    const prompt=`Dimension: ${dim} - ${DIMS[dim].label}\nFichas a generar: ${n}\n\nFUENTES REALES:\n\n${lista}\n\nSelecciona las ${n} MAS RELEVANTES para el proyecto.`;
    const parsed=await llamarClaude(prompt,SYS_AUTO);
    fichas=parsed.fichas||[];
    if(!fichas.length)throw new Error("Sin fichas.");
    // Preservar URL y API de la fuente original
    fichas.forEach(f=>{
      const orig=fuentes.find(a=>a.doi&&a.doi===f.doi)||fuentes.find(a=>a.titulo?.slice(0,40)===f.referencia_apa?.slice(0,40));
      if(orig){if(orig.url_fuente)f.url_fuente=orig.url_fuente;if(orig.api)f.api=orig.api;}
    });
    sp2.succeed(`${fichas.length} ficha(s) generada(s)`);
  }catch(e){sp2.fail("Error: "+e.message);return;}

  console.log(chalk.bold("\n  ── Verificando DOIs ──\n"));
  const sp3=ora({text:"Verificando...",indent:2}).start();
  for(const f of fichas){sp3.text=`Verificando ${f.folio}...`;f.verificacion=await verificarDOI(f.doi);await new Promise(r=>setTimeout(r,500));}
  sp3.succeed("Verificación completa");

  const {aprobadas,rechazadasN}=await procesarFichas(fichas,corpus,rechazados);

  const pd3={D1:0,D2:0,D3:0,D4:0};corpus.forEach(f=>{if(pd3[f.dimension]!==undefined)pd3[f.dimension]++;});
  console.log(chalk.bold("\n  ── SESIÓN COMPLETADA ──\n"));
  log(`Aprobadas: ${aprobadas}  |  Rechazadas: ${rechazadasN}`,"ok");
  log(`Corpus: ${corpus.length}  [D1:${pd3.D1} D2:${pd3.D2} D3:${pd3.D3} D4:${pd3.D4}]`,"ok");
  log(`${CORPUS_TXT}  <- abre en Word`,"ok");

  const pct=Math.round((corpus.length/60)*100);
  const b="█".repeat(Math.round(pct/5))+"░".repeat(20-Math.round(pct/5));
  console.log(chalk.bold(`\n  Progreso: [${b}] ${pct}% (${corpus.length}/60)\n`));
}

main().catch(e=>{console.error(chalk.red("\n  Error: "+e.message));process.exit(1);});
