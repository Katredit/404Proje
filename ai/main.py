import os
import json
import requests
import urllib.parse
import base64
from io import BytesIO
from groq import Groq
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import time

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

groq_client = Groq(api_key=GROQ_API_KEY)

URUN_SABLONLARI = {
    "vazo":   "highly detailed handmade Cappadocia TALL VASE with narrow neck and wide body, standing upright on white surface, 3D realistic ceramic object, NOT a plate NOT a bowl NOT a dish NOT a flat image NOT a photograph",
    "tabak":  "highly detailed handmade Cappadocia CERAMIC PLATE, round, flat, seen from slight angle, 3D realistic ceramic object, NOT a vase NOT a bowl",
    "bardak": "highly detailed handmade Cappadocia CERAMIC MUG with handle, standing upright, 3D realistic ceramic object, NOT a vase NOT a plate",
    "comlek": "highly detailed handmade Cappadocia CLAY POT with lid, round belly, 3D realistic ceramic object, traditional Anatolian style",
    "kilim":  "highly detailed traditional Cappadocia KILIM RUG, flat lay, geometric patterns, wool texture, vibrant colors, aerial view, NOT a ceramic NOT a vase",
}


def kultur_unsurlarini_getir(kultur):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Verilen ülke veya kültüre özgü ikonik görsel unsurları listele.
Stable Diffusion prompt'u için uygun, çok spesifik ve görsel olarak güçlü İngilizce terimler yaz.
Ünlü yapılar, geleneksel motifler, semboller, bitkiler, hayvanlar — somut ve tanınabilir olanları seç.
BAYRAK veya bayrak renkleri YAZMA.
Sadece virgülle ayrılmış liste yaz, 8-12 unsur, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Ülke/kültür: {kultur}"
            }
        ]
    )
    return yanit.choices[0].message.content.strip()


def istek_analiz_et(kullanici_istegi):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
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


def fotograf_analiz_et(fotograf_yolu):
    with open(fotograf_yolu, "rb") as f:
        fotograf_base64 = base64.b64encode(f.read()).decode("utf-8")

    uzanti = fotograf_yolu.lower().split(".")[-1]
    media_type_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "gif": "image/gif", "webp": "image/webp"
    }
    media_type = media_type_map.get(uzanti, "image/jpeg")

    yanit = groq_client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{fotograf_base64}"
                    }
                },
                {
                    "type": "text",
                    "text": """Analyze this image in extreme detail for use as a ceramic decoration pattern.
Describe:
- Exact motifs (flowers, geometric shapes, animals etc)
- Exact colors (name each color precisely)
- Pattern layout (centered, border, scattered etc)
- Art style (Iznik, Ottoman, geometric, naturalist etc)
Write in English, max 250 words."""
                }
            ],
        }]
    )
    return yanit.choices[0].message.content


def prompt_uret(desen, urun_tipi="vazo", kultur=None):
    urun_sablon = URUN_SABLONLARI.get(urun_tipi, URUN_SABLONLARI["vazo"])

    kultur_kismi = ""
    if kultur:
        print(f"Kültürel unsurlar alınıyor: {kultur}...")
        kultur_ikonlari = kultur_unsurlarini_getir(kultur)
        print(f"Kültürel unsurlar: {kultur_ikonlari}")
        kultur_kismi = f"MANDATORY: The ceramic surface MUST BE COVERED with highly recognizable {kultur} cultural icons: {kultur_ikonlari}. These symbols must be CLEARLY VISIBLE and DOMINANT."

    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""Sen bir Kapadokya el sanatları uzmanısın.
Kullanıcının isteğini Stable Diffusion için uygun İngilizce prompt'a çevir.
Bayrak, logo, kişi gibi şeyleri SADECE renge ve motife dönüştür.
DAİMA EKLE: {urun_sablon}, intricate hand-painted patterns on surface, terracotta texture, traditional Anatolian craftmanship, soft studio lighting, pure white background, photorealistic, 8K quality.
{kultur_kismi}
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Müşteri isteği: {desen}"
            }
        ]
    )
    return yanit.choices[0].message.content


