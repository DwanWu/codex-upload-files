#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import feedparser
import requests
from bs4 import BeautifulSoup

OUT = Path("Egern/Widget/AIReleaseRadar.json")
UA = "Mozilla/5.0 (AIReleaseRadar/1.0; +https://github.com/DwanWu/codex-upload-files)"
HEADERS = {"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"}
MONTHS = {m: i for i, m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], 1)}


def get(url, timeout=25):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r


def iso_date(text):
    if not text:
        return None
    text = str(text).strip().replace("Sept ", "Sep ")
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%Y年%m月%d日"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    m = re.search(r"(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})", text)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r"\b([A-Z][a-z]{2,8})\s+(\d{1,2}),\s*(20\d{2})\b", text)
    if m:
        mon = m.group(1)[:3]
        if mon in MONTHS:
            return f"{int(m.group(3)):04d}-{MONTHS[mon]:02d}-{int(m.group(2)):02d}"
    return None


def clean(s, limit=120):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s if len(s) <= limit else s[: limit - 1] + "…"


def item(pid, name, vendor, title, date, url, kind="更新", summary="", source=""):
    return {
        "id": pid,
        "name": name,
        "vendor": vendor,
        "title": clean(title, 110),
        "date": date,
        "url": url,
        "kind": kind,
        "summary": clean(summary, 150),
        "source": source,
    }


