# Scales the rendered icon layers to every Android density and web size, and draws the splash screens.
import sys, os
from PIL import Image, ImageDraw
tmp, root = sys.argv[1], sys.argv[2]
res = os.path.join(root, 'android/app/src/main/res')
full = Image.open(os.path.join(tmp, 'full.png')).convert('RGBA')
bg = Image.open(os.path.join(tmp, 'bg.png')).convert('RGBA')
fg = Image.open(os.path.join(tmp, 'fg.png')).convert('RGBA')
rnd = Image.open(os.path.join(tmp, 'round.png')).convert('RGBA')

def rounded(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = im.copy(); out.putalpha(m); return out

def circle(im):
    big = im.size[0] * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).ellipse([0, 0, big - 1, big - 1], fill=255)
    out = im.copy(); out.putalpha(m.resize(im.size, Image.LANCZOS)); return out

R = Image.LANCZOS
for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    f = s * 108 // 48
    dd = os.path.join(res, 'mipmap-' + d)
    rounded(full.resize((s, s), R), s * 0.16).save(os.path.join(dd, 'ic_launcher.png'))
    circle(rnd.resize((s, s), R)).save(os.path.join(dd, 'ic_launcher_round.png'))
    fg.resize((f, f), R).save(os.path.join(dd, 'ic_launcher_foreground.png'))
    bg.convert('RGB').resize((f, f), R).save(os.path.join(dd, 'ic_launcher_background.png'))

# web: favicon, apple touch icon, manifest icons
pub = os.path.join(root, 'public')
full.resize((64, 64), R).save(os.path.join(pub, 'favicon.png'))
full.convert('RGB').resize((180, 180), R).save(os.path.join(pub, 'apple-touch-icon.png'))
for s in (192, 512):
    full.resize((s, s), R).save(os.path.join(pub, f'icon-{s}.png'))

# splash screens: dark club-house brown with the round icon in the middle
for folder in os.listdir(res):
    p = os.path.join(res, folder, 'splash.png')
    if not os.path.exists(p): continue
    w, h = Image.open(p).size
    sp = Image.new('RGB', (w, h), (27, 22, 18))
    s = int(min(w, h) * 0.32)
    ic = circle(rnd.resize((s, s), R))
    sp.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
    sp.save(p)
print('icons written')
