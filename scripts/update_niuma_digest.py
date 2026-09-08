#!/usr/bin/env python3
import json
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Egern/Widget/NiuMaDigest/NiuMaDigest.json"

ACCOUNTS = [
    ("thsottiaux", "Tibo"),
    ("dkundel", "Dominik"),
    ("nickbaumann_", "Nick"),
    ("OpenAIDevs", "OpenAI Developers"),
]

RESET_RE = re.compile(
    r"\b(reset|resetting|reseting|banked reset|usage limits?|rate limits?|quota|credits?|extra usage)\b",
    re.I,
)
UPDATE_RE = re.compile(
    r"\b(update|updated|ship|shipped|shipping|release|released|launch|launched|rollout|rolling out|"
    r"available|landed|lands|new|added|fix|fixed|feature|version|app|cli|extension|browser|plugin|hooks?)\b",
    re.I,
)
CODEX_RE = re.compile(r"\b(codex|chatgpt work|astra)\b", re.I)
CJK_RE = re.compile(r"[\u3400-\u9fff]")
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def load_old():
    if not OUT.exists():
        return {}
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def fetch_profile(handle):
    url = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}"
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    match = NEXT_DATA_RE.search(html)
    if not match:
        raise RuntimeError("missing __NEXT_DATA__")
    data = json.loads(match.group(1))
    return data.get("props", {}).get("pageProps", {}).get("timeline", {}).get("entries", [])


def parse_dt(value):
    if not value:
        return datetime.now(timezone.utc)
    try:
        d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    try:
        d = parsedate_to_datetime(str(value))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def normalize_text(value):
    s = re.sub(r"https?://t\.co/\w+", "", str(value or ""))
    s = re.sub(r"https?://\S+", "", s)
    return re.sub(r"\s+", " ", s).strip()


def translate_zh(text):
    text = normalize_text(text)
    if not text:
        return ""
    if CJK_RE.search(text):
        return text

    params = urlencode({
        "client": "gtx",
        "sl": "auto",
        "tl": "zh-CN",
        "dt": "t",
        "q": text,
    })
    url = f"https://translate.googleapis.com/translate_a/single?{params}"
    req = Request(url, headers={"User-Agent": HEADERS["User-Agent"], "Accept": "application/json"})
    with urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8", errors="replace"))

    parts = []
    if isinstance(data, list) and data and isinstance(data[0], list):
        for seg in data[0]:
            if isinstance(seg, list) and seg and seg[0]:
                parts.append(str(seg[0]))
    return normalize_text("".join(parts))


def summarize_zh(text, limit=52):
    s = normalize_text(text)
    if not s:
        return ""

    # 只做稳定的文字压缩，不改产品名、方案名和数字。
    replacements = [
        ("已经", "已"),
        ("目前正在", "正"),
        ("正在", ""),
        ("将会", "将"),
        ("陆续开始", "陆续"),
        ("正式开始", "开始"),
        ("进行完整的", "进行完整"),
    ]
    for old, new in replacements:
        s = s.replace(old, new)
    s = re.sub(r"\s+", " ", s).strip(" ，,。；;：:")

    if len(s) <= limit:
        return s

    # 优先在句号、分号、逗号处收尾，避免截断关键短语。
    boundaries = []
    for m in re.finditer(r"[。；;，,！!？?]", s[:limit + 1]):
        if m.end() >= 24:
            boundaries.append(m.end())
    if boundaries:
        cut = boundaries[-1]
        summary = s[:cut].rstrip(" ，,。；;：:")
        if summary:
            return summary + "…"

    return s[: max(1, limit - 1)].rstrip() + "…"


def classify(handle, text):
    is_reset = bool(RESET_RE.search(text)) and (bool(CODEX_RE.search(text)) or handle.lower() == "thsottiaux")
    if is_reset:
        return "reset"
    if CODEX_RE.search(text) and UPDATE_RE.search(text):
        return "update"
    return None


