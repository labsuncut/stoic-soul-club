"""Writes the shop's HTML pages with one shared header and footer.
Run `python3 tools/pages.py` after changing the header, footer or a page body.
The output is plain HTML in public/, so the site itself has no build step."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
NAME = "Stoic Soul Club"
SITE = "https://stoicsoulclub.com"

HEAD = """<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{site}{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{name}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}{path}">
<meta name="theme-color" content="#1b1b19">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css">
{extra}</head>
<body data-page="{page}">
<a class="skip" href="#main" data-i18n="skip">Skip to content</a>
<div class="ribbon" data-i18n="ribbon">Preview store: card payments are practice only and no money is taken.</div>
<div class="notice" id="notice" hidden></div>
<header class="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="{name} home"><svg width="22" height="18" viewBox="0 0 44 36" aria-hidden="true"><path fill="#6888A0" d="M22 18C18 6 8 0 3 3s0 14 8 15c-7 3-8 12-2 14s11-6 13-14c2 8 7 16 13 14s5-11-2-14c8-1 13-12 8-15S26 6 22 18z"/></svg><span>Stoic Soul Club</span></a>
    <nav class="nav" aria-label="Main">
      <a href="/shop" data-i18n="nav.shop">Shop</a>
      <a href="/shop?c=tees" data-i18n="nav.tees">Tees</a>
      <a href="/shop?c=hoodies" data-i18n="nav.hoodies">Hoodies</a>
      <a href="/about" data-i18n="nav.about">About</a>
      <a href="/help" data-i18n="nav.help">Help</a>
    </nav>
    <div class="tools">
      <button class="tool" id="lang-toggle" type="button" lang="ar">عربي</button>
      <a class="tool" href="/bag"><span data-i18n="nav.bag">Bag</span> <span class="bag-count" hidden>0</span></a>
    </div>
  </div>
  <nav class="mobile-nav" aria-label="Main">
    <a href="/shop" data-i18n="nav.shop">Shop</a>
    <a href="/shop?c=tees" data-i18n="nav.tees">Tees</a>
    <a href="/shop?c=hoodies" data-i18n="nav.hoodies">Hoodies</a>
    <a href="/help" data-i18n="nav.help">Help</a>
  </nav>
</header>
<main id="main">
"""

FOOT = """</main>
<footer class="foot">
  <div class="wrap">
    <div>
      <a class="logo" href="/"><svg width="22" height="18" viewBox="0 0 44 36" aria-hidden="true"><path fill="#6888A0" d="M22 18C18 6 8 0 3 3s0 14 8 15c-7 3-8 12-2 14s11-6 13-14c2 8 7 16 13 14s5-11-2-14c8-1 13-12 8-15S26 6 22 18z"/></svg><span>Stoic Soul Club</span></a>
      <p data-i18n="foot.tag">100% cotton streetwear from Amman.</p>
      <p><a href="https://www.instagram.com/stoicsoul.club/" rel="noopener">Instagram @stoicsoul.club</a></p>
    </div>
    <div>
      <h4 data-i18n="foot.shop">Shop</h4>
      <ul>
        <li><a href="/shop" data-i18n="shop.all">All</a></li>
        <li><a href="/shop?c=tees" data-i18n="nav.tees">Tees</a></li>
        <li><a href="/shop?c=hoodies" data-i18n="nav.hoodies">Hoodies</a></li>
      </ul>
    </div>
    <div>
      <h4 data-i18n="foot.help">Help</h4>
      <ul>
        <li><a href="/help#delivery" data-i18n="foot.delivery">Delivery</a></li>
        <li><a href="/help#returns" data-i18n="foot.returns">Size swaps</a></li>
        <li><a href="/help#privacy" data-i18n="foot.privacy">Privacy</a></li>
        <li><a href="/help#terms" data-i18n="foot.terms">Terms</a></li>
      </ul>
    </div>
  </div>
</footer>
<script src="/assets/js/i18n.js"></script>
<script src="/assets/js/app.js"></script>
</body>
</html>
"""

ORG_LD = """<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ClothingStore","name":"Stoic Soul Club","url":"https://stoicsoulclub.com/",
 "logo":"https://stoicsoulclub.com/assets/img/favicon.svg","areaServed":"JO","currenciesAccepted":"JOD",
 "paymentAccepted":"Cash, CliQ","sameAs":["https://www.instagram.com/stoicsoul.club/"],"address":{"@type":"PostalAddress","addressLocality":"Amman","addressCountry":"JO"}}
