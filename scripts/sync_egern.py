#!/usr/bin/env python3
"""Fetch, validate and rebuild Egern rule sets; never execute upstream content."""
import argparse
import bisect
import ipaddress as ip
import json
import re
import time
import urllib.request
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / 'Egern/Rules'
POLICY = json.loads((ROOT / 'scripts/egern-policy.json').read_text())
UPSTREAM = 'https://raw.githubusercontent.com/QuixoticHeart/rule-set/refs/heads/ruleset/egern/'
VOICE = 'https://openai.com/chatgpt-voice.json'
CLAUDE_IP = 'https://platform.claude.com/docs/en/api/ip-addresses.md'
GOOG = 'https://www.gstatic.com/ipranges/goog.json'
CLOUD = 'https://www.gstatic.com/ipranges/cloud.json'
KEYS = ('domain_set','domain_suffix_set','domain_keyword_set','domain_regex_set',
        'domain_wildcard_set','ip_cidr_set','ip_cidr6_set','asn_set','url_regex_set',
        'user_agent_set','geoip_set')
IPS = ('ip_cidr_set','ip_cidr6_set')
CACHE = {}
LABELS = {
 'chatgpt':'OpenAI / ChatGPT / Codex / Sora',
 'claude':'Anthropic / Claude / Claude Code / MCP',
 'google':'Google / Gemini / YouTube / Firebase / FCM',
 'other':'Other proxy services'
}
NOTES = {
 'chatgpt':'OpenAI network recommendations; QuixoticHeart AI; official Voice IP JSON',
 'claude':'Anthropic official inbound/outbound IP documentation (excludes phased-out IPs); QuixoticHeart AI',
 'google':'QuixoticHeart Google, FCM, AI; Google service IP ranges (goog.json minus cloud.json)',
 'other':'QuixoticHeart proxy and AI; excludes dedicated categories, Apple and Chinese AI; preserves custom entries'
}

