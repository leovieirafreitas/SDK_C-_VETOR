import os

paths = [
    r'C:\Users\FELIPE BARROSO\Downloads\AEGP\GradientManipulator\GradientManipulator.cpp',
    r'C:\Users\FELIPE BARROSO\Downloads\AfterEffectsSDK_25.6_61_win\AfterEffectsSDK_25.6_61_win\ae25.6_61.64bit.AfterEffectsSDK\Examples\Template\Skeleton\Skeleton.cpp',
    r'C:\Users\FELIPE BARROSO\Documents\SDKAFTERGRADIENTE\GradientManipulator.cpp',
    r'C:\AEGP\GradientManipulator\GradientManipulator.cpp'
]

b = 'const std::string nl = "&#xA;", lt = "&lt;", gt = "&gt;", ap = "&apos;";'
f = 'const std::string nl = "&#xA;", lt = "&lt;", gt = "&gt;", ap = "\'";'

count = 0
for p in paths:
    try:
        with open(p, 'r', encoding='utf-8') as fh:
            txt = fh.read()
        if b in txt:
            with open(p, 'w', encoding='utf-8') as fh:
                fh.write(txt.replace(b, f))
            print('FIXED APOS:', p)
            count += 1
    except Exception as e:
        print('ERROR', p, e)
print('Total Fixed APOS:', count)
