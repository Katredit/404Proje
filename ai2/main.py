print("1. Gerçekçi Yapay Zeka Motoru Hazırlanıyor...")
model_id = "SG161222/Realistic_Vision_V5.1_noVAE"
pipe_txt = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16).to("cuda")
pipe_img = StableDiffusionImg2ImgPipeline(**pipe_txt.components)

print("\n" + "="*50)
kullanici_yazisi_tr = input("Hayalindeki tasarımı TÜRKÇE yaz (Örn: yerde duran çiçek motifli kapadokya kilimi): ")
kullanici_yazisi_en = GoogleTranslator(source='tr', target='en').translate(kullanici_yazisi_tr)
print(f"(Sistemin anladığı otomatik çeviri: {kullanici_yazisi_en})")

gorsel_sorusu = input("Kendi figürünü/desenini yüklemek ister misin? (Evet için 'e', Hayır için 'h'): ")
print("="*50 + "\n")

# UÇMA HATASI DÜZELTİLDİ: Sadece profesyonel fotoğraf şifresi bırakıldı. Konumu senin yazına bıraktık.
gelismis_prompt = f"Professional product photography of {kullanici_yazisi_en}, authentic traditional Turkish Anatolian Cappadocian style, photorealistic, highly detailed, 8k resolution, masterpiece"
negatif_prompt = "cgi, 3d render, sketch, drawing, artificial, plastic, smooth, ugly, deformed, weird perspective, floating"

if gorsel_sorusu.lower() == 'e':
    print("LÜTFEN GÖRSELİNİZİ SEÇİN:")
    yuklenen = files.upload()
    if len(yuklenen) > 0:
        dosya_adi = list(yuklenen.keys())[0]
        desen = Image.open(io.BytesIO(yuklenen[dosya_adi])).convert("RGB").resize((512, 512))
        print(f"Resim alındı, {DEGISTIRME_GUCU} gücüyle işleniyor...")
        sonuc = pipe_img(prompt=gelismis_prompt, negative_prompt=negatif_prompt, image=desen, strength=DEGISTIRME_GUCU, guidance_scale=7.5).images[0]
        display(sonuc)
else:
    print("Sıfırdan yazıyla çiziliyor, lütfen bekleyin...")
    sonuc = pipe_txt(prompt=gelismis_prompt, negative_prompt=negatif_prompt, num_inference_steps=30, guidance_scale=7.5).images[0]
    display(sonuc)
