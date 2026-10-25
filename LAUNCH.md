# Setting up and launching stoicsoulclub.com

Cloudflare sometimes renames buttons; pick the closest one. Steps 1 to 4 were done for the trial store; check them, then do 5 onwards.

## 1. The database (done for the trial)
**Storage & databases** → **D1 SQL database** → the database `stoic-db`. The site creates its tables and adds the new ones (collections, lookbooks, events) by itself on the first visit after a deployment. Trial orders stay in the old tables; nothing reads them any more.

## 2. The Pages project (done for the trial)
**Workers & Pages** → `stoic-soul-club`. Production branch `main`, build output directory `public`, no build command. Every push to `main` goes live in about a minute; other branches get a preview address under **Deployments** (for example `claude-project-thread-g52zzs.stoic-soul-club.pages.dev`).

## 3. Database binding (done for the trial)
Project → **Settings** → **Bindings**: D1 database, variable name `DB`, database `stoic-db`.

## 4. Staff password (done for the trial)
**Settings** → **Variables and Secrets**: secret `STAFF_PASSWORD` (12+ characters). Optional: a second secret `SESSION_SECRET` (any long random text) so that changing the password also logs everyone out.

## 5. Photo storage (new)
Uploads from the dashboard go to an R2 bucket.
1. Left menu: **Storage & databases** → **R2 object storage** → **Create bucket**. Name `stoic-images`, location automatic. (R2's free tier covers this site: 10 GB stored, no fee for serving.)
2. Project → **Settings** → **Bindings** → **Add** → **R2 bucket**. Variable name `IMAGES` (exactly), bucket `stoic-images`. Save.
3. **Deployments** → newest → **⋯** → **Retry deployment**.
Until this is done the dashboard's Upload buttons say so, and "Paste a link" still works.

## 6. Fill the site (Sanad, from the dashboard)
Follow [docs/EDITING.md](docs/EDITING.md). The minimum before launch:
- Site tab: the verified WhatsApp business number, the Instagram handle, the logo, the cover photo.
- Products: photos for every piece, stock per size checked against the shelf, materials.
- Chapters: a photo each; Lookbooks: the Chapter One shoot.

## 7. Test on the preview address
- Open `/api/health`: it should say `"database":"connected"`, `"content":"database"` and `"ordering":"on"`. If ordering is off, the WhatsApp number is not saved (dashboard, Site tab).
- On a phone: open a product, pick a size, tap **Order via WhatsApp**, check the message and the number it opens.
- Check a sold-out size cannot be chosen and a sold-out piece shows no order button.
- Open `/staff/` and change a stock number; reload the product page.
- Check the site with Reduce Motion on (iPhone: Settings → Accessibility → Motion).

## 8. Make it public (needs the founders' go-ahead)
1. Dashboard → Site → tick **Site is public** → Save. Rendered pages drop their `noindex`.
2. In the repo, remove the `X-Robots-Tag: noindex` line from `public/_headers` (it covers the static files) and push.
3. Submit `https://stoicsoulclub.com/sitemap.xml` in Google Search Console.

## 9. Connect stoicsoulclub.com (Namecheap)
In Cloudflare:
1. Project → **Custom domains** → **Set up a custom domain**. Type `stoicsoulclub.com`, **Continue**.
2. Cloudflare offers to move the domain's DNS to Cloudflare. Accept: it is free and the cleanest way to put a bare domain on Pages. It shows two **nameservers** (like `ana.ns.cloudflare.com`). Keep that page open.

In Namecheap:
1. **Domain List** → **Manage** next to `stoicsoulclub.com`.
2. **Nameservers** → **Custom DNS**, paste the two Cloudflare nameservers, click the green tick.

Back in Cloudflare, wait until the domain shows **Active** (minutes to a few hours). Add `www.stoicsoulclub.com` as a second custom domain. Turn on **Always Use HTTPS** in the zone's SSL/TLS settings. The padlock is added by itself.

If Stoic uses email at this domain (like hello@stoicsoulclub.com), say so before step 9 so the email records are copied across.

## Launch checklist
- [ ] WhatsApp number verified by sending a test inquiry from a customer's phone
- [ ] Instagram handle confirmed (@stoicsoulclub or @stoicsoul.club)
- [ ] Logo, cover photo and product photos uploaded (no placeholders left on the home page)
- [ ] Stock per size matches the shelf
- [ ] Delivery, payment and swap wording confirmed by the founders
- [ ] Shipping outside Jordan: only promised if it can be done
- [ ] Headline "FOR THE CHAPTER YOU'RE IN." confirmed
- [ ] Site public switch on, `_headers` noindex removed, sitemap submitted
- [ ] Domain active with HTTPS
