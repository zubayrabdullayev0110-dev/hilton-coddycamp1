# HILTON coddycamp ⭐⭐⭐⭐⭐

5 yulduzli mehmonxona bron qilish sayti — **Express.js**, **SQL (SQLite)**, **NoSQL (NeDB)**, **Telegram bot**, **Three.js 3D xonalar**.

## Ishga tushirish

```bash
cd hilton-coddycamp
npm install
copy .env.example .env      # keyin .env ichiga bot token va chat ID yozing
npm start                   # http://localhost:3000
```

Node.js **22.13+** kerak (ichki `node:sqlite` moduli ishlatiladi).

## Telegram botni ulash

1. Telegramda **@BotFather** → `/newbot` → token oling → `.env` dagi `TELEGRAM_BOT_TOKEN` ga yozing.
2. O'z botingizga `/start` yozing.
3. Brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching → `"chat":{"id": ...}` raqamini `TELEGRAM_CHAT_ID` ga yozing.
4. Serverni qayta ishga tushiring. Endi har bir bron, bekor qilish va kontakt xabari botingizga keladi.

## Qayerda SQL, qayerda NoSQL?

| Ma'lumot | Baza | Sabab |
|---|---|---|
| Xonalar, mehmonlar, bronlar | **SQLite** (`data/hotel.sqlite`) | Pul va sanalar: tranzaksiya, JOIN, bir xonani ikki marta bron qilmaslik (overlap tekshiruvi) |
| Sharhlar, kontakt xabarlari, obunachilar, faoliyat logi | **NeDB** (`data/*.db`, MongoDB uslubida) | Erkin tuzilmali JSON hujjatlar, sxema tez o'zgaradi |

## 3D xonalar va videolar

Har bir xona Three.js'da 3D qurilgan va kino kamerasi bilan "video" kabi aylanadi; 3D turda sichqoncha bilan aylantirish mumkin.
Agar haqiqiy video qo'shmoqchi bo'lsangiz, `public/videos/` papkasiga shu nomlar bilan `.mp4` fayl qo'ying — sayt avtomatik 3D o'rniga videoni ko'rsatadi:

```
deluxe-king.mp4  executive-twin.mp4  junior-suite.mp4
family-suite.mp4 panorama-suite.mp4  presidential.mp4
```

## API

| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/api/rooms?checkIn=&checkOut=` | Xonalar (+ bo'sh xonalar soni) |
| GET | `/api/rooms/:slug/availability` | Sana bo'yicha bo'shlik va narx |
| POST | `/api/bookings` | Bron qilish → Telegram |
| GET | `/api/bookings/:code` | Bronni ko'rish |
| POST | `/api/bookings/:code/cancel` | Bekor qilish (telefonning oxirgi 4 raqami bilan) |
| GET/POST | `/api/reviews` | Sharhlar (NoSQL) |
| POST | `/api/messages` | Kontakt xabari (NoSQL → Telegram) |
| POST | `/api/subscribe` | Obuna (NoSQL) |

## Narxlar (1 tun, nonushta + tushlik + kechki ovqat BEPUL)

| Xona | Narx |
|---|---|
| Deluxe King Room | $289 |
| Executive Twin Room | $349 |
| Junior Suite | $520 |
| Family Suite | $690 |
| Panorama Sky Suite | $980 |
| 👑 Presidential Suite | $2,450 |

> O'quv loyihasi (Coddy camp). Hilton Worldwide bilan aloqasi yo'q.

🌐 Sayt: https://hilton-coddycamp-1419.netlify.app
