# ═══════════════════════════════════════════════════════════════════
# KapadokyaCraft v3 — DÜZELTİLMİŞ KOD
# Düzeltmeler:
#   1. Prompt kontrolü: kullanıcı ne isterse onu üretiyor
#   2. Fotoğraf sarma: maske + blend tamamen yeniden yazıldı
#   3. Arka plan temizleme düzeltildi
# ═══════════════════════════════════════════════════════════════════

import subprocess, sys
def pip(p):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", p])

pip("groq"); pip("flask"); pip("flask-cors"); pip("pillow"); pip("numpy"); pip("requests")

<<<<<<< HEAD
import os, json, time, base64, threading
=======
import os
import tempfile
os.environ["GROQ_API_KEY"] = "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"
os.environ["HF_TOKEN"] = "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"

TMPDIR = tempfile.gettempdir()

import json
import requests
import urllib.parse
>>>>>>> 8f33e2eebfe6f85298c9d56ddb7f47f691195208
import numpy as np
from io import BytesIO
from groq import Groq
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as req
import urllib.parse

# ── API ANAHTARLARI ──────────────────────────────────────────────
GROQ_API_KEY = "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" # ← kendi keyini yaz
HF_TOKEN     = "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"   # ← kendi keyini yaz

groq_client = Groq(api_key=GROQ_API_KEY)
app = Flask(__name__)
CORS(app)

# ── ÜRÜN PROMPT'LARI (sadece şablon için, kullanıcı istediğinde override edilir) ──
URUN_SABLONLARI = {
    "vazo":   "plain white ceramic tall vase, centered on solid black background, no shadows, studio lighting, photorealistic",
    "tabak":  "plain white ceramic plate, centered on solid black background, no shadows, studio lighting, photorealistic",
    "bardak": "plain white ceramic mug with handle, centered on solid black background, no shadows, studio lighting, photorealistic",
    "comlek": "plain white clay pot with lid, centered on solid black background, no shadows, studio lighting, photorealistic",
    "kilim":  "plain beige kilim rug flat lay aerial top view, centered on solid black background, soft lighting, photorealistic",
}

# Varsayılan zengin promptlar (kullanıcı hiçbir desen belirtmezse)
URUN_VARSAYILAN_DESEN = {
    "vazo":   "handcrafted Cappadocia terracotta tall vase, intricate hand-painted Anatolian geometric patterns, vibrant red blue white, folk art, Turkish pottery, white background, photorealistic 8K",
    "tabak":  "handcrafted Cappadocia ceramic plate, Iznik floral tulip patterns, cobalt blue red white glaze, Ottoman motifs, white background, photorealistic 8K",
    "bardak": "handcrafted Cappadocia ceramic mug, hand-painted Anatolian folk patterns, terracotta warm colors, white background, photorealistic 8K",
    "comlek": "handcrafted Cappadocia clay pot with lid, rustic terracotta geometric bands, Anatolian pottery, white background, photorealistic 8K",
    "kilim":  "traditional Turkish kilim rug flat lay aerial view, bold geometric diamond medallion patterns, handwoven wool, rich deep red burgundy ivory black, Anatolian tribal weaving, white background, photorealistic 8K",
}


