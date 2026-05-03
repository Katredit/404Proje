# 404Proje

## Proje Nedir?
404Proje, çok katmanlı bir web uygulamasıdır. Proje, kullanıcılar için mağaza listesi, özel siparişler, satıcı panelleri ve yapay zeka destekli tasarım sayfaları sunan bir deneyim sağlar. Hem ön uç (front-end) hem de arka uç (backend) bileşenleri içerir. Ayrıca `ai/` klasöründe yapay zeka ya da veri işleme için ek betikler bulunabilir.

## Neden Bu Proje?
Bu proje, e-ticaret ve özel tasarım süreçlerini birleştiren kapsamlı bir platform oluşturmak için geliştirildi. Kullanıcılar mağazaları gezebilir, döviz kurları ve coğrafi hizmetler gibi dinamik verileri görebilir, özel talepler oluşturabilir ve satıcılar için ayrı paneller üzerinden yönetim yapabilir. Proje, modern web uygulaması mimarisi ve kullanıcı deneyimi gereksinimlerini hedefler.

## Nasıl Çalışır?
- `front-end/` klasörü Vite tabanlı React uygulamasını içerir. Bu kısım, kullanıcı arayüzünü, çeviri desteğini, ödeme adımlarını ve kullanıcı panellerini sağlar.
- `backend/` klasörü Node.js tabanlı bir REST API sunar. Kullanıcı kimlik doğrulama, mağaza verileri, döviz servisleri, coğrafya desteği ve özel sipariş yönetimi gibi işlevleri barındırır.
- `backend/data/` dizini, örnek veri kümeleri olarak kullanıcılar, mağazalar ve özel siparişler için JSON dosyaları içerir.
- `ai/` betikleri, ek yapay zeka veya veri işleme iş akışları için ayrılmıştır.

## Mimari
Bu mimari, modülerlik ve ölçeklenebilirlik üzerine kuruludur. Uygulama şu katmanları içerir:
1. Kullanıcı arayüzü (`front-end/`)
2. Sunucu tarafı API (`backend/`)
3. Veri depolama ve servis bağlantıları (`backend/data/`, `backend/services/`)
4. Ek AI/işleme bileşenleri (`ai/`)

### Mimari Diyagram
```mermaid
flowchart LR
    A[Web Tarayıcısı] -->|HTTP/HTTPS| B[Front-end (Vite/React)]
    B -->|API Çağrısı| C[Backend API (Node.js/Express)]
    C --> D[Veri Kaynakları]
    D --> D1[users.json]
    D --> D2[stores.json]
    D --> D3[customOrders.json]
    C --> E[Servisler]
    E --> E1[dovizService.js]
    E --> E2[geoService.js]
    B --> F[Çeviri/Dil Yönetimi]
    B --> G[AI/Tasarım Modülleri]
    G --> H[ai/]
```

## Nasıl Başlanır?
1. `backend/` dizinine girin ve `npm install` ile bağımlılıkları yükleyin.
2. `front-end/` dizinine girin ve `npm install` ile bağımlılıkları yükleyin.
3. Backend ve frontend uygulamalarını ayrı terminallerde başlatın.

## Projenin Gücü
Bu yapı hem kullanıcı deneyimini hem de yönetimsel kontrolü destekler. Çok dilli kullanım, canlı döviz verisi ve özel sipariş yönetimi ile proje, gerçek dünyada e-ticaret ve tasarım süreçlerini desteklemeye uygundur.
