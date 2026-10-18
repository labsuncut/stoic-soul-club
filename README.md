# Stoic Soul Club store (trial)

Weezy's clothing-store trial: a real online shop for Stoic Soul Club at stoicsoulclub.com, run like a paying client for two weeks. The lessons feed the Levorchy build.

## What's in it
- **Shop** (`public/`): home, collection with filters, product pages, bag and checkout, Arabic and English.
- **Payments**: cash on delivery, CliQ transfer (staff confirm it arrived), plus card payment in **test mode** (practice card `4242 4242 4242 4242`; `4000 0000 0000 0002` is declined). No real money moves.
- **Back end** (`functions/`): Cloudflare Pages Functions with a D1 database. Prices and stock are checked on the server; stock can't oversell.
- **Staff dashboard** at `/staff/`: today's numbers, orders (to pack, packed, on the way, delivered), WhatsApp messages to customers, products, stock per size, delivery fees, shop open/closed, CSV export.
- **SEO and AI search**: product pages are filled in on the server with title, description, price and stock (schema.org `Product`), plus `/sitemap.xml`. The whole site is `noindex` during the trial (see `public/_headers`).

## Layout
```
public/               static pages, CSS, JS (no build step)
  staff/              staff dashboard
functions/_lib/       database, order logic, login, helpers
functions/api/        shop API (products, checkout, order, test payment)
functions/api/staff/  staff API (password protected)
functions/product/    server-filled product pages
tools/pages.py        regenerates the HTML pages' shared header and footer
```

## Run it on your computer
```
npm i -g wrangler
echo STAFF_PASSWORD=pick-a-password > .dev.vars
wrangler pages dev public --d1 DB=stoic-local
```
Open http://localhost:8788 and http://localhost:8788/staff/.

## Going live
See [LAUNCH.md](LAUNCH.md).

## Content
Products, prices, stock, delivery terms and the size-swap rule come from the Stoic Soul Club brand brief (founder decisions D-007 to D-012). The starter stock only fills an empty database; after that the staff dashboard is the source of truth.
Still open: brand colours, fonts, logo and product photos (grey placeholders for now), and a native check of the Arabic copy. CliQ appears at checkout once the alias is set in the dashboard. Real card payments need a payment provider account (PayTabs or HyperPay in Jordan).
