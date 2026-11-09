const express = require('express');
const { q, availableUnits, createBooking } = require('../db/sql');
const { nosql, log } = require('../db/nosql');
const tg = require('../telegram');

const router = express.Router();
const LANGS = ['uz', 'ru', 'en'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
// vaqt zonalari farqi uchun 1 kun yumshoqlik (UTC vs mahalliy sana)
const today = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const nightsBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ---------------- Xonalar (SQL) ----------------
router.get('/rooms', (req, res) => {
  const { checkIn, checkOut } = req.query;
  const rooms = q.allRooms.all().map((r) => {
    const out = { ...r, is_presidential: !!r.is_presidential, meals_included: true };
    if (isDate(checkIn) && isDate(checkOut) && checkOut > checkIn) {
      out.available = availableUnits(r, checkIn, checkOut);
    }
    return out;
  });
  res.json(rooms);
});

router.get('/rooms/:slug/availability', (req, res) => {
  const room = q.roomBySlug.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  const { checkIn, checkOut } = req.query;
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) return res.status(400).json({ error: 'BAD_DATES' });
  const nights = nightsBetween(checkIn, checkOut);
  res.json({ available: availableUnits(room, checkIn, checkOut), nights, total: nights * room.price });
});

// ---------------- Bron (SQL + Telegram) ----------------
router.post('/bookings', async (req, res) => {
  const { slug, fullName, phone, email, checkIn, checkOut, adults, children, lang } = req.body || {};
  const room = q.roomBySlug.get(slug);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  const name = String(fullName || '').trim();
  const tel = String(phone || '').trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'BAD_NAME' });
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(tel)) return res.status(400).json({ error: 'BAD_PHONE' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'BAD_EMAIL' });
  if (!isDate(checkIn) || !isDate(checkOut) || checkIn < today() || checkOut <= checkIn) return res.status(400).json({ error: 'BAD_DATES' });

  const nights = nightsBetween(checkIn, checkOut);
  if (nights > 60) return res.status(400).json({ error: 'TOO_LONG' });
  const a = Math.max(1, parseInt(adults, 10) || 1);
  const c = Math.max(0, parseInt(children, 10) || 0);
  if (a + c > room.max_guests) return res.status(400).json({ error: 'TOO_MANY_GUESTS' });

  const result = createBooking({
    room, fullName: name, phone: tel, email: email ? String(email).trim() : null,
    checkIn, checkOut, nights, adults: a, children: c, lang: LANGS.includes(lang) ? lang : 'uz',
  });
  if (result.error) return res.status(409).json({ error: result.error });

  const b = result.booking;
  log('booking_created', { code: b.code, room: b.room_slug, total: b.total_price });
  const tgRes = await tg.sendBooking(b);
  res.status(201).json({ code: b.code, total: b.total_price, nights: b.nights, telegram: !!tgRes.ok });
});

router.get('/bookings/:code', (req, res) => {
  const b = q.bookingByCode.get(String(req.params.code).toUpperCase());
  if (!b) return res.status(404).json({ error: 'NOT_FOUND' });
  const { guest_id, ...safe } = b;
  safe.phone = b.phone.replace(/\d(?=\d{2})/g, '•');
  res.json(safe);
});

router.post('/bookings/:code/cancel', async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const b = q.bookingByCode.get(code);
  if (!b) return res.status(404).json({ error: 'NOT_FOUND' });
  // xavfsizlik: telefon raqamning oxirgi 4 raqami talab qilinadi
  const last4 = String(req.body?.phoneLast4 || '');
  if (b.phone.replace(/\D/g, '').slice(-4) !== last4) return res.status(403).json({ error: 'PHONE_MISMATCH' });
  const r = q.cancel.run(code);
  if (r.changes === 0) return res.status(409).json({ error: 'ALREADY_CANCELLED' });
  log('booking_cancelled', { code });
  await tg.sendCancel(b);
  res.json({ ok: true });
});

router.get('/stats', (req, res) => res.json(q.stats.get()));

// ---------------- Sharhlar (NoSQL) ----------------
router.get('/reviews', async (req, res) => {
  const docs = await nosql.reviews.findAsync({}).sort({ createdAt: -1 }).limit(12);
  res.json(docs.map(({ _id, name, rating, text, lang, createdAt }) => ({ id: _id, name, rating, text, lang, createdAt })));
});

router.post('/reviews', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 40);
  const text = String(req.body?.text || '').trim().slice(0, 500);
  const rating = Math.min(5, Math.max(1, parseInt(req.body?.rating, 10) || 5));
  if (name.length < 2 || text.length < 5) return res.status(400).json({ error: 'BAD_INPUT' });
  const doc = await nosql.reviews.insertAsync({ name, text, rating, lang: req.body?.lang || 'uz' });
  res.status(201).json({ id: doc._id });
});

// ---------------- Kontakt xabarlari (NoSQL + Telegram) ----------------
router.post('/messages', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  const contact = String(req.body?.contact || '').trim().slice(0, 80);
  const message = String(req.body?.message || '').trim().slice(0, 1000);
  if (name.length < 2 || contact.length < 5 || message.length < 3) return res.status(400).json({ error: 'BAD_INPUT' });
  await nosql.messages.insertAsync({ name, contact, message });
  await tg.sendMessage({ name, contact, message });
  res.status(201).json({ ok: true });
});

// ---------------- Obuna (NoSQL) ----------------
router.post('/subscribe', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'BAD_EMAIL' });
  try {
    await nosql.subscribers.insertAsync({ email });
    res.status(201).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true, already: true });
  }
});

module.exports = router;
