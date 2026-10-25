// Starter content. It fills an empty database once; after that the staff dashboard is the truth.
// It is also what the site shows when no database is connected (local previews), so nothing
// here may be a guess: facts come from the Stoic Soul Club brand brief (18 October 2026) and
// Ali's master brief (25 October 2026). Photos are the brand's own, sent by Ali on 25 October 2026.

// Chapter One stock is the founders' count of 10 October 2026; staff keep it current in the dashboard.
export const SEED_PRODUCTS = [
  {
    slug: 'vengeance-washed-hoodie',
    images: ['/assets/img/ch1/vengeance-hoodie-back.webp | Back print, acid-washed charcoal', '/assets/img/ch1/vengeance-hoodie-night.webp | Worn, Amman, after dark', '/assets/img/ch1/vengeance-art.webp | The print: Lady Justice, VENGEANCE', '/assets/img/ch1/cover-night.webp | Hood up, over the city'],
    sku: 'SSC-VEN-WH', name: 'VENGEANCE Washed Hoodie', category: 'hoodies', collection: 'vengeance',
    price: 35000, tone: '#55524c', featured: true, status: 'available', sort: 10, color: 'Acid-washed charcoal',
    stock: { S: 1, M: 3, L: 1, XL: 1, XXL: 0 },
    description: 'Acid-washed charcoal, cut oversized. Big back print, small bust on the chest.',
    fit: 'Cut oversized. Size M: 62 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 450 g/m², acid-washed.',
    care: '',
    story: 'VENGEANCE is adversity turned into forward movement. The hardest chapter, worn on the back.',
  },
  {
    slug: 'vengeance-washed-tee',
    images: ['/assets/img/ch1/vengeance-tee-wall.webp | Back print, on body, painted wall', '/assets/img/ch1/vengeance-tee-bar.webp | Worn, the gym', '/assets/img/ch1/vengeance-art.webp | The print: Lady Justice, VENGEANCE', '/assets/img/ch1/vengeance-tee-bar-2.webp | Pull-ups, Amman'],
    sku: 'SSC-VEN-WT', name: 'VENGEANCE Washed Tee', category: 'tees', collection: 'vengeance',
    price: 24000, tone: '#5e5b55', featured: true, status: 'available', sort: 20, color: 'Acid-washed charcoal',
    stock: { S: 0, M: 1, L: 2, XL: 2, XXL: 2 },
    description: 'Acid-washed charcoal, cut oversized. Big back print, small bust on the chest.',
    fit: 'Cut oversized. Size M: 58 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 250 g/m², acid-washed.',
    care: '',
    story: 'VENGEANCE is adversity turned into forward movement. The hardest chapter, worn on the back.',
  },
  {
    slug: 'kaizen-hoodie',
    images: ['/assets/img/ch1/kaizen-hoodie-back.webp | Back print, black', '/assets/img/ch1/hoodie-front-logo.webp | Front, chest logo', '/assets/img/ch1/kaizen-art.webp | The print: the angel, KAIZEN', '/assets/img/ch1/kaizen-hoodie-bar.webp | Worn, the gym'],
    sku: 'SSC-KAI-H', name: 'KAIZEN Hoodie', category: 'hoodies', collection: 'kaizen',
    price: 32000, tone: '#26252a', featured: true, status: 'available', sort: 30, color: 'Black',
    stock: { S: 1, M: 3, L: 3, XL: 3, XXL: 0 },
    description: 'Black, very boxy, dropped shoulder. Big back print, small bust on the chest.',
    fit: 'Very boxy, dropped shoulder. Size M: 66 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 400 g/m².',
    care: '',
    story: 'KAIZEN means getting a little better every day. The quiet chapter, the one nobody claps for.',
  },
  {
    slug: 'kaizen-tee',
    images: ['/assets/img/ch1/poster-kaizen-blossom.webp | Tee and hoodie, Chapter One poster', '/assets/img/ch1/kaizen-art.webp | The print: the angel, KAIZEN'],
    sku: 'SSC-KAI-T', name: 'KAIZEN Tee', category: 'tees', collection: 'kaizen',
    price: 22000, tone: '#2c2b30', featured: false, status: 'available', sort: 40, color: 'Black',
    stock: { S: 0, M: 2, L: 3, XL: 1, XXL: 0 },
    description: 'Black, puff logo on the chest, big back print. Relaxed regular fit.',
    fit: 'Relaxed regular fit; size up for baggy. Size M: 53 cm across the chest, 68 cm long, laid flat.',
    materials: '100% cotton, 260 g/m², puff print.',
    care: '',
    story: 'KAIZEN means getting a little better every day. The quiet chapter, the one nobody claps for.',
  },
  {
    slug: 'tranquility-hoodie',
    images: ['/assets/img/ch1/tranquility-hoodie-rooftop.webp | Back print, rooftop, Amman', '/assets/img/ch1/tranquility-hoodie-front.webp | Front, chest logo, hood up', '/assets/img/ch1/tranquility-art.webp | The print: TRANQUILITY', '/assets/img/ch1/tranquility-hoodie-wall.webp | Worn, after dark'],
    sku: 'SSC-TRA-H', name: 'TRANQUILITY Hoodie', category: 'hoodies', collection: 'tranquility',
    price: 32000, tone: '#e8e3d8', featured: false, status: 'available', sort: 50, color: 'White',
    stock: { S: 1, M: 3, L: 2, XL: 3, XXL: 0 },
    description: 'White, very boxy, dropped shoulder. Big back print, small bust on the chest.',
    fit: 'Very boxy, dropped shoulder. Size M: 66 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 400 g/m².',
    care: '',
    story: 'TRANQUILITY is calm and perspective. The chapter where you stop proving and start seeing.',
  },
  {
    slug: 'tranquility-tee',
    images: ['/assets/img/ch1/poster-tranquility.webp | Tee and hoodie, Chapter One poster', '/assets/img/ch1/tranquility-art.webp | The print: TRANQUILITY'],
    sku: 'SSC-TRA-T', name: 'TRANQUILITY Tee', category: 'tees', collection: 'tranquility',
    price: 22000, tone: '#efebe2', featured: false, status: 'available', sort: 60, color: 'White',
    stock: { S: 1, M: 3, L: 4, XL: 2, XXL: 0 },
    description: 'White, puff logo on the chest, big back print. Relaxed regular fit.',
    fit: 'Relaxed regular fit; size up for baggy. Size M: 53 cm across the chest, 68 cm long, laid flat.',
    materials: '100% cotton, 260 g/m², puff print.',
    care: '',
    story: 'TRANQUILITY is calm and perspective. The chapter where you stop proving and start seeing.',
  },
];