</script>
"""

PAGES = {
  "index.html": dict(path="/", page="home", title=f"{NAME} · Streetwear tees and hoodies, Amman",
    desc="Stoic Soul Club: heavyweight 100% cotton tees and hoodies with big back prints. Free delivery in Amman, 3 JOD across Jordan. Pay cash or CliQ.",
    extra=ORG_LD, body="""
<section class="hero">
  <div class="wrap">
    <div>
      <p class="eyebrow" data-i18n="hero.eyebrow">Stoic Soul Club · Chapter One</p>
      <h1 data-i18n="hero.title">Three designs. 48 pieces.</h1>
      <p class="lead" data-i18n="hero.lead">Heavy cotton tees and hoodies with a big back print. Free delivery in Amman, pay cash or CliQ.</p>
      <a class="btn" href="/shop" data-i18n="hero.cta">Shop Chapter One</a>
    </div>
    <div class="art hero-art" style="--tone:#2f2d29"><span aria-hidden="true">Stoic</span></div>
  </div>
</section>
<div class="promise">
  <div><b data-i18n="p.delivery">Free delivery in Amman</b><span data-i18n="p.deliveryD">3 JOD to the rest of Jordan</span></div>
  <div><b data-i18n="p.cod">Cash or CliQ</b><span data-i18n="p.codD">Pay when it arrives, or by CliQ</span></div>
  <div><b data-i18n="p.returns">7-day size swap</b><span data-i18n="p.returnsD">Unworn, tags on</span></div>
</div>
<section class="drop" id="drop" hidden>
  <div class="wrap">
    <div>
      <p class="eyebrow" data-i18n="drop.eyebrow">Early access · Sat 24 Oct, 8pm</p>
      <h2 data-i18n="drop.title">Get Chapter One a day early.</h2>
      <p data-i18n="drop.lead">The early-access list shops on Saturday at 8pm, a day before everyone else. Leave your WhatsApp or email and we'll message you the moment it opens.</p>
    </div>
    <form id="drop-form" novalidate>
      <label for="drop-contact" data-i18n="drop.label">WhatsApp number or email</label>
      <div class="drop-row">
        <input id="drop-contact" name="contact" type="text" inputmode="email" autocomplete="tel" placeholder="079 123 4567" required>
        <button class="btn" type="submit" data-i18n="drop.btn">Notify me</button>
      </div>
      <input class="sr-only" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="fine" id="drop-msg" aria-live="polite"><span data-i18n="drop.or">Or DM "CHAPTER" to</span> <a href="https://www.instagram.com/stoicsoul.club/" rel="noopener">@stoicsoul.club</a></p>
    </form>
  </div>
</section>
<section class="block">
  <div class="wrap">
    <div class="block-head"><h2 data-i18n="home.featured">The pieces</h2><a href="/shop" data-i18n="home.all">See everything</a></div>
    <div class="grid" id="featured"><p class="fine" data-i18n="shop.loading">Loading…</p></div>
  </div>
</section>
"""),
  "shop.html": dict(path="/shop", page="shop", title=f"Shop · {NAME}",
    desc="Shop Stoic Soul Club Chapter One: KAIZEN, TRANQUILITY and VENGEANCE tees and hoodies. Free delivery in Amman.",
    extra="", body="""
<section class="block" style="padding-top:40px">
  <div class="wrap">
    <h1 style="font-size:clamp(32px,5vw,52px)" data-i18n="shop.title">Chapter One</h1>
    <div class="filters" id="filters" role="group" aria-label="Category"></div>
    <div class="grid" id="grid"><p class="fine" data-i18n="shop.loading">Loading…</p></div>
  </div>
</section>
"""),
  "product-template.html": dict(path="/shop", page="product", title=f"{NAME}",
    desc="Stoic Soul Club", extra="<!--PRODUCT-HEAD-->", body="""
<div class="wrap">
  <nav class="crumbs"><a href="/shop" data-i18n="nav.shop">Shop</a> / <span id="crumb"></span></nav>
  <div class="pdp" id="pdp"><p class="fine" data-i18n="shop.loading">Loading…</p></div>
</div>
"""),
  "bag.html": dict(path="/bag", page="bag", title=f"Your bag · {NAME}", desc="Your bag and checkout.", extra="", body="""
