import subprocess, sys

def pip(p):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", p])

pip("groq")
pip("flask")
pip("flask-cors")
pip("pillow")
pip("numpy")
pip("requests")
pip("rembg[cpu]")

import os, json, time, base64, threading, random
import numpy as np
from io import BytesIO
from groq import Groq
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as req
import urllib.parse

try:
    from rembg import remove as rembg_remove
    REMBG_MEVCUT = True
    print("✅ rembg yüklendi")
except Exception:
    REMBG_MEVCUT = False
    print("⚠️ rembg yüklenemedi, renk bazlı yedek kullanılacak")

GROQ_API_KEY = "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"
HF_TOKEN     = "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"

groq_client = Groq(api_key=GROQ_API_KEY)
app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────
# SABITLER
# ─────────────────────────────────────────────────────
URUN_BOYUTLARI = {
    "vazo":   (512, 512),
    "tabak":  (512, 512),
    "bardak": (512, 512),
    "comlek": (512, 512),
    "kilim":  (768, 512),
}

# Kilim için özel motif çevirici — Türkçe/genel → kilim motif dili
KILIM_MOTIF_SOZLUGU = {
    "peri bacasi":  "tall cone-shaped rock formation silhouette motifs as repeating woven geometric symbols",
    "peri bacası":  "tall cone-shaped rock formation silhouette motifs as repeating woven geometric symbols",
    "fairy chimney":"tall cone-shaped rock formation silhouette motifs as repeating woven geometric symbols",
    "kapadokya":    "Cappadocia cone rock formation symbols, cave dwelling woven motifs",
    "cappadocia":   "Cappadocia cone rock formation symbols, cave dwelling woven motifs",
    "cicek":        "stylized eight-pointed star flower medallion woven motifs",
    "çiçek":        "stylized eight-pointed star flower medallion woven motifs",
    "floral":       "stylized eight-pointed star flower medallion woven motifs",
    "hayat agaci":  "tree of life woven motif, branching vertical symmetry",
    "hayat ağacı":  "tree of life woven motif, branching vertical symmetry",
    "nazar":        "evil eye protective concentric diamond medallion woven symbol",
    "nazarlik":     "evil eye protective concentric diamond medallion woven symbol",
    "yildiz":       "eight-pointed star medallion repeating woven pattern",
    "yıldız":       "eight-pointed star medallion repeating woven pattern",
    "star":         "eight-pointed star medallion repeating woven pattern",
    "geometrik":    "bold interlocking diamond and chevron woven geometric symbols",
    "geometric":    "bold interlocking diamond and chevron woven geometric symbols",
    "at":           "stylized horse silhouette woven geometric motifs",
    "kus":          "stylized bird silhouette woven geometric motifs",
    "kuş":          "stylized bird silhouette woven geometric motifs",
}

KILIM_PROMPT_SABLONLARI = [
    (
        "flat lay top-down aerial product photo of a handwoven Turkish kilim rug "
        "lying completely flat on pure white floor, {motif}, {renk} color palette, "
        "intricate woven wool texture, symmetric geometric border, "
        "rectangular shape WIDER than tall, "
        "ONLY the rug — NO plants NO greenery NO people NO furniture NO shadows outside rug, "
        "clean white background, sharp focus, photorealistic 8K"
    ),
    (
        "overhead bird's-eye view of a rectangular Turkish kilim rug on white surface, "
        "perfectly flat, {motif}, dominant colors {renk}, "
        "hand-woven Anatolian wool texture, decorative geometric border, "
        "landscape rectangle wider than tall, "
        "completely isolated on white — NO objects NO plants NO room context, "
        "professional product photography 8K"
    ),
    (
        "top-down studio product shot of a traditional Anatolian flat-weave kilim, "
        "horizontal rectangle wider than tall, pure white background, "
        "{motif} as the main woven design, {renk} tones, "
        "wool fiber texture visible, repeating geometric border, "
        "NO greenery NO plants NO decorations outside the rug, "
        "ONLY the rug on white, crisp detail, photorealistic 8K"
    ),
]


