#!/usr/bin/env python3
"""Mirror a third-party module as inert text, preserving a local description. Do not execute it."""
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SOURCE = 'https://nys4f2st.nvidia.cn.com:8443/tag.sgmodule'
MAX_SIZE = 2_000_000
DESCRIPTION = '#!desc=辅助 TAG 连接外网使用的模块。'.encode('utf-8')

class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        dest = urllib.parse.urlsplit(newurl)
        orig = urllib.parse.urlsplit(SOURCE)
        if dest.scheme != 'https' or dest.netloc.lower() != orig.netloc.lower() or dest.username or dest.password:
            raise ValueError('Unexpected redirect origin')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def validate(data):
    if not 0 < len(data) <= MAX_SIZE:
        raise ValueError('Empty or oversized module')
    s = data.decode('utf-8-sig')
    if '\x00' in s or re.match(r'\s*(?:<!doctype|<html|<head|<body|<\?xml)',s,re.I):
        raise ValueError('Not a text module')
    sections = re.findall(r'(?m)^\s*\[([A-Za-z][A-Za-z0-9 _-]*)\]\s*$',s)
    allowed = {'general','rule','rule-set','script','mitm','url rewrite','header rewrite','body rewrite','host','map local','mock','panel','proxy','proxy group','dns','replica','http request','http response'}
    if not any(x.lower() in allowed for x in sections):
        raise ValueError('No recognized module section')
    # Conservative credential detection before publication to a public repo.
    checks = (
        r'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----',
        r'(?i)\b(?:password|passwd|private[-_ ]?key|access[-_ ]?token|auth[-_ ]?token|api[-_ ]?key|secret)\s*[:=]\s*["\x27]?[^\s,\x27"#;]{6,}',
        r'(?i)[?&](?:token|access_token|auth|api_key|password|secret|subscription_token|key)=[^&#\s]{8,}',
        r'(?i)\bBearer\s+[A-Za-z0-9._~-]{16,}',
        r'(?i)\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,})\b',
        r'(?i)\b(?:vmess|vless|trojan|ss|hysteria2|tuic)://[^\s]+',
        r'(?im)^\s*(?:ca-p12|ca-passphrase)\s*=\s*\S+',
    )
    if any(re.search(p,s) for p in checks):
        raise ValueError('Possible private credential detected; refusing public mirror')
    return data

def apply_description(data):
    pattern = rb'(?m)^#!desc=[^\r\n]*'
    if re.search(pattern, data):
        return re.sub(pattern, lambda _: DESCRIPTION, data, count=1)
    # Add metadata after the module name, preserving the source line ending.
    eol = b'\r\n' if b'\r\n' in data else b'\n'
    name = re.search(rb'(?m)^(?:\xef\xbb\xbf)?#!name=[^\r\n]*(?:\r?\n|$)', data)
    if name:
        sep = b'' if data[:name.end()].endswith(b'\n') else eol
        return data[:name.end()] + sep + DESCRIPTION + eol + data[name.end():]
    bom = b'\xef\xbb\xbf' if data.startswith(b'\xef\xbb\xbf') else b''
    return bom + DESCRIPTION + eol + data[len(bom):]

def download():
    opener=urllib.request.build_opener(SameOriginRedirect(),urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    for attempt in range(3):
        try:
            req=urllib.request.Request(SOURCE,headers={'User-Agent':'Surge-Module-Mirror/1.0','Accept':'text/plain, */*','Cache-Control':'no-cache'})
            with opener.open(req,timeout=25) as r:
                if r.status!=200:
                    raise ValueError(f'Unexpected HTTP status {r.status}')
                raw=r.read(MAX_SIZE+1)
            return apply_description(validate(raw))
        except (urllib.error.URLError,TimeoutError,OSError,UnicodeError,ValueError) as exc:
            print(f'Fetch attempt {attempt+1} failed: {type(exc).__name__}',file=sys.stderr)
            if attempt==2:
                raise SystemExit('Module not updated; existing version preserved')
            time.sleep(2**attempt)

if __name__=='__main__':
    out=Path(sys.argv[1])
    data=download()
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_bytes(data)
    print(f'Validated {len(data)} bytes; saved with local description without execution.')
