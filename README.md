# NomadDays

Next.js app for country/day counting and related nomad tools.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000`.

## Deploy on Netlify Free

This repo includes `netlify.toml` with a build command and Node version.

1. Push this repo to GitHub.
2. In Netlify, go to `Add new site` -> `Import an existing project`.
3. Pick your GitHub repo and keep defaults:
   - Build command: `npm run build`
   - Publish directory: leave empty for Next.js
4. Deploy.

## Connect Custom Domain

After first deploy:

1. Netlify dashboard -> `Site configuration` -> `Domain management` -> `Add domain`.
2. Add `nomaddayscalculator.com` and also add `www.nomaddayscalculator.com`.
3. At your registrar, set DNS:
   - `A` record for apex (`@`) -> Netlify load balancer IP from dashboard.
   - `CNAME` for `www` -> your Netlify subdomain (for example `your-site.netlify.app`).
4. In Netlify domain settings, set primary domain and enable `www` -> apex (or apex -> `www`) redirect.

## Launch Checklist

- Enable domain auto-renew at registrar.
- Enable domain lock + WHOIS privacy.
- Add GA4.
- Add Google Search Console + Bing Webmaster Tools.
- Add `robots.txt` and `sitemap.xml`.
- Add privacy policy and terms pages before monetization.
