// Starter content. It fills an empty database once; after that the staff dashboard is the truth.
// It is also what the site shows when no database is connected (local previews), so nothing
// here may be a guess: facts come from the Stoic Soul Club brand brief (18 October 2026) and
// Ali's master brief (25 October 2026). Photos are the brand's own, sent by Ali on 25 October 2026.

// Chapter One stock is the founders' count of 10 October 2026; staff keep it current in the dashboard.
// Prices: tees 25 JOD, hoodies 35 JOD (Ali, 25 October 2026, matching the Chapter One posters).
// stock is either { size: count } in the product's one colour, or { colour: { size: count } }.
export function seedVariants(p) {
  const multi = Object.values(p.stock).some((v) => typeof v === 'object');
  const byColor = multi ? p.stock : { [p.color]: p.stock };
  const out = [];
  Object.entries(byColor).forEach(([color, sizes], c) => {
    Object.entries(sizes).forEach(([size, stock], i) => {
      const sku = c === 0 ? `${p.sku}-${size}` : `${p.sku}-${color.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${size}`;
      out.push({ size, color, sku, stock, sort: c * 10 + i });
    });
  });
  return out;
}

export const SEED_PRODUCTS = [
  {
    slug: 'vengeance-washed-hoodie',
    images: ['/assets/img/ch1/v2-vengeance-hoodie-balcony.webp | Back print, hood up, Amman after dark', '/assets/img/ch1/v2-vengeance-hoodie-balcony-2.webp | Over the city, after dark'],
    sku: 'SSC-VEN-WH', name: 'VENGEANCE Washed Hoodie', category: 'hoodies', collection: 'vengeance',
    price: 35000, tone: '#55524c', featured: true, status: 'available', sort: 10, color: 'Acid-washed charcoal',
    // White: real piece (Ali, 25 October 2026); count per size still to come, so it starts at 0.
    stock: { 'Acid-washed charcoal': { S: 1, M: 3, L: 1, XL: 1, XXL: 0 }, White: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } },
    description: 'Acid-washed charcoal or white, cut oversized. Big back print, small bust on the chest.',
    fit: 'Cut oversized. Size M: 62 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 450 g/m², acid-washed.',
    care: '',
    story: 'VENGEANCE is adversity turned into forward movement. The hardest chapter, worn on the back.',
  },
  {
    slug: 'vengeance-washed-tee',
    images: ['/assets/img/ch1/v2-vengeance-tee-wall.webp | Back print, acid-washed charcoal'],
    sku: 'SSC-VEN-WT', name: 'VENGEANCE Washed Tee', category: 'tees', collection: 'vengeance',
    price: 25000, tone: '#5e5b55', featured: true, status: 'available', sort: 20, color: 'Acid-washed charcoal',
    stock: { S: 0, M: 1, L: 2, XL: 2, XXL: 2 },
    description: 'Acid-washed charcoal, cut oversized. Big back print, small bust on the chest.',
    fit: 'Cut oversized. Size M: 58 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 250 g/m², acid-washed.',
    care: '',
    story: 'VENGEANCE is adversity turned into forward movement. The hardest chapter, worn on the back.',
  },
  {
    slug: 'kaizen-hoodie',
    images: [],
    sku: 'SSC-KAI-H', name: 'KAIZEN Hoodie', category: 'hoodies', collection: 'kaizen',
    price: 35000, tone: '#26252a', featured: true, status: 'available', sort: 30, color: 'Black',
    // White: real piece (Ali, 25 October 2026); count per size still to come, so it starts at 0.
    stock: { Black: { S: 1, M: 3, L: 3, XL: 3, XXL: 0 }, White: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } },
    description: 'Black or white, very boxy, dropped shoulder. Big back print, small bust on the chest.',
    fit: 'Very boxy, dropped shoulder. Size M: 66 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 400 g/m².',
    care: '',
    story: 'KAIZEN means getting a little better every day. The quiet chapter, the one nobody claps for.',
  },
  {
    slug: 'kaizen-tee',
    images: [],
    sku: 'SSC-KAI-T', name: 'KAIZEN Tee', category: 'tees', collection: 'kaizen',
    price: 25000, tone: '#2c2b30', featured: false, status: 'available', sort: 40, color: 'Black',
    stock: { S: 0, M: 2, L: 3, XL: 1, XXL: 0 },
    description: 'Black, puff logo on the chest, big back print. Relaxed regular fit.',
    fit: 'Relaxed regular fit; size up for baggy. Size M: 53 cm across the chest, 68 cm long, laid flat.',
    materials: '100% cotton, 260 g/m², puff print.',
    care: '',
    story: 'KAIZEN means getting a little better every day. The quiet chapter, the one nobody claps for.',
  },
  {
    slug: 'tranquility-hoodie',
    images: ['/assets/img/ch1/v2-tranquility-hoodie-pillar.webp | Back print, white', '/assets/img/ch1/v2-tranquility-hoodie-mural.webp | Hood up, the mural'],
    sku: 'SSC-TRA-H', name: 'TRANQUILITY Hoodie', category: 'hoodies', collection: 'tranquility',
    price: 35000, tone: '#e8e3d8', featured: false, status: 'available', sort: 50, color: 'White',
    stock: { S: 1, M: 3, L: 2, XL: 3, XXL: 0 },
    description: 'White, very boxy, dropped shoulder. Big back print, small bust on the chest.',
    fit: 'Very boxy, dropped shoulder. Size M: 66 cm across the chest, 72 cm long, laid flat.',
    materials: '100% cotton, 400 g/m².',
    care: '',
    story: 'TRANQUILITY is calm and perspective. The chapter where you stop proving and start seeing.',
  },
  {
    slug: 'tranquility-tee',
    images: [],
    sku: 'SSC-TRA-T', name: 'TRANQUILITY Tee', category: 'tees', collection: 'tranquility',
    price: 25000, tone: '#efebe2', featured: false, status: 'available', sort: 60, color: 'White',
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
    images: [],
    description: 'A little better, every day. Black cotton, a puff logo on the chest and a 52 cm print on the back. For the long, quiet stretch of a chapter where the work is the whole story.',
  },
  {
    slug: 'tranquility', title: 'TRANQUILITY', chapter: 1, accent: '#A9B7BE', status: 'current',
    meaning: 'Calm in the noise. A sense of peace and quiet.',
    images: ['/assets/img/ch1/v2-tranquility-hoodie-pillar.webp', '/assets/img/ch1/v2-tranquility-hoodie-mural.webp'],
    description: 'White cotton, the same cuts as KAIZEN, the opposite mood. For the chapter where you stop proving and start seeing clearly.',
  },
  {
    slug: 'vengeance', title: 'VENGEANCE', chapter: 1, accent: '#B8382E', status: 'current',
    meaning: 'The hardest chapter, turned into fuel.',
    images: ['/assets/img/ch1/v2-vengeance-hoodie-balcony-2.webp', '/assets/img/ch1/v2-vengeance-hoodie-balcony.webp'],
    description: 'Acid-washed charcoal, cut oversized, the heaviest fabric of the three. VENGEANCE is never about people. It is what you make of the hardest chapter.',
  },
];