export const SEED_COLLECTIONS = [
  {
    slug: 'kaizen', title: 'KAIZEN', chapter: 1, accent: '#C8963E', status: 'current',
    meaning: 'A discipline to be better. Small steps, big change.',
    images: ['/assets/img/ch1/kaizen-hoodie-back.webp', '/assets/img/ch1/kaizen-art.webp', '/assets/img/ch1/poster-kaizen-ruins.webp'],
    description: 'A little better, every day. Black cotton, a puff logo on the chest and a 52 cm print on the back. For the long, quiet stretch of a chapter where the work is the whole story.',
  },
  {
    slug: 'tranquility', title: 'TRANQUILITY', chapter: 1, accent: '#A9B7BE', status: 'current',
    meaning: 'Calm in the noise. A sense of peace and quiet.',
    images: ['/assets/img/ch1/tranquility-hoodie-rooftop.webp', '/assets/img/ch1/tranquility-art.webp', '/assets/img/ch1/poster-tranquility.webp'],
    description: 'White cotton, the same cuts as KAIZEN, the opposite mood. For the chapter where you stop proving and start seeing clearly.',
  },
  {
    slug: 'vengeance', title: 'VENGEANCE', chapter: 1, accent: '#B8382E', status: 'current',
    meaning: 'Seeking revenge for justice. Turn it into fuel.',
    images: ['/assets/img/ch1/vengeance-hoodie-back.webp', '/assets/img/ch1/vengeance-art.webp', '/assets/img/ch1/poster-vengeance.webp'],
    description: 'Acid-washed charcoal, cut oversized, the heaviest fabric of the three. VENGEANCE is never about people. It is what you make of the hardest chapter.',
  },
];

