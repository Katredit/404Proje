import os
from groq import Groq
from huggingface_hub import InferenceClient
from PIL import Image
import base64

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

groq_client = Groq(api_key=GROQ_API_KEY)
#prompt üretme kısmı

def prompt_uret(kullanici_istegi, urun_tipi="vazo"):
    yanit = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Sen bir Kapadokya el sanatları uzmanısın.
Kullanıcının isteğini Stable Diffusion için uygun İngilizce prompt'a çevir.
Marka/logo/kişi/bayrak gibi şeyleri renge ve motife dönüştür.
DAİMA EKLE: highly detailed handmade Cappadocia ceramic pottery, only the product, intricate hand-painted patterns, terracotta texture, traditional Anatolian craftmanship, soft studio lighting, pure white background, photorealistic.
Sadece prompt yaz, başka hiçbir şey yazma."""
            },
            {
                "role": "user",
                "content": f"Ürün: {urun_tipi}\nMüşteri isteği: {kullanici_istegi}"
            }
        ]
    )
    return yanit.choices[0].message.content
  
 #görsel üretme kısmı

def gorsel_uret(prompt):
    client = InferenceClient(provider="fal-ai", api_key=HF_TOKEN)
    image = client.text_to_image(
        prompt,
        model="black-forest-labs/FLUX.1-schnell"
    )
    return image
#fotoğraf analizi kısmı
def fotograf_analiz_et(fotograf_yolu):
    with open(fotograf_yolu, "rb") as f:
        fotograf_base64 = base64.b64encode(f.read()).decode("utf-8")
    yanit = groq_client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
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
#atılan fotoğrafa göre ürün üretme kısmı

def fotograf_ile_urun_uret(fotograf_yolu, urun_tipi="vazo"):
    print("Fotoğraf analiz ediliyor...")
    analiz = fotograf_analiz_et(fotograf_yolu)
    print("Analiz:", analiz)
    print("Prompt üretiliyor...")
    prompt = prompt_uret(f"Bu deseni kullan: {analiz}", urun_tipi)
    print("Prompt:", prompt)
    print("Görsel üretiliyor...")
    gorsel = gorsel_uret(prompt)
    return gorsel

print("KapadokyaCraft AI hazır!")