// The tee front and back views come from the brand's own 2024 design sheet (Stoic Sample Mock Ups.pdf).
// One lookbook per photoshoot. Photos are the brand's own (Ali, 25 October 2026); captions say
// what is in the frame, nothing more.
export const SEED_LOOKBOOKS = [
  {
    slug: 'chapter-one', title: 'Chapter One, worn', collection: '', credit: '', status: 'draft', featured: true, sort: 10,
    intro: 'The first drop on the people who made it: a gym in Amman, a rooftop after dark, a painted wall.',
    photos: [],
  },
  {
    slug: 'chapter-one-posters', title: 'Chapter One, the posters', collection: '', credit: '', status: 'draft', featured: false, sort: 20,
    intro: 'The announcement posters, as they ran on Instagram before and during the first drop.',
    photos: [],
  },
];

// Wording the founders retired (25 October 2026). A live site still holding the old text gets the new one.
export const RETIRED_WORDING = {
  // 26 October 2026: the real handle is @stoicsoul.club (Ali); the old guess went nowhere.
  instagram: ['stoicsoulclub'],
  ordering_text: ['Choose your size and tap Order via WhatsApp. The message is written for you; you send it. Sanad confirms availability, delivery and the total before anything is paid.'],
};
export const RETIRED_MEANINGS = { vengeance: ['Seeking revenge for justice. Turn it into fuel.'] };

// 25 October 2026: Ali asked for every photo to come off the site ("disregard all photos I sent
// you previously"). A live database still holding them is cleared once; the key below records it.
export const PHOTOS_CLEARED_KEY = 'photos_cleared';
// 26 October 2026: Ali approved the first five graded photographs (photo benchmark, Commerce Clean and
// Stoic Editorial treatments) for the site. A live database gets them once, only where it still has
// no photo, so anything the staff uploaded in between stays.
export const PHOTOS_V2_KEY = 'photos_v2';

export const DEFAULT_SETTINGS = {
  // The order number is never written in code. It is set in the dashboard, in international
  // format without + (for example 9627XXXXXXXX). Empty means ordering is switched off.
  whatsapp: '',
  instagram: 'stoicsoul.club',
  contact_email: '',
  site_public: '0', // '1' removes the noindex header once the founders approve the launch
  hero_headline: "FOR THE CHAPTER YOU'RE IN.",
  hero_cta: 'Shop the drop',
  hero_image: '/assets/img/ch1/v2-vengeance-hoodie-balcony.webp',
  hero_video: '',
  hero_caption: 'Chapter One, Amman, after dark',
  manifesto: 'People move through chapters. Some are about building, some about grief, some about getting your calm back.\nThe clothes are for the one you are in now, not the one you are performing.\nWear it like you mean it.',
  manifesto_image: '/assets/img/ch1/v2-tranquility-hoodie-mural.webp',
  announcement: '',
  ordering_text: 'Choose your size and tap Order via WhatsApp. The message is written for you; you send it. We confirm availability, delivery and the total before anything is paid.',
  shipping_text: 'Free delivery in Amman. 3 JOD across the rest of Jordan. International order inquiries welcome: shipping availability and cost are confirmed before purchase.',
  payment_text: 'CliQ transfer or cash on delivery inside Jordan, confirmed on WhatsApp.',
  swap_text: 'Wrong size? Swap it within 7 days if unworn with tags on; you cover the swap delivery. Defects are replaced free.',
  restock_inquiries: '1',
  analytics: '1',
  story_text: '',
  story_image: '',
  logo_image: '/assets/img/ch1/logo-mark.webp',
  telegram_chat: '',
};
