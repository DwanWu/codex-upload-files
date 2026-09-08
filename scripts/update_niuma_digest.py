#!/usr/bin/env python3
import html
import json
import os
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
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
ACCOUNT_NAMES = {handle.lower(): name for handle, name in ACCOUNTS}
MAX_FEED = 40
MAX_X_API_PAGES = 20

RESET_RE = re.compile(
    r"\b(reset|resetting|reseting|banked reset|usage limits?|rate limits?|quota|credits?|extra usage)\b",
    re.I,
)
CODEX_RE = re.compile(
    r"\b(codex|chatgpt work|astra|gpt[- ]?5(?:\.\d+)?[- ]?codex(?:[- ]?mini|[- ]?max)?|gpt[- ]?6)\b",
    re.I,
)
CJK_RE = re.compile(r"[\u3400-\u9fff]")
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_old():
    if not OUT.exists():
        return {}
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


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
    s = html.unescape(str(value or ""))
    s = re.sub(r"https?://t\.co/\w+", "", s)
    s = re.sub(r"https?://\S+", "", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize_x_url(url, handle="", tweet_id=""):
    s = str(url or "").strip()
    if s.startswith("/"):
        s = "https://x.com" + s
    s = s.replace("https://twitter.com/", "https://x.com/")
    s = s.replace("http://twitter.com/", "https://x.com/")
    if not s and handle and tweet_id:
        s = f"https://x.com/{handle}/status/{tweet_id}"
    return s


def classify(handle, text):
    if not text:
        return None
    if RESET_RE.search(text) and (CODEX_RE.search(text) or handle.lower() == "thsottiaux"):
        return "reset"
    # 所有来源都必须明确提及 Codex/Astra/GPT-Codex/GPT-6，避免 OpenAIDevs 泛 AI 动态混入。
    if CODEX_RE.search(text):
        return "update"
    return None


def retry_delay(exc, attempt, default=20):
    headers = getattr(exc, "headers", None)
    if headers:
        reset_at = headers.get("x-rate-limit-reset")
        if reset_at:
            try:
                return max(5, min(int(reset_at) - int(time.time()) + 2, 90))
            except Exception:
                pass
        retry_after = headers.get("Retry-After")
        if retry_after:
            try:
                return max(5, min(int(float(retry_after)), 90))
            except Exception:
                pass
    return min(default * (attempt + 1), 90)


def request_json(url, headers, timeout=25, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except HTTPError as exc:
            last_error = exc
            retryable = exc.code == 429 or 500 <= exc.code <= 599
            if not retryable or attempt >= attempts - 1:
                raise
            delay = retry_delay(exc, attempt)
            print(f"http {exc.code}: retry in {delay}s")
            time.sleep(delay)
        except (URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt >= attempts - 1:
                raise
            delay = min(10 * (attempt + 1), 30)
            print(f"network retry in {delay}s: {type(exc).__name__}")
            time.sleep(delay)
    if last_error:
        raise last_error
    return {}


def translate_zh(text):
    text = normalize_text(text)
    if not text or CJK_RE.search(text):
        return text

    params = urlencode({
        "client": "gtx",
        "sl": "auto",
        "tl": "zh-CN",
        "dt": "t",
        "q": text,
    })
    url = f"https://translate.googleapis.com/translate_a/single?{params}"
    data = request_json(
        url,
        {"User-Agent": HEADERS["User-Agent"], "Accept": "application/json"},
        timeout=15,
        attempts=2,
    )

    parts = []
    if isinstance(data, list) and data and isinstance(data[0], list):
        for seg in data[0]:
            if isinstance(seg, list) and seg and seg[0]:
                parts.append(str(seg[0]))
    return normalize_text("".join(parts))


def summarize_zh(text, limit=56):
    s = normalize_text(text)
    if not s:
        return ""

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

    boundaries = []
    for m in re.finditer(r"[。；;，,！!？?]", s[:limit + 1]):
        if m.end() >= 24:
            boundaries.append(m.end())
    if boundaries:
        summary = s[:boundaries[-1]].rstrip(" ，,。；;：:")
        if summary:
            return summary + "…"
    return s[: max(1, limit - 1)].rstrip() + "…"


# ---------- 官方 X API v2 主源 ----------

def fetch_x_api(old):
    token = os.getenv("X_BEARER_TOKEN", "").strip()
    if not token:
        return [], {"status": "not_configured", "posts": 0}, None

    handles = " OR ".join(f"from:{handle}" for handle, _ in ACCOUNTS)
    base_params = {
        "query": f"({handles}) -is:retweet",
        "max_results": "100",
        "sort_order": "recency",
        "tweet.fields": "created_at,author_id,public_metrics",
        "expansions": "author_id",
        "user.fields": "username,name",
    }
    since_id = str(old.get("x_api_newest_id") or "").strip()
    if since_id.isdigit():
        base_params["since_id"] = since_id

    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "application/json",
    }

    tweets = []
    users = {}
    next_token = None
    newest_id = None
    page_count = 0

    while True:
        page_count += 1
        if page_count > MAX_X_API_PAGES:
            # 不推进游标，宁可回退也不要因为截断分页而永久漏掉消息。
            raise RuntimeError(f"X API pagination exceeded {MAX_X_API_PAGES} pages")

        params = dict(base_params)
        if next_token:
            params["next_token"] = next_token
        url = "https://api.x.com/2/tweets/search/recent?" + urlencode(params)
        payload = request_json(url, headers, timeout=25, attempts=3)

        if payload.get("errors") and not payload.get("data"):
            raise RuntimeError(f"X API returned errors: {payload.get('errors')}")

        for user in payload.get("includes", {}).get("users", []) or []:
            users[str(user.get("id") or "")] = user

        page_tweets = payload.get("data", []) or []
        tweets.extend(page_tweets)
        meta = payload.get("meta") or {}
        candidate = str(meta.get("newest_id") or "")
        if candidate.isdigit() and (newest_id is None or int(candidate) > int(newest_id)):
            newest_id = candidate
        for tweet in page_tweets:
            tweet_id = str(tweet.get("id") or "")
            if tweet_id.isdigit() and (newest_id is None or int(tweet_id) > int(newest_id)):
                newest_id = tweet_id

        next_token = meta.get("next_token")
        if not next_token:
            break

    items = []
    for tweet in tweets:
        tweet_id = str(tweet.get("id") or "")
        if not tweet_id:
            continue
        user = users.get(str(tweet.get("author_id") or ""), {})
        handle = str(user.get("username") or "").strip()
        if not handle:
            continue
        text = normalize_text(tweet.get("text"))
        kind = classify(handle, text)
        if not kind:
            continue

        metrics = tweet.get("public_metrics") or {}
        items.append({
            "id": tweet_id,
            "kind": kind,
            "handle": handle,
            "author_name": str(user.get("name") or ACCOUNT_NAMES.get(handle.lower()) or handle),
            "created_at": parse_dt(tweet.get("created_at")).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "text": text[:700],
            "url": f"https://x.com/{handle}/status/{tweet_id}",
            "likes": int(metrics.get("like_count") or 0),
            "reposts": int(metrics.get("retweet_count") or 0),
            "source": "x_api",
        })

    return items, {
        "status": "ok",
        "posts": len(items),
        "raw_posts": len(tweets),
        "pages": page_count,
    }, newest_id


# ---------- 公开 syndication 兜底 ----------

def fetch_profile(handle, attempts=3):
    url = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}?dnt=true&lang=en"
    last_error = None
    for attempt in range(attempts):
        req = Request(url, headers=HEADERS)
        try:
            with urlopen(req, timeout=20) as resp:
                html_text = resp.read().decode("utf-8", errors="replace")
            match = NEXT_DATA_RE.search(html_text)
            if not match:
                raise RuntimeError("missing __NEXT_DATA__")
            data = json.loads(match.group(1))
            return data.get("props", {}).get("pageProps", {}).get("timeline", {}).get("entries", [])
        except HTTPError as exc:
            last_error = exc
            if exc.code != 429 or attempt >= attempts - 1:
                raise
            delay = retry_delay(exc, attempt, default=30)
            print(f"{handle}: rate limited; retry in {delay}s")
            time.sleep(delay)
        except (URLError, TimeoutError, OSError, RuntimeError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt >= attempts - 1:
                raise
            delay = min(10 * (attempt + 1), 30)
            print(f"{handle}: retry in {delay}s: {type(exc).__name__}")
            time.sleep(delay)
    if last_error:
        raise last_error
    return []


def extract_syndication(handle, fallback_name, entries):
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

        items.append({
            "id": tweet_id,
            "kind": kind,
            "handle": screen_name,
            "author_name": author_name,
            "created_at": parse_dt(tweet.get("created_at")).astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "text": text[:700],
            "url": normalize_x_url(tweet.get("permalink"), screen_name, tweet_id),
            "likes": int(tweet.get("favorite_count") or 0),
            "reposts": int(tweet.get("retweet_count") or 0),
            "source": "x_syndication",
        })
    return items


def fetch_syndication():
    fetched = []
    ok = 0
    failed = []
    for idx, (handle, name) in enumerate(ACCOUNTS):
        try:
            entries = fetch_profile(handle)
            extracted = extract_syndication(handle, name, entries)
            fetched.extend(extracted)
            ok += 1
            print(f"{handle}: ok ({len(entries)} timeline entries; {len(extracted)} matched)")
        except Exception as exc:
            failed.append(handle)
            print(f"{handle}: {type(exc).__name__}: {exc}")
        if idx < len(ACCOUNTS) - 1:
            time.sleep(35)

    return fetched, {
        "status": "ok" if ok == len(ACCOUNTS) else ("partial" if ok else "failed"),
        "accounts_ok": ok,
        "accounts_total": len(ACCOUNTS),
        "failed_accounts": failed,
        "posts": len(fetched),
    }


def sort_key(item):
    return parse_dt(item.get("created_at")).timestamp()


def merge_feed(old_feed, fetched):
    merged = {}
    for original in old_feed + fetched:
        item = dict(original)
        item_id = str(item.get("id") or "")
        if not item_id:
            continue
        item["url"] = normalize_x_url(item.get("url"), item.get("handle", ""), item_id)
        previous = merged.get(item_id)
        if previous:
            if previous.get("text_zh") and not item.get("text_zh"):
                item["text_zh"] = previous["text_zh"]
            if previous.get("summary_zh") and not item.get("summary_zh"):
                item["summary_zh"] = previous["summary_zh"]
        merged[item_id] = item
    return sorted(merged.values(), key=sort_key, reverse=True)[:MAX_FEED]


def enrich_feed(feed):
    translated = 0
    summarized = 0
    for item in feed:
        if not item.get("text_zh"):
            try:
                zh = translate_zh(item.get("text", ""))
                if zh:
                    item["text_zh"] = zh[:700]
                    translated += 1
            except Exception as exc:
                print(f"translate {item.get('id')}: {type(exc).__name__}: {exc}")
            time.sleep(0.5)

        source_zh = item.get("text_zh") or item.get("text") or ""
        summary = summarize_zh(source_zh)
        if summary and item.get("summary_zh") != summary:
            item["summary_zh"] = summary
            summarized += 1
    return translated, summarized


def main():
    old = load_old()
    old_feed = old.get("feed") if isinstance(old.get("feed"), list) else []
    source_health = {}
    fetched = []
    active_source = ""
    newest_id = old.get("x_api_newest_id")

    try:
        api_items, api_health, api_newest_id = fetch_x_api(old)
        source_health["x_api"] = api_health
        if api_health.get("status") == "ok":
            fetched = api_items
            active_source = "x_api"
            newest_id = api_newest_id or newest_id
            print(
                f"x_api: ok ({api_health.get('raw_posts', 0)} raw; "
                f"{len(api_items)} matched; {api_health.get('pages', 0)} pages)"
            )
    except Exception as exc:
        source_health["x_api"] = {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
        print(f"x_api: {type(exc).__name__}: {exc}")

    if not active_source:
        try:
            synd_items, synd_health = fetch_syndication()
            source_health["x_syndication"] = synd_health
            if synd_health.get("accounts_ok", 0) > 0:
                fetched = synd_items
                active_source = "x_syndication"
        except Exception as exc:
            source_health["x_syndication"] = {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
            print(f"x_syndication: {type(exc).__name__}: {exc}")

    # 所有来源都失败时保留已有健康数据和消息，不写坏 JSON。
    if not active_source:
        print("All X sources unavailable; preserving existing NiuMaDigest data unchanged")
        return

    feed = merge_feed(old_feed, fetched)
    if not feed:
        print("No matching Codex posts; preserving existing data")
        return

    translated, summarized = enrich_feed(feed)
    latest_reset = next((x for x in feed if x.get("kind") == "reset"), None)
    latest_update = next((x for x in feed if x.get("kind") == "update"), None)

    active_health = source_health.get(active_source, {})
    accounts_ok = (
        len(ACCOUNTS)
        if active_source == "x_api"
        else int(active_health.get("accounts_ok") or 0)
    )

    stamp = now_iso()
    payload = {
        "updated_at": stamp,
        "last_success_at": stamp,
        "source": active_source,
        "source_health": source_health,
        "translation": "zh-CN",
        "summary": "zh-CN-compact",
        "accounts_total": len(ACCOUNTS),
        "accounts_ok": accounts_ok,
        "accounts": [{"handle": h, "name": n} for h, n in ACCOUNTS],
        "x_api_newest_id": newest_id,
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

    state_changed = (
        old_state != new_state
        or old.get("x_api_newest_id") != newest_id
        or old.get("source") != active_source
        or old.get("source_health") != source_health
        or int(old.get("accounts_ok") or 0) != accounts_ok
    )
    if not state_changed:
        print(f"No 牛马消息 content/health changes; source={active_source}")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Updated {OUT} with {len(feed)} posts; "
        f"{translated} translated; {summarized} summarized; source={active_source}"
    )


if __name__ == "__main__":
    main()
