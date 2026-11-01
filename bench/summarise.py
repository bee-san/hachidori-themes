#!/usr/bin/env python3
"""Summarise before/after hover benchmark batches: summarise.py <dir> <batches...>."""
import json, math, sys
root, *batches = sys.argv[1:]
def rows(side):
    out = []
    for b in batches: out += json.load(open(f"{root}/{side}-{b}/raw.json"))
    return out
def med(v):
    v = sorted(v); n = len(v); return (v[n//2 - 1] + v[n//2]) / 2 if n % 2 == 0 else v[n//2]
def p95(v):
    v = sorted(v); return v[max(0, math.ceil(0.95 * len(v)) - 1)]
fmt = lambda v: f"{med(v):.2f} / {p95(v):.2f}"
summary = {}
for side in ("before", "after"):
    r = rows(side)
    warm = [x for x in r if x["label"].split("-")[0] in ("root", "deep")]
    cold = [x for x in r if x["label"] == "cold"]
    rend = [s["ms"] for x in warm for s in (x.get("renderer") or {}).get("samples", []) if s["method"] == "renderResults"]
    summary[side] = {"warmFirst": fmt([x["firstMs"] for x in warm]), "warmComplete": fmt([x["completeMs"] for x in warm]),
        "render": fmt(rend), "coldFirst": fmt([x["firstMs"] for x in cold]), "coldComplete": fmt([x["completeMs"] for x in cold]),
        "n": {"warm": len(warm), "render": len(rend), "cold": len(cold)},
        "coldFirstSamples": [round(x["firstMs"], 1) for x in cold]}
manifests = {side: [json.load(open(f"{root}/{side}-{b}/manifest.json")) for b in batches] for side in ("before", "after")}
summary["environment"] = {k: manifests["after"][0][k] for k in ("node", "cpu", "logicalCpus", "samples", "warmups")}
summary["environment"]["extensionSha256"] = {side: sorted({m["extensionSha256"] for m in manifests[side]}) for side in manifests}
summary["environment"]["load1"] = {side: [m["load"][0] for m in manifests[side]] for side in manifests}
print(json.dumps(summary, indent=1, ensure_ascii=False))
json.dump(summary, open(f"{root}/summary.json", "w"), indent=1, ensure_ascii=False)
