# Launch steps: stoicsoulclub.com

About 20 minutes. Do them in order. Cloudflare sometimes renames buttons; pick the closest one.

## 1. Make the database
1. Log in at dash.cloudflare.com.
2. Left menu: **Storage & databases**, then **D1 SQL database**, then **Create database**.
3. Name it `stoic-db`. Click **Create**.
   (This is where orders, products and stock live. The site builds its tables and sample products by itself the first time it runs.)

## 2. Put the site on Cloudflare
1. Left menu: **Workers & Pages**, then **Create**, then the **Pages** tab.
2. **Import an existing Git repository**, choose **GitHub**, and allow Cloudflare to see the `stoic-soul-club` repo.
3. Select `stoic-soul-club`, click **Begin setup**:
   - Project name: `stoic-soul-club`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: leave empty
   - Build output directory: `public`
4. **Save and Deploy**. You get a free address like `stoic-soul-club.pages.dev`.

## 3. Connect the database
Project, then **Settings**, then **Bindings**, then **Add**, then **D1 database**. Variable name `DB` (exactly), database `stoic-db`. Save.

## 4. Set the staff password
**Settings**, then **Variables and Secrets**, then **Add**. Type **Secret**, name `STAFF_PASSWORD`, value 12+ characters. Save it in your password manager.

## 5. Redeploy
**Deployments** tab, newest deployment, **⋯**, then **Retry deployment**.

## 6. Test on the free address
1. On your phone, open the `.pages.dev` address. Buy something with cash on delivery, and something with the test card `4242 4242 4242 4242`.
2. Open `/staff/`, log in, and walk an order through packed, on the way, delivered.
3. In **Settings** on the dashboard, add the Stoic WhatsApp number.

## 7. Connect stoicsoulclub.com (Namecheap)
In Cloudflare:
1. Project, then **Custom domains**, then **Set up a custom domain**. Type `stoicsoulclub.com`, **Continue**.
2. Cloudflare will offer to move the domain's DNS to Cloudflare. Accept: it is free and is the cleanest way to put a bare domain (no `www`) on Pages. It shows two **nameservers** (like `ana.ns.cloudflare.com`). Keep that page open.

In Namecheap:
1. **Domain List**, then **Manage** next to `stoicsoulclub.com`.
2. Under **Nameservers**, choose **Custom DNS**, paste the two Cloudflare nameservers, and click the green tick.

Back in Cloudflare, wait until the domain shows **Active** (minutes to a few hours). Then add `www.stoicsoulclub.com` as a second custom domain too. The padlock (HTTPS) is added by itself.

Note: if Stoic uses email at this domain (like hello@stoicsoulclub.com), tell Claude before step 7 so the email records are copied across.

## How updates go live
Every change pushed to `main` goes live in about a minute. Other branches get their own preview address under **Deployments**.
