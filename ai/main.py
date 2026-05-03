
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
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as req
import urllib.parse

# rembg
try:
    from rembg import remove as rembg_remove
    REMBG_MEVCUT = True
    print("✅ rembg yüklendi")
except ImportError:
    REMBG_MEVCUT = False
    print("⚠️ rembg yüklenemedi")

# ── API ANAHTARLARI ──────────────────────────────────────────────
GROQ_API_KEY = "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"
HF_TOKEN     = "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"

groq_client = Groq(api_key=GROQ_API_KEY)
app = Flask(__name__)
CORS(app)

# ── ÜRÜN BOYUTLARI ───────────────────────────────────────────────
URUN_BOYUTLARI = {
    "vazo":   (512, 512),
    "tabak":  (512, 512),
    "bardak": (512, 512),
    "comlek": (512, 512),
    "kilim":  (768, 512),
}

# ── SADE ÜRÜN PROMPTLARI (fotoğraf sarma modu için) ──────────────
# Bunlar AI'ın ürettiği SADELEŞTİRİLMİŞ ürün görselleri
# Üzerine fotoğraf texture olarak yapıştırılacak
URUN_SABLONLARI = {
    "vazo": (
        "a plain white ceramic vase, centered on pure white background, "
        "smooth surface, no patterns, studio product photography, soft lighting"
    ),
    "tabak": (
        "a plain white ceramic plate, centered on pure white background, "
        "smooth surface, no patterns, studio product photography, soft lighting"
    ),
    "bardak": (
        "a plain white ceramic mug with handle, centered on pure white background, "
        "smooth surface, no patterns, studio product photography, soft lighting"
    ),
    "comlek": (
        "a plain white clay pot with lid, centered on pure white background, "
        "smooth surface, no patterns, studio product photography, soft lighting"
    ),
    "kilim": (
        "a plain beige rectangular kilim rug lying flat on white floor, "
        "top-down overhead bird's-eye view, smooth surface, no patterns, "
        "studio product photography"
    ),
}

# ── KİLİM PROMPT ŞABLONLARI ─────────────────────────────────────
# 5 farklı güçlü şablon, istek gelince dinamik doldurulur
KILIM_SABLONLARI = [
    (
        "top-down aerial photograph of a handwoven Turkish kilim rug flat on white floor, "
        "{desen}, {renk} colors, geometric diamond medallion border pattern, "
        "wool texture visible, rectangular shape wider than tall, "
        "NO people NO plants NO furniture NO decorations around it, "
        "isolated product shot, photorealistic 8K"
    ),
    (
        "bird's-eye view product photo of a traditional Anatolian kilim rug, "
        "lying flat on a white surface, {desen}, dominant colors {renk}, "
        "intricate geometric patterns, woven wool texture, "
        "rectangular horizontal format, centered, white background, "
        "NO shadows around edges, NO objects nearby, 8K commercial photography"
    ),
    (
        "overhead shot of a flat Turkish kilim rug, rectangular, wider than tall, "
        "{desen}, {renk} color palette, Cappadocia folk art motifs, "
        "hand-woven texture, crisp detail, white background, "
        "NO people NO plants NO room context, isolated on white, photorealistic"
    ),
    (
        "flat lay top-down photo of a Turkish kilim prayer rug, "
        "horizontal rectangle on white background, {desen}, "
        "colors: {renk}, geometric tribal patterns, wool fiber texture, "
        "sharp focus, studio lighting, NO furniture NO decorations, "
        "clean white background, 4K product photo"
    ),
    (
        "professional product photography of a rectangular Anatolian kilim rug, "
        "top-down view, flat lay on pure white, {desen} design, "
        "{renk} dominant tones, traditional Turkish weaving patterns, "
        "horizontal orientation, NO background objects, isolated, 8K"
    ),
]


# ════════════════════════════════════════════════════════
# 1. İSTEK ANALİZİ
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
- "desen" alanına SADECE kullanıcının istediği şeyi yaz
- "renkler" alanına İngilizce renk isimleri yaz (virgülle ayır)
- Kullanıcı "sadece turkuaz kilim" → desen: "solid turquoise, minimal no pattern", renkler: "turquoise"
- Kullanıcı "çiçekli vazo" → desen: "floral patterns", renkler: "mixed"
- sade_mi: kullanıcı sadece renk belirttiyse true

