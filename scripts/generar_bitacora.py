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
    rows.append({
        "dim": f.get("dimension", "--"),
        "folio": f.get("folio", "--"),
        "fuente": autor_anio(f.get("referencia_apa")),
        "tipo": f.get("tipo", "--"),
        "anio": f.get("anio", "--"),
        "doi": doi,
        "api": f.get("api") or (f.get("revista_repositorio", "").split(" - ")[-1] if " - " in f.get("revista_repositorio", "") else "--"),
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
md.append("# Bitácora del corpus generado con el Agente de Fichas Bibliográficas v11\n")
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

# ---------- LaTeX ----------
tx = []
tx.append("% Generado por scripts/generar_bitacora.py — no editar a mano.")
tx.append("% Requiere: \\usepackage{longtable,booktabs,array}")
tx.append("\\begin{longtable}{@{}p{0.55cm}p{3.2cm}p{3.6cm}p{1.9cm}p{1.1cm}p{0.6cm}p{3.1cm}@{}}")
tx.append("\\caption{Bitácora de fichas aprobadas por el Agente de Fichas Bibliográficas v11 (decisión humana registrada).}\\label{tab:bitacora-corpus}\\\\")
tx.append("\\toprule Dim. & Fuente & DOI & Verificación & Citas & AA & Comentario de decisión \\\\ \\midrule \\endfirsthead")
tx.append("\\toprule Dim. & Fuente & DOI & Verificación & Citas & AA & Comentario de decisión \\\\ \\midrule \\endhead")
tx.append("\\bottomrule \\endfoot")
for r in rows:
    tx.append(f"{tex(r['dim'])} & {tex(r['fuente'])} & {{\\scriptsize {tex(r['doi'])}}} & {tex(r['verif'])} & {tex(r['citas'])} & {tex(r['oa'])} & {{\\small {tex(r['comentario'])}}} \\\\")
tx.append("\\end{longtable}")
tx.append("")
tx.append("\\begin{table}[htbp]\\centering\\small")
tx.append("\\caption{Resumen cuantitativo del corpus generado con el agente.}\\label{tab:resumen-corpus}")
tx.append("\\begin{tabular}{@{}lr@{}}\\toprule Indicador & Valor \\\\ \\midrule")
tx.append(f"Fichas aprobadas & {len(rows)} \\\\")
for d, lab in DIMS.items():
    tx.append(f"\\quad {d} · {tex(lab)} & {por_dim.get(d, 0)} \\\\")
tx.append(f"Fuentes rechazadas con DOI & {n_rech_doi} \\\\")
tx.append(f"Fuentes rechazadas registradas por título & {n_rech_tit} \\\\")
tx.append(f"DOI verificado & {verif.get('VERIFICADA', 0)} \\\\")
tx.append(f"DOI no localizado & {verif.get('NO ENCONTRADA', 0)} \\\\")
tx.append(f"Sin DOI (tesis de repositorio, modo manual) & {sum(v for k, v in verif.items() if k.startswith('SIN DOI'))} \\\\")
tx.append(f"Acceso abierto & {oa.get('Sí', 0)} \\\\")
tx.append(f"Fechas de sesión & {tex(', '.join(fechas))} \\\\")
tx.append("\\bottomrule\\end{tabular}\\end{table}")
(ROOT / "docs" / "bitacora_corpus.tex").write_text("\n".join(tx) + "\n", "utf8")

print(f"corpus={len(rows)} por_dim={dict(por_dim)} verif={dict(verif)} oa={dict(oa)} rech_doi={n_rech_doi} rech_tit={n_rech_tit} fechas={fechas}")
print("tipos", dict(tipos))
print("anios", dict(sorted(anios.items())))
