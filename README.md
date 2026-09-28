<div align="center">

<img src="assets/images/icon.png" alt="SIGAP Sekolah" width="110">

# 🛡️ SIGAP — Sekolah

**Panel pemantauan pihak sekolah untuk ekosistem keselamatan berkendara SIGAP.**

Memungkinkan sekolah memantau keselamatan berkendara para siswa dan merespons kejadian darurat.

![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/AI-Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

</div>

---

## ✨ Fitur

- 🏫 **Pantau siswa** — daftar & status keselamatan berkendara siswa dalam satu tampilan.
- 🚨 **Respons kejadian** — menerima notifikasi saat ada deteksi kecelakaan siswa.
- 📊 **Rekap per kelas** — pemantauan berbasis kelas untuk pihak sekolah.
- 🔗 **Terhubung dengan SIGAP-Siswa** — data mengalir dari aplikasi pengemudi.
- 🎨 **Design system "Dark Guardian"** — konsisten dengan seluruh ekosistem SIGAP.

## 🛠️ Tech Stack

**Framework:** Expo (Expo Router) · React Native · TypeScript
**Lokasi & notifikasi:** expo-location · expo-notifications
**Backend:** Firebase · Google Generative AI (Gemini)
**UI:** expo-linear-gradient · lucide-react-native · react-native-reanimated

## 🚀 Menjalankan

```bash
# Pasang dependency
npm install

# Jalankan (buka di Expo Go / emulator)
npm start
```

> Butuh [Node.js LTS](https://nodejs.org). Salin `.env.example` → `.env` dan `eas.json.example` → `eas.json`, lalu isi kredensial Firebase & API key (file asli sengaja diabaikan dari repo demi keamanan).

## 🧩 Ekosistem SIGAP

| Aplikasi | Peran |
|---|---|
| [SIGAP-Siswa](https://github.com/PiwPiyolett/SIGAP-Siswa) | Aplikasi pengemudi — deteksi kecelakaan & SOS |
| [SIGAP-Family](https://github.com/PiwPiyolett/SIGAP-Family) | Pendamping keluarga — memantau pengemudi |
| **SIGAP-Sekolah** (repo ini) | Pemantauan pihak sekolah |

---

<div align="center">

**Ariqo Banyusila Abrar** · [@PiwPiyolett](https://github.com/PiwPiyolett)

</div>
