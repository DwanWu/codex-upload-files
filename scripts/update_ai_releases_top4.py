#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path

from update_ai_releases import fetch_codex, fetch_claude, fetch_gemini, fetch_grok

OUT = Path("Egern/Widget/AIReleaseRadar.json")
ALLOWED = {"codex", "claude", "gemini", "grok"}


def main():
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            old = {}

    old_map = {
        x.get("id"): x
        for x in old.get("releases", [])
        if x.get("id") in ALLOWED
    }

    fetchers = [fetch_codex, fetch_claude, fetch_gemini, fetch_grok]
    releases = []
    errors = []

    for fn in fetchers:
        pid = fn.__name__.replace("fetch_", "")
        try:
            r = fn()
            if not r.get("date"):
                raise RuntimeError("missing date")
            releases.append(r)
            print(f"OK {r['name']}: {r['date']} {r['title']}")
        except Exception as e:
            errors.append(f"{pid}: {e}")
            if pid in old_map:
                releases.append(old_map[pid])
                print(f"FALLBACK {pid}: {e}")
            else:
                print(f"ERROR {pid}: {e}")

    releases = [r for r in releases if r.get("id") in ALLOWED]
    releases.sort(key=lambda x: x.get("date", ""), reverse=True)

    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sources": ["Codex", "Claude", "Gemini", "Grok"],
        "releases": releases,
        "errors": errors,
    }

    new_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    old_text = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if new_text == old_text:
        print("No release changes; JSON unchanged.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(new_text, encoding="utf-8")
    print(f"Updated {OUT}")


if __name__ == "__main__":
    main()