def fetch_codex():
    url = "https://openai.com/products/release-notes/"
    soup = BeautifulSoup(get(url).text, "html.parser")
    strings = [clean(x, 240) for x in soup.stripped_strings]
    date_re = re.compile(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, 20\d{2}$")
    skip = {"Codex", "GA", "Preview", "Beta", "Alpha", "Sunset", "View source", "Help center"}
    for i, s in enumerate(strings):
        if s != "Codex":
            continue
        d = None
        di = None
        for j in range(i + 1, min(i + 8, len(strings))):
            if date_re.match(strings[j]):
                d, di = iso_date(strings[j]), j
                break
        if not d:
            continue
        title = None
        kind = "Codex"
        for j in range(di + 1, min(di + 10, len(strings))):
            t = strings[j]
            if t in {"GA", "Preview", "Beta", "Alpha", "Sunset"}:
                kind = t
                continue
            if t in skip or len(t) < 5:
                continue
            title = t
            break
        if title:
            return item("codex", "Codex", "OpenAI", title, d, url, kind, "OpenAI Codex 官方 Release Notes", "OpenAI")

    # 稳定兜底：官方 Codex GitHub 最新 Release
    gh = get("https://api.github.com/repos/openai/codex/releases/latest").json()
    d = (gh.get("published_at") or "")[:10]
    title = gh.get("name") or gh.get("tag_name") or "Codex latest release"
    return item("codex", "Codex", "OpenAI", title, d, gh.get("html_url") or url, "CLI", "Codex 官方 GitHub 最新版本", "OpenAI GitHub")


def _parent_date(a):
    node = a
    for _ in range(5):
        if not node:
            break
        txt = clean(node.get_text(" ", strip=True), 800)
        m = re.search(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*20\d{2}\b", txt)
        if m:
            d = iso_date(m.group(0))
            if d:
                return d
        node = node.parent
    return None


def fetch_claude():
    base = "https://www.anthropic.com"
    url = base + "/news"
    soup = BeautifulSoup(get(url).text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        title = clean(a.get_text(" ", strip=True), 160)
        if "claude" not in title.lower():
            continue
        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = _parent_date(a)
        score = 0
        low = title.lower()
        if low.startswith("introducing claude"):
            score += 4
        if any(k in low for k in ["opus", "sonnet", "fable", "mythos", "haiku"]):
            score += 2
        if "claude code" in low:
            score += 1
        if d:
            candidates.append((d, score, title, href))
    if not candidates:
        raise RuntimeError("Anthropic newsroom parse failed")
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    d, _, title, href = candidates[0]
    return item("claude", "Claude", "Anthropic", title, d, href, "模型", "Anthropic 官方 Claude 发布", "Anthropic")


def fetch_gemini():
    feed = feedparser.parse("https://blog.google/rss/")
    candidates = []
    for e in feed.entries:
        title = clean(e.get("title", ""), 180)
        low = title.lower()
        if "gemini" not in low:
            continue
        score = 0
        if "introducing gemini" in low:
            score += 4
        if re.search(r"gemini\s+\d", low):
            score += 2
        if any(k in low for k in ["model", "flash", "pro", "omni", "deep think", "transcribe"]):
            score += 1
        pp = e.get("published_parsed") or e.get("updated_parsed")
        if not pp:
            continue
        d = datetime(*pp[:6], tzinfo=timezone.utc).date().isoformat()
        candidates.append((d, score, title, e.get("link", "https://blog.google/innovation-and-ai/models-and-research/gemini-models/")))
    if not candidates:
        raise RuntimeError("Google RSS parse failed")
    # 优先重大模型发布，同一天按评分取高；仍以日期为第一排序
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    d, _, title, href = candidates[0]
    return item("gemini", "Gemini", "Google", title, d, href, "模型", "Google 官方 Gemini 发布", "Google")


def fetch_grok():
    base = "https://x.ai"
    url = base + "/news"
    soup = BeautifulSoup(get(url).text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        title = clean(a.get_text(" ", strip=True), 170)
        low = title.lower()
        if "grok" not in low:
            continue
        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = _parent_date(a)
        if not d:
            continue
        score = 0
        if low.startswith("introducing grok"):
            score += 5
        if re.search(r"grok\s+\d", low):
            score += 3
        if "bot" in low:
            score += 1
        # 集成/上架消息权重较低，避免盖过真正的新模型发布
        if any(k in low for k in [" on ", "in github", "available via", "included with"]):
            score -= 2
        candidates.append((d, score, title, href))
    if not candidates:
        raise RuntimeError("xAI news parse failed")
    # 先挑近 45 天内重大条目，再以日期选择
    candidates.sort(key=lambda x: (x[1], x[0]), reverse=True)
    best_score = candidates[0][1]
    pool = [x for x in candidates if x[1] >= max(3, best_score - 1)]
    pool.sort(key=lambda x: x[0], reverse=True)
    d, _, title, href = pool[0]
    return item("grok", "Grok", "xAI", title, d, href, "模型", "xAI 官方 Grok 发布", "xAI")


def fetch_deepseek():
    url = "https://api-docs.deepseek.com/zh-cn/updates/"
    soup = BeautifulSoup(get(url).text, "html.parser")
    headings = soup.find_all(["h2", "h3"])
    current_date = None
    candidates = []
    for h in headings:
        txt = clean(h.get_text(" ", strip=True), 180)
        d = iso_date(txt)
        if d and ("时间" in txt or re.search(r"20\d{2}[-/年]", txt)):
            current_date = d
            continue
        if current_date and ("DeepSeek" in txt or "发布" in txt or "更新" in txt):
            candidates.append((current_date, txt, url))
    if not candidates:
        # 文本级兜底
        txt = clean(soup.get_text(" ", strip=True), 5000)
        m = re.search(r"时间[:：]?\s*(20\d{2}-\d{1,2}-\d{1,2}).{0,80}?(DeepSeek[^。]{3,100}?(?:发布|更新))", txt)
        if m:
            candidates.append((iso_date(m.group(1)), clean(m.group(2), 160), url))
    if not candidates:
        raise RuntimeError("DeepSeek updates parse failed")
    candidates.sort(key=lambda x: x[0], reverse=True)
    d, title, href = candidates[0]
    return item("deepseek", "DeepSeek", "DeepSeek", title, d, href, "模型", "DeepSeek 官方 API 更新日志", "DeepSeek")


def main():
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            old = {}
    old_map = {x.get("id"): x for x in old.get("releases", []) if x.get("id")}

    fetchers = [fetch_codex, fetch_claude, fetch_gemini, fetch_grok, fetch_deepseek]
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

    releases.sort(key=lambda x: x.get("date", ""), reverse=True)
    old_releases = old.get("releases", [])
    changed = releases != old_releases
    if not changed and OUT.exists():
        print("No release changes; JSON unchanged.")
        return

    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "releases": releases,
        "errors": errors,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUT}")


if __name__ == "__main__":
    main()
