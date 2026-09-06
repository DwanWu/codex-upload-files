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
UA = "Mozilla/5.0 (AIReleaseRadar/3.0; +https://github.com/DwanWu/codex-upload-files)"
HEADERS = {"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"}
MONTHS = {m: i for i, m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], 1)}
ALLOWED = {"chatgpt", "claude", "gemini", "grok"}


def get(url, timeout=25):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r


def clean(s, limit=160):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s if len(s) <= limit else s[: limit - 1] + "…"


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
    if m and m.group(1)[:3] in MONTHS:
        return f"{int(m.group(3)):04d}-{MONTHS[m.group(1)[:3]]:02d}-{int(m.group(2)):02d}"
    return None


def looks_like_date(text):
    s = str(text or "").strip()
    return bool(
        re.fullmatch(r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, 20\d{2}", s)
        or re.fullmatch(r"20\d{2}年\d{1,2}月\d{1,2}日", s)
        or re.fullmatch(r"20\d{2}-\d{1,2}-\d{1,2}", s)
    )


def zh_title(pid, raw):
    raw = clean(raw, 140)
    if not raw:
        return {
            "chatgpt": "ChatGPT 官方发布新版本或重大功能更新",
            "claude": "Claude 官方发布新模型或重大功能更新",
            "gemini": "Gemini 官方发布新模型或重大功能更新",
            "grok": "Grok 官方发布新模型或重大功能更新",
        }.get(pid, "AI 官方发布新版本或重大功能更新")
    if re.search(r"[\u4e00-\u9fff]", raw):
        return raw

    exact = {
        "Share ChatGPT Sites with people outside your workspace": "ChatGPT Sites 现支持与工作区外人员共享",
        "Healthcare plugins for ChatGPT and Codex": "ChatGPT 与 Codex 新增医疗保健插件",
    }
    if raw in exact:
        return exact[raw]

    m = re.match(r"^(?:Introducing|Announcing)\s+(.+)$", raw, re.I)
    if m:
        return "发布 " + re.sub(r"\band\b", "与", m.group(1), flags=re.I)

    m = re.match(r"^(.+?)\s+is now available(?:.*)$", raw, re.I)
    if m:
        return f"{m.group(1)} 现已发布"

    m = re.match(r"^New\s+(.+)$", raw, re.I)
    if m:
        return f"推出新的 {m.group(1)}"

    names = {"chatgpt": "ChatGPT", "claude": "Claude", "gemini": "Gemini", "grok": "Grok"}
    return f"{names.get(pid, 'AI')} 官方发布新版本或重大功能更新"


def item(pid, name, vendor, raw_title, date, url, kind="更新", summary="", source=""):
    return {
        "id": pid,
        "name": name,
        "vendor": vendor,
        "title": zh_title(pid, raw_title),
        "raw_title": clean(raw_title, 140),
        "date": date,
        "url": url,
        "kind": kind,
        "summary": clean(summary, 180),
        "source": source,
    }


def _parent_date(a):
    node = a
    for _ in range(5):
        if not node:
            break
        txt = clean(node.get_text(" ", strip=True), 900)
        m = re.search(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*20\d{2}\b", txt)
        if m:
            d = iso_date(m.group(0))
            if d:
                return d
        node = node.parent
    return None


def fetch_chatgpt():
    url = "https://openai.com/zh-Hans-CN/products/release-notes/"
    soup = BeautifulSoup(get(url).text, "html.parser")
    strings = [clean(x, 260) for x in soup.stripped_strings]
    skip = {
        "ChatGPT", "GA", "Preview", "Beta", "Alpha", "Sunset",
        "通用可用性", "全面开放", "预览", "测试版", "早期测试", "停止支持",
        "View source", "Help center", "Platform docs", "查看来源", "帮助中心", "平台文档"
    }

    for i, s in enumerate(strings):
        if s != "ChatGPT":
            continue
        d = None
        di = None
        for j in range(i + 1, min(i + 9, len(strings))):
            if looks_like_date(strings[j]):
                d, di = iso_date(strings[j]), j
                break
        if not d:
            continue

        title = None
        kind = "ChatGPT 更新"
        for j in range(di + 1, min(di + 12, len(strings))):
            t = strings[j]
            if t in {"GA", "通用可用性", "全面开放"}:
                kind = "正式发布"
                continue
            if t in {"Preview", "预览"}:
                kind = "预览版"
                continue
            if t in {"Beta", "测试版"}:
                kind = "测试版"
                continue
            if t in skip or len(t) < 5:
                continue
            title = t
            break

        if title:
            return item(
                "chatgpt", "ChatGPT", "OpenAI", title, d, url, kind,
                "OpenAI 官方 ChatGPT 发布记录，涵盖模型、应用、工具与产品功能更新。",
                "OpenAI 官方"
            )

    raise RuntimeError("OpenAI ChatGPT 官方发布页解析失败")


def fetch_claude():
    base = "https://www.anthropic.com"
    soup = BeautifulSoup(get(base + "/news").text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        raw = clean(a.get_text(" ", strip=True), 180)
        if "claude" not in raw.lower():
            continue
        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = _parent_date(a)
        if not d:
            continue
        low = raw.lower()
        score = 4 if low.startswith("introducing claude") else 0
        if any(k in low for k in ["opus", "sonnet", "fable", "mythos", "haiku"]):
            score += 2
        if "claude code" in low:
            score += 1
        candidates.append((d, score, raw, href))
    if not candidates:
        raise RuntimeError("Anthropic 官方发布页解析失败")
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    d, _, raw, href = candidates[0]
    return item("claude", "Claude", "Anthropic", raw, d, href, "模型发布",
                "Anthropic 官方 Claude 模型或重大功能发布。", "Anthropic 官方")


def fetch_gemini():
    feed = feedparser.parse("https://blog.google/rss/")
    candidates = []
    for e in feed.entries:
        raw = clean(e.get("title", ""), 190)
        low = raw.lower()
        if "gemini" not in low:
            continue
        pp = e.get("published_parsed") or e.get("updated_parsed")
        if not pp:
            continue
        score = 4 if "introducing gemini" in low else 0
        if re.search(r"gemini\s+\d", low):
            score += 2
        if any(k in low for k in ["model", "flash", "pro", "deep think"]):
            score += 1
        d = datetime(*pp[:6], tzinfo=timezone.utc).date().isoformat()
        candidates.append((d, score, raw, e.get("link", "https://blog.google/innovation-and-ai/models-and-research/gemini-models/")))
    if not candidates:
        raise RuntimeError("Google 官方 RSS 解析失败")
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    d, _, raw, href = candidates[0]
    return item("gemini", "Gemini", "Google", raw, d, href, "模型发布",
                "Google 官方 Gemini 模型或重大功能发布。", "Google 官方")


def fetch_grok():
    base = "https://x.ai"
    soup = BeautifulSoup(get(base + "/news").text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        raw = clean(a.get_text(" ", strip=True), 180)
        low = raw.lower()
        if "grok" not in low:
            continue
        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = _parent_date(a)
        if not d:
            continue
        score = 5 if low.startswith("introducing grok") else 0
        if re.search(r"grok\s+\d", low):
            score += 3
        if any(k in low for k in [" on ", "in github", "available via", "included with"]):
            score -= 2
        candidates.append((d, score, raw, href))
    if not candidates:
        raise RuntimeError("xAI 官方发布页解析失败")
    candidates.sort(key=lambda x: (x[1], x[0]), reverse=True)
    best = candidates[0][1]
    pool = [x for x in candidates if x[1] >= max(3, best - 1)]
    pool.sort(key=lambda x: x[0], reverse=True)
    d, _, raw, href = pool[0]
    return item("grok", "Grok", "xAI", raw, d, href, "模型发布",
                "xAI 官方 Grok 模型或重大功能发布。", "xAI 官方")


def main():
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            old = {}
    old_map = {x.get("id"): x for x in old.get("releases", []) if x.get("id") in ALLOWED}

    releases = []
    errors = []
    for fn in [fetch_chatgpt, fetch_claude, fetch_gemini, fetch_grok]:
        pid = fn.__name__.replace("fetch_", "")
        try:
            r = fn()
            if not r.get("date"):
                raise RuntimeError("缺少发布日期")
            releases.append(r)
            print(f"OK {r['name']}: {r['date']} {r['title']}")
        except Exception as e:
            errors.append(f"{pid}: {e}")
            if pid in old_map:
                releases.append(old_map[pid])
                print(f"FALLBACK {pid}: {e}")
            else:
                print(f"ERROR {pid}: {e}")

    releases = [x for x in releases if x.get("id") in ALLOWED]
    releases.sort(key=lambda x: x.get("date", ""), reverse=True)

    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sources": ["ChatGPT", "Claude", "Gemini", "Grok"],
        "releases": releases,
        "errors": errors,
    }

    old_norm = {k: old.get(k) for k in ["sources", "releases", "errors"]}
    new_norm = {k: data.get(k) for k in ["sources", "releases", "errors"]}
    if OUT.exists() and old_norm == new_norm:
        print("No release changes; JSON unchanged.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUT}")


if __name__ == "__main__":
    main()