# ════════════════════════════════════════════════════════
# 1. İSTEK ANALİZİ
#    ÖNEMLİ: Artık desen = kullanıcının tam isteği,
#    sistem kendi zevkini katmıyor
# ════════════════════════════════════════════════════════
def istek_analiz_et(kullanici_istegi):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """Kullanıcının isteğini analiz et. JSON döndür.

KURALLAR:
- "desen" alanına SADECE kullanıcının istediği şeyi yaz, kendi zevkini KATMA
- Kullanıcı "sadece turkuaz kilim" diyorsa desen = "plain solid turquoise color, no patterns, minimal"
- Kullanıcı "çiçekli vazo" diyorsa desen = "floral patterns on vase"
- Kullanıcı detaylı anlatırsa o detayları İngilizceye çevir
- "kullanici_sadece_renk_istedi" = true ise gereksiz desen ekleme

{
  "metin": "ürüne yazılacak metin varsa yaz, yoksa null",
  "metin_konum": "orta/ust/alt/sol_ust/sag_ust/sol_alt/sag_alt",
  "urun_tipi": "vazo/tabak/bardak/comlek/kilim",
  "kultur": "kültür varsa İngilizce, yoksa null",
  "desen": "SADECE kullanıcının istediği tasarım, İngilizce, KISA VE NET",
  "sade_mi": true/false  // kullanıcı sade/düz/minimal bir şey istediyse true
}

Örnekler:
- "sadece turkuaz kilim" → desen: "solid turquoise color kilim, minimal, no patterns", sade_mi: true
- "çiçekli mavi vazo" → desen: "blue floral patterns on vase", sade_mi: false
- "Japon tarzı tabak" → desen: "Japanese style ceramic plate with cherry blossom motifs", sade_mi: false

Sadece JSON yaz."""
            },
            {"role": "user", "content": kullanici_istegi}
        ]
    )
    return json.loads(yanit.choices[0].message.content)


# ════════════════════════════════════════════════════════
# 2. GÖRSEL ÜRETİMİ
# ════════════════════════════════════════════════════════
def gorsel_uret(prompt, genislik=512, yukseklik=512):
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    url = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
    payload = {
        "inputs": prompt[:500],
        "parameters": {"width": genislik, "height": yukseklik},
        "options": {"wait_for_model": True}
    }
    for deneme in range(3):
        try:
            print(f"  Görsel üretiliyor... (deneme {deneme+1}/3)")
            r = req.post(url, headers=headers, json=payload, timeout=90)
            if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
                img = Image.open(BytesIO(r.content)).convert("RGB")
                if np.array(img.convert("L")).mean() > 15:
                    print(f"  ✅ Üretildi ({img.size[0]}×{img.size[1]}px)")
                    return img.resize((genislik, yukseklik), Image.LANCZOS)
                print("  ⚠️ Siyah ekran, tekrar...")
            elif r.status_code == 503:
                bekleme = min(float(r.json().get("estimated_time", 20)), 30)
                print(f"  ⏳ Model yükleniyor, {bekleme:.0f}s bekleniyor...")
                time.sleep(bekleme)
            else:
                print(f"  ⚠️ HTTP {r.status_code}")
                time.sleep(5)
        except Exception as e:
            print(f"  ⚠️ Hata: {e}")
            time.sleep(5)

    # Yedek: Pollinations
    print("  🔄 Yedek API deneniyor...")
    try:
        clean = prompt.encode("ascii", "ignore").decode("ascii")[:400]
        encoded = urllib.parse.quote(" ".join(clean.split()))
        purl = f"https://image.pollinations.ai/prompt/{encoded}?width={genislik}&height={yukseklik}&nologo=true&model=turbo&seed=42"
        r2 = req.get(purl, timeout=60)
        if r2.status_code == 200 and "image" in r2.headers.get("content-type", ""):
            img = Image.open(BytesIO(r2.content)).convert("RGB")
            if np.array(img.convert("L")).mean() > 15:
                print("  ✅ Yedek API başarılı")
                return img.resize((genislik, yukseklik), Image.LANCZOS)
    except Exception as e:
        print(f"  ⚠️ Yedek de başarısız: {e}")

    # Son çare: grid görsel
    print("  ❌ Tüm kaynaklar başarısız, boş görsel döndürülüyor")
    fb = Image.new("RGB", (genislik, yukseklik), (245, 235, 220))
    d = ImageDraw.Draw(fb)
    for i in range(0, genislik, 40):
        d.line([(i,0),(i,yukseklik)], fill=(210,195,170), width=1)
    for j in range(0, yukseklik, 40):
        d.line([(0,j),(genislik,j)], fill=(210,195,170), width=1)
    return fb


