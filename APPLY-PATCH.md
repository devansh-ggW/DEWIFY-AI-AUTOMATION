# DEWIFY AI AUTOMATION — Paddle checkout + scroll cinema patch

This patch adds the Paddle checkout/localized price preview and light scroll motion to the existing static GitHub Pages site.

## Files

- `paddle-scroll-upgrade.js` — initializes Paddle, shows Paddle's localized price preview, opens checkout, and coordinates scroll effects.
- `paddle-scroll-upgrade.css` — styles the local-price block, progress indicator, messages, and motion styling.
- `index.html.patch` — the exact one-line script-tag addition for the existing `index.html`.

## Apply to the repository

1. Upload `paddle-scroll-upgrade.js` and `paddle-scroll-upgrade.css` into the repository root, beside `index.html`, `script.js`, and `style.css`.
2. Open `index.html` and find this existing line near the bottom:

   ```html
   <script src="script.js" defer></script>
   ```

3. Add this line immediately after it:

   ```html
   <script src="paddle-scroll-upgrade.js" defer></script>
   ```

   The exact diff is provided in `index.html.patch`. The original repository `index.html` is not duplicated in the archive, so the rest of your page remains untouched.

4. Commit your changes and let GitHub Pages redeploy.
5. In Paddle, confirm the price is active and associated with the product, configure supported currency conversion/overrides, and approve your live domain.

## Fallback behavior

If localized price preview fails, checkout remains independently enabled and the page says to see the checkout for the final local price. If Paddle cannot initialize, the page logs a diagnostic and shows a support message when a purchase button is clicked. No fabricated exchange rate is used.

## Performance

The existing seven-scene hero film stays intact. Lower sections get one-time reveal effects and small requestAnimationFrame parallax. Reduced-motion and reduced-data preferences are respected; no WebGL, build step, or animation library is added.
