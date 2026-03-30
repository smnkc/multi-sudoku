# Sudoku Royale 🎮

Modern, sunucusuz (serverless) çalışan, rekabetçi ve tamamen kurularak mobil uygulama gibi davranabilen (PWA) tam donanımlı Sudoku oyunu.

## ✨ Öne Çıkan Özellikler
- **Tek Oyunculu & Çok Oyunculu Modlar**: İster tek başına antrenman yap, istersen arkadaşına oda kodu gönderip kıyasıya kapış.
- **Akıllı Not Alma (Pencil Mode)**: Hücrelere küçük ihtimalleri not düş! Üstelik bir rakamı doğru yerleştirdiğinde, o satır ve sütundaki ilgili tüm notlar **otomatik olarak silinir**.
- **Karanlık / Aydınlık Mod (Theme)**: Göz yormayan şık, modern, cam tasarımlı (glassmorphism) elit temalar ekranı çok havalı gösteriyor.
- **PWA (Progressive Web App) Desteği**: Telefondan "Ana Ekrana Ekle" diyerek gerçek bir native mobil uygulama gibi tam ekran ve rubber-banding sıçrama efektleri olmadan kullanım! (Offline açılış destekli)
- **Canlı Sayaç & İstatistik Paneli**: Arkadaşınla oynarken kimin yüzde kaçta olduğunu, kimin kaç hata yaptığını (`X/3`) tepedeki şık panelden canlı izle.

---

## 🛠 Teknik Altyapı ve Kurulum

Bu oyun, karmaşık WebSocket veya Node.js bağlamlarına ihtiyaç duymaksızın sadece **PHP ve JSON** dosyaları üzerinden senkronize (Polling) çalışır. Bu yüzden herhangi bir standart cPanel / Plesk / XAMPP tabanlı hostingte tak-çalıştır şeklinde hemen çalışmaya başlar!

### ⚠️ ÖNEMLİ: `data` Klasörü ve Güvenlik Sistemi ⚠️

Oyunun Çok Oyunculu (Multiplayer) lobi sisteminin çalışabilmesi için PHP dosyasının oda verilerini kaydedeceği kök dizinde **`data`** isminde bir klasörü vardır.

Bu klasörün içerisine özel bir **`.htaccess`** dosyası eklenmiştir (`Require all denied`). 
Bu dosyanın **2 kilit faydası** vardır:
1. **GitHub Sorununu Çözer:** Git, içi boş klasörleri algılamaz ve yüklemezdi. Ancak bu ufak güvenlik dosyası klasörün içinde olduğu için Git artık `data` klasörünü görecek ve klonlayan (clone) herkesin sunucusunda otomatik olarak bu klasör hazır bulunacaktır. (Ekstra klasör açmanıza gerek kalmadı!)
2. **Hile Koruması:** Kötü niyetli kişilerin tarayıcı URL'si üzerinden `data/ODA_KODU.json` dosyasına girerek çözüm numaralarını (hileyi) çalmasını %100 oranında engeller. Sunucu JSON'a erişebilir, ama dışarıdaki kullanıcı erişemez.

> **NOT:** Projeyi canlı bir Linux hosting'e (cPanel/DirectAdmin vs.) taşıyorsanız, PHP'nin kendi içine dosya yazabilmesi için bu `data` klasörünün **dosya yazma/okuma izinlerini (`CHMOD`) `777` veya `755` olarak** ayarlamayı unutmayın.

---

## 🚀 Teknolojiler
- **Arayüz (Frontend)**: HTML5, İleri seviye CSS3 (CSS Variables, Grid, Native iOS Scroll Locks), Vanilla Javascript
- **Oyun Motoru & Eşitleme (Backend)**: JS Fetch API + PHP (`api.php`) + Serverless LocalStorage JSON Cache
- **Kutlama Efektleri**: `canvas-confetti` JS kütüphanesi
