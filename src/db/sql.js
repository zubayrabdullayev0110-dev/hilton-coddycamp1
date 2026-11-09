// =============================================================
//  SQL qismi (SQLite — Node.js ichki "node:sqlite" moduli)
//  Bu yerda qat'iy tuzilmali, munosabatli (relational) ma'lumotlar:
//    - rooms     : xonalar katalogi (narx, maydon, sig'im)
//    - guests    : mehmonlar
//    - bookings  : bronlar (guest -> room, sana oralig'i, summa)
//  Nega SQL?  Bron — pul va sana bilan bog'liq. Bir xonaning bir
//  sanada ikki marta bron qilinmasligi uchun tranzaksiya va
//  aniq so'rovlar (overlap check) kerak.
// =============================================================
const path = require('path');
const fs = require('fs');
// esbuild "node:" prefiksini olib tashlamasligi uchun dinamik nom
const { DatabaseSync } = require(['node', 'sqlite'].join(':'));

// Netlify / serverless muhitida faqat /tmp ga yozish mumkin
const DATA_DIR = process.env.DATA_DIR || (process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT ? '/tmp/hilton-data' : path.join(__dirname, '..', '..', 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'hotel.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    UNIQUE NOT NULL,
  price         INTEGER NOT NULL,          -- USD / tun
  size_m2       INTEGER NOT NULL,
  max_guests    INTEGER NOT NULL,
  beds          TEXT    NOT NULL,
  floor         INTEGER NOT NULL,
  units         INTEGER NOT NULL DEFAULT 1, -- shu turdagi nechta xona bor
  theme         TEXT    NOT NULL,           -- 3D sahna rang mavzusi
  is_presidential INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  room_id     INTEGER NOT NULL REFERENCES rooms(id),
  guest_id    INTEGER NOT NULL REFERENCES guests(id),
  check_in    TEXT NOT NULL,
  check_out   TEXT NOT NULL,
  nights      INTEGER NOT NULL,
  adults      INTEGER NOT NULL,
  children    INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
  lang        TEXT NOT NULL DEFAULT 'uz',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
`);

// ---------- Boshlang'ich xonalar (seed) ----------
const seedRooms = [
  { slug: 'deluxe-king',      price: 289,  size_m2: 42,  max_guests: 2, beds: '1 King',            floor: 5,  units: 200, theme: 'warm',     is_presidential: 0 },
  { slug: 'executive-twin',   price: 349,  size_m2: 48,  max_guests: 3, beds: '2 Queen',           floor: 9,  units: 150,  theme: 'ocean',    is_presidential: 0 },
  { slug: 'junior-suite',     price: 520,  size_m2: 65,  max_guests: 3, beds: '1 King + Sofa',     floor: 14, units: 80,  theme: 'emerald',  is_presidential: 0 },
  { slug: 'family-suite',     price: 690,  size_m2: 90,  max_guests: 5, beds: '1 King + 2 Twin',   floor: 18, units: 45,  theme: 'sunset',   is_presidential: 0 },
  { slug: 'panorama-suite',   price: 980,  size_m2: 120, max_guests: 4, beds: '1 Emperor King',    floor: 24, units: 24,  theme: 'violet',   is_presidential: 0 },
  { slug: 'presidential',     price: 2450, size_m2: 310, max_guests: 6, beds: '2 Emperor King',    floor: 30, units: 1,  theme: 'royal',    is_presidential: 1 },
];

const insertRoom = db.prepare(`
  INSERT INTO rooms (slug, price, size_m2, max_guests, beds, floor, units, theme, is_presidential)
  VALUES (:slug, :price, :size_m2, :max_guests, :beds, :floor, :units, :theme, :is_presidential)
  ON CONFLICT(slug) DO UPDATE SET
    price=excluded.price, size_m2=excluded.size_m2, max_guests=excluded.max_guests,
    beds=excluded.beds, floor=excluded.floor, units=excluded.units, theme=excluded.theme,
    is_presidential=excluded.is_presidential
`);
for (const r of seedRooms) insertRoom.run(r);

// ---------- So'rovlar ----------
const q = {
  allRooms: db.prepare('SELECT * FROM rooms ORDER BY price ASC'),
  roomBySlug: db.prepare('SELECT * FROM rooms WHERE slug = ?'),
  // sana oralig'i kesishadigan faol bronlar soni
  overlapping: db.prepare(`
    SELECT COUNT(*) AS cnt FROM bookings
    WHERE room_id = ? AND status = 'confirmed'
      AND check_in < ? AND check_out > ?
  `),
  insertGuest: db.prepare('INSERT INTO guests (full_name, phone, email) VALUES (?, ?, ?)'),
  insertBooking: db.prepare(`
    INSERT INTO bookings (code, room_id, guest_id, check_in, check_out, nights, adults, children, total_price, lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  bookingByCode: db.prepare(`
    SELECT b.*, r.slug AS room_slug, r.price AS room_price, g.full_name, g.phone, g.email
    FROM bookings b
    JOIN rooms r  ON r.id = b.room_id
    JOIN guests g ON g.id = b.guest_id
    WHERE b.code = ?
  `),
  cancel: db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE code = ? AND status = 'confirmed'`),
  stats: db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(total_price),0) AS revenue FROM bookings WHERE status='confirmed'`),
};

function availableUnits(room, checkIn, checkOut) {
  const { cnt } = q.overlapping.get(room.id, checkOut, checkIn);
  return Math.max(0, room.units - cnt);
}

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'HC-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Bronni tranzaksiya ichida yaratadi (ikki marta bron bo'lmasligi uchun). */
function createBooking({ room, fullName, phone, email, checkIn, checkOut, nights, adults, children, lang }) {
  db.exec('BEGIN IMMEDIATE');
  try {
    if (availableUnits(room, checkIn, checkOut) <= 0) {
      db.exec('ROLLBACK');
      return { error: 'NOT_AVAILABLE' };
    }
    const guest = q.insertGuest.run(fullName, phone, email || null);
    const total = room.price * nights;
    let code;
    for (;;) { code = makeCode(); if (!q.bookingByCode.get(code)) break; }
    q.insertBooking.run(code, room.id, guest.lastInsertRowid, checkIn, checkOut, nights, adults, children, total, lang);
    db.exec('COMMIT');
    return { booking: q.bookingByCode.get(code) };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { db, q, availableUnits, createBooking };
