import os
paths = [
    r'C:\Users\FELIPE BARROSO\Downloads\AEGP\GradientManipulator\GradientManipulator.cpp',
    r'C:\Users\FELIPE BARROSO\Downloads\AfterEffectsSDK_25.6_61_win\AfterEffectsSDK_25.6_61_win\ae25.6_61.64bit.AfterEffectsSDK\Examples\Template\Skeleton\Skeleton.cpp',
    r'C:\Users\FELIPE BARROSO\Documents\SDKAFTERGRADIENTE\GradientManipulator.cpp',
    r'C:\AEGP\GradientManipulator\GradientManipulator.cpp'
]
b = 'lt+"key"+gt+"Stops List"+lt+"key"+gt+nl;'
f = 'lt+"key"+gt+"Stops List"+lt+"/key"+gt+nl;'

for p in paths:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as fh: txt = fh.read()
        if b in txt:
            with open(p, 'w', encoding='utf-8') as fh: fh.write(txt.replace(b, f))
            print('FIXED', p)
