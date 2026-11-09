import { I18N, ROOMS_I18N } from './i18n.js';
import { PhotoViewer, coverFor } from './photos.js';

// ---------------- Yordamchilar ----------------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => '$' + Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); };
const nights = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

async function api(url, opts = {}) {
  const res = await fetch('/api' + url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'generic'), { code: data.error || 'generic' });
  return data;
}

// ---------------- Holat ----------------
const state = {
  lang: (() => { try { return localStorage.getItem('lang') || 'uz'; } catch { return 'uz'; } })(),
  rooms: [],
  snaps: {},
  videos: {},
  heroSlug: 'presidential',
  checkIn: addDays(isoLocal(new Date()), 1),
  checkOut: addDays(isoLocal(new Date()), 4),
  guests: 2,
  bookingSlug: null,
  tourSlug: null,
  rating: 5,
};
if (!I18N[state.lang]) state.lang = 'uz';

const t = (k) => I18N[state.lang][k] ?? I18N.en[k] ?? k;
const roomName = (slug) => ROOMS_I18N[slug]?.[state.lang]?.name || slug;
const roomDesc = (slug) => ROOMS_I18N[slug]?.[state.lang]?.desc || '';
const roomBySlug = (slug) => state.rooms.find((r) => r.slug === slug);
const errText = (e) => t('err.' + (e.code || 'generic')) || t('err.generic');

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3800);
}

// ---------------- Til (i18n) ----------------
function applyLang() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $$('#langSwitch button').forEach((b) => b.classList.toggle('active', b.dataset.lang === state.lang));
  movePill();
  renderRooms();
  renderHeroInfo();
  renderThumbs();
  if (state.bookingSlug) { $('#bkRoom').textContent = roomName(state.bookingSlug); updateSummary(); }
  if (state.tourSlug) $('#tourRoom').textContent = roomName(state.tourSlug);
}
function movePill() {
  const active = $('#langSwitch button.active');
  if (!active) return;
  const pill = $('.lang-pill');
  pill.style.width = active.offsetWidth + 'px';
  pill.style.transform = `translateX(${active.offsetLeft - 3}px)`;
}
$$('#langSwitch button').forEach((b) => b.addEventListener('click', () => {
  state.lang = b.dataset.lang;
  try { localStorage.setItem('lang', state.lang); } catch {}
  applyLang();
  loadReviews();
}));
window.addEventListener('resize', movePill);

// ---------------- Video (ixtiyoriy) ----------------
// public/videos/<slug>.mp4 qo'yilsa, 3D o'rniga shu video ko'rsatiladi
async function videoFor(slug) {
  if (slug in state.videos) return state.videos[slug];
  try {
    const r = await fetch(`/videos/${slug}.mp4`, { method: 'HEAD' });
    state.videos[slug] = r.ok && (r.headers.get('content-type') || '').includes('video') ? `/videos/${slug}.mp4` : null;
  } catch { state.videos[slug] = null; }
  return state.videos[slug];
}

// ---------------- Foto "video" ko'ruvchilar (haqiqiy rasmlar) ----------------
const heroViewer = new PhotoViewer($('#heroCanvas'), { interval: 4500 });
const presViewer = new PhotoViewer($('#presCanvas'));
const tourViewer = new PhotoViewer($('#tourCanvas'), { interactive: true, intro: true });
tourViewer.onManual = () => $('#tourAuto').classList.remove('btn-gold');

function makeSnapshots() {
  for (const r of state.rooms) state.snaps[r.slug] = coverFor(r.slug);
}

async function setHero(slug) {
  const room = roomBySlug(slug);
  if (!room) return;
  state.heroSlug = slug;
  const vid = await videoFor(slug);
  const v = $('#heroVideo');
  if (vid) {
    heroViewer.stop(); $('#heroCanvas').hidden = true;
    v.src = vid; v.hidden = false; v.play().catch(() => {});
  } else {
    v.pause(); v.hidden = true; $('#heroCanvas').hidden = false;
    heroViewer.load(room.slug); heroViewer.start();
  }
  renderHeroInfo();
  renderThumbs();
}
function renderHeroInfo() {
  const room = roomBySlug(state.heroSlug);
  if (!room) return;
  const el = $('#heroRoomName');
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = roomName(room.slug); el.style.opacity = 1; }, 150);
  $('#heroRoomPrice').textContent = money(room.price);
}
function renderThumbs() {
  $('#heroThumbs').innerHTML = state.rooms.map((r) => `
    <button data-slug="${r.slug}" class="${r.slug === state.heroSlug ? 'active' : ''}">
      <img src="${state.snaps[r.slug] || ''}" alt="" /><span>${esc(roomName(r.slug))}</span>
    </button>`).join('');
}
$('#heroThumbs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-slug]');
  if (b) { setHero(b.dataset.slug); resetHeroCycle(); }
});
$('#heroBook').addEventListener('click', () => openBooking(state.heroSlug));
$('#heroTour').addEventListener('click', () => openTour(state.heroSlug));