# ─────────────────────────────────────────────────────
# 1. İSTEK ANALİZİ
# ─────────────────────────────────────────────────────
def istek_analiz_et(kullanici_istegi):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Kullanıcının isteğini analiz et. Sadece JSON döndür.\n\n"
                    "KURALLAR:\n"
                    "- desen: SADECE kullanıcının istediği şey, İngilizce, kısa\n"
                    "- renkler: İngilizce renk isimleri, virgülle\n"
                    "- sade_mi: sadece renk belirtildiyse true\n\n"
                    '{"metin":null,"metin_konum":"orta","urun_tipi":"vazo/tabak/bardak/comlek/kilim",'
                    '"kultur":null,"desen":"...","renkler":"...","sade_mi":false}'
                )
            },
            {"role": "user", "content": kullanici_istegi}
        ]
    )
    return json.loads(yanit.choices[0].message.content)


# ─────────────────────────────────────────────────────
# 2. PROMPT OLUŞTURMA
# ─────────────────────────────────────────────────────
def kilim_motif_cevir(desen):
    desen_l = desen.lower()
    for anahtar, motif in KILIM_MOTIF_SOZLUGU.items():
        if anahtar in desen_l:
            return motif
    return desen

def prompt_olustur(analiz):
    urun_tipi = analiz.get("urun_tipi", "vazo")
    desen     = analiz.get("desen", "geometric patterns")
    renkler   = analiz.get("renkler", "red blue ivory")
    kultur    = analiz.get("kultur") or ""
    sade_mi   = analiz.get("sade_mi", False)

    if urun_tipi == "kilim":
        motif  = kilim_motif_cevir(desen)
        sablon = random.choice(KILIM_PROMPT_SABLONLARI)
        p = sablon.format(motif=motif, renk=renkler)
        print(f"  Kilim motif: '{desen}' → '{motif[:60]}'")
        return p

    kultur_eki = f"{kultur} style, " if kultur else ""
    renk_eki   = f"{renkler} colors, " if renkler else ""
    urun_baglam = {
        "vazo":   "handcrafted ceramic tall vase, white background, photorealistic 8K",
        "tabak":  "handcrafted ceramic plate, white background, photorealistic 8K",
        "bardak": "handcrafted ceramic mug with handle, white background, photorealistic 8K",
        "comlek": "handcrafted clay pot with lid, white background, photorealistic 8K",
    }
    if sade_mi:
        return f"{desen} {urun_baglam.get(urun_tipi,'ceramic product')}, {kultur_eki}{renk_eki}studio lighting, photorealistic 8K"
    return f"{desen}, {kultur_eki}{renk_eki}{urun_baglam.get(urun_tipi,'handcrafted product, white background, photorealistic 8K')}"


# ─────────────────────────────────────────────────────
# 3. GÖRSEL ÜRETİMİ (prompt modu — API çağrısı)
# ─────────────────────────────────────────────────────
def gorsel_uret(prompt, urun_tipi="vazo"):
    genislik, yukseklik = URUN_BOYUTLARI.get(urun_tipi, (512, 512))
    print(f"  Görsel üretiliyor ({genislik}×{yukseklik})...")

    # 1. Pollinations
    try:
        clean   = prompt.encode("ascii", "ignore").decode("ascii")[:450]
        encoded = urllib.parse.quote(" ".join(clean.split()))
        seed    = int(time.time()) % 99999
        purl    = (f"https://image.pollinations.ai/prompt/{encoded}"
                   f"?width={genislik}&height={yukseklik}&nologo=true&model=flux&seed={seed}&enhance=true")
        r = req.get(purl, timeout=70)
        if r.status_code == 200 and "image" in r.headers.get("content-type",""):
            img = Image.open(BytesIO(r.content)).convert("RGB")
            if np.array(img.convert("L")).mean() > 15:
                print("  ✅ Pollinations")
                img = img.resize((genislik, yukseklik), Image.LANCZOS)
                if urun_tipi == "kilim":
                    img = kilim_kenarlari_temizle(img)
                return img
        print(f"  ⚠️ Pollinations HTTP {r.status_code}")
    except Exception as e:
        print(f"  ⚠️ Pollinations: {e}")

    # 2. HuggingFace
    print("  🔄 HuggingFace deneniyor...")
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {"inputs": prompt[:500],
               "parameters": {"width": genislik, "height": yukseklik},
               "options": {"wait_for_model": True}}
    for _ in range(2):
        try:
            r2 = req.post("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
                          headers=headers, json=payload, timeout=90)
            if r2.status_code == 200 and "image" in r2.headers.get("content-type",""):
                img = Image.open(BytesIO(r2.content)).convert("RGB")
                if np.array(img.convert("L")).mean() > 15:
                    print("  ✅ HuggingFace")
                    img = img.resize((genislik, yukseklik), Image.LANCZOS)
                    if urun_tipi == "kilim":
                        img = kilim_kenarlari_temizle(img)
                    return img
            elif r2.status_code == 503:
                time.sleep(min(float(r2.json().get("estimated_time", 20)), 25))
            else:
                time.sleep(5)
        except Exception as e:
            print(f"  ⚠️ HuggingFace: {e}")
            time.sleep(5)

    print("  ❌ Tüm kaynaklar başarısız")
    return Image.new("RGB", (genislik, yukseklik), (245, 235, 220))


