# DEWIFY AI AUTOMATION website

A lightweight, static product website built with HTML, CSS, and vanilla JavaScript.

## Deploy to GitHub Pages

This site is a static bundle. It uses only HTML, CSS, vanilla JavaScript, and local assets; there is no build step, server, database, or required external API.

## Upload

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root. Keep `index.html` at the root and keep the `assets/` folder beside it.
3. Open **Settings → Pages** in GitHub.
4. Choose **Deploy from a branch**, select the branch containing these files, and select the repository root (`/`) as the folder.
5. Save and wait for GitHub Pages to publish the site.

All site links and animation assets use relative paths so the site works at both `username.github.io` and `username.github.io/repository/` project URLs. The homepage is a static seven-scene scroll film: no build step or runtime library is required.

## Configure the product CTA

Open `script.js` and set the one clearly marked value:

```js
const CHECKOUT_URL = 'https://your-verified-checkout-url.example';
```

Leave it as an empty string until the real checkout URL is verified. With an empty value, every toolkit CTA opens a message to `dewifystores@gmail.com` instead of pretending payment is configured.

## Before publishing

Replace the bracketed placeholders in `privacy.html`, `terms.html`, `refund.html`, and `contact.html` with the seller's actual legal and policy information. The supplied product ZIP did not provide a legal entity, address, jurisdiction, support hours, or final refund terms, so this site deliberately does not invent them.

The `assets/` folder includes the optimized toolkit cover, the supplied DEWIFY D-mark used throughout the site, local SVG brand marks for WhatsApp, Instagram, and Facebook, and a small cinematic loop. The toolkit cover opens in an accessible lightbox without cropping or stretching. Video playback is no longer scrub-seeked on each scroll frame, which avoids repeated decoder seeks. No CDN, npm install, or runtime service is required.