// One lookbook per photoshoot. Photos are the brand's own (Ali, 25 October 2026); captions say
// what is in the frame, nothing more.
const P = (file, caption, tag = 'campaign') => ({ image: `/assets/img/ch1/${file}.webp`, caption, alt: caption, tag });
export const SEED_LOOKBOOKS = [
  {
    slug: 'chapter-one', title: 'Chapter One, worn', collection: '', credit: '', status: 'published', featured: true, sort: 10,
    intro: 'The first drop on the people who made it: a gym in Amman, a rooftop after dark, a painted wall.',
    photos: [
      P('kaizen-hoodie-bar', 'KAIZEN hoodie, the bar'),
      P('vengeance-tee-wall', 'VENGEANCE washed tee, painted wall'),
      P('tranquility-hoodie-rooftop', 'TRANQUILITY hoodie, rooftop, Amman'),
      P('vengeance-hoodie-night', 'VENGEANCE washed hoodie, the city at night'),
      P('logo-on-body', 'The chest logo'),
      P('kaizen-hoodie-flex', 'KAIZEN hoodie, back print'),
      P('tranquility-hoodie-front', 'TRANQUILITY hoodie, hood up'),
      P('vengeance-tee-bar', 'VENGEANCE washed tee, pull-ups'),
      P('cover-night', 'Hood up, over the city'),
      P('tranquility-hoodie-wall', 'TRANQUILITY hoodie, after dark'),
      P('kaizen-hoodie-night', 'KAIZEN hoodie, night'),
    ],
  },
  {
    slug: 'chapter-one-posters', title: 'Chapter One, the posters', collection: '', credit: '', status: 'published', featured: false, sort: 20,
    intro: 'The announcement posters, as they ran on Instagram before and during the first drop.',
    photos: [
      P('poster-first-era', 'The first era is coming'),
      P('poster-drop', 'Approaching the drop'),
      P('poster-kaizen-ruins', 'KAIZEN: a discipline to be better'),
      P('poster-kaizen-blossom', 'KAIZEN, second poster'),
      P('poster-tranquility', 'TRANQUILITY: calm in the noise'),
      P('poster-vengeance', 'VENGEANCE: turn it into fuel'),
    ],
  },
];

export const DEFAULT_SETTINGS = {
  // The order number is never written in code. It is set in the dashboard, in international
  // format without + (for example 9627XXXXXXXX). Empty means ordering is switched off.
  whatsapp: '',
  instagram: 'stoicsoulclub',
  contact_email: '',
  site_public: '0', // '1' removes the noindex header once the founders approve the launch
  hero_headline: "FOR THE CHAPTER YOU'RE IN.",
  hero_cta: 'Shop the drop',
  hero_image: '/assets/img/ch1/cover-night.webp',
  hero_video: '',
  hero_caption: 'Chapter One, Amman, after dark',
  manifesto: 'People move through chapters. Some are about building, some about grief, some about getting your calm back.\nThe clothes are for the one you are in now, not the one you are performing.\nWear it like you mean it.',
  manifesto_image: '/assets/img/ch1/tranquility-hoodie-rooftop.webp',
  announcement: '',
  ordering_text: 'Choose your size and tap Order via WhatsApp. The message is written for you; you send it. Sanad confirms availability, delivery and the total before anything is paid.',
  shipping_text: 'Free delivery in Amman. 3 JOD across the rest of Jordan. International order inquiries welcome: shipping availability and cost are confirmed before purchase.',
  payment_text: 'CliQ transfer or cash on delivery inside Jordan, confirmed on WhatsApp.',
  swap_text: 'Wrong size? Swap it within 7 days if unworn with tags on; you cover the swap delivery. Defects are replaced free.',
  restock_inquiries: '1',
  analytics: '1',
  story_text: '',
  story_image: '/assets/img/ch1/logo-black.webp',
  logo_image: '/assets/img/ch1/logo-mark.webp',
  telegram_chat: '',
};