# ════════════════════════════════════════════════════════
# 3. PROMPT OLUŞTURMA
#    Kullanıcının isteğine göre prompt hazırlar.
#    Sade isteklerde gereksiz detay EKLEME.
# ════════════════════════════════════════════════════════
def prompt_olustur(analiz):
    urun_tipi = analiz.get("urun_tipi", "vazo")
    desen     = analiz.get("desen", "")
    kultur    = analiz.get("kultur") or ""
    sade_mi   = analiz.get("sade_mi", False)

    kultur_eki = f"{kultur} style, " if kultur else ""

    if sade_mi:
        # Sade istek: sadece kullanıcının dediği + beyaz arka plan
        urun_isimleri = {
            "vazo": "ceramic vase", "tabak": "ceramic plate",
            "bardak": "ceramic mug", "comlek": "clay pot", "kilim": "kilim rug flat lay"
        }
        urun_ismi = urun_isimleri.get(urun_tipi, "ceramic product")
        prompt = f"{desen} {urun_ismi}, {kultur_eki}plain background, studio lighting, photorealistic 8K"
    else:
        # Detaylı istek: kullanıcının isteği + ürün bağlamı
        urun_baglam = {
            "vazo":   "handcrafted ceramic tall vase, white background, photorealistic 8K",
            "tabak":  "handcrafted ceramic plate, white background, photorealistic 8K",
            "bardak": "handcrafted ceramic mug, white background, photorealistic 8K",
            "comlek": "handcrafted clay pot with lid, white background, photorealistic 8K",
            "kilim":  "traditional kilim rug flat lay aerial view, white background, photorealistic 8K",
        }
        prompt = f"{desen}, {kultur_eki}{urun_baglam.get(urun_tipi, '')}"

    return prompt


