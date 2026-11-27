#!/usr/bin/env python3
"""Build a small reproducible data kit from one immutable repository commit."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Exact published kit commit")
    parser.add_argument("--output", required=True, help="Destination ZIP")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}", args.source):
        parser.error("--source must be a full lowercase commit SHA")
    root = Path(__file__).resolve().parents[2]
    subprocess.run(["git", "cat-file", "-e", args.source + "^{commit}"], cwd=root, check=True)

    def read(path):
        return subprocess.check_output(["git", "show", args.source + ":" + path], cwd=root)

    def json_bytes(value):
        return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()

    files = {}
    for name in ["AUTHORING.md", "CONTRIBUTOR-BRIEF.md", "INTEGRATION.md"]:
        files[name] = read("docs/experiments/instrument-foundry/" + name)
    files["README.md"] = read("docs/experiments/instrument-foundry/STARTER-README.md")
    for instrument in ["descending-resonance", "chime-terraces"]:
        for name in ["instrument.json", "probes.json"]:
            files["references/" + instrument + "/" + name] = read("worlds/instruments/" + instrument + "/" + name)
    scaffold = json.loads(files["references/descending-resonance/instrument.json"])
    scaffold["preset"]["id"] = "your-instrument-scaffold-v1"
    scaffold["preset"]["name"] = "Your instrument scaffold"
    scaffold["sourceBuild"] = args.source
    scaffold["invitation"] = "A copy of Descending Resonance to edit into your own instrument. This scaffold is not an independent submission."
    scaffold["camera"] = {"target": {"x": 0, "y": 3, "z": 28}, "radius": 75, "yaw": 45, "elevation": 30}
    files["template/instrument.json"] = json_bytes(scaffold)
    files["template/probes.json"] = files["references/descending-resonance/probes.json"]
    files["SOURCE.json"] = json_bytes({
        "format": "rail-golf-instrument-starter", "version": 1,
        "repository": "https://github.com/CharlesMish/rail-golf",
        "kitCommit": args.source, "auditionRoute": "/lab/instrument-foundry",
        "scope": "Authoring data and instructions; the pinned repository supplies the shared engine and validator.",
    })
    files["SHA256SUMS"] = "".join(
        hashlib.sha256(data).hexdigest() + "  " + path + "\n"
        for path, data in sorted(files.items())
    ).encode()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, data in sorted(files.items()):
            info = zipfile.ZipInfo("rail-golf-instrument-starter/" + path, date_time=(2026, 11, 27, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compresslevel=9)
    print(json.dumps({"source": args.source, "output": str(output), "files": len(files),
                      "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == "__main__":
    main()
