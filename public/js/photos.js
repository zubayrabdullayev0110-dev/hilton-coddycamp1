// Haqiqiy fotosuratlardan "video" (Ken Burns: sekin zoom + silliq almashinuv).
// Rasmlar: Wikimedia Commons, erkin litsenziya — mualliflar public/photos/credits.json da.

const COUNTS = {
  'deluxe-king': 3, 'executive-twin': 3, 'junior-suite': 3,
  'family-suite': 3, 'panorama-suite': 3, presidential: 4,
};
// Turning boshida: Toshkentdagi haqiqiy Hilton Tashkent City
export const INTRO = ['hilton-tashkent-1', 'hilton-tashkent-2'];

export const photosFor = (slug) =>
  Array.from({ length: COUNTS[slug] || 0 }, (_, i) => `${slug}-${i + 1}`);
export const photoUrl = (id) => `/photos/${id}.jpg`;
export const coverFor = (slug) => photoUrl(`${slug}-1`);

let creditsP;
const credits = () => (creditsP ??= fetch('/photos/credits.json').then((r) => r.json()).catch(() => ({})));

const MOVES = [
  ['scale(1.0) translate(0,0)', 'scale(1.14) translate(-2%,-1%)'],
  ['scale(1.14) translate(2%,1%)', 'scale(1.0) translate(0,0)'],
  ['scale(1.04) translate(-2%,0)', 'scale(1.16) translate(2%,-2%)'],
  ['scale(1.12) translate(0,-2%)', 'scale(1.02) translate(-1%,1%)'],
];

export class PhotoViewer {
  constructor(el, { interactive = false, intro = false, interval = 5500 } = {}) {
    this.el = el;
    this.intro = intro;
    this.interval = interval;
    this.autoCam = true;
    this.running = false;
    el.classList.add('pv');
    el.innerHTML = `
      <img class="pv-img" alt="" /><img class="pv-img" alt="" />
      <div class="pv-cap"><b class="pv-title"></b><small class="pv-credit"></small></div>
      ${interactive ? `<button class="pv-nav pv-prev" aria-label="Prev">‹</button>
      <button class="pv-nav pv-next" aria-label="Next">›</button><div class="pv-dots"></div>` : ''}`;
    this.layers = [...el.querySelectorAll('.pv-img')];
    this.front = 0;
    if (interactive) {
      const manual = (d) => { this.autoCam = false; this.onManual?.(); this.show(this.i + d); };
      el.querySelector('.pv-prev').onclick = () => manual(-1);
      el.querySelector('.pv-next').onclick = () => manual(1);
      this.dots = el.querySelector('.pv-dots');
      this.dots.onclick = (e) => {
        const b = e.target.closest('button[data-i]');
        if (b) { this.autoCam = false; this.onManual?.(); this.show(+b.dataset.i); }
      };
      let x0 = null;
      el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
      el.addEventListener('pointerup', (e) => {
        if (x0 != null && Math.abs(e.clientX - x0) > 40) manual(e.clientX < x0 ? 1 : -1);
        x0 = null;
      });
    }
  }

  load(slug) {
    this.room = slug;
    this.list = [...(this.intro ? INTRO : []), ...photosFor(slug)];
    this.list.forEach((id) => { new Image().src = photoUrl(id); }); // oldindan yuklash
    if (this.dots) this.dots.innerHTML = this.list.map((_, i) => `<button data-i="${i}"></button>`).join('');
    this.autoCam = true;
    this.i = -1;
    this.show(0);
  }

  async show(i) {
    if (!this.list?.length) return;
    this.i = (i + this.list.length) % this.list.length;
    const id = this.list[this.i];
    const next = this.layers[1 - this.front], prev = this.layers[this.front];
    const [from, to] = MOVES[this.i % MOVES.length];
    next.style.transition = 'none';
    next.style.transform = from;
    next.src = photoUrl(id);
    try { await next.decode(); } catch { /* rasm yuklanmasa ham davom etamiz */ }
    if (this.list[this.i] !== id) return;
    void next.offsetWidth;
    next.style.transition = `opacity 1.2s ease, transform ${this.interval + 1500}ms linear`;
    next.style.transform = to;
    next.classList.add('on');
    prev.classList.remove('on');
    this.front = 1 - this.front;
    this.dots?.querySelectorAll('button').forEach((b, k) => b.classList.toggle('active', k === this.i));
    this.caption(id);
    this.schedule();
  }

  async caption(id) {
    const c = (await credits())[id];
    if (this.list[this.i] !== id) return;
    this.el.querySelector('.pv-title').textContent = id.startsWith('hilton-tashkent') ? 'Hilton Tashkent City · Toshkent' : '';
    this.el.querySelector('.pv-credit').textContent = c ? `📷 ${c.author} · ${c.license}` : '';
  }

  schedule() {
    clearTimeout(this.timer);
    if (this.running && this.autoCam) this.timer = setTimeout(() => this.show(this.i + 1), this.interval);
  }

  start() { if (this.running) return; this.running = true; this.schedule(); }
  stop() { this.running = false; clearTimeout(this.timer); }
  setAuto(on) { this.autoCam = on; this.schedule(); }
}