def foto_prompt_uret(fotograf_analiz, urun_tipi="vazo", kultur=None, ek_istek=""):
    urun_sablon = URUN_SABLONLARI.get(urun_tipi, URUN_SABLONLARI["vazo"])

    kultur_kismi = ""
    if kultur:
        kultur_ikonlari = kultur_unsurlarini_getir(kultur)
        kultur_kismi = f"also incorporate {kultur} cultural elements: {kultur_ikonlari},"

    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""Sen bir Kapadokya el sanatları uzmanısın.
Fotoğraf analizindeki desenleri AYNEN seramiğe aktaracak Stable Diffusion prompt'u yaz.
DAİMA EKLE: {urun_sablon}, {kultur_kismi}
the EXACT same patterns colors and motifs faithfully hand-painted on the ceramic surface,
intricate brush strokes, glazed ceramic texture, terracotta body, traditional Anatolian craftmanship,
soft studio lighting, pure white background, photorealistic, 8K quality.
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Fotoğraf analizi:\n{fotograf_analiz}\nEk istek: {ek_istek}"
            }
        ]
    )
    return yanit.choices[0].message.content


def gorsel_uret(prompt, max_deneme=3):
    clean_prompt = prompt.encode('ascii', 'ignore').decode('ascii')
    clean_prompt = ' '.join(clean_prompt.split())
    clean_prompt = clean_prompt[:500]

    for deneme in range(max_deneme):
        try:
            print(f"Görsel üretiliyor... (deneme {deneme + 1}/{max_deneme})")
            encoded = urllib.parse.quote(clean_prompt)
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=768&nologo=true&model=flux"
            response = requests.get(url, timeout=60)

            if response.status_code != 200:
                print(f"HTTP hatası: {response.status_code}")
                time.sleep(2)
                continue

            content_type = response.headers.get('content-type', '')
            if 'image' not in content_type:
                print(f"Yanlış content-type: {content_type}")
                time.sleep(2)
                continue

            image = Image.open(BytesIO(response.content))
            if image and image.size[0] > 10:
                print(f"Görsel üretildi: {image.size}")
                return image

            time.sleep(2)

        except Exception as e:
            print(f"Hata: {e}, tekrar deneniyor...")
            time.sleep(3)

    print("Görsel üretilemedi, varsayılan oluşturuluyor...")
    fallback = Image.new('RGB', (512, 768), color=(245, 240, 235))
    draw = ImageDraw.Draw(fallback)
    draw.text((100, 384), "Gorsel Uretilemedi", fill=(100, 80, 60))
    draw.text((120, 450), "API Baglanti Hatasi", fill=(100, 80, 60))
    return fallback