<div class="wrap">
  <div id="bag-empty" class="empty" hidden>
    <p data-i18n="bag.empty">Your bag is empty.</p>
    <a class="btn" href="/shop" data-i18n="bag.continue">Continue shopping</a>
  </div>
  <div id="bag-full" hidden>
    <form class="checkout" id="checkout">
      <div>
        <h1 style="font-size:36px" data-i18n="bag.title">Your bag</h1>
        <ul class="lines" id="lines"></ul>
        <h2 style="font-size:24px;margin-top:36px" data-i18n="co.details">Your details</h2>
        <div class="field"><label for="name" data-i18n="co.name">Full name</label><input id="name" name="name" type="text" autocomplete="name" required maxlength="80"></div>
        <div class="row2">
          <div class="field"><label for="phone" data-i18n="co.phone">Phone or WhatsApp</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="07X XXX XXXX"></div>
          <div class="field"><label for="email" data-i18n="co.email">Email (optional)</label><input id="email" name="email" type="email" autocomplete="email"></div>
        </div>
        <div class="field"><label for="zone" data-i18n="co.zone">Delivery area</label><select id="zone" name="zone" required></select></div>
        <div class="field"><label for="address" data-i18n="co.address">Address (area, street, building number)</label><textarea id="address" name="address" autocomplete="street-address" required maxlength="300"></textarea></div>
        <div class="field"><label for="note" data-i18n="co.note">Delivery note (optional)</label><input id="note" name="note" type="text" maxlength="300"></div>
        <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
        <h2 style="font-size:24px;margin-top:28px" data-i18n="co.pay">Payment</h2>
        <label class="choice" id="opt-cod"><input type="radio" name="payment" value="cod" checked><span><span data-i18n="co.cod">Cash on delivery</span><small data-i18n="co.codD">Pay in cash when your order arrives.</small></span></label>
        <label class="choice" id="opt-cliq" hidden><input type="radio" name="payment" value="cliq"><span><span data-i18n="co.cliq">CliQ</span><small data-i18n="co.cliqD">Transfer by CliQ after you place the order.</small></span></label>
        <label class="choice" id="opt-card"><input type="radio" name="payment" value="card"><span><span data-i18n="co.card">Card (test)</span><small data-i18n="co.cardD">Visa or Mastercard. In this test store only a practice card works.</small></span></label>
      </div>
      <aside class="panel">
        <h2 data-i18n="co.summary">Summary</h2>
        <div class="sum"><span data-i18n="co.subtotal">Subtotal</span><span id="sub">—</span></div>
        <div class="sum"><span data-i18n="co.delivery">Delivery</span><span id="fee">—</span></div>
        <div class="sum total"><span data-i18n="co.total">Total</span><span id="total">—</span></div>
        <p class="fine" id="free-note"></p>
        <button class="btn block" id="place" type="submit" data-i18n="co.place">Place order</button>
        <p class="msg" id="co-msg" role="status"></p>
        <p class="fine"><span data-i18n="co.privacy">We use your details only to deliver your order and contact you about it.</span> <a href="/help#privacy" data-i18n="foot.privacy">Privacy</a></p>
      </aside>
    </form>
  </div>
</div>
"""),
  "pay/index.html": dict(path="/pay/", page="pay", title=f"Pay · {NAME}", desc="Card payment.", extra='<meta name="robots" content="noindex">\n', body="""
<div class="wrap">
  <div class="paybox panel">
    <h1 style="font-size:30px" data-i18n="pay.title">Pay by card</h1>
    <p id="pay-total" class="fine"></p>
    <div class="testcard"><span data-i18n="pay.test">This is a practice payment page. No money is taken.</span><br>
      Success: <code>4242 4242 4242 4242</code><br>Declined: <code>4000 0000 0000 0002</code><br>Any future date, any 3 digits.</div>
    <form id="payform">
      <div class="field"><label for="card" data-i18n="pay.card">Card number</label><input id="card" type="text" inputmode="numeric" autocomplete="off" required placeholder="4242 4242 4242 4242"></div>
      <div class="row2">
        <div class="field"><label for="exp" data-i18n="pay.exp">Expiry</label><input id="exp" type="text" inputmode="numeric" autocomplete="off" placeholder="12/30"></div>
        <div class="field"><label for="cvc" data-i18n="pay.cvc">Security code</label><input id="cvc" type="text" inputmode="numeric" autocomplete="off" placeholder="123"></div>
      </div>
      <button class="btn block" id="pay-btn" type="submit" data-i18n="pay.btn">Pay now</button>
      <p class="msg" id="pay-msg" role="status"></p>
    </form>
  </div>