// Hero avtomatik ravishda xonalarni almashtiradi (kino slayd-shou)
let heroTimer;
function resetHeroCycle() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    if (document.hidden || $('.modal.open')) return;
    const i = state.rooms.findIndex((r) => r.slug === state.heroSlug);
    setHero(state.rooms[(i + 1) % state.rooms.length].slug);
  }, 14000);
}

// Ko'rinmayotgan canvaslarni to'xtatish (tezlik uchun)
const visObs = new IntersectionObserver((entries) => {
  for (const en of entries) {
    const v = en.target.id === 'heroCanvas' ? heroViewer : presViewer;
    if (!v.room) continue;
    if (en.isIntersecting && !en.target.hidden) v.start(); else v.stop();
  }
}, { threshold: 0.05 });

// ---------------- Xonalar ----------------
function renderRooms() {
  const hasDates = state.rooms.some((r) => 'available' in r);
  $('#roomsGrid').innerHTML = state.rooms.map((r) => {
    const sold = hasDates && r.available === 0;
    return `
    <article class="room ${r.is_presidential ? 'vip' : ''}" data-slug="${r.slug}">
      <div class="room-media" data-tour="${r.slug}">
        <img src="${state.snaps[r.slug] || ''}" alt="${esc(roomName(r.slug))}" loading="lazy" />
        <div class="play-3d">3D</div>
        <div class="room-tags">
          ${r.is_presidential ? '<span class="tag gold">👑 VIP</span>' : ''}
          <span class="tag">${r.size_m2} m²</span>
          ${hasDates ? (sold ? `<span class="tag red">${t('room.soldout')}</span>` : `<span class="tag green">${r.available} ${t('room.left')}</span>`) : ''}
        </div>
        <div class="room-price"><b>${money(r.price)}</b><br><span>${t('room.night')}</span></div>
      </div>
      <div class="room-body">
        <h3>${esc(roomName(r.slug))}</h3>
        <p>${esc(roomDesc(r.slug))}</p>
        <div class="room-meta">
          <span>👥 ${r.max_guests} ${t('room.guests')}</span>
          <span>🛏 ${esc(r.beds)}</span>
          <span>🏢 ${r.floor} ${t('room.floor')}</span>
          <span>🛁🚽🚪 ${t('room.bath')}</span>
        </div>
        <span class="free-chip">🍳🍲🍽 ${t('room.meals')}</span>
        <div class="room-actions">
          <button class="btn btn-ghost" data-tour="${r.slug}">⟲ ${t('room.tour')}</button>
          <button class="btn btn-gold" data-book="${r.slug}" ${sold ? 'disabled' : ''}>${t('room.book')} →</button>
        </div>
      </div>
    </article>`;
  }).join('');
  bindTilt();
}