# ════════════════════════════════════════════════════════
# 4. MASKE
#    Düzeltme 1: Gölge kalıntısı → eşik biraz daha agresif
#    Düzeltme 2: Kenar yumuşatma daha az → kesik alt sorunu azalır
# ════════════════════════════════════════════════════════
def vazo_maskesi_olustur(vazo_img):
    rgb  = vazo_img.convert("RGB")
    arr  = np.array(rgb, dtype=np.float32)
    h, w = arr.shape[:2]

    # Köşe + kenar ortası piksellerinden arka plan rengini bul
    koseler = np.array([
        arr[0, 0], arr[0, w-1], arr[h-1, 0], arr[h-1, w-1],
        arr[0, w//2], arr[h//2, 0], arr[h//2, w-1], arr[h-1, w//2],
        arr[2, 2], arr[2, w-3], arr[h-3, 2], arr[h-3, w-3],
        # Alt kenar ortası — gölgenin tam yerinden örnekle
        arr[h-1, w//3], arr[h-1, 2*w//3],
        arr[h-2, w//4], arr[h-2, 3*w//4],
    ])
    bg = np.median(koseler, axis=0)
    print(f"  Arka plan rengi: R={bg[0]:.0f} G={bg[1]:.0f} B={bg[2]:.0f}")

    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    mesafe = np.sqrt((r-bg[0])**2 + (g-bg[1])**2 + (b-bg[2])**2)

    # Eşiği biraz yüksek tut → gölge kalıntıları da temizlenir
    esik = max(40, np.percentile(mesafe, 18))
    print(f"  Maske eşiği: {esik:.1f}")

    maske = np.where(mesafe < esik, 0, 255).astype(np.uint8)
    m = Image.fromarray(maske, "L")

    # Delikler kapat, kenarı hafif içe çek, az yumuşat
    m = m.filter(ImageFilter.MaxFilter(9))
    m = m.filter(ImageFilter.MinFilter(5))
    m = m.filter(ImageFilter.GaussianBlur(radius=2))  # daha az blur → alt kenar kesilmez

    return m


# ════════════════════════════════════════════════════════
# 5. FOTOĞRAF SARMA
#    Düzeltme 1: Görüntü kırpması → padding ekle, vazo sığsın
#    Düzeltme 2: Renk ezilmesi → Brightness daha az, Soft Light blend
#    Düzeltme 3: Gölge → maske eşiği yükseltildi (yukarıda)
# ════════════════════════════════════════════════════════
def deseni_vazoya_sar(vazo_img, desen_img, opaklık=0.72):
    # ── Düzeltme 1: Vazo'yu %10 padding ile küçült → alt kenar kesilmez ──
    w, h = vazo_img.size
    pad = int(h * 0.08)  # alt + sağ/sol için padding
    yeni_h = h - pad
    yeni_w = w - pad

    # Vazoyu küçült ve ortala
    vazo_kucuk = vazo_img.convert("RGB").resize((yeni_w, yeni_h), Image.LANCZOS)
    vazo_rgb   = Image.new("RGB", (w, h), (0, 0, 0))  # siyah arka plan
    offset_x   = (w - yeni_w) // 2
    offset_y   = (h - yeni_h) // 2
    vazo_rgb.paste(vazo_kucuk, (offset_x, offset_y))

    # Maske
    maske     = vazo_maskesi_olustur(vazo_rgb)
    maske_arr = np.array(maske)

    # Ürün bounding box
    satir_var = np.any(maske_arr > 128, axis=1)
    sutun_var = np.any(maske_arr > 128, axis=0)
    if not satir_var.any() or not sutun_var.any():
        print("  ⚠️ Maske boş! Tam boyut kullanılıyor.")
        y1, y2, x1, x2 = 0, h, 0, w
    else:
        y1, y2 = np.where(satir_var)[0][[0, -1]]
        x1, x2 = np.where(sutun_var)[0][[0, -1]]

    urun_w = max(x2 - x1, 1)
    urun_h = max(y2 - y1, 1)
    print(f"  Ürün bölgesi: {urun_w}×{urun_h}px  offset=({x1},{y1})")

    # Deseni ürün kutusuna sığdır
    desen_kucuk = desen_img.convert("RGB").resize((urun_w, urun_h), Image.LANCZOS)
    desen_tam   = Image.new("RGB", (w, h), (128, 128, 128))
    desen_tam.paste(desen_kucuk, (x1, y1))

    # ── Düzeltme 2: Soft-Light tarzı blend — renkleri ezmez ──
    vazo_gray     = vazo_rgb.convert("L")
    vazo_gray_arr = np.array(vazo_gray, dtype=np.float32) / 255.0  # 0-1

    desen_arr = np.array(desen_tam, dtype=np.float32) / 255.0  # 0-1

    # Soft light formülü: karanlık yerleri koyulaştır, açık yerleri aydınlat
    # out = desen * (vazo_gray + 0.5) — basit ama etkili
    karisim = np.clip(desen_arr * (vazo_gray_arr[:,:,None] * 1.6 + 0.3), 0, 1)
    blended = Image.fromarray((karisim * 255).astype(np.uint8), "RGB")

    # Orijinal desenle hafif karıştır (renk korunumu için)
    blended = Image.blend(desen_tam, blended, opaklık)
    blended = ImageEnhance.Color(blended).enhance(1.2)    # rengi biraz canlı tut
    blended = ImageEnhance.Contrast(blended).enhance(1.1)

    # Maske uygula → dışı beyaz
    beyaz = Image.new("RGB", (w, h), (255, 255, 255))
    sonuc = Image.composite(blended, beyaz, maske)

    return sonuc


# ════════════════════════════════════════════════════════
# 6. METİN EKLEME
# ════════════════════════════════════════════════════════
def metni_ekle(gorsel, metin, konum="orta"):
    img = gorsel.copy().convert("RGBA")
    w, h = img.size
    font_size = max(40, int(h * 0.075))
    font = None
    for yol in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try: font = ImageFont.truetype(yol, font_size); break
        except: continue
    if not font:
        font = ImageFont.load_default()
    dummy = ImageDraw.Draw(img)
    try:
        bbox = dummy.textbbox((0, 0), metin, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    except:
        tw, th = len(metin)*20, 40
    konumlar = {
        "orta":    ((w-tw)//2, (h-th)//2),
        "ust":     ((w-tw)//2, int(h*0.12)),
        "alt":     ((w-tw)//2, h-th-int(h*0.12)),
        "sol_ust": (int(w*0.08), int(h*0.12)),
        "sag_ust": (w-tw-int(w*0.08), int(h*0.12)),
        "sol_alt": (int(w*0.08), h-th-int(h*0.12)),
        "sag_alt": (w-tw-int(w*0.08), h-th-int(h*0.12)),
    }
    x, y = konumlar.get(konum, konumlar["orta"])
    golge = Image.new("RGBA", img.size, (0,0,0,0))
    ImageDraw.Draw(golge).text((x+3,y+3), metin, font=font, fill=(20,10,5,90))
    golge = golge.filter(ImageFilter.GaussianBlur(radius=2.5))
    boya = Image.new("RGBA", img.size, (0,0,0,0))
    bd = ImageDraw.Draw(boya)
    for ox, oy, renk in [(-1,0,(15,30,100,80)),(1,0,(15,30,100,80)),
                          (0,-1,(15,30,100,80)),(0,1,(15,30,100,80)),
                          (0,0,(30,50,140,210))]:
        bd.text((x+ox, y+oy), metin, font=font, fill=renk)
    boya = boya.filter(ImageFilter.GaussianBlur(radius=0.6))
    sonuc = Image.alpha_composite(img, golge)
    sonuc = Image.alpha_composite(sonuc, boya)
    return sonuc.convert("RGB")


# ════════════════════════════════════════════════════════
# 7. YARDIMCI
# ════════════════════════════════════════════════════════
def gorsel_to_base64(g):
    buf = BytesIO()
    g.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


<<<<<<< HEAD
# ════════════════════════════════════════════════════════
# 8. FLASK ENDPOINT'LERİ
# ════════════════════════════════════════════════════════
tasarim_oturumlari = {}
=======
# ─────────────────────────────────────────────
# 7. ANA ÜRETİM FONKSİYONU
# ─────────────────────────────────────────────
def urun_uret(kullanici_istegi, fotograf_yolu=None, debug=False):
    print("=" * 50)
    print("İstek analiz ediliyor...")
    analiz = istek_analiz_et(kullanici_istegi)
    print(f"Analiz: {analiz}")
    print("=" * 50)

    urun_tipi = analiz.get("urun_tipi", "vazo")

    if fotograf_yolu:
        print(f"[1/3] '{urun_tipi}' üretiliyor (siyah arka plan)...")
        vazo_img = gorsel_uret(URUN_SABLONLARI[urun_tipi])

        if debug:
            vazo_img.save(os.path.join(TMPDIR, "vazo_ham.png"))
            print(f"  [DEBUG] Ham vazo: {os.path.join(TMPDIR, 'vazo_ham.png')}")
            maske_debug = vazo_maskesi_olustur(vazo_img.convert("RGB"))
            maske_debug.save(os.path.join(TMPDIR, "maske_debug.png"))
            print(f"  [DEBUG] Maske: {os.path.join(TMPDIR, 'maske_debug.png')}")

        print("[2/3] Desen uygulanıyor...")
        desen_img = Image.open(fotograf_yolu).convert("RGB")
        gorsel = deseni_vazoya_sar(vazo_img, desen_img)
        print("[3/3] Tamamlandı!")
    else:
        print("[1/1] Prompt ile görsel üretiliyor...")
        ek = URUN_PROMPT_EKLER.get(urun_tipi, "")
        kultur = analiz.get("kultur", "")
        kultur_eki = f"{kultur} style" if kultur else ""
        prompt = f"{ek}, {kultur_eki}, {analiz.get('desen', '')}".strip(", ")
        gorsel = gorsel_uret(prompt)

    if analiz.get("metin"):
        gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

    print("=" * 50)
    return gorsel


def gorseli_kaydet(gorsel, dosya_adi="sonuc.png"):
    gorsel.save(dosya_adi, format="PNG", optimize=True)
    print(f"Kaydedildi: {dosya_adi}")
    return dosya_adi


# ─────────────────────────────────────────────
# 8. FLASK API
# ─────────────────────────────────────────────
@app.route("/uret", methods=["POST"])
def uret():
    """
    POST /uret
    Form-data:
        istek    : str  (zorunlu)
        fotograf : file (opsiyonel)
    Yanıt:
        { basarili, gorsel_base64, analiz }
    """
    try:
        istek_metni = request.form.get("istek", "").strip()
        if not istek_metni:
            return jsonify({"basarili": False, "hata": "istek alanı boş"}), 400

        analiz = istek_analiz_et(istek_metni)
        urun_tipi = analiz.get("urun_tipi", "vazo")

        fotograf_yolu = None
        if "fotograf" in request.files:
            dosya = request.files["fotograf"]
            if dosya.filename:
                fotograf_yolu = os.path.join(TMPDIR, f"{int(time.time())}_{dosya.filename}")
                dosya.save(fotograf_yolu)

        if fotograf_yolu:
            vazo_img = gorsel_uret(URUN_SABLONLARI[urun_tipi])
            desen_img = Image.open(fotograf_yolu).convert("RGB")
            gorsel = deseni_vazoya_sar(vazo_img, desen_img)
        else:
            ek = URUN_PROMPT_EKLER.get(urun_tipi, "")
            kultur = analiz.get("kultur", "")
            kultur_eki = f"{kultur} style" if kultur else ""
            prompt = f"{ek}, {kultur_eki}, {analiz.get('desen', '')}".strip(", ")
            gorsel = gorsel_uret(prompt)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        return jsonify({
            "basarili": True,
            "gorsel_base64": gorsel_to_base64(gorsel),
            "analiz": analiz,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500

>>>>>>> 8f33e2eebfe6f85298c9d56ddb7f47f691195208

@app.route("/saglik", methods=["GET"])
def saglik():
    return jsonify({"durum": "çalışıyor"})


@app.route("/uret", methods=["POST"])
def uret():
    try:
        istek_metni = request.form.get("istek", "").strip()
        if not istek_metni:
            return jsonify({"basarili": False, "hata": "istek boş"}), 400

        t0 = time.time()
        analiz = istek_analiz_et(istek_metni)
        urun_tipi = analiz.get("urun_tipi", "vazo")
        print(f"Analiz: {analiz}")

        fotograf_yolu = None
        if "fotograf" in request.files:
            d = request.files["fotograf"]
            if d.filename:
                fotograf_yolu = f"/tmp/{int(time.time())}_{d.filename}"
                d.save(fotograf_yolu)

        if fotograf_yolu:
            # Fotoğraf modunda: şablon ürün üret + deseni sar
            vazo_img  = gorsel_uret(URUN_SABLONLARI[urun_tipi])
            desen_img = Image.open(fotograf_yolu).convert("RGB")
            gorsel    = deseni_vazoya_sar(vazo_img, desen_img)
        else:
            # Prompt modunda: kullanıcının isteğine göre prompt oluştur
            prompt = prompt_olustur(analiz)
            print(f"Prompt: {prompt}")
            gorsel = gorsel_uret(prompt)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        print(f"  ⏱️ Toplam süre: {time.time()-t0:.1f}s")
        return jsonify({
            "basarili": True,
            "gorsel_base64": gorsel_to_base64(gorsel),
            "analiz": analiz,
            "prompt_kullanildi": prompt_olustur(analiz) if not fotograf_yolu else "fotograf_modu"
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/baslat", methods=["POST"])
def tasarim_baslat():
    try:
        data = request.json
        kullanici_prompt = data.get("prompt", "")
        urun_tipi = data.get("urun_tipi", "vazo")
        session_id = base64.b64encode(os.urandom(16)).decode()[:16]

        analiz = istek_analiz_et(kullanici_prompt)
        analiz["urun_tipi"] = urun_tipi

        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        tasarim_oturumlari[session_id] = {
            "son_gorsel": gorsel, "tasarim_gecmisi": [gorsel],
            "prompt_gecmisi": [kullanici_prompt], "urun_tipi": urun_tipi, "analiz": analiz
        }
        return jsonify({
            "basarili": True, "session_id": session_id,
            "gorsel_base64": gorsel_to_base64(gorsel), "analiz": analiz
        })
    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/duzenle", methods=["POST"])
def tasarim_duzenle():
    try:
        data = request.json
        session_id = data.get("session_id")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

        oturum = tasarim_oturumlari[session_id]
        yeni_prompt = f"{oturum['prompt_gecmisi'][-1]}, ancak {data.get('duzenleme', '')}"

        analiz = istek_analiz_et(yeni_prompt)
        analiz["urun_tipi"] = oturum["urun_tipi"]

        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        oturum["prompt_gecmisi"].append(yeni_prompt)

        return jsonify({"basarili": True, "gorsel_base64": gorsel_to_base64(gorsel), "analiz": analiz})
    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/fotograf_ekle", methods=["POST"])
def tasarim_fotograf_ekle():
    try:
        session_id = request.form.get("session_id")
        dosya = request.files.get("fotograf")
        if not dosya:
            return jsonify({"basarili": False, "hata": "Fotoğraf gerekli"}), 400
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

<<<<<<< HEAD
        fotograf_yolu = f"/tmp/{int(time.time())}_{dosya.filename}"
=======
        # Fotoğrafı geçici kaydet
        fotograf_yolu = os.path.join(TMPDIR, f"{int(time.time())}_{dosya.filename}")
>>>>>>> 8f33e2eebfe6f85298c9d56ddb7f47f691195208
        dosya.save(fotograf_yolu)

        oturum = tasarim_oturumlari[session_id]
        urun_img  = gorsel_uret(URUN_SABLONLARI[oturum["urun_tipi"]])
        desen_img = Image.open(fotograf_yolu).convert("RGB")
        gorsel    = deseni_vazoya_sar(urun_img, desen_img)

        if oturum["analiz"].get("metin"):
            gorsel = metni_ekle(gorsel, oturum["analiz"]["metin"],
                               oturum["analiz"].get("metin_konum", "orta"))

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        try: os.remove(fotograf_yolu)
        except: pass

        return jsonify({"basarili": True, "gorsel_base64": gorsel_to_base64(gorsel)})
    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/gerial", methods=["POST"])
def tasarim_gerial():
    try:
        session_id = request.json.get("session_id")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404
        oturum = tasarim_oturumlari[session_id]
        if len(oturum["tasarim_gecmisi"]) > 1:
            oturum["tasarim_gecmisi"].pop()
            if oturum["prompt_gecmisi"]: oturum["prompt_gecmisi"].pop()
            oturum["son_gorsel"] = oturum["tasarim_gecmisi"][-1]
            return jsonify({"basarili": True, "gorsel_base64": gorsel_to_base64(oturum["son_gorsel"])})
        return jsonify({"basarili": False, "hata": "Geri alınacak değişiklik yok"}), 400
    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/kaydet", methods=["POST"])
def tasarim_kaydet():
    try:
        session_id = request.json.get("session_id")
        dosya_adi  = request.json.get("dosya_adi", "tasarim.png")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404
        oturum = tasarim_oturumlari[session_id]
<<<<<<< HEAD
        kayit_yolu = f"/tmp/son_tasarimlar/{session_id}_{dosya_adi}"
        os.makedirs("/tmp/son_tasarimlar", exist_ok=True)
        oturum["son_gorsel"].save(kayit_yolu)
        return jsonify({"basarili": True, "dosya_yolu": kayit_yolu, "mesaj": "Kaydedildi"})
=======
        gorsel = oturum["son_gorsel"]

        # Kalıcı kaydet
        kayit_klasoru = os.path.join(TMPDIR, "son_tasarimlar")
        os.makedirs(kayit_klasoru, exist_ok=True)
        kayit_yolu = os.path.join(kayit_klasoru, f"{session_id}_{dosya_adi}")
        gorsel.save(kayit_yolu)

        return jsonify({
            "basarili": True,
            "dosya_yolu": kayit_yolu,
            "mesaj": "Tasarım kaydedildi"
        })

>>>>>>> 8f33e2eebfe6f85298c9d56ddb7f47f691195208
    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


# ════════════════════════════════════════════════════════
# 9. BAŞLAT
# ════════════════════════════════════════════════════════
def _flask_calistir():
    import logging
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

_t = threading.Thread(target=_flask_calistir)
_t.daemon = True
_t.start()
time.sleep(2)
print("✅ KapadokyaCraft v3 hazır!")
print("📡 Endpoint: http://localhost:5000/uret")
print("─" * 40)