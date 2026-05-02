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

# Kullanıcının isteğini analiz eder — metin, metin konumu, logo ve desen ayrı ayrı çıkarılır
def istek_analiz_et(kullanici_istegi):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                # Groq'a JSON formatında analiz yapmasını söylüyoruz
                "content": """Kullanıcının isteğini analiz et ve JSON formatında döndür:
{
  "metin": "vazoya yazılacak metin varsa yaz, yoksa null",
  "metin_konum": "metnin konumu: orta, sol_ust, sag_ust, sol_alt, sag_alt, ust, alt — belirtilmemişse orta",
  "logo": "istenen marka/takım adı varsa yaz, yoksa null",
  "desen": "metin ve logo dışındaki tasarım isteği"
}
Sadece JSON yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": kullanici_istegi
            }
        ]
    )
    # Gelen yanıtı JSON'a çevir
    return json.loads(yanit.choices[0].message.content)

# Kullanıcının Türkçe isteğini Stable Diffusion için İngilizce prompt'a çevirir
# Logo, marka, bayrak gibi şeyleri otomatik olarak renge ve motife dönüştürür
def prompt_uret(desen, urun_tipi="vazo"):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Sen bir Kapadokya el sanatları uzmanısın.
Kullanıcının isteğini Stable Diffusion için uygun İngilizce prompt'a çevir.
Marka/logo/kişi/bayrak gibi şeyleri SADECE renge ve motife dönüştür.
DAİMA EKLE: highly detailed handmade Cappadocia TALL VASE with narrow neck and wide body, standing upright, NOT a plate NOT a bowl NOT a dish, only the vase, intricate hand-painted patterns on vase surface, terracotta texture, traditional Anatolian craftmanship, soft studio lighting, pure white background, photorealistic.
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Ürün: {urun_tipi}\nMüşteri isteği: {desen}"
            }
        ]
    )
    return yanit.choices[0].message.content

# Pollinations AI ile görsel üretir, tamamen ücretsiz ve token gerektirmez
# Bağlantı sorunu olursa 3 kez dener
def gorsel_uret(prompt):
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=768&nologo=true"
    for deneme in range(3):
        try:
            print(f"Görsel üretiliyor... (deneme {deneme+1})")
            response = requests.get(url, timeout=120)
            image = Image.open(BytesIO(response.content))
            return image
        except Exception as e:
            print(f"Hata: {e}, tekrar deneniyor...")
    raise Exception("Görsel üretilemedi, 3 deneme de başarısız oldu.")

# Görselin üstüne metin ekler, konum parametresine göre yerleştirir
def vazoya_metin_ekle(gorsel, metin, konum="orta", renk=(255, 215, 0)):
    img = gorsel.copy()
    draw = ImageDraw.Draw(img)
    w, h = img.size
    # Sistem fontunu kullan, yoksa varsayılana geç
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), metin, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Konuma göre x, y koordinatlarını hesapla
    konumlar = {
        "orta":    ((w - text_w) // 2, (h - text_h) // 2),
        "ust":     ((w - text_w) // 2, 20),
        "alt":     ((w - text_w) // 2, h - text_h - 20),
        "sol_ust": (20, 20),
        "sag_ust": (w - text_w - 20, 20),
        "sol_alt": (20, h - text_h - 20),
        "sag_alt": (w - text_w - 20, h - text_h - 20),
    }
    x, y = konumlar.get(konum, konumlar["orta"])
    draw.text((x, y), metin, font=font, fill=renk)
    return img

# Yüklenen fotoğrafı base64'e çevirip Groq'un görsel modeline gönderir
# Motif, renk ve desen tarzını analiz eder
def fotograf_analiz_et(fotograf_yolu):
    with open(fotograf_yolu, "rb") as f:
        fotograf_base64 = base64.b64encode(f.read()).decode("utf-8")
    yanit = groq_client.chat.completions.create(
        # Görsel anlayan Llama 4 modelini kullanıyoruz
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{fotograf_base64}"}
                },
                {
                    "type": "text",
                    "text": """Bu fotoğraftaki deseni, renkleri ve motifleri analiz et.
- Ana motif: (ne var?)
- Renkler: (hangi renkler?)
- Desen tarzı: (geometrik mi, doğal mı, soyut mu?)
Kısa ve net yaz."""
                }
            ]
        }]
    )
    return yanit.choices[0].message.content

# Kullanıcı önceki tasarımı beğenmezse yeni isteğini yazarak geliştirebilir
# Önceki prompt hatırlanır ve yeni istekle birleştirilir
def iteratif_urun_uret(yeni_istek, onceki_prompt=None, urun_tipi="vazo", fotograf_yolu=None):
    if onceki_prompt:
        # Önceki prompt varsa yeni istekle birleştir, beğenilen kısımlar korunur
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
    else:
        # İlk kez üretiyorsa normal akış
        analiz = istek_analiz_et(yeni_istek)
        if fotograf_yolu:
            fotograf_analiz = fotograf_analiz_et(fotograf_yolu)
            desen = analiz["desen"] + " " + fotograf_analiz
        else:
            desen = analiz["desen"]
        prompt = prompt_uret(desen, urun_tipi)

    print("Prompt:", prompt)
    gorsel = gorsel_uret(prompt)

    # İlk istek ise metin kontrolü yap
    if not onceki_prompt:
        analiz = istek_analiz_et(yeni_istek)
        if analiz["metin"]:
            print(f"Metin ekleniyor: {analiz['metin']} — konum: {analiz['metin_konum']}")
            gorsel = vazoya_metin_ekle(gorsel, analiz["metin"], analiz["metin_konum"])

    # Prompt'u da döndür, bir sonraki iterasyonda kullanılacak
    return gorsel, prompt

# Tüm adımları birleştiren ana fonksiyon
def urun_uret(kullanici_istegi, urun_tipi="vazo", fotograf_yolu=None):
    # 1. Kullanıcının isteğini analiz et
    print("İstek analiz ediliyor...")
    analiz = istek_analiz_et(kullanici_istegi)
    print("Analiz:", analiz)

    # 2. Fotoğraf varsa analiz et ve desene ekle
    if fotograf_yolu:
        print("Fotoğraf analiz ediliyor...")
        fotograf_analiz = fotograf_analiz_et(fotograf_yolu)
        desen = analiz["desen"] + " " + fotograf_analiz
    else:
        desen = analiz["desen"]

    # 3. Deseni İngilizce prompt'a çevir
    print("Prompt üretiliyor...")
    prompt = prompt_uret(desen, urun_tipi)
    print("Prompt:", prompt)

    # 4. Görseli üret
    print("Görsel üretiliyor...")
    gorsel = gorsel_uret(prompt)

    # 5. Metin varsa görselin üstüne konumuna göre ekle
    if analiz["metin"]:
        print(f"Metin ekleniyor: {analiz['metin']} — konum: {analiz['metin_konum']}")
        gorsel = vazoya_metin_ekle(gorsel, analiz["metin"], analiz["metin_konum"])

    return gorsel

print("KapadokyaCraft AI hazır!")
