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
<div class="ribbon" data-i18n="ribbon">Test store: card payments are practice only and no money is taken. Products shown are samples.</div>
<div class="notice" id="notice" hidden></div>
<header class="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="{name} home">Stoic</a>
    <nav class="nav" aria-label="Main">
      <a href="/shop" data-i18n="nav.shop">Shop</a>
      <a href="/shop?c=tops" data-i18n="nav.tops">Tops</a>
      <a href="/shop?c=bottoms" data-i18n="nav.bottoms">Bottoms</a>
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
    <a href="/shop?c=tops" data-i18n="nav.tops">Tops</a>
    <a href="/shop?c=bottoms" data-i18n="nav.bottoms">Bottoms</a>
    <a href="/help" data-i18n="nav.help">Help</a>
  </nav>
</header>
<main id="main">
"""

FOOT = """</main>
<footer class="foot">
  <div class="wrap">
    <div>
      <a class="logo" href="/">Stoic</a>
      <p data-i18n="foot.tag">Quiet clothes for a steady mind. Amman, Jordan.</p>
    </div>
    <div>
      <h4 data-i18n="foot.shop">Shop</h4>
      <ul>
        <li><a href="/shop" data-i18n="shop.all">All</a></li>
        <li><a href="/shop?c=tops" data-i18n="nav.tops">Tops</a></li>
        <li><a href="/shop?c=bottoms" data-i18n="nav.bottoms">Bottoms</a></li>
        <li><a href="/shop?c=outerwear" data-i18n="nav.outer">Outerwear</a></li>
        <li><a href="/shop?c=accessories" data-i18n="nav.acc">Accessories</a></li>
      </ul>
    </div>
    <div>
      <h4 data-i18n="foot.help">Help</h4>
      <ul>
        <li><a href="/help#delivery" data-i18n="foot.delivery">Delivery</a></li>
        <li><a href="/help#returns" data-i18n="foot.returns">Exchanges and returns</a></li>
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
 "paymentAccepted":"Cash, Credit Card","address":{"@type":"PostalAddress","addressLocality":"Amman","addressCountry":"JO"}}
</script>
"""

PAGES = {
  "index.html": dict(path="/", page="home", title=f"{NAME} · Clothing in Amman, delivered across Jordan",
    desc="Stoic Soul Club: quiet, well-made everyday clothing from Amman. Delivery across Jordan, cash on delivery or card.",
    extra=ORG_LD, body="""
<section class="hero">
  <div class="wrap">
    <div>
      <p class="eyebrow" data-i18n="hero.eyebrow">Stoic Soul Club · Amman</p>
      <h1 data-i18n="hero.title">Quiet clothes for a steady mind.</h1>
      <p class="lead" data-i18n="hero.lead">Well-made everyday pieces, without the noise. Delivered across Jordan, pay on delivery.</p>
      <a class="btn" href="/shop" data-i18n="hero.cta">Shop the collection</a>
    </div>
    <div class="art hero-art" style="--tone:#2f2d29"><span aria-hidden="true">Stoic</span></div>
  </div>
</section>
<div class="promise">
  <div><b data-i18n="p.delivery">Delivery across Jordan</b><span data-i18n="p.deliveryD">Amman in 1 to 3 working days</span></div>
  <div><b data-i18n="p.cod">Cash on delivery</b><span data-i18n="p.codD">Or pay online by card</span></div>
  <div><b data-i18n="p.returns">Easy exchanges</b><span data-i18n="p.returnsD">Within 7 days of delivery</span></div>
</div>
<section class="block">
  <div class="wrap">
    <div class="block-head"><h2 data-i18n="home.featured">Selected pieces</h2><a href="/shop" data-i18n="home.all">See everything</a></div>
    <div class="grid" id="featured"><p class="fine" data-i18n="shop.loading">Loading…</p></div>
  </div>
</section>
"""),
  "shop.html": dict(path="/shop", page="shop", title=f"Shop · {NAME}",
    desc="Shop the Stoic Soul Club collection: tops, bottoms, outerwear and accessories. Delivery across Jordan.",
    extra="", body="""
<section class="block" style="padding-top:40px">
  <div class="wrap">
    <h1 style="font-size:clamp(32px,5vw,52px)" data-i18n="shop.title">The collection</h1>
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
  "about.html": dict(path="/about", page="about", title=f"About · {NAME}", desc="The story behind Stoic Soul Club.", extra="", body="""
<div class="wrap"><article class="prose">
  <p class="eyebrow">Stoic Soul Club</p>
  <h1>About Stoic</h1>
  <p class="draft">Draft page. Stoic's own story, founders and values go here once the brand brief arrives.</p>
</article></div>
"""),
  "help.html": dict(path="/help", page="help", title=f"Help · {NAME}", desc="Delivery, exchanges, privacy and terms at Stoic Soul Club.", extra="", body="""
<div class="wrap"><article class="prose">
  <h1>Help</h1>
  <p class="draft">Draft policies for the trial store. Stoic must confirm every fee, time and rule before real customers order.</p>
  <h2 id="delivery">Delivery</h2>
  <p>We deliver across Jordan. Fees by area are shown at checkout. Amman orders usually arrive in 1 to 3 working days.</p>
  <h2 id="returns">Exchanges and returns</h2>
  <p>Wrong size? Message us within 7 days of delivery and we'll swap it, as long as the piece is unworn with its tags on.</p>
  <h2 id="track">Your order</h2>
  <p>After checkout you get a private order page. Bookmark it to follow your order from received to delivered.</p>
  <h2 id="privacy">Privacy</h2>
  <p>We collect your name, phone, email (if you give it) and address only to deliver your order and contact you about it. We do not sell your details or use advertising trackers. Card details are handled by the payment provider, never stored by us. To see or delete your details, message us.</p>
  <h2 id="terms">Terms</h2>
  <p>Prices are in Jordanian dinars. An order is confirmed when you receive your order page. If an item turns out to be unavailable, we contact you and refund anything paid for it.</p>
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
