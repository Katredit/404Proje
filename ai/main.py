import os
import json
import requests
import urllib.parse
import base64
from io import BytesIO
from groq import Groq
from PIL import Image, ImageDraw, ImageFont

# API key'leri ortam değişkeninden oku, GitHub'a gönderilmez
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Groq istemcisini başlat
groq_client = Groq(api_key=GROQ_API_KEY)

# Desteklenen ürün tipleri — her biri için 3D gerçekçi İngilizce şablon
URUN_SABLONLARI = {
    "vazo":   "highly detailed handmade Cappadocia TALL VASE with narrow neck and wide body, standing upright, 3D realistic ceramic object, NOT a plate NOT a bowl NOT a dish",
    "tabak":  "highly detailed handmade Cappadocia CERAMIC PLATE, round, flat, seen from slight angle, 3D realistic ceramic object, NOT a vase NOT a bowl",
    "bardak": "highly detailed handmade Cappadocia CERAMIC MUG with handle, standing upright, 3D realistic ceramic object, NOT a vase NOT a plate",
    "comlek": "highly detailed handmade Cappadocia CLAY POT with lid, round belly, 3D realistic ceramic object, traditional Anatolian style",
    "kilim":  "highly detailed traditional Cappadocia KILIM RUG, flat lay, geometric patterns, wool texture, vibrant colors, aerial view, NOT a ceramic NOT a vase",
}

# Herhangi bir ülke/kültür için ikonik unsurları Groq'tan dinamik alır — elle sözlük eklemeye gerek yok
def kultur_unsurlarini_getir(kultur):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Verilen ülke veya kültüre özgü ikonik unsurları listele.
Sadece İngilizce, kısa ve Stable Diffusion prompt'una uygun yaz.
Şunları dahil et: ünlü yapılar, geleneksel yiyecekler, semboller, motifler, hayvanlar, bitkiler.
BAYRAK veya bayrak renkleri YAZMA — sadece kültürel ikonlar.
Tek satır, virgülle ayrılmış, sadece liste yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Ülke/kültür: {kultur}"
            }
        ]
    )
    return yanit.choices[0].message.content.strip()

