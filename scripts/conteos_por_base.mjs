// Cuenta el total de registros que devuelve cada base para cada ecuación del agente,
// con los mismos filtros que agente.js. Sirve para reportar "registros recuperados" por base (PRISMA-S).
// Uso:  node scripts/conteos_por_base.mjs > docs/conteos_por_base.json
const EMAIL="erandi.carrasco@udemex.edu.mx";
const DIMS={
D1:{queries:["AI governance higher education ethics transparency","artificial intelligence academic integrity university policy","responsible AI education institutional governance","AI ethics higher education accountability","algorithmic accountability academic institutions policy","generative AI governance university Mexico"],tesis:["gobernanza inteligencia artificial educacion superior","etica inteligencia artificial universidad Mexico","uso responsable IA educacion superior posgrado","politicas institucionales inteligencia artificial universidad"]},
D2:{queries:["AI disclosure labeling academic content transparency","artificial intelligence transparency labeling education","algorithmic transparency content authorship higher education","AI generated content labeling standards","machine learning content disclosure academic writing","generative AI authorship transparency university"],tesis:["transparencia inteligencia artificial contenidos educativos","etiquetado IA materiales educativos universidad","declaracion autoria inteligencia artificial academia Mexico","sistema etiquetado contenidos generados IA educacion"]},
D3:{queries:["participatory design educational technology usability","co-design learning materials higher education","heuristic evaluation usability educational materials Nielsen","user centered design learning tools students","participatory action research educational technology","co-creation digital learning resources university"],tesis:["diseno participativo tecnologia educativa universidad","co-diseno materiales educativos digitales posgrado","usabilidad recursos educativos digitales Mexico","evaluacion heuristica materiales aprendizaje"]},
D4:{queries:["critical educational technology AI Latin America","critical digital literacy higher education AI","AI education inequality critical perspective Mexico","technology education power critical pedagogy","digital colonialism education artificial intelligence","critical algorithm studies education equity"],tesis:["tecnologia educativa critica America Latina inteligencia artificial","pedagogia critica inteligencia artificial Mexico universidad","alfabetizacion digital critica educacion superior","desigualdad tecnologica educacion superior Mexico"]},
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(url,h={}){const r=await fetch(url,{headers:{"User-Agent":`Agente/11.0 (mailto:${EMAIL})`,...h}});if(!r.ok)return {__err:r.status};return r.json();}
async function oa(q,type){const p=new URLSearchParams({search:q,filter:`publication_year:2018-2025,type:${type}`,per_page:"1",mailto:EMAIL});const d=await j(`https://api.openalex.org/works?${p}`);return d.__err?`E${d.__err}`:d.meta?.count;}
async function cr(q){const p=new URLSearchParams({query:q,filter:"from-pub-date:2018,type:journal-article",rows:"0",mailto:EMAIL});const d=await j(`https://api.crossref.org/works?${p}`);return d.__err?`E${d.__err}`:d.message?.["total-results"];}
async function s2(q){const p=new URLSearchParams({query:q,limit:"1"});const d=await j(`https://api.semanticscholar.org/graph/v1/paper/search?${p}`);return d.__err?`E${d.__err}`:d.total;}
async function doaj(q){const d=await j(`https://doaj.org/api/v3/search/articles/${encodeURIComponent(q)}?pageSize=1`);return d.__err?`E${d.__err}`:d.total;}
const out=[];
for(const [dim,v] of Object.entries(DIMS)){
  for(const q of v.queries){const row={dim,tipo:"art",q,doaj:await doaj(q),openalex:await oa(q,"article"),crossref:await cr(q),s2:await s2(q)};out.push(row);console.error(JSON.stringify(row));await sleep(1200);}
  for(const q of v.tesis){const row={dim,tipo:"tesis",q,openalex:await oa(q,"dissertation"),s2:await s2(q+" thesis dissertation")};out.push(row);console.error(JSON.stringify(row));await sleep(1200);}
}
console.log(JSON.stringify({fecha:new Date().toISOString().slice(0,10),filas:out},null,1));
