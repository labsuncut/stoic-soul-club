# Stoic Soul Club: the digital flagship

The website of Stoic Soul Club, the Amman streetwear brand (stoicsoulclub.com). It is built like a magazine issue, not a shop template: a cover, the drop as a contact sheet, chapters, lookbooks, the archive and the story. Orders are inquiries on WhatsApp; there is no cart or checkout.

Status: **preview**. The site stays `noindex` and the order line stays off until the founders approve the launch (see [LAUNCH.md](LAUNCH.md)).

## Pages
| Address | What it is |
| --- | --- |
| `/` | Cover, the drop (contact sheet), the philosophy, the current chapters, a lookbook strip |
| `/shop` | Every piece on sale, with sold-out pieces still shown |
| `/product/<name>` | One piece: photos, sizes, materials, the WhatsApp order button |
| `/lookbook`, `/lookbook/<name>` | Photoshoots and community photos, as film strips |
| `/archive` | Every chapter and every design ever made, for the record |
| `/story` | The brand's story in the founders' words |
| `/contact` | How ordering, delivery, payment and swaps work |
| `/staff/` | The dashboard Sanad and the founders use to run the site (password) |

Every page is rendered on the server from the database, so Google, WhatsApp link previews and AI search tools see the real text, prices and stock. Products carry schema.org `Product` and `Offer` data, lookbooks `ImageGallery`, and `/sitemap.xml` lists everything.

## How ordering works
1. The customer picks a size (and colour) that is in stock.
2. The button opens WhatsApp with the inquiry already written: product, variant, size, displayed price, destination country, link.
3. The customer sends it. Sanad confirms availability, delivery and the total. Nothing is reserved or paid on the site.

The WhatsApp number lives only in the dashboard (Site tab). When it is empty the button reads "Ordering opens soon". Clicks are counted as inquiries, never as sales.

## Layout
```
public/                 static files (no build step)
  assets/css/site.css   the public site's styles (fonts first, then the design)
  assets/css/staff.css  the dashboard's styles
  assets/js/site.js     menu, reveals, film strip, product gallery, the order message
  assets/js/staff.js    the dashboard
  assets/fonts/         Archivo, Instrument Serif, DM Sans (self-hosted)
  staff/index.html      the dashboard page
  404.html              not-found page
functions/              Cloudflare Pages Functions
  _lib/seed.js          starter content and default settings (no phone number in code)
  _lib/db.js            tables, migrations, settings, rate limit
  _lib/content.js       loads everything a page needs; falls back to seed.js without a database
  _lib/render.js        layout, frames, cards, film strip, headers (CSP, noindex)
  _lib/pages.js         the page templates
  index.js, shop.js, product/, lookbook/, archive.js, story.js, contact.js, sitemap.xml.js
  api/event.js          first-party, cookie-free counts (page views, WhatsApp clicks)
  api/staff/            dashboard API: login, products, variants, collections, lookbooks, settings, upload, overview
  img/[key].js          serves uploaded photos from the R2 bucket
docs/EDITING.md         how Sanad edits the site
LAUNCH.md               Cloudflare setup and launch checklist
```

## Run it on your computer
```
npm i -g wrangler
cp wrangler.local.toml wrangler.toml      # local bindings only; wrangler.toml is ignored by git
echo STAFF_PASSWORD=pick-a-password > .dev.vars
wrangler pages dev public --port 8788
```
Open http://localhost:8788 and http://localhost:8788/staff/. The local database and uploads live in `.wrangler/` and start with the seed content. Do not commit `wrangler.toml`: Cloudflare would read it and replace the production bindings.

## Rules this site keeps
- No invented facts: no made-up stories, reviews, countdowns, scarcity, prices in other currencies. Empty fields show honest placeholders ("Photo to come").
- No third-party scripts, no cookies, no tracking pixels. The counts in the dashboard are first-party and anonymous and can be switched off.
- `prefers-reduced-motion` is honoured; content never waits for an animation; no scroll hijacking; no heavy video on phones.
- Sold-out pieces stay visible without an order button. "Available" with every size at 0 shows as sold out by itself.
- Secrets (`STAFF_PASSWORD`) live in Cloudflare only.

## Content and credits
Starter products, prices, delivery terms and the size-swap rule come from the Stoic Soul Club brand brief and the founders' decisions during the trial store. After the first run the dashboard is the source of truth. Photos: none yet; the frames hold labelled placeholders until the brand's own photos are uploaded.