def metni_ekle(gorsel, metin, konum="orta"):
    img = gorsel.copy().convert("RGBA")
    w, h = img.size

    # Serif font seramiğe daha yakın hissiyat verir
    font = None
    font_size = max(40, int(h * 0.075))
    for yol in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(yol, font_size)
            break
        except:
            continue
    if font is None:
        font = ImageFont.load_default()

    dummy_draw = ImageDraw.Draw(img)
    try:
        bbox = dummy_draw.textbbox((0, 0), metin, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except:
        text_w, text_h = len(metin) * 20, 40

    konumlar = {
        "orta":    ((w - text_w) // 2, (h - text_h) // 2),
        "ust":     ((w - text_w) // 2, int(h * 0.12)),
        "alt":     ((w - text_w) // 2, h - text_h - int(h * 0.12)),
        "sol_ust": (int(w * 0.08), int(h * 0.12)),
        "sag_ust": (w - text_w - int(w * 0.08), int(h * 0.12)),
        "sol_alt": (int(w * 0.08), h - text_h - int(h * 0.12)),
        "sag_alt": (w - text_w - int(w * 0.08), h - text_h - int(h * 0.12)),
    }
    x, y = konumlar.get(konum, konumlar["orta"])

    # Katman 1: gölge
    golge = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(golge).text((x + 3, y + 3), metin, font=font, fill=(20, 10, 5, 90))
    golge = golge.filter(ImageFilter.GaussianBlur(radius=2.5))

    # Katman 2: kobalt mavi boya — hafif ofsetli 4 baskı + merkez
    boya = Image.new("RGBA", img.size, (0, 0, 0, 0))
    boya_ciz = ImageDraw.Draw(boya)
    renk_ana   = (30, 50, 140, 210)
    renk_kenar = (15, 30, 100, 80)
    for ox, oy, renk in [(-1, 0, renk_kenar), (1, 0, renk_kenar),
                          (0, -1, renk_kenar), (0, 1, renk_kenar),
                          (0,  0, renk_ana)]:
        boya_ciz.text((x + ox, y + oy), metin, font=font, fill=renk)
    boya = boya.filter(ImageFilter.GaussianBlur(radius=0.6))

    # Katman 3: kabartma ışığı
    kabartma = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(kabartma).text((x - 1, y - 1), metin, font=font, fill=(255, 255, 240, 40))
    kabartma = kabartma.filter(ImageFilter.GaussianBlur(radius=0.3))

    sonuc = Image.alpha_composite(img, golge)
    sonuc = Image.alpha_composite(sonuc, boya)
    sonuc = Image.alpha_composite(sonuc, kabartma)

    return sonuc.convert("RGB")


def iteratif_urun_uret(yeni_istek, onceki_prompt=None, fotograf_yolu=None):
    if onceki_prompt:
        print("Önceki tasarım geliştiriliyor...")
        yanit = groq_client.chat.completions.create(
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
        prompt = yanit.choices[0].message.content
        gorsel = gorsel_uret(prompt)
        return gorsel, prompt

    analiz = istek_analiz_et(yeni_istek)
    urun_tipi = analiz.get("urun_tipi", "vazo")

    if fotograf_yolu:
        print("Fotoğraf analiz ediliyor...")
        fo_analiz = fotograf_analiz_et(fotograf_yolu)
        print(f"Analiz tamamlandı ({len(fo_analiz)} karakter)")
        prompt = foto_prompt_uret(fo_analiz, urun_tipi, analiz.get("kultur"), analiz.get("desen", ""))
        print(f"Prompt: {prompt[:200]}...")
        gorsel = gorsel_uret(prompt)
        if analiz.get("metin"):
            gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))
        return gorsel, prompt

    prompt = prompt_uret(analiz["desen"], urun_tipi, analiz.get("kultur"))
    gorsel = gorsel_uret(prompt)
    if analiz.get("metin"):
        gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))
    return gorsel, prompt


def urun_uret(kullanici_istegi, fotograf_yolu=None):
    print("İstek analiz ediliyor...")
    analiz = istek_analiz_et(kullanici_istegi)
    print("Analiz:", analiz)

    urun_tipi = analiz.get("urun_tipi", "vazo")
    print(f"Ürün tipi: {urun_tipi}")

    if fotograf_yolu:
        print("Fotoğraf analiz ediliyor...")
        fo_analiz = fotograf_analiz_et(fotograf_yolu)
        print(f"Fotoğraf analizi tamamlandı ({len(fo_analiz)} karakter)")
        prompt = foto_prompt_uret(fo_analiz, urun_tipi, analiz.get("kultur"), analiz.get("desen", ""))
        print(f"Prompt: {prompt[:200]}...")
    else:
        print("Prompt üretiliyor...")
        prompt = prompt_uret(analiz["desen"], urun_tipi, analiz.get("kultur"))
        print("Prompt:", prompt[:200], "...")

    print("Görsel üretiliyor...")
    gorsel = gorsel_uret(prompt)

    if analiz.get("metin"):
        print(f"Metin ekleniyor: {analiz['metin']} — konum: {analiz.get('metin_konum', 'orta')}")
        gorsel = metni_ekle(gorsel, analiz["metin"], analiz.get("metin_konum", "orta"))

    return gorsel


print("KapadokyaCraft AI hazir!")