# ─────────────────────────────────────────────────────
# 4. KİLİM KENAR TEMİZLEME
#    Pollinations etrafına bitki/obje ekliyor.
#    Beyaz olmayan kenarları tespit edip kırpar.
# ─────────────────────────────────────────────────────
def kilim_kenarlari_temizle(img):
    w, h  = img.size
    arr   = np.array(img, dtype=np.float32)
    beyaz = (arr[:,:,0] > 180) & (arr[:,:,1] > 180) & (arr[:,:,2] > 180)
    dolu_satir  = (~beyaz).mean(axis=1) > 0.08
    dolu_sutun  = (~beyaz).mean(axis=0) > 0.08

    if dolu_satir.any() and dolu_sutun.any():
        y1 = max(0,   int(np.where(dolu_satir)[0][0])  - 6)
        y2 = min(h,   int(np.where(dolu_satir)[0][-1]) + 6)
        x1 = max(0,   int(np.where(dolu_sutun)[0][0])  - 6)
        x2 = min(w,   int(np.where(dolu_sutun)[0][-1]) + 6)
        if (x2-x1) > w*0.3 and (y2-y1) > h*0.3:
            print(f"  ✂️ Kenar temizlendi: ({x1},{y1})→({x2},{y2})")
            return img.crop((x1, y1, x2, y2))
    return img


# ─────────────────────────────────────────────────────
# 5. KOD İLE ÜRÜN ŞEKLİ ÇİZ (fotoğraf modu için)
#    API'ya HİÇ gitmiyor — sade şekil PIL ile çizilir
#    Üzerine fotoğraf texture olarak yapıştırılır
# ─────────────────────────────────────────────────────
def kod_ile_urun_olustur(urun_tipi):
    w, h = URUN_BOYUTLARI.get(urun_tipi, (512, 512))
    img  = Image.new("RGB", (w, h), (255, 255, 255))
    d    = ImageDraw.Draw(img)

    if urun_tipi == "kilim":
        px, py = int(w*0.06), int(h*0.08)
        x0, y0, x1, y1 = px, py, w-px, h-py
        # Hafif gölge
        for i in range(10, 0, -1):
            g = 255 - i*12
            d.rectangle([x0+i, y0+i, x1+i, y1+i], fill=(g, g, g))
        # Zemin
        d.rectangle([x0, y0, x1, y1], fill=(210, 195, 170))
        # Kenar şeritleri (kilim bordür hissi)
        d.rectangle([x0,    y0,    x1,    y1],    outline=(150,120, 90), width=4)
        d.rectangle([x0+10, y0+10, x1-10, y1-10], outline=(170,140,110), width=2)
        d.rectangle([x0+18, y0+18, x1-18, y1-18], outline=(150,120, 90), width=1)
        # Hafif iç gölge (3D his için sol ve üst kenar koyu)
        for i in range(20):
            alfa = int(60 * (1 - i/20))
            g    = max(0, 210 - alfa)
            d.line([(x0+i, y0), (x0+i, y1)], fill=(g, int(g*0.95), int(g*0.88)))
            d.line([(x0, y0+i), (x1, y0+i)], fill=(g, int(g*0.95), int(g*0.88)))

    elif urun_tipi == "tabak":
        cx, cy = w//2, h//2
        r = int(min(w,h) * 0.42)
        # Gölge
        for i in range(8, 0, -1):
            g = 255 - i*10
            d.ellipse([cx-r+i, cy-r+i, cx+r+i, cy+r+i], fill=(g,g,g))
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(220, 215, 208))
        d.ellipse([cx-r+6, cy-r+6, cx+r-6, cy+r-6], outline=(180,170,160), width=2)

    elif urun_tipi in ("vazo", "comlek"):
        px = int(w*0.25); top = int(h*0.08); bot = int(h*0.92)
        # Gölge
        for i in range(8,0,-1):
            g = 255 - i*10
            d.rectangle([px+i, top+i, w-px+i, bot+i], fill=(g,g,g))
        d.rectangle([px, top, w-px, bot], fill=(220, 215, 208))
        # Sol taraf karartma (3D his)
        for i in range(int(w*0.1)):
            alfa = int(50 * (1 - i/(w*0.1)))
            g    = max(0, 220 - alfa)
            d.line([(px+i, top), (px+i, bot)], fill=(g, g-5, g-10))

    elif urun_tipi == "bardak":
        px = int(w*0.22); top = int(h*0.10); bot = int(h*0.88)
        d.rectangle([px, top, w-px, bot], fill=(220, 215, 208))
        # Kulp
        kx = w - px
        d.arc([kx-15, top+40, kx+45, top+150], start=300, end=60,
              fill=(180,170,160), width=10)
        for i in range(int(w*0.08)):
            alfa = int(45*(1-i/(w*0.08)))
            g    = max(0,220-alfa)
            d.line([(px+i,top),(px+i,bot)],fill=(g,g-5,g-10))

    print(f"  🎨 Kod ile {urun_tipi} şekli oluşturuldu ({w}×{h})")
    return img