function bindTilt() {
  $$('.room').forEach((card) => {
    card.onmousemove = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-6px)`;
    };
    card.onmouseleave = () => (card.style.transform = '');
  });
}

// Global tugmalar: data-book / data-tour
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (b) return openBooking(b.dataset.book);
  const tr = e.target.closest('[data-tour]');
  if (tr) return openTour(tr.dataset.tour);
});

async function loadRooms() {
  const qs = state.searched ? `?checkIn=${state.checkIn}&checkOut=${state.checkOut}` : '';
  state.rooms = await api('/rooms' + qs);
  const pres = roomBySlug('presidential');
  if (pres) $('#presPrice').textContent = money(pres.price);
}

// ---------------- Qidiruv ----------------
const sIn = $('#sIn'), sOut = $('#sOut');
function initSearch() {
  const today = isoLocal(new Date());
  sIn.min = today; sIn.value = state.checkIn;
  sOut.min = addDays(state.checkIn, 1); sOut.value = state.checkOut;
  sIn.addEventListener('change', () => {
    sOut.min = addDays(sIn.value, 1);
    if (sOut.value <= sIn.value) sOut.value = addDays(sIn.value, 1);
  });
}
$('#searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  state.checkIn = sIn.value; state.checkOut = sOut.value; state.guests = +$('#sGuests').value; state.searched = true;
  await loadRooms();
  state.rooms.sort((a, b) => (b.max_guests >= state.guests) - (a.max_guests >= state.guests) || a.price - b.price);
  renderRooms();
  $('#rooms').scrollIntoView({ behavior: 'smooth' });
});

// ---------------- Modal umumiy ----------------
function openModal(id) { $(id).classList.add('open'); $(id).setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); }
function closeModal(m) {
  m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
  if (!$('.modal.open')) document.body.classList.remove('lock');
  if (m.id === 'tourModal') { tourViewer.stop(); $('#tourVideo').pause(); state.tourSlug = null; }
  if (m.id === 'bookModal') state.bookingSlug = null;
}
$$('.modal').forEach((m) => m.addEventListener('click', (e) => {
  if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal.open').forEach(closeModal); });

// ---------------- 3D tur ----------------
async function openTour(slug) {
  const room = roomBySlug(slug);
  if (!room) return;
  state.tourSlug = slug;
  $('#tourRoom').textContent = roomName(slug);
  openModal('#tourModal');
  const vid = await videoFor(slug);
  const v = $('#tourVideo');
  if (vid) {
    $('#tourCanvas').hidden = true; v.hidden = false; v.src = vid; v.play().catch(() => {});
  } else {
    v.hidden = true; $('#tourCanvas').hidden = false;
    tourViewer.load(room.slug); tourViewer.start();
  }
  $('#tourAuto').classList.add('btn-gold');
}
$('#tourAuto').addEventListener('click', (e) => {
  tourViewer.setAuto(true);
  e.currentTarget.classList.add('btn-gold');
});
$('#tourBook').addEventListener('click', () => {
  const slug = state.tourSlug;
  closeModal($('#tourModal'));
  openBooking(slug);
});

// ---------------- Bron qilish ----------------
const bf = $('#bookForm');
let availTimer;
function openBooking(slug) {
  const room = roomBySlug(slug);
  if (!room) return;
  state.bookingSlug = slug;
  $('#bkRoom').textContent = roomName(slug);
  $('#bkImg').src = state.snaps[slug] || '';
  bf.hidden = false; $('#bkOk').hidden = true; $('#bkErr').textContent = '';
  const today = isoLocal(new Date());
  bf.checkIn.min = today;
  bf.checkIn.value = state.checkIn >= today ? state.checkIn : addDays(today, 1);
  bf.checkOut.min = addDays(bf.checkIn.value, 1);
  bf.checkOut.value = state.checkOut > bf.checkIn.value ? state.checkOut : addDays(bf.checkIn.value, 3);
  bf.adults.max = room.max_guests;
  bf.adults.value = Math.min(state.guests, room.max_guests);
  bf.children.max = Math.max(0, room.max_guests - 1);
  updateSummary();
  openModal('#bookModal');
  setTimeout(() => bf.fullName.focus(), 350);
}
function updateSummary() {
  const room = roomBySlug(state.bookingSlug);
  if (!room) return;
  const n = nights(bf.checkIn.value, bf.checkOut.value);
  const ok = n > 0;
  $('#bkNightsTxt').textContent = ok ? `${money(room.price)} × ${n} ${t('bk.nights')}` : '—';
  $('#bkSub').textContent = ok ? money(room.price * n) : '—';
  $('#bkTotal').textContent = ok ? money(room.price * n) : '$0';
  clearTimeout(availTimer);
  if (!ok) { $('#bkAvail').textContent = '—'; return; }
  availTimer = setTimeout(async () => {
    try {
      const a = await api(`/rooms/${room.slug}/availability?checkIn=${bf.checkIn.value}&checkOut=${bf.checkOut.value}`);
      $('#bkAvail').innerHTML = a.available > 0 ? `<span class="ok">${a.available} / ${room.units}</span>` : `<span style="color:var(--err)">${t('room.soldout')}</span>`;
    } catch { $('#bkAvail').textContent = '—'; }
  }, 250);
}
bf.addEventListener('input', (e) => {
  if (e.target === bf.checkIn) {
    bf.checkOut.min = addDays(bf.checkIn.value, 1);
    if (bf.checkOut.value <= bf.checkIn.value) bf.checkOut.value = addDays(bf.checkIn.value, 1);
  }
  if (['checkIn', 'checkOut'].includes(e.target.name)) updateSummary();
});
bf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#bkSubmit');
  $('#bkErr').textContent = '';
  btn.disabled = true; btn.textContent = t('bk.sending');
  try {
    const data = Object.fromEntries(new FormData(bf));
    const res = await api('/bookings', { method: 'POST', body: { ...data, slug: state.bookingSlug, lang: state.lang } });
    bf.hidden = true;
    $('#okCode').textContent = res.code;
    $('#bkOk').hidden = false;
    toast(`✓ ${t('bk.ok.title')} ${res.code}`, 'ok');
    confetti();
    try { localStorage.setItem('lastBooking', res.code); } catch {}
    bf.reset();
    if (state.searched) { await loadRooms(); renderRooms(); }
  } catch (err) {
    $('#bkErr').textContent = errText(err);
  } finally {
    btn.disabled = false; btn.textContent = t('bk.submit');
  }
});
$('#okCode').addEventListener('click', () => {
  navigator.clipboard?.writeText($('#okCode').textContent).then(() => toast('📋 ' + $('#okCode').textContent, 'ok')).catch(() => {});
});

function confetti() {
  const colors = ['#f6dc9b', '#e2b65c', '#4fd18b', '#fff'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    Object.assign(p.style, {
      position: 'fixed', zIndex: 300, left: '50%', top: '40%', width: '8px', height: '12px', borderRadius: '2px',
      background: colors[i % colors.length], pointerEvents: 'none',
    });
    document.body.appendChild(p);
    const ang = Math.random() * Math.PI * 2, dist = 150 + Math.random() * 300;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 200}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 800, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => p.remove();
  }
}

// ---------------- Mening bronim ----------------
$('#lookupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('#lookupCode').value.trim().toUpperCase();
  const box = $('#lookupResult');
  try {
    const b = await api('/bookings/' + encodeURIComponent(code));
    box.innerHTML = `
      <div class="lk-card">
        <h4>${esc(roomName(b.room_slug))} <span class="status ${b.status}">${t('my.status.' + b.status)}</span></h4>
        <div class="lk-row"><span>Code</span><b>${esc(b.code)}</b></div>
        <div class="lk-row"><span>${t('bk.name')}</span><span>${esc(b.full_name)}</span></div>
        <div class="lk-row"><span>${t('bk.phone')}</span><span>${esc(b.phone)}</span></div>
        <div class="lk-row"><span>${t('bk.in')}</span><span>${esc(b.check_in)}</span></div>
        <div class="lk-row"><span>${t('bk.out')}</span><span>${esc(b.check_out)}</span></div>
        <div class="lk-row"><span>${t('search.guests')}</span><span>${b.adults} + ${b.children}</span></div>
        <div class="lk-row"><span>${t('bk.meals')}</span><span style="color:var(--ok)">${t('bk.free')}</span></div>
        <div class="lk-row"><span>${t('bk.total')}</span><b style="color:var(--gold2)">${money(b.total_price)}</b></div>
        ${b.status === 'confirmed' ? `
          <form id="cancelForm" style="margin-top:16px;display:grid;gap:10px">
            <label style="font-size:13px;color:var(--muted)">${t('my.last4')}</label>
            <div style="display:flex;gap:10px"><input name="last4" maxlength="4" pattern="[0-9]{4}" required inputmode="numeric" placeholder="••••" />
            <button class="btn btn-ghost" type="submit" style="margin:0">${t('my.cancel')}</button></div>
          </form>` : ''}
      </div>`;
    $('#cancelForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        await api(`/bookings/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: { phoneLast4: ev.target.last4.value } });
        toast(t('my.cancelled'), 'ok');
        $('#lookupForm').requestSubmit();
        if (state.searched) { await loadRooms(); renderRooms(); }
      } catch (err) { toast(errText(err), 'err'); }
    });
  } catch {
    box.innerHTML = `<div class="lk-card" style="text-align:center;color:var(--muted)">🔍 ${t('my.notfound')}</div>`;
  }
});

