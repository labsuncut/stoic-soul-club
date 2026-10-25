// The public pages: home, shop, product, lookbook, archive, story, contact.
import { money, chapterLabel, bySlug } from './content.js';
import { layout, frame, productCard, statement, filmStrip, sectionHead, esc, SITE } from './render.js';

const pad = (n) => String(n).padStart(2, '0');
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const words = (n) => WORDS[n] || String(n);
const paragraphs = (text) => String(text || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');
const imgUrl = (origin, u) => (u ? new URL(u, origin).href : '');

function currentChapter(site) {
  const current = site.collections.filter((c) => c.status === 'current');
  return current.length ? Math.max(...current.map((c) => c.chapter)) : 1;
}

const visible = (site) => site.products.filter((p) => p.status !== 'draft');
const onSale = (site) => visible(site).filter((p) => p.status === 'available' || p.status === 'sold_out');
const archived = (site) => visible(site).filter((p) => p.status === 'archived');

// ---------- Home ----------
export function home(site, origin) {
  const s = site.settings;
  const chapter = currentChapter(site);
  const drop = onSale(site);
  const hero = drop.find((p) => p.featured) || drop[0];
  const rest = drop.filter((p) => p !== hero);
  const featuredBook = site.lookbooks.find((l) => l.featured) || site.lookbooks[0];
  const strip = featuredBook ? featuredBook.photos.filter((ph) => ph.tag !== 'community') : [];
  const community = site.lookbooks.flatMap((l) => l.photos.filter((ph) => ph.tag === 'community')).slice(0, 6);
  const chapters = [...site.collections].sort((a, b) => b.chapter - a.chapter || a.sort - b.sort);

  const heroMedia = s.hero_video
    ? `<video class="cover-media" autoplay muted loop playsinline preload="none" poster="${esc(s.hero_image)}" aria-hidden="true"><source src="${esc(s.hero_video)}" type="video/mp4"></video>`
    : s.hero_image
      ? `<img class="cover-media" src="${esc(s.hero_image)}" alt="" fetchpriority="high">`
      : `<div class="cover-media ph ph-dark" role="img" aria-label="Cover photo to come"><span class="ph-label">Cover photo to come</span><span class="ph-shot">VENGEANCE washed hoodie, back print, on body, warm street light</span></div>`;

  const body = `
<section class="cover" id="cover">
  <div class="cover-pic">${heroMedia}<span class="cover-cap">${esc(s.hero_caption)}</span></div>
  <div class="cover-text">
    ${statement(s.hero_headline.replace(/\s+(YOU'RE IN\.?)$/i, '\n$1'), { tag: 'h1', cls: 'statement-xl' })}
    <p class="cover-sub"><em>Chapter ${words(chapter)}</em> is out. Heavy cotton tees and hoodies, three designs, a print on the back that says where you are.</p>
    <p class="cover-cta"><a class="btn" href="/shop">${esc(s.hero_cta)}</a><a class="link" href="/lookbook">See the lookbook</a></p>
  </div>
  <a class="cover-scroll" href="#drop" aria-label="Scroll to the drop">Scroll</a>
</section>

<section class="band" id="drop">
  <div class="wrap">
    ${sectionHead(2, `${chapterLabel(chapter)} · Current drop`, 'THE DROP.')}
    ${drop.length ? `<div class="sheet sheet-drop">${hero ? productCard(hero, 1, { cls: 'product-lead' }) : ''}${rest.map((p, i) => productCard(p, i + 2)).join('')}</div>
    <p class="sheet-foot"><a class="link" href="/shop">Everything in the shop</a></p>`
      : `<p class="lead">Nothing is on sale right now. The next chapter is being made.</p>`}
  </div>
</section>

<section class="band band-paper" id="philosophy">
  <div class="wrap split">
    <div class="split-text">
      ${sectionHead(3, 'The philosophy', 'WEAR THE / CHAPTER / YOU\'RE IN.')}
      <div class="manifesto">${paragraphs(s.manifesto)}</div>
      <p><a class="link" href="/story">Read the story</a></p>
    </div>
    <div class="split-pic">${frame({ image: s.manifesto_image, alt: 'A real person wearing Stoic Soul Club', n: 9, ratio: '4/5', shot: 'Real person, KAIZEN hoodie, daylight, no pose' })}</div>
  </div>
</section>

${strip.length ? `<section class="band band-strip" id="lookbook">
  <div class="wrap">${sectionHead(4, 'Lookbook', featuredBook.title.toUpperCase())}</div>
  ${filmStrip(strip, { id: 'home-strip', label: featuredBook.title })}
  <div class="wrap"><p class="sheet-foot"><a class="link" href="/lookbook/${esc(featuredBook.slug)}">Open the lookbook</a></p></div>
</section>` : ''}

<section class="band band-ink" id="archive">
  <div class="wrap">
    ${sectionHead(5, 'Chapters so far', 'EVERY DESIGN / IS A CHAPTER.')}
    <ol class="chapters">
      ${chapters.map((c) => {
        const pieces = visible(site).filter((p) => p.collection === c.slug);
        const live = pieces.some((p) => p.status === 'available');
        return `<li class="chapter" style="--accent:${esc(c.accent)}">
          <a class="chapter-link" href="${live ? `/shop?collection=${esc(c.slug)}` : `/archive#${esc(c.slug)}`}">
            <span class="chapter-n">${chapterLabel(c.chapter)}</span>
            <span class="chapter-title">${esc(c.title)}</span>
            <span class="chapter-meaning">${esc(c.meaning)}</span>
            <span class="chapter-state">${live ? 'Current · in the shop' : c.status === 'archived' ? 'Archived' : 'Chapter'}</span>
          </a>
          <div class="chapter-pic">${frame({ image: c.images[0], alt: `${c.title} campaign`, ratio: '3/2', shot: `${c.title} campaign photo` })}</div>
        </li>`;
      }).join('')}
    </ol>
    <p class="sheet-foot"><a class="link link-light" href="/archive">Open the archive</a></p>
  </div>
</section>

${(community.length || s.instagram) ? `<section class="band" id="community">
  <div class="wrap">
    ${sectionHead(6, 'People and places', 'SEEN / IN THE WILD.')}
    ${community.length ? `<div class="sheet sheet-3">${community.map((ph, i) => frame({ image: ph.image, alt: ph.alt, caption: ph.caption, n: i + 1, ratio: '1/1' })).join('')}</div>` : ''}
    ${s.instagram ? `<p class="ig-line"><a href="https://www.instagram.com/${esc(s.instagram)}/" target="_blank" rel="noopener">@${esc(s.instagram)}</a><span>Tag us when you wear it. With your permission, it ends up here.</span></p>` : ''}
  </div>
</section>` : ''}
`;
  return layout({
    site, origin, page: 'home', section: 'Cover', chapter, title: SITE, path: '/', image: s.hero_image,
    description: `Stoic Soul Club, independent streetwear from Amman. ${s.hero_headline} Heavy cotton tees and hoodies, three designs, ordered on WhatsApp.`,
    body, bodyClass: 'is-home',
  });
}

// ---------- Shop ----------
export function shop(site, origin, url) {
  const chapter = currentChapter(site);
  const filter = (url.searchParams.get('collection') || '').toLowerCase();
  const all = onSale(site);
  const collections = site.collections.filter((c) => all.some((p) => p.collection === c.slug));
  const list = filter ? all.filter((p) => p.collection === filter) : all;
  const active = bySlug(site.collections, filter);
  const body = `
<section class="band band-first">
  <div class="wrap">
    ${sectionHead(2, `${chapterLabel(chapter)} · Shop`, active ? active.title : 'THE DROP.')}
    ${active ? `<p class="lead">${esc(active.meaning)}</p>` : ''}
    <nav class="filters" aria-label="Collections">
      <a href="/shop"${!filter ? ' aria-current="true"' : ''}>All</a>
      ${collections.map((c) => `<a href="/shop?collection=${esc(c.slug)}"${filter === c.slug ? ' aria-current="true"' : ''} style="--accent:${esc(c.accent)}">${esc(c.title)}</a>`).join('')}
    </nav>
    ${list.length
      ? `<div class="sheet sheet-shop">${list.map((p, i) => productCard(p, i + 1)).join('')}</div>`
      : `<div class="empty"><p class="lead">${active ? `Nothing from ${esc(active.title)} is on sale right now.` : 'Nothing is on sale right now.'}</p><p><a class="link" href="/archive">See the archive</a>${filter ? ` <a class="link" href="/shop">All pieces</a>` : ''}</p></div>`}
    <p class="fine">Sizes and prices are shown as listed; availability and delivery are confirmed on WhatsApp before you pay.</p>
  </div>
</section>`;
  return layout({
    site, origin, page: 'shop', section: active ? active.title : 'Shop', chapter,
    title: active ? `${active.title} · Shop` : 'Shop', path: filter ? `/shop?collection=${encodeURIComponent(filter)}` : '/shop',
    description: `Shop Stoic Soul Club${active ? ` ${active.title}` : ''}: heavy cotton tees and hoodies from Amman, ordered on WhatsApp.`,
    body,
  });
}

// ---------- Product ----------
const COUNTRIES = ['Jordan', 'Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Egypt', 'Lebanon', 'Iraq', 'Palestine', 'Libya', 'Turkey', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'Sweden', 'United States', 'Canada', 'Australia', 'Other'];

export function product(site, origin, p) {
  const s = site.settings;
  const col = bySlug(site.collections, p.collection);
  const chapter = col ? col.chapter : currentChapter(site);
  const shots = [['front', `${p.name}, front`], ['back', `${p.name}, back print`], ['detail', `${p.name}, close-up detail`], ['on body', `${p.name}, on body`]];
  const real = p.images.map((u, i) => frame({ image: u, alt: p.captions[i] || `${p.name}, photo ${i + 1}`, caption: p.captions[i], n: i + 1, ratio: '4/5', eager: i === 0 }));
  // A product with photos shows only real photos; only a product with none gets one marked placeholder.
  const missing = p.images.length ? [] : shots.slice(0, 1).map(([, shot], j) => frame({ image: '', alt: shot, n: j + 1, ratio: '4/5', shot }));
  const gallery = [...real, ...missing].join('');
  const colors = p.colors;
  const sizes = p.sizes;
  const stockBy = Object.fromEntries(p.variants.map((v) => [`${v.color}|${v.size}`, v.in_stock]));
  const waOn = !!s.whatsapp;
  const others = onSale(site).filter((x) => x.slug !== p.slug).slice(0, 3);
  const url = `${origin}/product/${p.slug}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, sku: p.sku || p.slug,
    image: p.images.map((u) => imgUrl(origin, u)), brand: { '@type': 'Brand', name: SITE }, material: p.materials || undefined,
    offers: {
      '@type': 'Offer', url, priceCurrency: p.currency, price: (p.price / 1000).toFixed(2),
      availability: p.orderable ? 'https://schema.org/InStock' : p.status === 'archived' ? 'https://schema.org/Discontinued' : 'https://schema.org/SoldOut',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }];
  const detail = (label, text) => (text ? `<div class="detail"><dt>${label}</dt><dd>${paragraphs(text)}</dd></div>` : '');
  const body = `
<article class="pdp" data-product>
  <div class="pdp-gallery" data-gallery>${gallery}</div>
  <div class="pdp-panel">
    <div class="pdp-sticky">
      <p class="pdp-chapter" style="--accent:${esc(col ? col.accent : '#6888A0')}"><a href="${p.status === 'archived' ? '/archive' : `/shop?collection=${esc(p.collection)}`}">${chapterLabel(chapter)} · ${esc((col ? col.title : p.collection).toUpperCase())}</a></p>
      <h1 class="pdp-name">${esc(p.name)}</h1>
      <p class="pdp-price"><span data-price>${money(p.price, p.currency)}</span>${p.compare_at > p.price ? ` <s>${money(p.compare_at, p.currency)}</s>` : ''}</p>
      <p class="pdp-desc">${esc(p.description)}</p>
      ${p.status === 'archived' ? `<p class="state-line"><span class="state state-past">Past release · not for sale</span></p><p class="notice-line">This piece is in the archive as the record. Nothing on this page can be ordered.</p>` : ''}
      ${p.status === 'sold_out' ? `<p class="notice-line">Sold out.${waOn && s.restock_inquiries === '1' ? ` <a class="link" data-restock href="#">Ask about a restock</a>` : ''}</p>` : ''}
      ${p.orderable ? `
      <form class="order" data-order novalidate>
        ${colors.length > 1 || (colors.length === 1 && colors[0]) ? `<fieldset class="opt"><legend>Colour</legend><div class="chips" data-colors>${colors.map((c, i) => `<label class="chip"><input type="radio" name="color" value="${esc(c)}"${colors.length === 1 ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></fieldset>` : ''}
        <fieldset class="opt"><legend>Size <a class="link fine" href="#fit">Fit guide</a></legend><div class="chips" data-sizes>${sizes.map((sz) => {
          const any = colors.length ? colors.some((c) => stockBy[`${c}|${sz}`]) : stockBy[`|${sz}`];
          return `<label class="chip${any ? '' : ' out'}"><input type="radio" name="size" value="${esc(sz)}"${any ? '' : ' disabled'}><span>${esc(sz)}</span></label>`;
        }).join('')}</div><p class="fine" data-size-note>Struck-through sizes are gone.</p></fieldset>
        <div class="opt"><label for="country">Destination country</label><select id="country" name="country">${COUNTRIES.map((c) => `<option${c === 'Jordan' ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        <button class="btn btn-wa" type="submit" disabled data-order-btn>${waOn ? 'Order via WhatsApp' : 'Ordering opens soon'}</button>
        <p class="fine" data-order-hint>${waOn ? 'Pick a size first. WhatsApp opens with your inquiry written; you send it. Nothing is reserved or paid until Stoic confirms.' : 'The order line is being set up. Message us on Instagram meanwhile.'}</p>
      </form>` : ''}
      <dl class="details" id="fit">
        ${detail('Fit', p.fit)}
        ${detail('Materials', p.materials)}
        ${detail('Care', p.care)}
        ${detail('The chapter', p.story)}
        ${detail('Ordering', s.ordering_text)}
        ${detail('Delivery', s.shipping_text)}
        ${detail('Size swaps', s.swap_text)}
      </dl>
    </div>
  </div>
  <script type="application/json" id="product-data">${JSON.stringify({ slug: p.slug, name: p.name, price: money(p.price, p.currency), collection: p.collection, colors, sizes, stock: stockBy, url, whatsapp: s.whatsapp }).replace(/</g, '\\u003c')}</script>
</article>
${others.length ? `<section class="band band-paper"><div class="wrap">${sectionHead(2, 'Same chapter', 'MORE / FROM THE DROP.')}<div class="sheet sheet-3">${others.map((o, i) => productCard(o, i + 1)).join('')}</div></div></section>` : ''}`;
  return layout({
    site, origin, page: 'product', section: col ? col.title : 'Product', chapter, title: p.name, path: `/product/${p.slug}`,
    description: `${p.name}: ${p.description} ${money(p.price, p.currency)}. ${p.orderable ? 'Order on WhatsApp.' : p.status === 'sold_out' ? 'Sold out.' : 'Archived.'}`,
    image: p.images[0], ld, body,
  });
}

// ---------- Lookbook ----------
export function lookbookIndex(site, origin) {
  const chapter = currentChapter(site);
  const books = site.lookbooks;
  const body = `
<section class="band band-first">
  <div class="wrap">
    ${sectionHead(4, 'Lookbook', 'SHOT WHERE / IT\'S WORN.')}
    ${books.length ? `<div class="books">${books.map((l, i) => {
      const cover = l.photos[0];
      return `<a class="book" href="/lookbook/${esc(l.slug)}">${frame({ image: cover ? cover.image : '', alt: cover ? cover.alt : l.title, n: i + 1, ratio: '4/5', shot: cover ? cover.caption : `${l.title} cover` })}<span class="book-title">${esc(l.title)}</span><span class="book-sub">${l.photos.length} frames${l.credit ? ` · ${esc(l.credit)}` : ''}</span></a>`;
    }).join('')}</div>` : '<p class="lead">The first lookbook is being shot.</p>'}
  </div>
</section>`;
  return layout({ site, origin, page: 'lookbook', section: 'Lookbook', chapter, title: 'Lookbook', path: '/lookbook', description: 'Stoic Soul Club lookbooks: real campaign photographs, shot in Amman.', body });
}

export function lookbook(site, origin, l) {
  const col = bySlug(site.collections, l.collection);
  const chapter = col ? col.chapter : currentChapter(site);
  const photos = l.photos;
  const ld = photos.some((ph) => ph.image) ? [{ '@context': 'https://schema.org', '@type': 'ImageGallery', name: `${l.title} · ${SITE}`, image: photos.filter((ph) => ph.image).map((ph) => imgUrl(origin, ph.image)) }] : [];
  const body = `
<section class="band band-first band-strip">
  <div class="wrap">${sectionHead(4, `Lookbook${col ? ` · ${col.title}` : ''}`, l.title.toUpperCase())}${l.intro ? `<p class="lead">${esc(l.intro)}</p>` : ''}</div>
  ${filmStrip(photos, { id: 'book-strip', label: l.title })}
</section>
<section class="band">
  <div class="wrap">
    <div class="sheet sheet-contact">${photos.map((ph, i) => frame({ image: ph.image, alt: ph.alt, caption: ph.caption, n: i + 1, ratio: i % 3 === 1 ? '3/4' : '4/5', cls: i % 5 === 0 ? 'span-2' : '' })).join('')}</div>
    ${l.credit ? `<p class="fine">Photography: ${esc(l.credit)}</p>` : ''}
    <p class="sheet-foot"><a class="link" href="/shop">Shop the pieces</a></p>
  </div>
</section>`;
  return layout({ site, origin, page: 'lookbook', section: l.title, chapter, title: `${l.title} · Lookbook`, path: `/lookbook/${l.slug}`, description: l.intro || `${l.title}, a Stoic Soul Club lookbook.`, image: (photos.find((ph) => ph.image) || {}).image, ld, body });
}

// ---------- Archive ----------
export function archive(site, origin) {
  const chapter = currentChapter(site);
  const chapters = [...site.collections].sort((a, b) => b.chapter - a.chapter || a.sort - b.sort);
  const body = `
<section class="band band-first band-ink">
  <div class="wrap">
    ${sectionHead(5, 'Archive', 'THE CHAPTERS / SO FAR.')}
    <p class="lead">Every design Stoic has made, in order. Archived pieces stay here as the record; they are not for sale.</p>
  </div>
</section>
${chapters.map((c) => {
    const pieces = visible(site).filter((p) => p.collection === c.slug);
    const live = pieces.filter((p) => p.status === 'available' || p.status === 'sold_out');
    const gone = pieces.filter((p) => p.status === 'archived');
    return `<section class="band chapter-band" id="${esc(c.slug)}" style="--accent:${esc(c.accent)}">
  <div class="wrap">
    <div class="split">
      <div class="split-text">
        <p class="chapter-n">${chapterLabel(c.chapter)}${c.release_date ? ` · ${esc(c.release_date)}` : ''}</p>
        <h2 class="statement statement-s"><span class="line"><span class="line-in">${esc(c.title)}</span></span></h2>
        <p class="state-line"><span class="state ${live.length ? 'state-now' : 'state-past'}">${live.length ? 'Available now' : c.status === 'archived' ? 'Past release · not for sale' : 'Not in the shop'}</span></p>
        <p class="lead">${esc(c.meaning)}</p>
        <div class="manifesto">${paragraphs(c.description)}</div>
        ${live.length ? `<p><a class="link" href="/shop?collection=${esc(c.slug)}">${live.length} piece${live.length === 1 ? '' : 's'} in the shop</a></p>` : ''}
      </div>
      <div class="split-pic">${frame({ image: c.images[0], alt: `${c.title} campaign`, ratio: '4/5', shot: `${c.title} campaign photo` })}</div>
    </div>
    ${gone.length ? `<p class="fine-caps">Past pieces, kept as the record. Not for sale.</p><div class="sheet sheet-3">${gone.map((p, i) => productCard(p, i + 1)).join('')}</div>` : ''}
  </div>
</section>`;
  }).join('')}`;
  return layout({ site, origin, page: 'archive', section: 'Archive', chapter, title: 'Archive', path: '/archive', description: 'The Stoic Soul Club archive: every chapter and design so far.', body });
}

// ---------- Story ----------
export function story(site, origin) {
  const s = site.settings;
  const chapter = currentChapter(site);
  // Only confirmed facts from the brand brief; the founders replace this text from the dashboard.
  const fallback = `Stoic Soul Club is an independent streetwear brand from Amman, started by three friends with Libyan, Iraqi and Jordanian-Palestinian roots.
The idea was always the same: people move through chapters, and there is pride in the one you are in, not only the one you are aiming for.
The first three designs, KAIZEN, TRANQUILITY and VENGEANCE, were made in 2024. Every piece carries a small bust on the chest and a large print on the back.
The three founders still make it together: the clothes, the photos and the words.`;
  const body = `
<section class="band band-first">
  <div class="wrap split">
    <div class="split-text">
      ${sectionHead(6, 'Story', 'STILL / BECOMING.')}
      <div class="manifesto story-text">${paragraphs(s.story_text || fallback)}</div>
      <p><a class="link" href="/archive">See every chapter</a></p>
    </div>
    <div class="split-pic">${frame({ image: s.story_image, alt: 'The people behind Stoic Soul Club', n: 1, ratio: '4/5', shot: 'The founders, together' })}</div>
  </div>
</section>
<section class="band band-paper">
  <div class="wrap">
    <div class="beliefs">
      <div><span class="sec-n">01</span><h3>Garment first</h3><p>The piece has to be wanted with the words covered up. The meaning is the second thing you notice.</p></div>
      <div><span class="sec-n">02</span><h3>Real people, real places</h3><p>No stock models, no AI. The photos are friends, in Amman: a gym, a rooftop, a painted wall.</p></div>
      <div><span class="sec-n">03</span><h3>Nobody has arrived</h3><p>The clothes are for people building something who have not finished yet, and do not pretend to have.</p></div>
      <div><span class="sec-n">04</span><h3>Warm, not cold</h3><p>Confidence without arrogance, discipline without cruelty. Belonging never requires buying.</p></div>
    </div>
  </div>
</section>`;
  return layout({ site, origin, page: 'story', section: 'Story', chapter, title: 'Our story', path: '/story', description: 'Where Stoic Soul Club comes from, who makes it, and what the chapters mean.', image: s.story_image, body });
}

// ---------- Contact ----------
export function contact(site, origin) {
  const s = site.settings;
  const chapter = currentChapter(site);
  const wa = s.whatsapp ? `https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent('Hello Stoic Soul Club! I have a question about ordering.')}` : '';
  const body = `
<section class="band band-first">
  <div class="wrap">
    ${sectionHead(7, 'Contact and ordering', 'HOW / IT WORKS.')}
    <ol class="steps">
      <li><span class="sec-n">01</span><h3>Pick a piece and a size</h3><p>Every product page shows the sizes that are left, with measurements laid flat.</p></li>
      <li><span class="sec-n">02</span><h3>Tap Order via WhatsApp</h3><p>WhatsApp opens with your inquiry already written: the piece, size, colour, price and your country. You send it yourself.</p></li>
      <li><span class="sec-n">03</span><h3>We confirm</h3><p>${esc(s.ordering_text)}</p></li>
      <li><span class="sec-n">04</span><h3>Pay and receive</h3><p>${esc(s.payment_text)}</p></li>
    </ol>
    <p class="cover-cta">${wa ? `<a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener" data-wa-general>Message us on WhatsApp</a>` : '<span class="btn" aria-disabled="true">WhatsApp line opening soon</span>'}${s.instagram ? `<a class="link" href="https://www.instagram.com/${esc(s.instagram)}/" target="_blank" rel="noopener">Instagram @${esc(s.instagram)}</a>` : ''}${s.contact_email ? `<a class="link" href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a>` : ''}</p>
  </div>
</section>
<section class="band band-paper">
  <div class="wrap policies">
    <div id="shipping"><h3>Delivery and shipping</h3><p>${esc(s.shipping_text)}</p></div>
    <div id="payment"><h3>Payment</h3><p>${esc(s.payment_text)}</p></div>
    <div id="swap"><h3>Size swaps and defects</h3><p>${esc(s.swap_text)}</p></div>
    <div id="privacy"><h3>Privacy</h3><p>This site sets no cookies and runs no third-party trackers. It counts page views and WhatsApp clicks without personal data. What you send on WhatsApp stays between you and Stoic Soul Club and is used only to handle your order.</p></div>
  </div>
</section>`;
  return layout({ site, origin, page: 'contact', section: 'Contact', chapter, title: 'Contact and ordering', path: '/contact', description: 'How to order Stoic Soul Club on WhatsApp, delivery inside Jordan, international inquiries, payment and size swaps.', body });
}