def extract(handle, fallback_name, entries):
    items = []
    for entry in entries:
        if entry.get("type") != "tweet":
            continue
        tweet = entry.get("content", {}).get("tweet", {}) or {}
        text = normalize_text(tweet.get("full_text") or tweet.get("text"))
        if not text:
            continue
        kind = classify(handle, text)
        if not kind:
            continue

        user = tweet.get("user", {}) or {}
        screen_name = str(user.get("screen_name") or handle)
        author_name = str(user.get("name") or fallback_name)
        tweet_id = str(tweet.get("id_str") or tweet.get("id") or "")
        if not tweet_id:
            continue
        created = parse_dt(tweet.get("created_at"))
        permalink = str(tweet.get("permalink") or f"https://x.com/{screen_name}/status/{tweet_id}")
        permalink = permalink.replace("https://twitter.com/", "https://x.com/")
        permalink = permalink.replace("http://twitter.com/", "https://x.com/")

        items.append({
            "id": tweet_id,
            "kind": kind,
            "handle": screen_name,
            "author_name": author_name,
            "created_at": created.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "text": text[:420],
            "url": permalink,
            "likes": int(tweet.get("favorite_count") or 0),
            "reposts": int(tweet.get("retweet_count") or 0),
        })
    return items


def sort_key(item):
    return parse_dt(item.get("created_at")).timestamp()


def main():
    old = load_old()
    old_feed = old.get("feed") if isinstance(old.get("feed"), list) else []
    fetched = []
    ok = 0

    for idx, (handle, name) in enumerate(ACCOUNTS):
        try:
            entries = fetch_profile(handle)
            fetched.extend(extract(handle, name, entries))
            ok += 1
            print(f"{handle}: ok ({len(entries)} timeline entries)")
        except Exception as exc:
            print(f"{handle}: {type(exc).__name__}: {exc}")
        if idx < len(ACCOUNTS) - 1:
            time.sleep(20)

    merged = {}
    for item in old_feed + fetched:
        item_id = str(item.get("id") or "")
        if not item_id:
            continue
        previous = merged.get(item_id)
        if previous and previous.get("text") == item.get("text"):
            item = dict(item)
            if previous.get("text_zh") and not item.get("text_zh"):
                item["text_zh"] = previous["text_zh"]
            if previous.get("summary_zh") and not item.get("summary_zh"):
                item["summary_zh"] = previous["summary_zh"]
        merged[item_id] = item

    feed = sorted(merged.values(), key=sort_key, reverse=True)[:30]

    translated = 0
    summarized = 0
    for item in feed:
        if not item.get("text_zh"):
            try:
                zh = translate_zh(item.get("text", ""))
                if zh:
                    item["text_zh"] = zh[:420]
                    translated += 1
            except Exception as exc:
                print(f"translate {item.get('id')}: {type(exc).__name__}: {exc}")
            time.sleep(0.6)

        source_zh = item.get("text_zh") or item.get("text") or ""
        summary = summarize_zh(source_zh)
        if summary and item.get("summary_zh") != summary:
            item["summary_zh"] = summary
            summarized += 1

    latest_reset = next((x for x in feed if x.get("kind") == "reset"), None)
    latest_update = next((x for x in feed if x.get("kind") == "update"), None)

    if not feed:
        print("No matching Codex X posts; leaving existing data unchanged")
        return

    accounts = [{"handle": h, "name": n} for h, n in ACCOUNTS]
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "x_syndication",
        "translation": "zh-CN",
        "summary": "zh-CN-compact",
        "accounts_total": len(ACCOUNTS),
        "accounts_ok": ok,
        "accounts": accounts,
        "latest_reset": latest_reset,
        "latest_update": latest_update,
        "feed": feed,
    }

    old_state = [
        (x.get("id"), x.get("kind"), x.get("text"), x.get("text_zh"), x.get("summary_zh"))
        for x in old_feed
    ]
    new_state = [
        (x.get("id"), x.get("kind"), x.get("text"), x.get("text_zh"), x.get("summary_zh"))
        for x in feed
    ]
    old_ok = old.get("accounts_ok")
    if old_state == new_state and old_ok == ok and old.get("summary") == "zh-CN-compact":
        print("No 牛马消息 content changes")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Updated {OUT} with {len(feed)} posts; "
        f"{translated} translated; {summarized} summarized; {ok}/{len(ACCOUNTS)} sources available"
    )


if __name__ == "__main__":
    main()