// ---------------- Sharhlar (NoSQL) ----------------
async function loadReviews() {
  try {
    const list = await api('/reviews');
    $('#reviewsList').innerHTML = list.map((r, i) => `
      <article class="review" style="animation-delay:${i * 0.07}s">
        <div class="r-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p>“${esc(r.text)}”</p>
        <footer><b>${esc(r.name)}</b><span>${esc((r.lang || '').toUpperCase())} · ${new Date(r.createdAt).toLocaleDateString(state.lang === 'en' ? 'en-GB' : state.lang)}</span></footer>
      </article>`).join('');
  } catch {}
}
function paintStars() { $$('#ratingStars button').forEach((b) => b.classList.toggle('on', +b.dataset.v <= state.rating)); }
$('#ratingStars').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.rating = +b.dataset.v; paintStars(); } });
$('#reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/reviews', { method: 'POST', body: { name: f.name.value, text: f.text.value, rating: state.rating, lang: state.lang } });
    toast(t('rev.thanks'), 'ok'); f.reset(); state.rating = 5; paintStars(); loadReviews();
  } catch (err) { toast(errText(err), 'err'); }
});

// ---------------- Aloqa va obuna (NoSQL) ----------------
$('#contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/messages', { method: 'POST', body: Object.fromEntries(new FormData(f)) });
    toast(t('contact.ok'), 'ok'); f.reset();
  } catch (err) { toast(errText(err), 'err'); }
});
$('#subForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inp = $('input', e.target);
  try { await api('/subscribe', { method: 'POST', body: { email: inp.value } }); toast(t('foot.subok'), 'ok'); inp.value = ''; }
  catch (err) { toast(errText(err), 'err'); }
});