# Kullanıcının isteğini analiz eder — metin, konum, ürün tipi, kültür ve desen ayrı ayrı çıkar
def istek_analiz_et(kullanici_istegi):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},  # Groq'u JSON moduna zorla — JSONDecodeError çözüldü
        messages=[
            {
                "role": "system",
                "content": """Kullanıcının isteğini analiz et ve JSON formatında döndür:
{
  "metin": "ürüne yazılacak metin varsa yaz, yoksa null",
  "metin_konum": "metnin konumu: orta, sol_ust, sag_ust, sol_alt, sag_alt, ust, alt — belirtilmemişse orta",
  "urun_tipi": "vazo, tabak, bardak, comlek veya kilim — belirtilmemişse vazo",
  "kultur": "bahsedilen ülke veya kültür varsa Türkçe küçük harfle yaz (almanya, japonya vb), yoksa null",
  "desen": "ürün tipi, metin ve kültür dışındaki tasarım isteği"
}
Sadece JSON yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": kullanici_istegi
            }
        ]
    )
    return json.loads(yanit.choices[0].message.content)

# Türkçe isteği Stable Diffusion için İngilizce prompt'a çevirir
# Kültür varsa Groq'tan dinamik olarak ikonik unsurları alır — bayrak değil semboller
def prompt_uret(desen, urun_tipi="vazo", kultur=None):
    urun_sablon = URUN_SABLONLARI.get(urun_tipi, URUN_SABLONLARI["vazo"])

    # Kültür varsa Groq'a sor, sözlük karıştırma
    kultur_kismi = ""
    if kultur:
        print(f"Kültürel unsurlar alınıyor: {kultur}...")
        kultur_ikonlari = kultur_unsurlarini_getir(kultur)
        print(f"Kültürel unsurlar: {kultur_ikonlari}")
        kultur_kismi = f"decorated with iconic {kultur} cultural elements such as {kultur_ikonlari},"

    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""Sen bir Kapadokya el sanatları uzmanısın.
Kullanıcının isteğini Stable Diffusion için uygun İngilizce prompt'a çevir.
Bayrak, logo, kişi gibi şeyleri SADECE renge ve motife dönüştür.
DAİMA EKLE: {urun_sablon}, {kultur_kismi} intricate hand-painted patterns on surface, terracotta texture, traditional Anatolian craftmanship, soft studio lighting, pure white background, photorealistic, 8K quality.
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Müşteri isteği: {desen}"
            }
        ]
    )
    return yanit.choices[0].message.content

# Pollinations AI ile görsel üretir, tamamen ücretsiz — bağlantı sorunu olursa 3 kez dener
def gorsel_uret(prompt):
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=768&nologo=true&model=flux"  # flux = daha gerçekçi
    for deneme in range(3):
        try:
            print(f"Görsel üretiliyor... (deneme {deneme+1})")
            response = requests.get(url, timeout=120)
            image = Image.open(BytesIO(response.content))
            return image
        except Exception as e:
            print(f"Hata: {e}, tekrar deneniyor...")
    raise Exception("Görsel üretilemedi, 3 deneme de başarısız oldu.")

# Yüklenen fotoğrafı Llama 4 Vision ile çok detaylı analiz eder
# Stable Diffusion prompt'u için spesifik renk/motif/desen bilgisi çıkarır
def fotograf_analiz_et(fotograf_yolu):
    with open(fotograf_yolu, "rb") as f:
        fotograf_base64 = base64.b64encode(f.read()).decode("utf-8")
    yanit = groq_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",  # Görsel anlayan model
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{fotograf_base64}"}
                },
                {
                    "type": "text",
                    "text": """Analyze this image in extreme detail for Stable Diffusion prompt use:
- Exact motifs: (flowers, geometric shapes, animals etc — be very specific)
- Exact colors: (name each color precisely)
- Pattern layout: (center, border, repeating, scattered etc)
- Art style: (Iznik, Ottoman, geometric, naturalist, modern etc)
- Texture and technique: (hand-painted, glazed, embroidered etc)
Write in English, be very specific and detailed."""
                }
            ]
        }]
    )
    return yanit.choices[0].message.content

# Fotoğraftaki deseni ürüne aktarır — Llama 4 Vision + güçlü prompt ile
def foto_ile_gorsel_uret(fotograf_yolu, urun_tipi="vazo", kultur=None, ek_istek=""):
    print("Fotoğraf detaylı analiz ediliyor...")
    fotograf_analiz = fotograf_analiz_et(fotograf_yolu)
    print(f"Analiz: {fotograf_analiz}")

    urun_sablon = URUN_SABLONLARI.get(urun_tipi, URUN_SABLONLARI["vazo"])

    # Kültür varsa onu da ekle
    kultur_kismi = ""
    if kultur:
        kultur_ikonlari = kultur_unsurlarini_getir(kultur)
        kultur_kismi = f"also incorporate {kultur} cultural elements: {kultur_ikonlari},"

    # "AYNEN" vurgusu çok önemli — fotoğraftaki deseni birebir kopyalaması için
    guclu_prompt = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""Sen bir Kapadokya el sanatları uzmanısın.
Aşağıdaki fotoğraf analizindeki desenleri, renkleri ve motifleri AYNEN koruyarak
Stable Diffusion için güçlü İngilizce prompt yaz.
DAİMA EKLE: {urun_sablon}, {kultur_kismi} the EXACT same patterns, colors and motifs from the reference faithfully reproduced on the surface, intricate hand-painted details, terracotta texture, traditional Anatolian craftmanship, soft studio lighting, pure white background, photorealistic, 8K quality.
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Fotoğraf analizi: {fotograf_analiz}\nEk istek: {ek_istek}"
            }
        ]
    ).choices[0].message.content

    print(f"Güçlü prompt: {guclu_prompt}")
    return gorsel_uret(guclu_prompt)

# Görselin üstüne yarı saydam arka planla şık metin ekler
# Yarı saydam koyu arka plan + beyaz yazı — her ürün renginde okunur
def metni_ekle(gorsel, metin, konum="orta"):
    img = gorsel.copy().convert("RGBA")
    w, h = img.size

    # En iyi fontu bul — önce serif (daha zarif), yoksa sans
    font = None
    for yol in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(yol, 48)
            break
        except:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Yazı boyutunu hesapla
    dummy = ImageDraw.Draw(img)
    bbox = dummy.textbbox((0, 0), metin, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    padding = 16

    # Konum hesapla
    konumlar = {
        "orta":    ((w - text_w) // 2, (h - text_h) // 2),
        "ust":     ((w - text_w) // 2, 30),
        "alt":     ((w - text_w) // 2, h - text_h - 30),
        "sol_ust": (30, 30),
        "sag_ust": (w - text_w - 30, 30),
        "sol_alt": (30, h - text_h - 30),
        "sag_alt": (w - text_w - 30, h - text_h - 30),
    }
    x, y = konumlar.get(konum, konumlar["orta"])

    # Yarı saydam yuvarlak arka plan — yazıyı her renkte okunur yapar
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(
        [x - padding, y - padding, x + text_w + padding, y + text_h + padding],
        radius=10,
        fill=(0, 0, 0, 140)  # siyah, yarı saydam
    )
    img = Image.alpha_composite(img, overlay)

    # Beyaz yazı — her arka planda net okunur
    draw = ImageDraw.Draw(img)
    draw.text((x, y), metin, font=font, fill=(255, 255, 255, 255))

    return img.convert("RGB")

# Kullanıcı önceki tasarımı beğenmezse geliştirmek için kullanılır
# Önceki prompt hatırlanır ve yeni istekle birleştirilir — chat gibi çalışır
def iteratif_urun_uret(yeni_istek, onceki_prompt=None, fotograf_yolu=None):
    if onceki_prompt:
        # Önceki prompt varsa yeni istekle birleştir
        print("Önceki tasarım geliştiriliyor...")
        birlestir = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """Bir önceki tasarım promptu ve kullanıcının yeni isteğini birleştir.
Kullanıcının beğenmediği kısımları değiştir, beğendiklerini koru.
Sadece yeni prompt yaz, başka hiçbir şey yazma."""
                },
                {
                    "role": "user",
                    "content": f"Önceki prompt: {onceki_prompt}\nDeğiştirilecek kısım: {yeni_istek}"
                }
            ]
        )
        prompt = birlestir.choices[0].message.content
        gorsel = gorsel_uret(prompt)
        return gorsel, prompt

    # İlk üretimse normal akış
    analiz = istek_analiz_et(yeni_istek)
    urun_tipi = analiz.get("urun_tipi", "vazo")

    if fotograf_yolu:
        gorsel = foto_ile_gorsel_uret(
            fotograf_yolu,
            urun_tipi=urun_tipi,
            kultur=analiz.get("kultur"),
            ek_istek=analiz.get("desen", "")
        )
        prompt = "foto_ile_uretildi"
    else:
        prompt = prompt_uret(analiz["desen"], urun_tipi, analiz.get("kultur"))
        gorsel = gorsel_uret(prompt)

    if analiz.get("metin"):
        print(f"Metin ekleniyor: {analiz['metin']} — konum: {analiz['metin_konum']}")
        gorsel = metni_ekle(gorsel, analiz["metin"], analiz["metin_konum"])

    return gorsel, prompt

# Tüm adımları birleştiren ana fonksiyon
def urun_uret(kullanici_istegi, fotograf_yolu=None):
    # 1. İsteği analiz et — ürün tipi, kültür, metin, desen ayrı ayrı çıkar
    print("İstek analiz ediliyor...")
    analiz = istek_analiz_et(kullanici_istegi)
    print("Analiz:", analiz)

    urun_tipi = analiz.get("urun_tipi", "vazo")
    print(f"Ürün tipi: {urun_tipi}")

    # 2. Fotoğraf varsa deseni direkt aktar, yoksa prompt üret
    if fotograf_yolu:
        print("Fotoğraf deseni ürüne aktarılıyor...")
        gorsel = foto_ile_gorsel_uret(
            fotograf_yolu,
            urun_tipi=urun_tipi,
            kultur=analiz.get("kultur"),
            ek_istek=analiz.get("desen", "")
        )
    else:
        print("Prompt üretiliyor...")
        prompt = prompt_uret(analiz["desen"], urun_tipi, analiz.get("kultur"))
        print("Prompt:", prompt)
        print("Görsel üretiliyor...")
        gorsel = gorsel_uret(prompt)

    # 3. Metin varsa yarı saydam arka planla şık ekle
    if analiz.get("metin"):
        print(f"Metin ekleniyor: {analiz['metin']} — konum: {analiz['metin_konum']}")
        gorsel = metni_ekle(gorsel, analiz["metin"], analiz["metin_konum"])

    return gorsel

print("✅ KapadokyaCraft AI hazır!")
