import json, math, sys
root = sys.argv[1]
def load(theme):
    rows = []
    for b in (1, 2): rows += json.load(open(f"{root}/{theme}-{b}/raw.json"))
    return rows
def med(v):
    v = sorted(v); n = len(v); return (v[n//2 - 1] + v[n//2]) / 2 if n % 2 == 0 else v[n//2]
def p95(v):
    v = sorted(v); return v[max(0, math.ceil(0.95 * len(v)) - 1)]
fmt = lambda v: f"{med(v):.2f} / {p95(v):.2f}"
summary = {}
for theme in ("bee", "grimoire"):
    rows = load(theme)
    warm = [x for x in rows if x["label"].split("-")[0] in ("root", "deep")]
    cold = [x for x in rows if x["label"] == "cold"]
    rend = [s["ms"] for x in warm for s in (x.get("renderer") or {}).get("samples", []) if s["method"] == "renderResults"]
    nodes = [json.loads(x["completeSignature"])[x["depth"]]["nodes"] for x in warm if x.get("completeSignature")]
    summary[theme] = {"warmFirst": fmt([x["firstMs"] for x in warm]), "warmComplete": fmt([x["completeMs"] for x in warm]),
      "render": fmt(rend), "coldFirst": fmt([x["firstMs"] for x in cold]), "coldComplete": fmt([x["completeMs"] for x in cold]),
      "n": {"warm": len(warm), "render": len(rend), "cold": len(cold)}, "nodesMedian": med(nodes),
      "coldFirstSamples": [round(x["firstMs"], 1) for x in cold]}
manifest = json.load(open(f"{root}/grimoire-1/manifest.json"))
summary["environment"] = {k: manifest[k] for k in ("revision", "node", "cpu", "logicalCpus", "samples", "warmups")}
summary["environment"]["load"] = [json.load(open(f"{root}/{t}-{b}/manifest.json"))["load"] for b in (1, 2) for t in ("bee", "grimoire")]
print(json.dumps(summary, indent=1, ensure_ascii=False))
json.dump(summary, open(f"{root}/summary.json", "w"), indent=1, ensure_ascii=False)