// ---------------- Qulayliklar modal ----------------
$('#amenGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.amen');
  if (!card) return;
  const art = $('.amen-art', card).cloneNode(true);
  const key = card.dataset.amen;
  $('#amenBody').innerHTML = '';
  $('#amenBody').appendChild(art);
  $('#amenBody').insertAdjacentHTML('beforeend', `
    <div class="amb">
      <h3>${t('am.' + key)}</h3>
      <p>${t('am.' + key + '.t')}</p>
      <div class="lk-row"><span>${t('am.hours')}</span><b>${card.dataset.hours}</b></div>
      <div class="lk-row"><span>💎</span><span style="color:var(--ok);font-weight:700">${t('am.free')}</span></div>
      <a href="#rooms" class="btn btn-gold" data-close style="margin-top:18px;width:100%">${t('nav.book')} →</a>
    </div>`);
  openModal('#amenModal');
});

// ---------------- Navigatsiya, animatsiyalar ----------------
const header = $('#header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 40), { passive: true });
$('#burger').addEventListener('click', () => { $('#nav').classList.toggle('open'); $('#burger').classList.toggle('x'); });
$$('#nav a').forEach((a) => a.addEventListener('click', () => { $('#nav').classList.remove('open'); $('#burger').classList.remove('x'); }));

const navObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) $$('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('section[id]').forEach((s) => navObs.observe(s));

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
}, { threshold: 0.12 });
$$('.reveal').forEach((el) => revealObs.observe(el));

const countObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    $$('[data-count]', en.target).forEach((el) => {
      const end = +el.dataset.count, t0 = performance.now(), dur = 1800;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString('en-US') + (end > 1000 && p === 1 ? '+' : '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    countObs.unobserve(en.target);
  });
}, { threshold: 0.4 });
countObs.observe($('.stats'));

// ---------------- Ishga tushirish ----------------
(async function init() {
  initSearch();
  paintStars();
  try {
    await loadRooms();
    makeSnapshots();
  } catch (e) {
    console.error(e);
    toast(t('err.generic'), 'err');
  }
  applyLang();
  loadReviews();
  await setHero('presidential');
  presViewer.load('presidential');
  visObs.observe($('#heroCanvas'));
  visObs.observe($('#presCanvas'));
  resetHeroCycle();
  const last = (() => { try { return localStorage.getItem('lastBooking'); } catch { return null; } })();
  if (last) $('#lookupCode').value = last;
  setTimeout(() => {
    $('#loader').classList.add('done');
    $$('.hero .reveal').forEach((el) => el.classList.add('in'));
  }, 600);
})();
