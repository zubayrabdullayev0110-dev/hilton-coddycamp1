// =============================================================
//  NoSQL qismi (NeDB — MongoDB uslubidagi hujjatli baza, fayllarda)
//  Bu yerda erkin tuzilmali, tez o'zgaruvchan ma'lumotlar:
//    - reviews     : mehmon sharhlari (matn, reyting, til)
//    - messages    : "Bog'lanish" formasi xabarlari
//    - subscribers : newsletter obunachilari
//    - activity    : sayt hodisalari logi (har xil shakldagi JSON)
//  Nega NoSQL?  Bu hujjatlarning maydonlari vaqt o'tib o'zgaradi,
//  qat'iy sxema va JOIN kerak emas — JSON holida saqlash qulay.
// =============================================================
const path = require('path');
const Datastore = require('@seald-io/nedb');

const dir = process.env.DATA_DIR || (process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT ? '/tmp/hilton-data' : path.join(__dirname, '..', '..', 'data'));
require('fs').mkdirSync(dir, { recursive: true });
const make = (name) => new Datastore({ filename: path.join(dir, `${name}.db`), autoload: true, timestampData: true });

const nosql = {
  reviews: make('reviews'),
  messages: make('messages'),
  subscribers: make('subscribers'),
  activity: make('activity'),
};

nosql.subscribers.ensureIndexAsync({ fieldName: 'email', unique: true }).catch(() => {});

// Boshlang'ich sharhlar
(async () => {
  const count = await nosql.reviews.countAsync({});
  if (count === 0) {
    await nosql.reviews.insertAsync([
      { name: 'Aziza R.',      rating: 5, lang: 'uz', text: "Prezident xonasi — ertakdek! Nonushta, tushlik va kechki ovqat bepul bo'lgani juda yoqdi." },
      { name: 'Dmitry K.',     rating: 5, lang: 'ru', text: 'Лучший отель, где я останавливался. Бассейн и сауна — на высшем уровне.' },
      { name: 'Sarah M.',      rating: 5, lang: 'en', text: 'Stunning panorama suite, impeccable service. The kids loved the football pitch!' },
      { name: 'Jasur T.',      rating: 4, lang: 'uz', text: "Futbol maydoni zo'r, do'stlar bilan o'ynadik. Xonalar juda toza." },
    ]);
  }
})();

function log(type, payload = {}) {
  nosql.activity.insertAsync({ type, ...payload }).catch(() => {});
}

module.exports = { nosql, log };