# ─────────────────────────────────────────────────────
# 6. MASKE ALMA
# ─────────────────────────────────────────────────────
def urun_maskesi_al(img_rgb):
    w, h = img_rgb.size

    if REMBG_MEVCUT:
        try:
            print("  🧹 rembg maske alınıyor...")
            buf = BytesIO(); img_rgb.save(buf, format="PNG"); buf.seek(0)
            sonuc = Image.open(BytesIO(rembg_remove(buf.read()))).convert("RGBA")
            alfa  = np.array(sonuc)[:,:,3]
            gecerli = (alfa > 30).sum() / alfa.size
            print(f"  Maske oranı: %{gecerli*100:.1f}")
            if gecerli > 0.05:
                print("  ✅ rembg başarılı")
                m = Image.fromarray(alfa,"L").filter(ImageFilter.GaussianBlur(1))
                return m.resize((w,h), Image.LANCZOS)
        except Exception as e:
            print(f"  ⚠️ rembg: {e}")

    # Renk bazlı yedek
    print("  🎨 Renk bazlı maske...")
    arr  = np.array(img_rgb, dtype=np.float32)
    hh, ww = arr.shape[:2]
    koseler = np.array([arr[0,0],arr[0,ww-1],arr[hh-1,0],arr[hh-1,ww-1],
                        arr[0,ww//2],arr[hh//2,0],arr[hh//2,ww-1],arr[hh-1,ww//2]])
    bg  = np.median(koseler, axis=0)
    mes = np.sqrt(((arr - bg)**2).sum(axis=2))
    esik = max(35, np.percentile(mes, 20))
    alfa_arr = np.where(mes < esik, 0, 255).astype(np.uint8)
    m = Image.fromarray(alfa_arr,"L")
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(2))
    return m.resize((w,h), Image.LANCZOS)


# ─────────────────────────────────────────────────────
# 7. FOTOĞRAF TEXTURE SARMA
# ─────────────────────────────────────────────────────
def fotografi_urune_texture_sar(urun_img, fotograf_img, urun_tipi="vazo"):
    w, h = urun_img.size
    print(f"  Texture sarma başlıyor ({w}×{h})...")

    maske     = urun_maskesi_al(urun_img)
    maske_arr = np.array(maske, dtype=np.float32) / 255.0
    gecerli   = (maske_arr > 0.1).sum() / maske_arr.size
    print(f"  Ürün maske oranı: %{gecerli*100:.1f}")

    if gecerli < 0.05:
        print("  ⚠️ Maske çok küçük, tam yüzey")
        maske_arr = np.ones((h,w), dtype=np.float32)

    # Bounding box
    mb = maske_arr > 0.1
    satir = np.any(mb, axis=1); sutun = np.any(mb, axis=0)
    if satir.any() and sutun.any():
        y1 = max(0,   np.where(satir)[0][0]  - 4)
        y2 = min(h,   np.where(satir)[0][-1] + 4)
        x1 = max(0,   np.where(sutun)[0][0]  - 4)
        x2 = min(w,   np.where(sutun)[0][-1] + 4)
    else:
        y1,y2,x1,x2 = 0,h,0,w

    alan_w = max(x2-x1, 1)
    alan_h = max(y2-y1, 1)
    print(f"  Ürün alanı: ({x1},{y1})→({x2},{y2}), {alan_w}×{alan_h}")

    # Fotoğrafı ürün alanına sığdır (cover)
    foto = fotograf_img.convert("RGB")
    fw, fh = foto.size
    oran = max(alan_w/fw, alan_h/fh)
    foto = foto.resize((int(fw*oran), int(fh*oran)), Image.LANCZOS)
    fw2, fh2 = foto.size
    sol = (fw2-alan_w)//2; ust = (fh2-alan_h)//2
    foto = foto.crop((sol, ust, sol+alan_w, ust+alan_h))

    # Texture tuvali
    texture = Image.new("RGB", (w,h), (240,240,240))
    texture.paste(foto, (x1,y1))

    # Shading (ürün 3D formu)
    urun_gray = np.array(urun_img.convert("L"), dtype=np.float32) / 255.0
    shading   = np.clip(urun_gray * 1.1 + 0.15, 0.4, 1.15)
    tex_arr   = np.array(texture, dtype=np.float32) / 255.0
    blended   = np.clip(tex_arr * shading[:,:,np.newaxis], 0, 1)
    sonuc_img = Image.fromarray((blended*255).astype(np.uint8), "RGB")
    sonuc_img = ImageEnhance.Color(sonuc_img).enhance(1.15)
    sonuc_img = ImageEnhance.Contrast(sonuc_img).enhance(1.05)

    # Beyaz arka plana yapıştır
    beyaz = Image.new("RGB", (w,h), (255,255,255))
    beyaz.paste(sonuc_img, (0,0), Image.fromarray((maske_arr*255).astype(np.uint8),"L"))

    print("  ✅ Texture sarma tamamlandı")
    return beyaz


# ─────────────────────────────────────────────────────
# 8. METİN EKLEME
# ─────────────────────────────────────────────────────
def metni_ekle(gorsel, metin, konum="orta"):
    img = gorsel.copy().convert("RGBA")
    w, h = img.size
    font_size = max(40, int(h*0.075))
    font = None
    for yol in ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try: font = ImageFont.truetype(yol, font_size); break
        except: pass
    if not font: font = ImageFont.load_default()

    d = ImageDraw.Draw(img)
    try: bbox = d.textbbox((0,0),metin,font=font); tw,th = bbox[2]-bbox[0],bbox[3]-bbox[1]
    except: tw,th = len(metin)*20, 40

    pos = {"orta":((w-tw)//2,(h-th)//2),"ust":((w-tw)//2,int(h*0.12)),
           "alt":((w-tw)//2,h-th-int(h*0.12)),"sol_ust":(int(w*0.08),int(h*0.12)),
           "sag_ust":(w-tw-int(w*0.08),int(h*0.12)),"sol_alt":(int(w*0.08),h-th-int(h*0.12)),
           "sag_alt":(w-tw-int(w*0.08),h-th-int(h*0.12))}
    x,y = pos.get(konum, pos["orta"])

    golge = Image.new("RGBA",img.size,(0,0,0,0))
    ImageDraw.Draw(golge).text((x+3,y+3),metin,font=font,fill=(20,10,5,90))
    golge = golge.filter(ImageFilter.GaussianBlur(2.5))

    boya = Image.new("RGBA",img.size,(0,0,0,0))
    bd   = ImageDraw.Draw(boya)
    for ox,oy,c in [(-1,0,(15,30,100,80)),(1,0,(15,30,100,80)),
                    (0,-1,(15,30,100,80)),(0,1,(15,30,100,80)),(0,0,(30,50,140,210))]:
        bd.text((x+ox,y+oy),metin,font=font,fill=c)

    return Image.alpha_composite(Image.alpha_composite(img,golge),boya).convert("RGB")


def gorsel_to_base64(g):
    buf = BytesIO(); g.save(buf,format="PNG"); buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


# ─────────────────────────────────────────────────────
# 9. FLASK ENDPOINT'LERİ
# ─────────────────────────────────────────────────────
tasarim_oturumlari = {}

@app.route("/saglik", methods=["GET"])
def saglik():
    return jsonify({"durum":"çalışıyor","rembg":REMBG_MEVCUT})

@app.route("/uret", methods=["POST"])
def uret():
    try:
        istek_metni = request.form.get("istek","").strip()
        if not istek_metni:
            return jsonify({"basarili":False,"hata":"istek boş"}), 400

        t0        = time.time()
        analiz    = istek_analiz_et(istek_metni)
        urun_tipi = analiz.get("urun_tipi","vazo")
        print(f"Analiz: {analiz}")

        fotograf_yolu = None
        if "fotograf" in request.files:
            d = request.files["fotograf"]
            if d.filename:
                fotograf_yolu = f"/tmp/{int(time.time())}_{d.filename}"
                d.save(fotograf_yolu)

        if fotograf_yolu:
            # FOTOĞRAF MODU — API'ya gitme, kod ile şekil çiz
            urun_img  = kod_ile_urun_olustur(urun_tipi)
            desen_img = Image.open(fotograf_yolu).convert("RGB")
            gorsel    = fotografi_urune_texture_sar(urun_img, desen_img, urun_tipi)
            try: os.remove(fotograf_yolu)
            except: pass
            kullanilan_prompt = "fotograf_modu"
        else:
            # PROMPT MODU
            kullanilan_prompt = prompt_olustur(analiz)
            print(f"Prompt: {kullanilan_prompt}")
            gorsel = gorsel_uret(kullanilan_prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum","orta"))

        print(f"  ⏱️ {time.time()-t0:.1f}s")
        return jsonify({"basarili":True,"gorsel_base64":gorsel_to_base64(gorsel),
                        "analiz":analiz,"prompt_kullanildi":kullanilan_prompt})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili":False,"hata":str(e)}), 500

@app.route("/tasarim/baslat", methods=["POST"])
def tasarim_baslat():
    try:
        data     = request.json or {}
        prompt_k = data.get("prompt","").strip()
        urun_tipi= data.get("urun_tipi","vazo")
        if not prompt_k:
            return jsonify({"basarili":False,"hata":"prompt boş"}), 400

        session_id = base64.b64encode(os.urandom(16)).decode()[:16]
        analiz = istek_analiz_et(prompt_k)
        analiz["urun_tipi"] = urun_tipi
        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt, urun_tipi)
        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel,analiz["metin"],analiz.get("metin_konum","orta"))

        tasarim_oturumlari[session_id] = {
            "son_gorsel":gorsel,"tasarim_gecmisi":[gorsel],
            "prompt_gecmisi":[prompt_k],"urun_tipi":urun_tipi,"analiz":analiz
        }
        return jsonify({"basarili":True,"session_id":session_id,
                        "gorsel_base64":gorsel_to_base64(gorsel),"analiz":analiz})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili":False,"hata":str(e)}), 500

@app.route("/tasarim/duzenle", methods=["POST"])
def tasarim_duzenle():
    try:
        data          = request.json or {}
        session_id    = data.get("session_id","")
        geri_bildirim = data.get("geri_bildirim","").strip()
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili":False,"hata":"Oturum bulunamadı"}), 404
        if not geri_bildirim:
            return jsonify({"basarili":False,"hata":"geri_bildirim boş"}), 400

        oturum    = tasarim_oturumlari[session_id]
        urun_tipi = oturum["urun_tipi"]
        birlesik  = f"Orijinal: {oturum['prompt_gecmisi'][0]}\nGeri bildirim: {geri_bildirim}"
        analiz    = istek_analiz_et(birlesik)
        analiz["urun_tipi"] = urun_tipi
        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt, urun_tipi)
        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel,analiz["metin"],analiz.get("metin_konum","orta"))

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        oturum["prompt_gecmisi"].append(geri_bildirim)
        oturum["analiz"] = analiz
        return jsonify({"basarili":True,"gorsel_base64":gorsel_to_base64(gorsel),
                        "analiz":analiz,"prompt_kullanildi":prompt})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili":False,"hata":str(e)}), 500

@app.route("/tasarim/fotograf_ekle", methods=["POST"])
def tasarim_fotograf_ekle():
    try:
        session_id = request.form.get("session_id","")
        dosya      = request.files.get("fotograf")
        if not dosya:
            return jsonify({"basarili":False,"hata":"Fotoğraf gerekli"}), 400
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili":False,"hata":"Oturum bulunamadı"}), 404

        fotograf_yolu = f"/tmp/{int(time.time())}_{dosya.filename}"
        dosya.save(fotograf_yolu)
        oturum    = tasarim_oturumlari[session_id]
        urun_tipi = oturum["urun_tipi"]

        # FOTOĞRAF MODU — kod ile şekil
        urun_img  = kod_ile_urun_olustur(urun_tipi)
        desen_img = Image.open(fotograf_yolu).convert("RGB")
        gorsel    = fotografi_urune_texture_sar(urun_img, desen_img, urun_tipi)
        if oturum["analiz"].get("metin"):
            gorsel = metni_ekle(gorsel,oturum["analiz"]["metin"],oturum["analiz"].get("metin_konum","orta"))

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        try: os.remove(fotograf_yolu)
        except: pass
        return jsonify({"basarili":True,"gorsel_base64":gorsel_to_base64(gorsel)})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili":False,"hata":str(e)}), 500

@app.route("/tasarim/gerial", methods=["POST"])
def tasarim_gerial():
    try:
        session_id = (request.json or {}).get("session_id","")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili":False,"hata":"Oturum bulunamadı"}), 404
        oturum = tasarim_oturumlari[session_id]
        if len(oturum["tasarim_gecmisi"]) > 1:
            oturum["tasarim_gecmisi"].pop()
            if len(oturum["prompt_gecmisi"]) > 1: oturum["prompt_gecmisi"].pop()
            oturum["son_gorsel"] = oturum["tasarim_gecmisi"][-1]
            return jsonify({"basarili":True,"gorsel_base64":gorsel_to_base64(oturum["son_gorsel"])})
        return jsonify({"basarili":False,"hata":"Geri alınacak değişiklik yok"}), 400
    except Exception as e:
        return jsonify({"basarili":False,"hata":str(e)}), 500

@app.route("/tasarim/kaydet", methods=["POST"])
def tasarim_kaydet():
    try:
        data       = request.json or {}
        session_id = data.get("session_id","")
        dosya_adi  = data.get("dosya_adi","tasarim.png")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili":False,"hata":"Oturum bulunamadı"}), 404
        oturum     = tasarim_oturumlari[session_id]
        kayit_yolu = f"/tmp/son_tasarimlar/{session_id}_{dosya_adi}"
        os.makedirs("/tmp/son_tasarimlar", exist_ok=True)
        oturum["son_gorsel"].save(kayit_yolu)
        return jsonify({"basarili":True,"dosya_yolu":kayit_yolu,"mesaj":"Kaydedildi"})
    except Exception as e:
        return jsonify({"basarili":False,"hata":str(e)}), 500


# ─────────────────────────────────────────────────────
# 10. BAŞLAT
# ─────────────────────────────────────────────────────
def _flask_calistir():
    import logging; logging.getLogger("werkzeug").setLevel(logging.ERROR)
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

_t = threading.Thread(target=_flask_calistir)
_t.daemon = True
_t.start()
time.sleep(2)

print("✅ KapadokyaCraft v9 hazır!")
print(f"   rembg: {'✅ aktif' if REMBG_MEVCUT else '⚠️ yok (renk bazlı yedek)'}")
print("📡 http://localhost:5000/uret")
print("─" * 50)