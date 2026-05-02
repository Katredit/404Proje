# ═══════════════════════════════════════════════════════════════════
# KapadokyaCraft v4 — TAM DÜZELTİLMİŞ KOD
# Değişiklikler:
#   1. rembg ile gerçek arka plan silme
#   2. Kilim için yatay dikdörtgen (768x512)
#   3. Düzenleme: kullanıcı geri bildirimi → AI düzenler (hata düzeltildi)
#   4. Kilim promptları iyileştirildi (düz görünüm, doğru şekil)
#   5. Desen sarma iyileştirildi
# ═══════════════════════════════════════════════════════════════════

import subprocess, sys

def pip(p):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", p])

pip("groq")
pip("flask")
pip("flask-cors")
pip("pillow")
pip("numpy")
pip("requests")
pip("rembg")

import os, json, time, base64, threading
import numpy as np
from io import BytesIO
from groq import Groq
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests as req
import urllib.parse

# rembg — arka plan silme
try:
    from rembg import remove as rembg_remove
    REMBG_MEVCUT = True
    print("✅ rembg yüklendi")
except ImportError:
    REMBG_MEVCUT = False
    print("⚠️ rembg yüklenemedi, renk bazlı yöntem kullanılacak")

# ── API ANAHTARLARI ──────────────────────────────────────────────
GROQ_API_KEY = "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"
HF_TOKEN     = "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"

groq_client = Groq(api_key=GROQ_API_KEY)
app = Flask(__name__)
CORS(app)

# ── ÜRÜN BOYUTLARI ───────────────────────────────────────────────
# Kilim yatay dikdörtgen, diğerleri kare
URUN_BOYUTLARI = {
    "vazo":   (512, 512),
    "tabak":  (512, 512),
    "bardak": (512, 512),
    "comlek": (512, 512),
    "kilim":  (768, 512),   # ← yatay dikdörtgen
}

# ── ŞABLON PROMPTLAR (fotoğraf modu için sade ürün) ──────────────
URUN_SABLONLARI = {
    "vazo":   "plain white ceramic tall vase, centered on pure white background, no shadows, studio photography",
    "tabak":  "plain white ceramic plate, centered on pure white background, no shadows, studio photography",
    "bardak": "plain white ceramic mug with handle, centered on pure white background, no shadows, studio photography",
    "comlek": "plain white clay pot with lid, centered on pure white background, no shadows, studio photography",
    "kilim":  "plain beige kilim rug, flat lay, top-down aerial view, rectangular shape, pure white background, studio photography",
}

# ── VARSAYILAN DESEN PROMPTLARI ──────────────────────────────────
URUN_VARSAYILAN_DESEN = {
    "vazo":   "handcrafted Cappadocia terracotta tall vase, intricate hand-painted Anatolian geometric patterns, vibrant red blue white, folk art, Turkish pottery, white background, photorealistic 8K",
    "tabak":  "handcrafted Cappadocia ceramic plate, Iznik floral tulip patterns, cobalt blue red white glaze, Ottoman motifs, white background, photorealistic 8K",
    "bardak": "handcrafted Cappadocia ceramic mug, hand-painted Anatolian folk patterns, terracotta warm colors, white background, photorealistic 8K",
    "comlek": "handcrafted Cappadocia clay pot with lid, rustic terracotta geometric bands, Anatolian pottery, white background, photorealistic 8K",
    "kilim":  "traditional Turkish kilim rug, flat lay top-down aerial view, rectangular shape, bold geometric diamond medallion patterns, handwoven wool, rich deep red burgundy ivory black, Anatolian tribal weaving, white background, photorealistic 8K, wide format",
}


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
- "desen" alanına SADECE kullanıcının istediği şeyi yaz, kendi zevkini KATMA
- Kullanıcı "sadece turkuaz kilim" diyorsa desen = "plain solid turquoise color, no patterns, minimal"
- Kullanıcı "çiçekli vazo" diyorsa desen = "floral patterns on vase"
- Kullanıcı detaylı anlatırsa o detayları İngilizceye çevir
- "sade_mi" = true ise gereksiz desen ekleme