def fetch(url):
    if url in CACHE:
        return CACHE[url]
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Egern-Rule-Sync/1.0','Cache-Control':'no-cache','Accept':'*/*'})
            with urllib.request.urlopen(req, timeout=45) as r:
                raw = r.read(10_000_001)
            if not 20 < len(raw) <= 10_000_000:
                raise ValueError('unexpected response length')
            s = raw.decode('utf-8-sig')
            if re.match(r'\s*<!doctype html',s,re.I):
                raise ValueError('unexpected HTML')
            CACHE[url] = s
            return s
        except Exception as exc:
            print(f'{url}: {exc}')
            if attempt == 2:
                raise
            time.sleep(2**attempt)

def empty():
    return {k:set() for k in KEYS}

class UniqueLoader(yaml.BaseLoader):
    pass

def unique_mapping(loader,node):
    out={}
    for key,val in node.value:
        k=loader.construct_object(key)
        if k in out:
            raise ValueError(f'duplicate YAML key: {k}')
        out[k]=loader.construct_object(val)
    return out
UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,unique_mapping)

def parse(text,label):
    d=yaml.load(text,Loader=UniqueLoader)
    if not isinstance(d,dict):
        raise ValueError(f'{label}: expected mapping')
    out=empty()
    for k,vs in d.items():
        if k=='no_resolve':
            if str(vs).lower() not in ('true','false'):
                raise ValueError(f'{label}: invalid no_resolve')
            continue
        if k not in KEYS or not isinstance(vs,list):
            raise ValueError(f'{label}: unsupported or invalid section {k}')
        for v in vs:
            if not isinstance(v,str) or not v.strip() or '\n' in v or '\r' in v:
                raise ValueError(f'{label}: invalid rule in {k}')
            v=v.strip()
            if k in ('domain_set','domain_suffix_set','domain_keyword_set'):
                v=v.lower().rstrip('.')
            if k in IPS:
                n=ip.ip_network(v,strict=False)
                if n.version != (4 if k==IPS[0] else 6) or n.prefixlen==0:
                    raise ValueError(f'{label}: unsafe or invalid CIDR {v}')
                v=str(n)
            out[k].add(v)
    return out

def count(r):
    return sum(map(len,r.values()))

def merge(*rules):
    out=empty()
    for r in rules:
        for k,vs in r.items():
            out[k].update(vs)
    return out

def pick(r,fn):
    return {k:{v for v in vs if fn(k,v)} for k,vs in r.items()}

def pin(name):
    return merge(POLICY[name])

def read(name):
    return parse((RULES/f'{name}.yaml').read_text(),name)

def source(name,minimum):
    r=parse(fetch(UPSTREAM+name+'.yaml'),name)
    if count(r)<minimum:
        raise ValueError(f'{name}: upstream incomplete')
    return r

def root(v,r):
    return v==r or v.endswith('.'+r)

def openai(k,v):
    return k.startswith('domain_') and (any(x in v.lower() for x in ('openai','chatgpt','oaistatic','oaistatsig','oaiusercontent')) or v in ('chat.com','ai.com','sora.com'))

def anthropic(k,v):
    if not k.startswith('domain_'):
        return False
    if k=='domain_keyword_set':
        return v in ('anthropic','claude')
    return 'anthropic' in v.lower() or any(root(v,r) for r in ('clau.de','antspace.dev','ant.dev','claude.ai','claude.app','claude.com','claude.dev','claude.new','claude.site','claudemcpclient.com','claudemcpcontent.com','claudepages.dev','claudeusercontent.com'))

def google(k,v):
    return k.startswith('domain_') and (bool(re.search(r'(^|[.-])(google(?:apis|usercontent)?|gstatic|deepmind|gemini|notebooklm|antigravity|makersuite)([.-]|$)',v,re.I)) or any(root(v,r) for r in ('g.ai','ai.studio','gemma.ai','withgoogle.com','generativeai.google','stitch.withgoogle.com')))

def ips(values):
    out=empty()
    for v in values:
        n=ip.ip_network(v,strict=False)
        if n.prefixlen==0:
            raise ValueError('unsafe default CIDR')
        out[IPS[n.version==6]].add(str(n))
    if not count(out):
        raise ValueError('empty IP ranges')
    return out

def voice(text):
    raw=json.dumps(json.loads(text))
    r=ips(re.findall(r'(?<![0-9a-fA-F:.])[0-9a-fA-F:.]+/\d{1,3}',raw))
    if count(r)<10:
        raise ValueError('voice IP feed unexpectedly short')
    return r

def claude_ip(text):
    start=re.search(r'^## Inbound IP addresses\s*$',text,re.M|re.I)
    stop=re.search(r'^###? Phased out IP addresses\s*$',text,re.M|re.I)
    if not start or not stop or stop.start()<=start.start():
        raise ValueError('Anthropic IP document structure changed')
    active=text[start.start():stop.start()]
    if not re.search(r'^## Outbound IP addresses\s*$',active,re.M|re.I):
        raise ValueError('missing Anthropic outbound section')
    r=ips(re.findall(r'[0-9a-fA-F:.]+/\d{1,3}',active))
    if not all(r[k] for k in IPS):
        raise ValueError('missing Anthropic IP family')
    return r

def intervals(values,version):
    nets=(ip.ip_network(v) for v in values)
    items=sorted((int(n.network_address),int(n.broadcast_address)) for n in nets if n.version==version)
    out=[]
    for a,b in items:
        if out and a<=out[-1][1]+1:
            out[-1]=(out[-1][0],max(b,out[-1][1]))
        else:
            out.append((a,b))
    return out

def google_ip(goog,cloud):
    def values(s):
        data=json.loads(s)
        p=data['prefixes']
        if not isinstance(p,list) or len(p)<10:
            raise ValueError('Google IP feed unexpectedly short')
        return [x.get('ipv4Prefix') or x['ipv6Prefix'] for x in p]
    gv,cv=values(goog),values(cloud)
    result=empty()
    for version,key,addr in ((4,IPS[0],ip.IPv4Address),(6,IPS[1],ip.IPv6Address)):
        g,c=intervals(gv,version),intervals(cv,version)
        for a,b in g:
            for x,y in c:
                if y<a:
                    continue
                if x>b:
                    break
                if x>a:
                    result[key].update(str(n) for n in ip.summarize_address_range(addr(a),addr(x-1)))
                a=max(a,y+1)
                if a>b:
                    break
            if a<=b:
                result[key].update(str(n) for n in ip.summarize_address_range(addr(a),addr(b)))
    if not all(result[k] for k in IPS):
        raise ValueError('Google service IP calculation unexpectedly empty')
    return result

def owner_index(r):
    index={}
    for key,version in zip(IPS,(4,6)):
        ranges=intervals(r[key],version)
        index[key]=([a for a,b in ranges],ranges)
    return r,index

def covered(k,v,owners):
    r,index=owners
    if v in r[k]:
        return True
    if k in ('domain_set','domain_suffix_set'):
        parts=v.split('.')
        if any('.'.join(parts[i:]) in r['domain_suffix_set'] for i in range(len(parts))):
            return True
        if any(w in v for w in r['domain_keyword_set']):
            return True
    if k in IPS:
        n=ip.ip_network(v)
        starts,ranges=index[k]
        i=bisect.bisect_right(starts,int(n.network_address))-1
        return i>=0 and ranges[i][1]>=int(n.broadcast_address)
    return False

def china(k,v):
    if k in ('domain_set','domain_suffix_set'):
        return any(root(v,r) for r in POLICY['cnDomains'])
    return k=='domain_keyword_set' and v in POLICY['cnKeywords']

def other(proxy,ai,owners):
    idx=owner_index(merge(*owners))
    return pick(merge(proxy,ai,pin('other')),lambda k,v:not china(k,v) and not covered(k,v,idx))

def guard(name,r,old):
    if count(r)<max(5,count(old)//2):
        raise ValueError(f'{name}: suspicious rule count {count(old)} -> {count(r)}')
    return r

def render(name,r):
    # JSON strings are valid YAML scalars, including quoted IPv6 and regex.
    lines=['# '+LABELS[name]+' routing rules for Egern','# '+NOTES[name],
           '# Dedicated categories must precede Other.','no_resolve: true']
    for k in KEYS:
        if r[k]:
            lines+=['',k+':']+['- '+json.dumps(v,ensure_ascii=False) for v in sorted(r[k])]
    text='\n'.join(lines)+'\n'
    if parse(text,name)!=r:
        raise ValueError(f'{name}: serialization round-trip mismatch')
    return text

def test():
    a=parse('no_resolve: true\ndomain_suffix_set:\n- example.com\nip_cidr_set:\n- 10.0.0.0/8\n','test')
    idx=owner_index(a)
    assert covered('domain_set','x.example.com',idx)
    assert not covered('domain_set','notexample.com',idx)
    assert covered('ip_cidr_set','10.1.0.0/16',idx)
    assert not covered('ip_cidr_set','10.0.0.0/7',idx)
    assert count(claude_ip('## Inbound IP addresses\n160.79.104.0/23\n2607:6bc0::/48\n## Outbound IP addresses\n160.79.104.0/21\n### Phased out IP addresses\n34.162.46.92/32'))==3
    try:
        parse('domain_set:\n- a.com\ndomain_set:\n- b.com','bad')
    except ValueError:
        pass
    else:
        raise AssertionError('duplicate mapping accepted')
    assert parse(render('chatgpt',a),'test')==a
    print('Self-tests passed')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('target',choices=('all','chatgpt','claude','google','other','test'))
    args=p.parse_args()
    test()
    if args.target=='test':
        return
    target=args.target
    names=('chatgpt','claude','google','other','apple-ai')
    old={k:read(k) for k in names}
    result={k:old[k] for k in names}
    ai=source('ai',30)
    if target in ('all','chatgpt'):
        result['chatgpt']=guard('chatgpt',merge(pin('chatgpt'),pick(ai,openai),voice(fetch(VOICE))),old['chatgpt'])
    if target in ('all','claude'):
        result['claude']=guard('claude',merge(pin('claude'),pick(ai,anthropic),claude_ip(fetch(CLAUDE_IP))),old['claude'])
    if target in ('all','google'):
        result['google']=guard('google',merge(source('google',100),source('googlefcm',10),pick(ai,google),pin('google'),google_ip(fetch(GOOG),fetch(CLOUD))),old['google'])
        result['google']['domain_set'].discard('claude.googleapis.com')
        result['google']['domain_suffix_set'].discard('claude.googleapis.com')
    apple=[source(x,5) for x in ('apple','apple-cn','apple-proxy','apple-tv','apns')]
    owners=[result[x] for x in ('chatgpt','claude','google','apple-ai')]+apple
    result['other']=guard('other',other(source('proxy',1000),ai,owners),old['other'])
    selected=('chatgpt','claude','google','other') if target=='all' else ('other',) if target=='other' else (target,'other')
    # Fully validate all selected outputs before changing any tracked file.
    texts={k:render(k,result[k]) for k in selected}
    for k,s in texts.items():
        dest=RULES/f'{k}.yaml'
        tmp=dest.with_suffix('.yaml.tmp')
        tmp.write_text(s,encoding='utf-8')
        tmp.replace(dest)
        print(k,{section:len(v) for section,v in result[k].items() if v})

if __name__=='__main__':
    main()