{
  "metin": null,
  "metin_konum": "orta",
  "urun_tipi": "vazo/tabak/bardak/comlek/kilim",
  "kultur": null,
  "desen": "İngilizce kısa tasarım açıklaması",
  "renkler": "İngilizce renk isimleri",
  "sade_mi": false
}

Sadece JSON yaz."""
            },
            {"role": "user", "content": kullanici_istegi}
        ]
    )
    return json.loads(yanit.choices[0].message.content)


# ════════════════════════════════════════════════════════
# 2. KİLİM PROMPT OLUŞTURMA (yeni, güçlü)
# ════════════════════════════════════════════════════════
def kilim_prompt_olustur(analiz):
    desen  = analiz.get("desen", "geometric diamond patterns")
    renkler = analiz.get("renkler", "deep red burgundy ivory black")
    sablon = random.choice(KILIM_SABLONLARI)
    return sablon.format(desen=desen, renk=renkler)


# ════════════════════════════════════════════════════════
# 3. GENEL PROMPT OLUŞTURMA
# ════════════════════════════════════════════════════════
def prompt_olustur(analiz):
    urun_tipi = analiz.get("urun_tipi", "vazo")

    # Kilim için özel şablon sistemi
    if urun_tipi == "kilim":
        return kilim_prompt_olustur(analiz)

    desen   = analiz.get("desen", "")
    renkler = analiz.get("renkler", "")
    kultur  = analiz.get("kultur") or ""
    sade_mi = analiz.get("sade_mi", False)

    kultur_eki = f"{kultur} style, " if kultur else ""
    renk_eki   = f"{renkler} colors, " if renkler else ""

    urun_baglam = {
        "vazo":   "handcrafted ceramic tall vase, centered on white background, photorealistic 8K",
        "tabak":  "handcrafted ceramic plate, centered on white background, photorealistic 8K",
        "bardak": "handcrafted ceramic mug with handle, centered on white background, photorealistic 8K",
        "comlek": "handcrafted clay pot with lid, centered on white background, photorealistic 8K",
    }

    if sade_mi:
        return (
            f"{desen} {urun_baglam.get(urun_tipi, 'ceramic product')}, "
            f"{kultur_eki}{renk_eki}plain white background, studio lighting, photorealistic 8K"
        )
    else:
        return (
            f"{desen}, {kultur_eki}{renk_eki}"
            f"{urun_baglam.get(urun_tipi, 'handcrafted product, white background, photorealistic 8K')}"
        )


# ════════════════════════════════════════════════════════
# 4. GÖRSEL ÜRETİMİ
# ════════════════════════════════════════════════════════
def gorsel_uret(prompt, urun_tipi="vazo"):
    genislik, yukseklik = URUN_BOYUTLARI.get(urun_tipi, (512, 512))

    print(f"  Görsel üretiliyor ({genislik}×{yukseklik})...")
    print(f"  Prompt: {prompt[:120]}...")

    # ── 1. Pollinations (primary) ──
    try:
        clean   = prompt.encode("ascii", "ignore").decode("ascii")[:450]
        encoded = urllib.parse.quote(" ".join(clean.split()))
        seed    = int(time.time()) % 99999
        purl    = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width={genislik}&height={yukseklik}&nologo=true&model=flux&seed={seed}&enhance=true"
        )
        r = req.get(purl, timeout=70)
        if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
            img = Image.open(BytesIO(r.content)).convert("RGB")
            if np.array(img.convert("L")).mean() > 15:
                print("  ✅ Üretildi (Pollinations)")
                return img.resize((genislik, yukseklik), Image.LANCZOS)
        print(f"  ⚠️ Pollinations HTTP {r.status_code}")
    except Exception as e:
        print(f"  ⚠️ Pollinations hata: {e}")

    # ── 2. HuggingFace FLUX (yedek) ──
    print("  🔄 HuggingFace deneniyor...")
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    url     = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
    payload = {
        "inputs": prompt[:500],
        "parameters": {"width": genislik, "height": yukseklik},
        "options": {"wait_for_model": True}
    }
    for deneme in range(2):
        try:
            r2 = req.post(url, headers=headers, json=payload, timeout=90)
            if r2.status_code == 200 and "image" in r2.headers.get("content-type", ""):
                img = Image.open(BytesIO(r2.content)).convert("RGB")
                if np.array(img.convert("L")).mean() > 15:
                    print("  ✅ Üretildi (HuggingFace)")
                    return img.resize((genislik, yukseklik), Image.LANCZOS)
            elif r2.status_code == 503:
                bekleme = min(float(r2.json().get("estimated_time", 20)), 25)
                print(f"  ⏳ Model yükleniyor, {bekleme:.0f}s bekleniyor...")
                time.sleep(bekleme)
            else:
                print(f"  ⚠️ HuggingFace HTTP {r2.status_code}")
                time.sleep(5)
        except Exception as e:
            print(f"  ⚠️ HuggingFace hata: {e}")
            time.sleep(5)

    # Son çare
    print("  ❌ Tüm kaynaklar başarısız, boş görsel")
    fb = Image.new("RGB", (genislik, yukseklik), (245, 235, 220))
    return fb


# ════════════════════════════════════════════════════════
# 5. MASKE ALMA (rembg veya renk bazlı)
# ════════════════════════════════════════════════════════
def urun_maskesi_al(img_rgb):
    """
    Ürün görselinden maske (L modunda siyah-beyaz) döndürür.
    Beyaz=ürün var, Siyah=arka plan
    """
    w, h = img_rgb.size

    # ── rembg dene ──
    if REMBG_MEVCUT:
        try:
            print("  🧹 rembg ile maske alınıyor...")
            buf = BytesIO()
            img_rgb.save(buf, format="PNG")
            buf.seek(0)
            sonuc_bytes = rembg_remove(buf.read())
            sonuc_rgba  = Image.open(BytesIO(sonuc_bytes)).convert("RGBA")
            alfa = np.array(sonuc_rgba)[:, :, 3]
            gecerli = (alfa > 30).sum() / alfa.size
            print(f"  Maske oranı: %{gecerli*100:.1f}")
            if gecerli > 0.05:
                print("  ✅ rembg maske başarılı")
                # Maskeyi yumuşat
                maske_img = Image.fromarray(alfa, "L")
                maske_img = maske_img.filter(ImageFilter.GaussianBlur(radius=1))
                return maske_img.resize((w, h), Image.LANCZOS)
            print("  ⚠️ rembg maske çok küçük")
        except Exception as e:
            print(f"  ⚠️ rembg hatası: {e}")

    # ── Renk bazlı yedek ──
    print("  🎨 Renk bazlı maske alınıyor...")
    arr  = np.array(img_rgb.convert("RGB"), dtype=np.float32)
    hh, ww = arr.shape[:2]

    # Köşe örneklemesi ile arka plan rengini bul
    koseler = np.array([
        arr[0,0], arr[0,ww-1], arr[hh-1,0], arr[hh-1,ww-1],
        arr[0,ww//2], arr[hh//2,0], arr[hh//2,ww-1], arr[hh-1,ww//2],
        arr[2,2], arr[2,ww-3], arr[hh-3,2], arr[hh-3,ww-3],
    ])
    bg = np.median(koseler, axis=0)

    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    mesafe  = np.sqrt((r-bg[0])**2 + (g-bg[1])**2 + (b-bg[2])**2)
    esik    = max(35, np.percentile(mesafe, 20))

    alfa_arr = np.where(mesafe < esik, 0, 255).astype(np.uint8)
    maske    = Image.fromarray(alfa_arr, "L")
    maske    = maske.filter(ImageFilter.MaxFilter(7))
    maske    = maske.filter(ImageFilter.MinFilter(3))
    maske    = maske.filter(ImageFilter.GaussianBlur(radius=2))
    return maske.resize((w, h), Image.LANCZOS)


# ════════════════════════════════════════════════════════
# 6. FOTOĞRAF TEXTURE SARMA (YENİ, SAĞLAM)
#
#    Strateji:
#    1. Ürün görselinden maske al (rembg veya renk bazlı)
#    2. Ürün görselinden gri ton (3D form / shading) al
#    3. Fotoğrafı ürün alanına sığdır
#    4. Shading'i texture üzerine uygula → 3D his
#    5. Maske ile arka planı beyaz yap
# ════════════════════════════════════════════════════════
def fotografi_urune_texture_sar(urun_img, fotograf_img, urun_tipi="vazo"):
    """
    urun_img   : Pollinations/HF'den gelen sade beyaz ürün görseli
    fotograf_img: Kullanıcının yüklediği desen fotoğrafı
    """
    w, h = urun_img.size
    print(f"  Texture sarma başlıyor ({w}×{h})...")

    # 1. Ürün maskesini al
    maske = urun_maskesi_al(urun_img)
    maske_arr = np.array(maske, dtype=np.float32) / 255.0

    gecerli_oran = (maske_arr > 0.1).sum() / maske_arr.size
    print(f"  Ürün maske oranı: %{gecerli_oran*100:.1f}")

    # Eğer maske çok küçükse (arka plan silinemedi) tam yüzey kullan
    if gecerli_oran < 0.05:
        print("  ⚠️ Maske başarısız, tam yüzey kullanılıyor")
        maske_arr = np.ones((h, w), dtype=np.float32)

    # 2. Ürün görselinin gri ton shadingini al (3D form)
    urun_gray = np.array(urun_img.convert("L"), dtype=np.float32) / 255.0

    # 3. Bounding box — texture'ı sadece ürünün olduğu alana uygula
    maske_bin = (maske_arr > 0.1)
    satir_var  = np.any(maske_bin, axis=1)
    sutun_var  = np.any(maske_bin, axis=0)

    if satir_var.any() and sutun_var.any():
        y1 = int(np.where(satir_var)[0][0])
        y2 = int(np.where(satir_var)[0][-1])
        x1 = int(np.where(sutun_var)[0][0])
        x2 = int(np.where(sutun_var)[0][-1])
        # Biraz padding ekle
        pad = 4
        y1 = max(0, y1 - pad)
        y2 = min(h, y2 + pad)
        x1 = max(0, x1 - pad)
        x2 = min(w, x2 + pad)
    else:
        y1, y2, x1, x2 = 0, h, 0, w

    alan_w = max(x2 - x1, 1)
    alan_h = max(y2 - y1, 1)
    print(f"  Ürün alanı: ({x1},{y1}) → ({x2},{y2}), {alan_w}×{alan_h}")

    # 4. Fotoğrafı ürün alanına sığdır (aspect ratio korunarak)
    fotograf_rgb = fotograf_img.convert("RGB")
    foto_w, foto_h = fotograf_rgb.size

    # Cover (fill) modunda resize — alanı tamamen kapla
    oran_w = alan_w / foto_w
    oran_h = alan_h / foto_h
    oran   = max(oran_w, oran_h)
    yeni_w = int(foto_w * oran)
    yeni_h = int(foto_h * oran)
    fotograf_buyuk = fotograf_rgb.resize((yeni_w, yeni_h), Image.LANCZOS)

    # Ortadan kırp
    sol = (yeni_w - alan_w) // 2
    ust = (yeni_h - alan_h) // 2
    fotograf_kirpik = fotograf_buyuk.crop((sol, ust, sol + alan_w, ust + alan_h))

    # Texture'ı tam boyuta yerleştir
    texture_tam = Image.new("RGB", (w, h), (240, 240, 240))
    texture_tam.paste(fotograf_kirpik, (x1, y1))

    # 5. Shading uygula — ürünün 3D formunu texture üzerine yansıt
    texture_arr = np.array(texture_tam, dtype=np.float32) / 255.0

    # Normalize shading: çok koyu veya çok açık olmayan orta aralık
    shading = urun_gray.copy()
    # Shading'i daralt: 0.4 - 1.15 aralığına sıkıştır
    shading = np.clip(shading * 1.1 + 0.15, 0.4, 1.15)

    # Texture × shading
    texture_shaded = texture_arr * shading[:, :, np.newaxis]
    texture_shaded = np.clip(texture_shaded, 0, 1)

    shaded_img = Image.fromarray((texture_shaded * 255).astype(np.uint8), "RGB")

    # 6. Renk ve kontrast iyileştirme
    shaded_img = ImageEnhance.Color(shaded_img).enhance(1.15)
    shaded_img = ImageEnhance.Contrast(shaded_img).enhance(1.05)

    # 7. Maske ile beyaz arka plana yapıştır
    beyaz = Image.new("RGB", (w, h), (255, 255, 255))

    # Maskeyi Image'a çevir
    maske_img = Image.fromarray((maske_arr * 255).astype(np.uint8), "L")
    beyaz.paste(shaded_img, (0, 0), maske_img)

    print("  ✅ Texture sarma tamamlandı")
    return beyaz


# ════════════════════════════════════════════════════════
# 7. METİN EKLEME
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
        try:
            font = ImageFont.truetype(yol, font_size)
            break
        except:
            continue
    if not font:
        font = ImageFont.load_default()

    dummy = ImageDraw.Draw(img)
    try:
        bbox = dummy.textbbox((0, 0), metin, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    except:
        tw, th = len(metin) * 20, 40

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
    ImageDraw.Draw(golge).text((x+3, y+3), metin, font=font, fill=(20,10,5,90))
    golge = golge.filter(ImageFilter.GaussianBlur(radius=2.5))

    boya = Image.new("RGBA", img.size, (0,0,0,0))
    bd   = ImageDraw.Draw(boya)
    for ox, oy, renk in [
        (-1,0,(15,30,100,80)),(1,0,(15,30,100,80)),
        (0,-1,(15,30,100,80)),(0,1,(15,30,100,80)),
        (0,0,(30,50,140,210))
    ]:
        bd.text((x+ox, y+oy), metin, font=font, fill=renk)

    sonuc = Image.alpha_composite(img, golge)
    sonuc = Image.alpha_composite(sonuc, boya)
    return sonuc.convert("RGB")


# ════════════════════════════════════════════════════════
# 8. YARDIMCI
# ════════════════════════════════════════════════════════
def gorsel_to_base64(g):
    buf = BytesIO()
    g.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


# ════════════════════════════════════════════════════════
# 9. FLASK ENDPOINT'LERİ
# ════════════════════════════════════════════════════════
tasarim_oturumlari = {}


@app.route("/saglik", methods=["GET"])
def saglik():
    return jsonify({"durum": "çalışıyor", "rembg": REMBG_MEVCUT})


@app.route("/uret", methods=["POST"])
def uret():
    try:
        istek_metni = request.form.get("istek", "").strip()
        if not istek_metni:
            return jsonify({"basarili": False, "hata": "istek boş"}), 400

        t0 = time.time()
        analiz    = istek_analiz_et(istek_metni)
        urun_tipi = analiz.get("urun_tipi", "vazo")
        print(f"Analiz: {analiz}")

        fotograf_yolu = None
        if "fotograf" in request.files:
            d = request.files["fotograf"]
            if d.filename:
                fotograf_yolu = f"/tmp/{int(time.time())}_{d.filename}"
                d.save(fotograf_yolu)

        if fotograf_yolu:
            # ── FOTOĞRAF MODU ──
            # Sade ürün üret → fotoğrafı texture olarak sar
            urun_img  = gorsel_uret(URUN_SABLONLARI[urun_tipi], urun_tipi)
            desen_img = Image.open(fotograf_yolu).convert("RGB")
            gorsel    = fotografi_urune_texture_sar(urun_img, desen_img, urun_tipi)
            try:
                os.remove(fotograf_yolu)
            except:
                pass
            kullanilan_prompt = "fotograf_modu"
        else:
            # ── PROMPT MODU ──
            kullanilan_prompt = prompt_olustur(analiz)
            print(f"Prompt: {kullanilan_prompt}")
            gorsel = gorsel_uret(kullanilan_prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        print(f"  ⏱️ Toplam süre: {time.time()-t0:.1f}s")
        return jsonify({
            "basarili":       True,
            "gorsel_base64":  gorsel_to_base64(gorsel),
            "analiz":         analiz,
            "prompt_kullanildi": kullanilan_prompt
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/baslat", methods=["POST"])
def tasarim_baslat():
    try:
        data          = request.json or {}
        kullanici_prompt = data.get("prompt", "").strip()
        urun_tipi     = data.get("urun_tipi", "vazo")

        if not kullanici_prompt:
            return jsonify({"basarili": False, "hata": "prompt boş"}), 400

        session_id = base64.b64encode(os.urandom(16)).decode()[:16]
        analiz     = istek_analiz_et(kullanici_prompt)
        analiz["urun_tipi"] = urun_tipi

        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        tasarim_oturumlari[session_id] = {
            "son_gorsel":      gorsel,
            "tasarim_gecmisi": [gorsel],
            "prompt_gecmisi":  [kullanici_prompt],
            "urun_tipi":       urun_tipi,
            "analiz":          analiz,
        }

        return jsonify({
            "basarili":      True,
            "session_id":    session_id,
            "gorsel_base64": gorsel_to_base64(gorsel),
            "analiz":        analiz
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/duzenle", methods=["POST"])
def tasarim_duzenle():
    try:
        data          = request.json or {}
        session_id    = data.get("session_id", "")
        geri_bildirim = data.get("geri_bildirim", "").strip()

        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404
        if not geri_bildirim:
            return jsonify({"basarili": False, "hata": "geri_bildirim boş"}), 400

        oturum          = tasarim_oturumlari[session_id]
        orijinal_prompt = oturum["prompt_gecmisi"][0]
        urun_tipi       = oturum["urun_tipi"]

        birlesik_istek = (
            f"Orijinal istek: {orijinal_prompt}\n"
            f"Kullanıcının geri bildirimi: {geri_bildirim}\n"
            f"Buna göre yeni tasarım talebi oluştur."
        )

        analiz = istek_analiz_et(birlesik_istek)
        analiz["urun_tipi"] = urun_tipi

        prompt = prompt_olustur(analiz)
        gorsel = gorsel_uret(prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        oturum["prompt_gecmisi"].append(geri_bildirim)
        oturum["analiz"] = analiz

        return jsonify({
            "basarili":         True,
            "gorsel_base64":    gorsel_to_base64(gorsel),
            "analiz":           analiz,
            "prompt_kullanildi": prompt
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/fotograf_ekle", methods=["POST"])
def tasarim_fotograf_ekle():
    try:
        session_id = request.form.get("session_id", "")
        dosya      = request.files.get("fotograf")

        if not dosya:
            return jsonify({"basarili": False, "hata": "Fotoğraf gerekli"}), 400
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

        fotograf_yolu = f"/tmp/{int(time.time())}_{dosya.filename}"
        dosya.save(fotograf_yolu)

        oturum    = tasarim_oturumlari[session_id]
        urun_tipi = oturum["urun_tipi"]

        urun_img  = gorsel_uret(URUN_SABLONLARI[urun_tipi], urun_tipi)
        desen_img = Image.open(fotograf_yolu).convert("RGB")
        gorsel    = fotografi_urune_texture_sar(urun_img, desen_img, urun_tipi)

        if oturum["analiz"].get("metin"):
            gorsel = metni_ekle(
                gorsel,
                oturum["analiz"]["metin"],
                oturum["analiz"].get("metin_konum", "orta")
            )

        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)

        try:
            os.remove(fotograf_yolu)
        except:
            pass

        return jsonify({"basarili": True, "gorsel_base64": gorsel_to_base64(gorsel)})

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/gerial", methods=["POST"])
def tasarim_gerial():
    try:
        session_id = (request.json or {}).get("session_id", "")
        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

        oturum = tasarim_oturumlari[session_id]
        if len(oturum["tasarim_gecmisi"]) > 1:
            oturum["tasarim_gecmisi"].pop()
            if len(oturum["prompt_gecmisi"]) > 1:
                oturum["prompt_gecmisi"].pop()
            oturum["son_gorsel"] = oturum["tasarim_gecmisi"][-1]
            return jsonify({
                "basarili":      True,
                "gorsel_base64": gorsel_to_base64(oturum["son_gorsel"])
            })
        return jsonify({"basarili": False, "hata": "Geri alınacak değişiklik yok"}), 400

    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/kaydet", methods=["POST"])
def tasarim_kaydet():
    try:
        data       = request.json or {}
        session_id = data.get("session_id", "")
        dosya_adi  = data.get("dosya_adi", "tasarim.png")

        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

        oturum     = tasarim_oturumlari[session_id]
        kayit_yolu = f"/tmp/son_tasarimlar/{session_id}_{dosya_adi}"
        os.makedirs("/tmp/son_tasarimlar", exist_ok=True)
        oturum["son_gorsel"].save(kayit_yolu)

        return jsonify({"basarili": True, "dosya_yolu": kayit_yolu, "mesaj": "Kaydedildi"})

    except Exception as e:
        return jsonify({"basarili": False, "hata": str(e)}), 500


# ════════════════════════════════════════════════════════
# 10. BAŞLAT
# ════════════════════════════════════════════════════════
def _flask_calistir():
    import logging
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

_t = threading.Thread(target=_flask_calistir)
_t.daemon = True
_t.start()
time.sleep(2)

print("✅ KapadokyaCraft v8 hazır!")
print(f"   rembg: {'✅ aktif' if REMBG_MEVCUT else '⚠️ yok (renk bazlı yedek)'}")
print("📡 Endpoint: http://localhost:5000/uret")
print("─" * 50)