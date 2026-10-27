#!/usr/bin/env python3
"""Genera la bitácora trazable del corpus (Markdown y LaTeX) a partir de
corpus_estado_del_arte.json y rechazados.json.

Uso:  python3 -I scripts/generar_bitacora.py
Salida: docs/bitacora_corpus.md  y  docs/bitacora_corpus.tex
"""
import json, collections, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
corpus = json.loads((ROOT / "corpus_estado_del_arte.json").read_text("utf8"))
rech = json.loads((ROOT / "rechazados.json").read_text("utf8"))

DIMS = {
    "D1": "Gobernanza y ética de la IA en educación",
    "D2": "Transparencia y etiquetado de IA en contenidos",
    "D3": "Diseño participativo en tecnología educativa",
    "D4": "Perspectiva crítica IA educación latinoamericana",
}

def autor_anio(ref):
    ref = ref or ""
    m = re.match(r"^(.*?)\s*\((\d{4}|s\.f\.|Verificar en fuente)\)", ref)
    if not m:
        return ref[:60]
    autores = m.group(1).strip().rstrip(",.")
    primero = re.split(r",| &|;", autores)[0].strip()
    if " et al" in autores or autores.count(",") >= 3 or " & " in autores:
        primero += " et al."
    return f"{primero} ({m.group(2)})"

def tex(s):
    s = str(s if s is not None else "--")
    for a, b in [("\\", "\\textbackslash{}"), ("&", "\\&"), ("%", "\\%"), ("$", "\\$"),
                 ("#", "\\#"), ("_", "\\_"), ("{", "\\{"), ("}", "\\}"), ("~", "\\textasciitilde{}"), ("^", "\\^{}")]:
        s = s.replace(a, b)
    return s

def norm_fecha(fd):
    fd = (fd or "--").split(",")[0].strip()
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", fd)
    return f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{m.group(3)}" if m else fd

def limpiar_comentario(c):
    c = (c or "--").strip()
    if c.startswith("http"):
        return "(URL de acceso registrada)"
    return c[:70]

rows = []
for f in corpus:
    v = f.get("verificacion") or {}
    doi = f.get("doi") or ""
    doi = doi.replace("https://doi.org/", "") if doi else "--"
    if not doi.startswith("10.") and not doi.startswith("http"):
        doi = "--"
    rows.append({
        "dim": f.get("dimension", "--"),
        "folio": f.get("folio", "--"),
        "fuente": autor_anio(f.get("referencia_apa")),
        "tipo": f.get("tipo", "--"),
        "anio": f.get("anio", "--"),
        "doi": doi,
        "api": (f.get("api") or (f.get("revista_repositorio", "").split(" - ")[-1] if " - " in f.get("revista_repositorio", "") else "--")).replace(" verificado", "").replace("Semantic Scholar", "S. Scholar"),
        "verif": v.get("estado", "--"),
        "citas": v.get("citas", 0),
        "oa": "Sí" if v.get("acceso_abierto") else "No",
        "pais": f.get("pais_contexto", "--"),
        "metodo": f.get("metodologia", "--"),
        "comentario": limpiar_comentario(f.get("comentario")),
        "fecha": norm_fecha(f.get("fecha_decision")),
    })
rows.sort(key=lambda r: (r["dim"], r["folio"], r["fuente"]))

por_dim = collections.Counter(r["dim"] for r in rows)
verif = collections.Counter(r["verif"] for r in rows)
oa = collections.Counter(r["oa"] for r in rows)
anios = collections.Counter(str(r["anio"]) for r in rows)
tipos = collections.Counter(r["tipo"] for r in rows)
n_rech_doi = len([d for d in rech.get("dois", []) if d and d != "--"])
n_rech_tit = len(rech.get("titulos", []))
fechas = sorted({r["fecha"] for r in rows if r["fecha"] != "--"})

# ---------- Markdown ----------
md = []
md.append("# Bitácora del corpus generado con el Fichas UDEMEX Doctorado v11\n")
md.append("Generada automáticamente desde `corpus_estado_del_arte.json` y `rechazados.json`. "
          "Cada fila corresponde a una decisión humana registrada por el agente.\n")
