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
UA = "Mozilla/5.0 (AIReleaseRadar/4.1; +https://github.com/DwanWu/codex-upload-files)"
HEADERS = {"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"}
ALLOWED = {"chatgpt", "claude", "gemini", "grok"}


def get(url, timeout=25):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r


def clean(s, limit=180):
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
    if m:
        try:
            return datetime.strptime(f"{m.group(1)[:3]} {m.group(2)}, {m.group(3)}", "%b %d, %Y").date().isoformat()
        except ValueError:
            return None
    return None


def nearest_date_before(strings, idx, span=18):
    for j in range(idx - 1, max(-1, idx - span), -1):
        d = iso_date(strings[j])
        if d:
            return d
    return None


def parent_date(a):
    node = a
    for _ in range(6):
        if not node:
            break
        txt = clean(node.get_text(" ", strip=True), 1000)
        m = re.search(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*20\d{2}\b", txt)
        if m:
            d = iso_date(m.group(0))
            if d:
                return d
        node = node.parent
    return None


def normalize_model_title(pid, raw):
    raw = clean(raw, 200)
    if pid == "grok":
        # xAI 新闻卡片常把“标题 + 摘要 + 日期”全部放进同一个 <a>。
        # 这里只保留明确的模型发布标题，避免整段摘要进入面板。
        m = re.search(r"\bIntroducing\s+(Grok\s+\d+(?:\.\d+)?)\b", raw, re.I)
        if m:
            return f"Introducing {m.group(1)}"
        m = re.search(r"\b(Grok\s+\d+(?:\.\d+)?)\b", raw, re.I)
        if m:
            return f"Introducing {m.group(1)}"
    return raw


def zh_title(raw):
    raw = clean(raw, 150)
    if not raw:
        return "模型发布"
    if re.search(r"[\u4e00-\u9fff]", raw):
        return raw
    m = re.match(r"^(?:Introducing|Announcing)\s+(.+)$", raw, re.I)
    if m:
        return "发布 " + re.sub(r"\band\b", "与", m.group(1), flags=re.I)
    m = re.match(r"^(.+?)\s+is now available(?:.*)$", raw, re.I)
    if m:
        return f"{m.group(1)} 现已发布"
    return raw


def item(pid, name, vendor, raw_title, date, url, summary, source):
    raw_title = normalize_model_title(pid, raw_title)
    return {
        "id": pid,
        "name": name,
        "vendor": vendor,
        "title": zh_title(raw_title),
        "raw_title": clean(raw_title, 150),
        "date": date,
        "url": url,
        "kind": "模型发布",
        "summary": clean(summary, 200),
        "source": source,
    }


def fetch_chatgpt():
    url = "https://openai.com/products/release-notes/"
    soup = BeautifulSoup(get(url).text, "html.parser")
    strings = [clean(x, 260) for x in soup.stripped_strings]
    candidates = []

    for i, raw in enumerate(strings):
        low = raw.lower().replace("‑", "-").replace("–", "-")
        is_model_name = bool(
            re.search(r"\bgpt[- ]?\d", low)
            or re.search(r"\bo\d(?:[- .]|$)", low)
        )
        is_release_title = bool(
            re.search(r"\b(introducing|announcing|released|launching)\b", low)
            or "is now available" in low
        )
        if not (is_model_name and is_release_title):
            continue
        d = nearest_date_before(strings, i, 20)
        if d:
            candidates.append((d, raw))

    if not candidates:
        raise RuntimeError("OpenAI 官方发布页未找到模型发布")
    candidates.sort(key=lambda x: x[0], reverse=True)
    d, raw = candidates[0]
    return item(
        "chatgpt", "ChatGPT", "OpenAI", raw, d, url,
        "OpenAI 最新 GPT/o 系列模型发布；仅记录模型版本，不记录 ChatGPT 一般功能更新。",
        "OpenAI 官方"
    )


def fetch_claude():
    base = "https://www.anthropic.com"
    soup = BeautifulSoup(get(base + "/news").text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        raw = clean(a.get_text(" ", strip=True), 200)
        low = raw.lower()
        if not re.match(r"^introducing\s+claude\b", low):
            continue
        if not (re.search(r"\d", low) or any(k in low for k in ["opus", "sonnet", "haiku", "fable", "mythos"])):
            continue
        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = parent_date(a)
        if d:
            candidates.append((d, raw, href))
    if not candidates:
        raise RuntimeError("Anthropic 官方发布页未找到 Claude 模型发布")
    candidates.sort(key=lambda x: x[0], reverse=True)
    d, raw, href = candidates[0]
    return item(
        "claude", "Claude", "Anthropic", raw, d, href,
        "Anthropic 最新 Claude 模型发布；不记录 Claude Code、功能或集成更新。",
        "Anthropic 官方"
    )


def fetch_gemini():
    feed = feedparser.parse("https://blog.google/rss/")
    candidates = []
    for e in feed.entries:
        raw = clean(e.get("title", ""), 200)
        low = raw.lower()
        if not re.match(r"^introducing\s+gemini\b", low):
            continue
        if not re.search(r"gemini\s+\d", low):
            continue
        pp = e.get("published_parsed") or e.get("updated_parsed")
        if not pp:
            continue
        d = datetime(*pp[:6], tzinfo=timezone.utc).date().isoformat()
        candidates.append((d, raw, e.get("link", "https://blog.google/innovation-and-ai/models-and-research/gemini-models/")))
    if not candidates:
        raise RuntimeError("Google 官方 RSS 未找到 Gemini 模型发布")
    candidates.sort(key=lambda x: x[0], reverse=True)
    d, raw, href = candidates[0]
    return item(
        "gemini", "Gemini", "Google", raw, d, href,
        "Google 最新 Gemini 模型发布；不记录 Gemini App 一般功能更新。",
        "Google 官方"
    )


def fetch_grok():
    base = "https://x.ai"
    soup = BeautifulSoup(get(base + "/news").text, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        card_raw = clean(a.get_text(" ", strip=True), 260)
        if not re.search(r"\bIntroducing\s+Grok\s+\d", card_raw, re.I):
            continue

        # 优先读取卡片中的标题节点；若页面结构变化，再由 normalize_model_title 截取。
        heading = a.find(["h1", "h2", "h3", "h4", "h5"])
        raw = clean(heading.get_text(" ", strip=True), 160) if heading else normalize_model_title("grok", card_raw)
        raw = normalize_model_title("grok", raw)

        href = urljoin(base, a.get("href"))
        if "/news/" not in href:
            continue
        d = parent_date(a)
        if d:
            candidates.append((d, raw, href))
    if not candidates:
        raise RuntimeError("xAI 官方发布页未找到 Grok 模型发布")
    candidates.sort(key=lambda x: x[0], reverse=True)
    d, raw, href = candidates[0]
    return item(
        "grok", "Grok", "xAI", raw, d, href,
        "xAI 最新 Grok 模型发布；不记录平台集成、Bot 或应用功能更新。",
        "xAI 官方"
    )


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
        if x.get("id") in ALLOWED and x.get("kind") == "模型发布"
    }

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
                fallback = dict(old_map[pid])
                if pid == "grok":
                    fallback["raw_title"] = normalize_model_title("grok", fallback.get("raw_title") or fallback.get("title"))
                    fallback["title"] = zh_title(fallback["raw_title"])
                releases.append(fallback)
                print(f"FALLBACK {pid}: {e}")
            else:
                print(f"ERROR {pid}: {e}")

    releases.sort(key=lambda x: x.get("date", ""), reverse=True)
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "mode": "model_releases_only",
        "sources": ["ChatGPT", "Claude", "Gemini", "Grok"],
        "releases": releases,
        "errors": errors,
    }

    old_norm = {k: old.get(k) for k in ["mode", "sources", "releases", "errors"]}
    new_norm = {k: data.get(k) for k in ["mode", "sources", "releases", "errors"]}
    if OUT.exists() and old_norm == new_norm:
        print("No model release changes; JSON unchanged.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUT}")


if __name__ == "__main__":
    main()
