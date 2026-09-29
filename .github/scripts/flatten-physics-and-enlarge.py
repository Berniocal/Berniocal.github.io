from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Slightly larger cards: prefer 3 columns on common desktop widths.
s = s.replace('.grid{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}',
              '.grid{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}')
s = s.replace('border-radius:var(--r);padding:17px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px;min-height:150px;',
              'border-radius:var(--r);padding:19px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:11px;min-height:165px;')
s = s.replace('font-weight:800;font-size:18px}.icon{width:32px;height:32px;',
              'font-weight:800;font-size:19px}.icon{width:36px;height:36px;')

old_e = '["sub","elektrina","⚡","Elektřina","Elektrické obvody a další pomůcky pro výuku elektřiny."]'
new_e = '["app","🔌","Elektrické obvody","/obvody","Interaktivní elektrické obvody, výpočty a simulace chování součástek.","https://bernio.cz/obvody"]'
s = s.replace(old_e, new_e)

old_v = '["sub","vernier_fyz","📡","Vernier","Nástroje a aplikace pro práci se senzory Vernier."]'
new_v = '["app","📡","Vernier","/vernier","Nástroje pro práci se senzory Vernier a zpracování laboratorních měření.","https://bernio.cz/vernier"]'
s = s.replace(old_v, new_v)

# Remove now-unneeded one-item subsections to avoid duplicate search results.
s = s.replace(',"elektrina":[["app","🔌","Obvody","/obvody","Interaktivní elektrické obvody, výpočty a simulace chování součástek.","https://bernio.cz/obvody"]]', '')
s = s.replace(',"vernier_fyz":[["app","📡","Vernier","/vernier","Nástroje pro práci se senzory Vernier a zpracování laboratorních měření.","https://bernio.cz/vernier"]]', '')

s = s.replace(',"elektrina":"Elektřina"', '')
s = s.replace(',"vernier_fyz":"Vernier"', '')
s = s.replace(',"elektrina":"fyzika"', '')
s = s.replace(',"vernier_fyz":"fyzika"', '')

p.write_text(s, encoding='utf-8')

assert 'minmax(270px,1fr)' in s
assert '["app","🔌","Elektrické obvody"' in s
assert '["app","📡","Vernier","/vernier"' in s
assert '["sub","elektrina"' not in s
assert '["sub","vernier_fyz"' not in s