{
  "metin": "ürüne yazılacak metin varsa yaz, yoksa null",
  "metin_konum": "orta/ust/alt/sol_ust/sag_ust/sol_alt/sag_alt",
  "urun_tipi": "vazo/tabak/bardak/comlek/kilim",
  "kultur": "kültür varsa İngilizce, yoksa null",
  "desen": "SADECE kullanıcının istediği tasarım, İngilizce, KISA VE NET",
  "sade_mi": true
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
#    Kilim için farklı boyut kullanır
# ════════════════════════════════════════════════════════
def gorsel_uret(prompt, urun_tipi="vazo"):
    genislik, yukseklik = URUN_BOYUTLARI.get(urun_tipi, (512, 512))

    # Kilim promptuna her zaman flat-lay ve rectangular ekle
    if urun_tipi == "kilim" and "flat lay" not in prompt.lower():
        prompt = prompt + ", flat lay top-down view, rectangular rug, wide format"

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    url = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
    payload = {
        "inputs": prompt[:500],
        "parameters": {"width": genislik, "height": yukseklik},
        "options": {"wait_for_model": True}
    }

    for deneme in range(3):
        try:
            print(f"  Görsel üretiliyor... ({genislik}×{yukseklik}) deneme {deneme+1}/3")
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

    # Son çare: boş görsel
    print("  ❌ Tüm kaynaklar başarısız")
    fb = Image.new("RGB", (genislik, yukseklik), (245, 235, 220))
    d = ImageDraw.Draw(fb)
    for i in range(0, genislik, 40):
        d.line([(i, 0), (i, yukseklik)], fill=(210, 195, 170), width=1)
    for j in range(0, yukseklik, 40):
        d.line([(0, j), (genislik, j)], fill=(210, 195, 170), width=1)
    return fb


# ════════════════════════════════════════════════════════
# 3. PROMPT OLUŞTURMA
# ════════════════════════════════════════════════════════
def prompt_olustur(analiz):
    urun_tipi = analiz.get("urun_tipi", "vazo")
    desen     = analiz.get("desen", "")
    kultur    = analiz.get("kultur") or ""
    sade_mi   = analiz.get("sade_mi", False)

    kultur_eki = f"{kultur} style, " if kultur else ""

    if sade_mi:
        urun_isimleri = {
            "vazo":   "ceramic vase",
            "tabak":  "ceramic plate",
            "bardak": "ceramic mug",
            "comlek": "clay pot",
            "kilim":  "kilim rug flat lay top-down view rectangular",
        }
        urun_ismi = urun_isimleri.get(urun_tipi, "ceramic product")
        prompt = f"{desen} {urun_ismi}, {kultur_eki}plain white background, studio lighting, photorealistic 8K"
    else:
        urun_baglam = {
            "vazo":   "handcrafted ceramic tall vase, white background, photorealistic 8K",
            "tabak":  "handcrafted ceramic plate, white background, photorealistic 8K",
            "bardak": "handcrafted ceramic mug, white background, photorealistic 8K",
            "comlek": "handcrafted clay pot with lid, white background, photorealistic 8K",
            "kilim":  "traditional kilim rug flat lay top-down aerial view, rectangular shape, white background, photorealistic 8K",
        }
        prompt = f"{desen}, {kultur_eki}{urun_baglam.get(urun_tipi, '')}"

    return prompt


# ════════════════════════════════════════════════════════
# 4. ARKA PLAN SİLME
#    Önce rembg dene, olmazsa renk bazlı yöntem
# ════════════════════════════════════════════════════════
def arkaplan_sil(img):
    """
    Görüntüden arka planı siler, RGBA döndürür.
    Önce rembg (AI tabanlı, çok daha iyi), olmazsa renk bazlı.
    """
    if REMBG_MEVCUT:
        try:
            print("  🧹 rembg ile arka plan siliniyor...")
            buf = BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            sonuc_bytes = rembg_remove(buf.read())
            sonuc = Image.open(BytesIO(sonuc_bytes)).convert("RGBA")
            # Kontrol: alfa kanalı var mı?
            alfa = np.array(sonuc)[:, :, 3]
            if alfa.mean() > 5:
                print(f"  ✅ rembg başarılı (ortalama alfa: {alfa.mean():.0f})")
                return sonuc
            print("  ⚠️ rembg alfa boş, renk bazlı yönteme geçiliyor")
        except Exception as e:
            print(f"  ⚠️ rembg hatası: {e}, renk bazlı yönteme geçiliyor")

    # Yedek: renk bazlı maske
    print("  🎨 Renk bazlı arka plan silme...")
    return _renk_bazli_arkaplan_sil(img)


def _renk_bazli_arkaplan_sil(img):
    """Köşe rengi örnekleyerek arka planı RGBA'ya çevirir."""
    rgb  = img.convert("RGB")
    arr  = np.array(rgb, dtype=np.float32)
    h, w = arr.shape[:2]

    koseler = np.array([
        arr[0, 0], arr[0, w-1], arr[h-1, 0], arr[h-1, w-1],
        arr[0, w//2], arr[h//2, 0], arr[h//2, w-1], arr[h-1, w//2],
        arr[2, 2], arr[2, w-3], arr[h-3, 2], arr[h-3, w-3],
        arr[h-1, w//3], arr[h-1, 2*w//3],
    ])
    bg = np.median(koseler, axis=0)
    print(f"  Arka plan rengi: R={bg[0]:.0f} G={bg[1]:.0f} B={bg[2]:.0f}")

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mesafe = np.sqrt((r - bg[0])**2 + (g - bg[1])**2 + (b - bg[2])**2)
    esik = max(40, np.percentile(mesafe, 18))

    alfa_arr = np.where(mesafe < esik, 0, 255).astype(np.uint8)
    alfa_img = Image.fromarray(alfa_arr, "L")
    alfa_img = alfa_img.filter(ImageFilter.MaxFilter(9))
    alfa_img = alfa_img.filter(ImageFilter.MinFilter(5))
    alfa_img = alfa_img.filter(ImageFilter.GaussianBlur(radius=2))

    rgba = rgb.convert("RGBA")
    rgba.putalpha(alfa_img)
    return rgba


# ════════════════════════════════════════════════════════
# 5. FOTOĞRAF SARMA (yeniden yazıldı)
#    rembg kullanarak çok daha temiz maske alır
# ════════════════════════════════════════════════════════
def deseni_urune_sar(urun_img, desen_img, urun_tipi="vazo", opaklık=0.70):
    """
    Ürün görselini al, arka planını sil (rembg), deseni alt katmana ekle.
    """
    w, h = urun_img.size

    # ── 1. Ürün arka planını sil → RGBA ──
    print("  Ürün arka planı siliniyor...")
    urun_rgba = arkaplan_sil(urun_img.convert("RGB"))
    urun_rgba = urun_rgba.resize((w, h), Image.LANCZOS)

    # ── 2. Alfa kanalından bounding box bul ──
    alfa = np.array(urun_rgba)[:, :, 3]
    satir_var = np.any(alfa > 64, axis=1)
    sutun_var = np.any(alfa > 64, axis=0)

    if satir_var.any() and sutun_var.any():
        y1, y2 = np.where(satir_var)[0][[0, -1]]
        x1, x2 = np.where(sutun_var)[0][[0, -1]]
    else:
        y1, y2, x1, x2 = 0, h, 0, w

    urun_w = max(x2 - x1, 1)
    urun_h = max(y2 - y1, 1)
    print(f"  Ürün bölgesi: {urun_w}×{urun_h} offset=({x1},{y1})")

    # ── 3. Deseni ürün boyutuna sığdır ──
    desen_kucuk = desen_img.convert("RGB").resize((urun_w, urun_h), Image.LANCZOS)
    desen_tam   = Image.new("RGB", (w, h), (200, 200, 200))
    desen_tam.paste(desen_kucuk, (x1, y1))

    # ── 4. Soft-light blend: desen + ürün aydınlık haritası ──
    urun_gray     = urun_rgba.convert("L")
    vazo_arr      = np.array(urun_gray, dtype=np.float32) / 255.0
    desen_arr     = np.array(desen_tam, dtype=np.float32) / 255.0

    karisim = np.clip(desen_arr * (vazo_arr[:, :, None] * 1.5 + 0.35), 0, 1)
    blended = Image.fromarray((karisim * 255).astype(np.uint8), "RGB")
    blended = Image.blend(desen_tam, blended, opaklık)
    blended = ImageEnhance.Color(blended).enhance(1.15)
    blended = ImageEnhance.Contrast(blended).enhance(1.1)

    # ── 5. Beyaz arka plan üstüne: önce desen, sonra ürün alfa maskesi ──
    beyaz = Image.new("RGBA", (w, h), (255, 255, 255, 255))

    # Desen katmanı (ürünün şekline göre maskelenmiş)
    desen_rgba = blended.convert("RGBA")
    desen_rgba.putalpha(Image.fromarray(alfa, "L"))

    # Beyaza deseni yapıştır
    beyaz.paste(desen_rgba, (0, 0), desen_rgba)

    # Ürünün orijinal kenar çizgilerini/dokusunu hafifçe üstüne bindir
    urun_overlay = urun_rgba.copy()
    # Sadece kenar detayları için hafif overlay
    urun_arr_rgb = np.array(urun_rgba.convert("RGB"), dtype=np.float32) / 255.0
    # Gray değeri 0.85 üstü = açık alan (arka plan kısmı) → atla
    sobel_arr = np.array(urun_gray, dtype=np.float32) / 255.0
    kenar_alfa = np.clip((1.0 - sobel_arr) * np.array(alfa, dtype=np.float32) / 255.0 * 180, 0, 120).astype(np.uint8)
    urun_karartma = Image.fromarray(kenar_alfa, "L")
    karartma_katmani = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    karartma_katmani.putalpha(urun_karartma)
    beyaz = Image.alpha_composite(beyaz, karartma_katmani)

    return beyaz.convert("RGB")


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
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    except:
        tw, th = len(metin) * 20, 40

    konumlar = {
        "orta":    ((w - tw) // 2, (h - th) // 2),
        "ust":     ((w - tw) // 2, int(h * 0.12)),
        "alt":     ((w - tw) // 2, h - th - int(h * 0.12)),
        "sol_ust": (int(w * 0.08), int(h * 0.12)),
        "sag_ust": (w - tw - int(w * 0.08), int(h * 0.12)),
        "sol_alt": (int(w * 0.08), h - th - int(h * 0.12)),
        "sag_alt": (w - tw - int(w * 0.08), h - th - int(h * 0.12)),
    }
    x, y = konumlar.get(konum, konumlar["orta"])

    golge = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(golge).text((x + 3, y + 3), metin, font=font, fill=(20, 10, 5, 90))
    golge = golge.filter(ImageFilter.GaussianBlur(radius=2.5))

    boya = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(boya)
    for ox, oy, renk in [
        (-1, 0, (15, 30, 100, 80)), (1, 0, (15, 30, 100, 80)),
        (0, -1, (15, 30, 100, 80)), (0, 1, (15, 30, 100, 80)),
        (0, 0, (30, 50, 140, 210))
    ]:
        bd.text((x + ox, y + oy), metin, font=font, fill=renk)
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


# ════════════════════════════════════════════════════════
# 8. FLASK ENDPOINT'LERİ
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
            # Fotoğraf modu: sade ürün üret + deseni sar
            urun_img  = gorsel_uret(URUN_SABLONLARI[urun_tipi], urun_tipi)
            desen_img = Image.open(fotograf_yolu).convert("RGB")
            gorsel    = deseni_urune_sar(urun_img, desen_img, urun_tipi)
            try:
                os.remove(fotograf_yolu)
            except:
                pass
            kullanilan_prompt = "fotograf_modu"
        else:
            # Prompt modu
            kullanilan_prompt = prompt_olustur(analiz)
            print(f"Prompt: {kullanilan_prompt}")
            gorsel = gorsel_uret(kullanilan_prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        print(f"  ⏱️ Toplam süre: {time.time() - t0:.1f}s")
        return jsonify({
            "basarili": True,
            "gorsel_base64": gorsel_to_base64(gorsel),
            "analiz": analiz,
            "prompt_kullanildi": kullanilan_prompt
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/baslat", methods=["POST"])
def tasarim_baslat():
    try:
        data = request.json or {}
        kullanici_prompt = data.get("prompt", "").strip()
        urun_tipi = data.get("urun_tipi", "vazo")

        if not kullanici_prompt:
            return jsonify({"basarili": False, "hata": "prompt boş"}), 400

        session_id = base64.b64encode(os.urandom(16)).decode()[:16]

        analiz = istek_analiz_et(kullanici_prompt)
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


# ════════════════════════════════════════════════════════
# DÜZELTİLDİ: Kullanıcı geri bildirimi → AI düzenler
# Eski hata: prompt birleştirmesi bozuktu, analiz yanlış override ediliyordu
# ════════════════════════════════════════════════════════
@app.route("/tasarim/duzenle", methods=["POST"])
def tasarim_duzenle():
    try:
        data = request.json or {}
        session_id = data.get("session_id", "")
        geri_bildirim = data.get("geri_bildirim", "").strip()  # kullanıcının yazılı geri bildirimi

        if session_id not in tasarim_oturumlari:
            return jsonify({"basarili": False, "hata": "Oturum bulunamadı"}), 404

        if not geri_bildirim:
            return jsonify({"basarili": False, "hata": "geri_bildirim boş"}), 400

        oturum = tasarim_oturumlari[session_id]
        orijinal_prompt = oturum["prompt_gecmisi"][0]   # kullanıcının ilk isteği
        urun_tipi       = oturum["urun_tipi"]

        # Groq'a: orijinal istek + kullanıcının geri bildirimi → yeni tasarım talebi
        birlesik_istek = (
            f"Orijinal istek: {orijinal_prompt}\n"
            f"Kullanıcının geri bildirimi: {geri_bildirim}\n"
            f"Lütfen bu geri bildirimi dikkate alarak yeni bir tasarım talebi oluştur."
        )

        # Yeni analiz — urun_tipi'yi koru
        analiz = istek_analiz_et(birlesik_istek)
        analiz["urun_tipi"] = urun_tipi          # ürün tipi değişmesin

        prompt = prompt_olustur(analiz)
        print(f"  Düzenleme promptu: {prompt}")

        gorsel = gorsel_uret(prompt, urun_tipi)

        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

        # Geçmişi güncelle
        oturum["son_gorsel"] = gorsel
        oturum["tasarim_gecmisi"].append(gorsel)
        oturum["prompt_gecmisi"].append(geri_bildirim)
        oturum["analiz"] = analiz

        return jsonify({
            "basarili":      True,
            "gorsel_base64": gorsel_to_base64(gorsel),
            "analiz":        analiz,
            "prompt_kullanildi": prompt
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"basarili": False, "hata": str(e)}), 500


@app.route("/tasarim/fotograf_ekle", methods=["POST"])
def tasarim_fotograf_ekle():
    try:
        session_id = request.form.get("session_id", "")
        dosya = request.files.get("fotograf")

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
        gorsel    = deseni_urune_sar(urun_img, desen_img, urun_tipi)

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

print("✅ KapadokyaCraft v4 hazır!")
print(f"   rembg: {'✅ aktif' if REMBG_MEVCUT else '⚠️ yok (renk bazlı yedek)'}")
print("📡 Endpoint: http://localhost:5000/uret")
print("─" * 40)