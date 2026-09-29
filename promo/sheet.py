import sys, glob
from PIL import Image, ImageDraw
files = sys.argv[2:] if len(sys.argv) > 2 else sorted(glob.glob('out/stills/*.jpg'))
out = sys.argv[1]
W = 640; H = 360; cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H), (255, 0, 255))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    x, y = (i % cols) * W, (i // cols) * H
    sheet.paste(im, (x, y))
    d.text((x + 6, y + 4), f.split('/')[-1], fill=(255, 255, 0))
sheet.save(out, quality=88)
