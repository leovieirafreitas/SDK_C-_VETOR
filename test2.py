import os

with open(r'c:\AEGP\grad_data.json', 'r', encoding='utf-8') as f:
    js = f.read()

gn = js.find('"gradient"')
stA = js.find('"stops"', gn)
brS = js.find('[', stA)
brE = js.find(']', brS)
ob = js.find('{', brS)

print('gn:', gn, 'stA:', stA, 'brS:', brS, 'brE:', brE, 'ob:', ob)

stops = []
sp = brS
while True:
    ob = js.find('{', sp)
    if ob == -1 or ob > brE: break
    cb = js.find('}', ob)
    if cb == -1: break
    
    def cnum(k):
        kp = js.find(k, ob)
        if kp == -1 or kp > cb: return -1.0
        colon = js.find(':', kp) + 1
        while colon < cb and js[colon] in ' \n\r': colon += 1
        end = colon
        while end < cb and js[end] in '0123456789.-': end += 1
        try:
            return float(js[colon:end])
        except:
            return -1.0
            
    stops.append({'pos': cnum('"pos"'), 'r': cnum('"r"')})
    sp = cb + 1

print('STOPS:', stops)