md.append("## Resumen cuantitativo\n")
md.append("| Indicador | Valor |\n|---|---|")
md.append(f"| Fichas aprobadas (corpus) | {len(rows)} |")
for d, lab in DIMS.items():
    md.append(f"| {d} · {lab} | {por_dim.get(d, 0)} |")
md.append(f"| Fuentes rechazadas permanentemente (con DOI) | {n_rech_doi} |")
md.append(f"| Fuentes rechazadas registradas por título (incluye sin DOI) | {n_rech_tit} |")
md.append(f"| DOI verificado en OpenAlex/Crossref | {verif.get('VERIFICADA', 0)} |")
md.append(f"| DOI no localizado | {verif.get('NO ENCONTRADA', 0)} |")
md.append(f"| Sin DOI (fuente manual: tesis de repositorio) | {sum(v for k, v in verif.items() if k.startswith('SIN DOI'))} |")
md.append(f"| Acceso abierto (según OpenAlex) | {oa.get('Sí', 0)} |")
md.append(f"| Fechas de las sesiones de decisión | {', '.join(fechas)} |")
md.append("\n### Distribución por año de publicación\n")
md.append("| Año | Fichas |\n|---|---|")
for a, n in sorted(anios.items()):
    md.append(f"| {a} | {n} |")
md.append("\n### Distribución por tipo documental\n")
md.append("| Tipo | Fichas |\n|---|---|")
for t, n in tipos.most_common():
    md.append(f"| {t} | {n} |")

md.append("\n## Fichas aprobadas\n")
md.append("| Dim. | Folio | Fuente | Año | DOI | Base de origen | Verificación | Citas | AA | Contexto | Metodología | Comentario de decisión | Fecha |")
md.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in rows:
    md.append("| " + " | ".join(str(r[k]).replace("|", "/") for k in
              ["dim", "folio", "fuente", "anio", "doi", "api", "verif", "citas", "oa", "pais", "metodo", "comentario", "fecha"]) + " |")

md.append("\n## Fuentes rechazadas (bloqueo permanente)\n")
md.append("El agente guarda el DOI y los primeros 60 caracteres de la referencia; "
          "el motivo de rechazo se escribe en consola pero la versión 11 no lo persiste (ver recomendaciones).\n")
md.append("| # | DOI | Referencia (truncada) |\n|---|---|---|")
dois = [d for d in rech.get("dois", []) if d and d != "--"]
tits = rech.get("titulos", [])
for i in range(max(len(dois), len(tits))):
    md.append(f"| {i+1} | {dois[i] if i < len(dois) else '--'} | {tits[i] if i < len(tits) else '--'} |")
(ROOT / "docs" / "bitacora_corpus.md").write_text("\n".join(md) + "\n", "utf8")

# ---------- LaTeX (formato del Avance: tablas con borde y encabezado bgCotejo) ----------
tx = []
tx.append("% Generado por scripts/generar_bitacora.py a partir de corpus_estado_del_arte.json y rechazados.json. No editar a mano.")
tx.append("% Requiere en el preámbulo: longtable, colortbl/xcolor[table] y el color bgCotejo definido en main.tex.")
tx.append("{\\footnotesize\\setlength{\\tabcolsep}{4pt}")
tx.append("\\begin{longtable}{|p{0.55cm}|p{2.6cm}|p{2.8cm}|p{1.3cm}|p{1.6cm}|p{0.8cm}|p{0.45cm}|p{2.4cm}|}")
tx.append("\\caption{Bitácora de fichas aprobadas con el Fichas UDEMEX Doctorado v11 (una fila por decisión registrada).}\\label{tab:bitacora-corpus}\\\\")
hdr="\\hline\n\\rowcolor{bgCotejo}\n\\textbf{Dim.} & \\textbf{Fuente} & \\textbf{DOI} & \\textbf{Base} & \\textbf{Verif.} & \\textbf{Citas} & \\textbf{AA} & \\textbf{Comentario de decisión} \\\\\n\\hline"
tx.append(hdr+"\n\\endfirsthead")
tx.append(hdr+"\n\\endhead")
for r in rows:
    tx.append(f"{tex(r['dim'])} & {tex(r['fuente'])} & {{\\scriptsize {('\\url{'+r['doi']+'}') if r['doi']!='--' else '--'}}} & {tex(r['api'])} & {tex(r['verif']).replace('SIN DOI — URL manual','Sin DOI (manual)').replace('SIN DOI - fuente manual','Sin DOI (manual)').replace('VERIFICADA','Verificada').replace('NO ENCONTRADA','No localizada')} & {tex(r['citas'])} & {tex(r['oa'])} & {tex(r['comentario'])} \\\\")
    tx.append("\\hline")
