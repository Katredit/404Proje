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

# Kullanıcının isteğini analiz eder — metin, logo ve desen ayrı ayrı çıkarılır
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
def prompt_uret(desen, urun_tipi="vazo"):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                # Groq'a Kapadokya uzmanı kimliği veriyoruz
                # Logo ve marka isimlerini renge ve motife dönüştürmesini istiyoruz
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

# Pollinations AI ile görsel üretir, tamamen ücretsiz
def gorsel_uret(prompt):
    # Prompt'u URL'e uygun hale getir
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=768&nologo=true"
    
    # Bağlantı sorunu olursa 3 kez dene
    for deneme in range(3):
        try:
            print(f"Görsel üretiliyor... (deneme {deneme+1})")
            response = requests.get(url, timeout=120)
            image = Image.open(BytesIO(response.content))
            return image
        except Exception as e:
            print(f"Hata: {e}, tekrar deneniyor...")
    
    raise Exception("Görsel üretilemedi, 3 deneme de başarısız oldu.")

# Görselin üstüne metin ekler
def vazoya_metin_ekle(gorsel, metin, renk=(255, 215, 0)):
    img = gorsel.copy()
    draw = ImageDraw.Draw(img)
    w, h = img.size
    # Sistem fontunu kullan, yoksa varsayılana geç
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    # Metni görselin ortasına yerleştir
    bbox = draw.textbbox((0, 0), metin, font=font)
    text_w = bbox[2] - bbox[0]
    x = (w - text_w) // 2
    y = h // 2
    draw.text((x, y), metin, font=font, fill=renk)
    return img

# Yüklenen fotoğrafı analiz eder, motif ve renkleri çıkarır
def fotograf_analiz_et(fotograf_yolu):
    # Fotoğrafı base64'e çevir, AI'a göndermek için gerekli
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

    # 5. Metin varsa görselin üstüne ekle
    if analiz["metin"]:
        print(f"Metin ekleniyor: {analiz['metin']}")
        gorsel = vazoya_metin_ekle(gorsel, analiz["metin"])

    return gorsel

print("✅ KapadokyaCraft AI hazır!")
print("KapadokyaCraft AI hazır!")