</div>
"""),
  "order/index.html": dict(path="/order/", page="order", title=f"Your order · {NAME}", desc="Order status.", extra='<meta name="robots" content="noindex">\n', body="""
<div class="wrap"><div class="track" id="order"><p class="fine" data-i18n="shop.loading">Loading…</p></div></div>
"""),
  "about.html": dict(path="/about", page="about", title=f"About · {NAME}", desc="Stoic Soul Club is streetwear for people building something who have not arrived yet.", extra="", body="""
<div class="wrap"><article class="prose">
  <p class="eyebrow">Stoic Soul Club</p>
  <h1>Pride in becoming.</h1>
  <p>Stoic Soul Club is an independent streetwear brand from Amman, started by friends with Libyan, Iraqi and Jordanian-Palestinian roots.</p>
  <p>We make clothes for people building something: a degree, a body, a business, a craft. People who have not arrived yet and don't pretend they have. Your circumstances don't decide your future, and there is pride in the chapter you are in.</p>
  <p>The clothes come first. Heavy 100% cotton, cut big, with a back print you'll want people to see. Three designs in Chapter One:</p>
  <p><b>KAIZEN</b> is getting a little better every day. <b>TRANQUILITY</b> is calm and perspective. <b>VENGEANCE</b> is adversity turned into fuel.</p>
  <p>Say hi on Instagram: <a href="https://www.instagram.com/stoicsoul.club/" rel="noopener">@stoicsoul.club</a>.</p>
</article></div>
"""),
  "help.html": dict(path="/help", page="help", title=f"Help · {NAME}", desc="Delivery, payment, size swaps, privacy and terms at Stoic Soul Club.", extra="", body="""
<div class="wrap"><article class="prose">
  <h1>Help</h1>
  <div class="ask">
    <h2 data-i18n="ask.title">Fastest answer: message us</h2>
    <p data-i18n="ask.lead">Sizes, delivery, an order: send us a message and one of us replies.</p>
    <div class="ask-btns">
      <a class="btn" id="ask-wa" href="#" hidden data-i18n="ask.wa">WhatsApp us</a>
      <a class="btn ghost" href="https://www.instagram.com/stoicsoul.club/" rel="noopener" data-i18n="ask.ig">Instagram DM</a>
    </div>
  </div>
  <h2 id="delivery">Delivery</h2>
  <p>Free inside Amman: one of us brings it to you. Anywhere else in Jordan, 3 JOD by courier. We message you on WhatsApp to arrange the time.</p>
  <h2 id="payment">Payment</h2>
  <p>Pay cash when your order arrives, or by CliQ. After you order, your order page shows the CliQ alias and the number to write in the note.</p>
  <h2 id="returns">Size swaps and defects</h2>
  <p>Wrong size? Message us within 7 days of delivery and we'll swap it, as long as it's unworn with the tags on. The swap delivery is on you. If something arrives with a defect, we replace it for free.</p>
  <h2 id="track">Your order</h2>
  <p>After checkout you get a private order page. Bookmark it to follow your order from received to delivered.</p>
  <h2 id="privacy">Privacy</h2>
  <p>We collect your name, phone, email (if you give it) and address only to deliver your order and contact you about it. We don't sell your details and we don't use advertising trackers. To see or delete your details, message us.</p>
  <h2 id="terms">Terms</h2>
  <p>Prices are in Jordanian dinars. If a piece turns out to be unavailable after you order, we contact you and refund anything you paid for it.</p>
</article></div>
"""),
  "404.html": dict(path="/404", page="404", title=f"Page not found · {NAME}", desc="Page not found.", extra='<meta name="robots" content="noindex">\n', body="""
<div class="wrap"><div class="empty"><h1 data-i18n="nf.title">This page doesn't exist.</h1><a class="btn" href="/shop" data-i18n="nf.back">Back to the shop</a></div></div>
"""),
}

for name, p in PAGES.items():
    out = ROOT / name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(HEAD.format(site=SITE, name=NAME, **{k: v for k, v in p.items() if k != "body"}) + p["body"].lstrip("\n") + FOOT)
    print("wrote", out.relative_to(ROOT))
