// Telegram botga xabar yuborish (Bot API, qo'shimcha kutubxonasiz)
const ROOM_NAMES = {
  'deluxe-king': 'Deluxe King Room',
  'executive-twin': 'Executive Twin Room',
  'junior-suite': 'Junior Suite',
  'family-suite': 'Family Suite',
  'panorama-suite': 'Panorama Sky Suite',
  'presidential': '👑 Presidential Suite',
};

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function send(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || token.startsWith('123456789:')) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID sozlanmagan — xabar yuborilmadi.');
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const data = await res.json();
    if (!data.ok) console.error('[telegram] xato:', data.description);
    return data;
  } catch (e) {
    console.error('[telegram] ulanib bo\'lmadi:', e.message);
    return { ok: false };
  }
}

function sendBooking(b) {
  const text =
`🏨 <b>YANGI BRON — HILTON coddycamp</b> ⭐⭐⭐⭐⭐

🔖 Kod: <code>${esc(b.code)}</code>
🛏 Xona: <b>${esc(ROOM_NAMES[b.room_slug] || b.room_slug)}</b>
📅 Kirish: <b>${esc(b.check_in)}</b>
📅 Chiqish: <b>${esc(b.check_out)}</b>
🌙 Tunlar: ${b.nights}
👥 Mehmonlar: ${b.adults} kattalar, ${b.children} bolalar

👤 Ism: <b>${esc(b.full_name)}</b>
📞 Telefon: ${esc(b.phone)}
✉️ Email: ${esc(b.email || '—')}
🌐 Til: ${esc(b.lang.toUpperCase())}

🍳 Nonushta + 🍲 Tushlik + 🍽 Kechki ovqat: <b>BEPUL</b>
💰 Jami: <b>$${b.total_price.toLocaleString('en-US')}</b> (${b.nights} × $${b.room_price})`;
  return send(text);
}

function sendCancel(b) {
  return send(`❌ <b>BRON BEKOR QILINDI</b>\n🔖 <code>${esc(b.code)}</code>\n🛏 ${esc(ROOM_NAMES[b.room_slug] || b.room_slug)}\n👤 ${esc(b.full_name)} · ${esc(b.phone)}\n📅 ${esc(b.check_in)} → ${esc(b.check_out)}`);
}

function sendMessage(m) {
  return send(`💬 <b>Yangi xabar (Kontakt)</b>\n👤 ${esc(m.name)}\n📞 ${esc(m.contact)}\n\n${esc(m.message)}`);
}

module.exports = { sendBooking, sendCancel, sendMessage };