tx.append("\\end{longtable}}")
tx.append("")
tx.append("\\begin{table}[H]\\centering\\footnotesize")
tx.append("\\caption{Resumen cuantitativo del corpus generado con el agente.}\\label{tab:resumen-corpus}")
tx.append("\\renewcommand{\\arraystretch}{1.3}")
tx.append("\\begin{tabular}{|p{9.5cm}|c|}\\hline\\rowcolor{bgCotejo}\\textbf{Indicador} & \\textbf{Valor} \\\\\\hline")
tx.append(f"Fichas aprobadas & {len(rows)} \\\\\\hline")
for d, lab in DIMS.items():
    tx.append(f"\\quad {d} · {tex(lab)} & {por_dim.get(d, 0)} \\\\\\hline")
tx.append(f"Fuentes rechazadas con DOI (bloqueo permanente) & {n_rech_doi} \\\\\\hline")
tx.append(f"Fuentes rechazadas registradas por título (incluye sin DOI) & {n_rech_tit} \\\\\\hline")
tx.append(f"DOI verificado en OpenAlex o Crossref & {verif.get('VERIFICADA', 0)} \\\\\\hline")
tx.append(f"DOI no localizado & {verif.get('NO ENCONTRADA', 0)} \\\\\\hline")
tx.append(f"Sin DOI (tesis de repositorio, modo manual) & {sum(v for k, v in verif.items() if k.startswith('SIN DOI'))} \\\\\\hline")
tx.append(f"Con versión de acceso abierto & {oa.get('Sí', 0)} \\\\\\hline")
tx.append(f"Tesis o tesinas & {sum(v for k, v in tipos.items() if 'esis' in k or 'esina' in k)} \\\\\\hline")
tx.append(f"Publicadas en 2022--2026 & {sum(v for k, v in anios.items() if k.isdigit() and int(k) >= 2022)} \\\\\\hline")
tx.append(f"Fechas de las sesiones de decisión & {tex(' y '.join(fechas))} \\\\\\hline")
tx.append("\\end{tabular}\\end{table}")
tx.append("")
tx.append("{\\footnotesize")
tx.append("\\begin{longtable}{|c|p{4.0cm}|p{8.2cm}|}")
tx.append("\\caption{Fuentes rechazadas de forma permanente (el agente conserva el DOI y los primeros sesenta caracteres de la referencia).}\\label{tab:rechazadas}\\\\")
hdr2="\\hline\n\\rowcolor{bgCotejo}\n\\textbf{\\#} & \\textbf{DOI} & \\textbf{Referencia (truncada)} \\\\\n\\hline"
tx.append(hdr2+"\n\\endfirsthead")
tx.append(hdr2+"\n\\endhead")
dois_l = [d for d in rech.get("dois", []) if d and d != "--"]
tits_l = rech.get("titulos", [])
for i in range(max(len(dois_l), len(tits_l))):
    tx.append(f"{i+1} & {{\\scriptsize {('\\url{'+dois_l[i]+'}') if i < len(dois_l) else '--'}}} & {{\\small {tex(tits_l[i]) if i < len(tits_l) else '--'}}} \\\\")
    tx.append("\\hline")
tx.append("\\end{longtable}}")
(ROOT / "docs" / "bitacora_corpus.tex").write_text("\n".join(tx) + "\n", "utf8")

print(f"corpus={len(rows)} por_dim={dict(por_dim)} verif={dict(verif)} oa={dict(oa)} rech_doi={n_rech_doi} rech_tit={n_rech_tit} fechas={fechas}")
print("tipos", dict(tipos))
print("anios", dict(sorted(anios.items())))
