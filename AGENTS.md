# AGENTS.md — Bagawan Brothers website (notes for Codex / AI helpers)

The site is **built and working**. Your job is maintenance: small edits, new sections, content changes. Keep what exists; do not re-scaffold (no Vite/React/Tailwind — it is intentionally plain static files).

## Owner's rules (always follow)

1. **Mobile first.** Phones are the main screen; desktop is second. Base CSS = phone; bigger screens are added with `@media (min-width: …)`. Test at **360×740 and 390×844 first**, then 768 and 1440. No horizontal scroll at any width.
2. **Bright, mixed colours. Never dark.** No dark/black section backgrounds, no dark theme. Sections use the bright palette tokens in `styles.css` (`--lime`, `--sky`, `--peach`, `--lilac`, `--cream`, `--lemon`, `--pink`). Dark ink is only for text.
3. **Minimal text, fancy type.** Headings 2–6 words; one-sentence supporting lines. One accent word per heading in `<em>` (Instrument Serif italic).
4. Thumb-sized tap targets (≥ 48px; main buttons 56px). Vertical scrolling only (except the hero swipe). Give things space.

## How it works

- `site/` is the whole website (static; opens straight from disk too). Deploy = upload the `site` folder (Netlify Drop).
- **4 pages:** `index.html` (Home: hero slider + teasers), `lemons.html` (all variety cards + size/packing), `about.html` (Lemon City, numbers, why us, farm-to-counter), `order.html` (steps + enquiry form). Pages link with relative hrefs (`lemons.html`), so they also work from disk.
- **Shared blocks:** the icon sprite, header + phone menu, and footer + WhatsApp button live between `<!--bb:sprite-->`, `<!--bb:header-->`, `<!--bb:footer-->` markers. Edit them in `index.html` only; the build copies them to the other pages and marks the current page (`aria-current="page"`). A new page = copy an inner page, keep the markers, add it to the nav in `index.html`, run the build.
- **Lemon cards** are written by the build between `<!--bb:cards-home-->` (first 4, Home) and `<!--bb:cards-all-->` (Lemons page). Don't hand-edit inside those markers.
- `site/assets/js/config.js` — business name, WhatsApp number, Web3Forms key, `SITE_URL`, image folder, featured variety, autoplay seconds.
- `site/assets/js/varieties.js` — **auto-generated, never edit by hand.** Made by `scripts/build.mjs` from photos in `../Image` (file name = variety name).
- `lemons.json` — optional per-variety overrides: `tagline`, `badge`, `order`, `hide`, `bg` (bg only for transparent cut-outs).
- `scripts/build.mjs` (run via `update-lemons.bat` or `npm run build`): optimises photos with sharp (webp 480/960/1400 + thumbs), reads each photo's background colour so the hero colour matches it, picks readable text colour, copies fonts, makes icons + `og.jpg` (from `scripts/og-template.svg`), and writes settings into `index.html` between `<!--bb:…-->` markers and the `/*bb:style*/` block. Don't remove those markers.
- `scripts/preview.mjs` (`preview.bat` / `npm run preview`): local server + LAN link for phone testing.
- `site/assets/js/main.js` — no libraries. Header state, full-screen phone menu (inert/focus handled), hero slider (colour theme via CSS vars on `:root`, title roll, product swap, floating slices, autoplay with pause button, swipe, keyboard), scroll reveals + word-split headings, form (validation, Web3Forms JSON POST, live WhatsApp link, success state), footer wordmark fit.
- `site/assets/css/styles.css` — tokens at the top; hero block; coloured sections (`.origin`, `.why`, `.supply`, `.how`, `.order`, `.picks`, `.range`, `.specs`, `.numbers`, `.journey`, `.cta` each set `--sec-bg`, `--accent`, `--dot`); sections overlap with rounded tops (`--overlap`, `--round`); `.page-hero` = coloured top of inner pages (`--lemons`, `--about`, `--order`); `.vcard` = lemon cards.

## Form

- Web3Forms: POST JSON to `https://api.web3forms.com/submit` with `access_key` from config. Mail goes to the email tied to the key. **Never put the owner's email address in the HTML/JS.**
- "Send on WhatsApp" is a real `<a>` whose `wa.me` link updates live from the form fields.
- Honeypot field `botcheck` (hidden) — keep it.

## Don'ts

- Don't deploy anything to or change **maktaba.rouf.in** — that is the owner's separate Maktaba app. The lemon site uses its own address (e.g. `bagawan.rouf.in`, set in `config.js`).
- Don't use images without a clear licence; CC BY / BY-SA images need visible credit. Don't generate or add fake "photos" (drawn shapes) as product images.
- Don't claim GI status, certifications or origins the owner hasn't confirmed. Foreign varieties (Eureka, Lisbon, Meyer…) are not grown in Indi — no origin claims on those slides.
- Don't add dark colours, heavy libraries, or tracking scripts.

## Checks before you finish

`npm run build` → no errors. Open **every page** at 360px and 390px: hero fits one screen, swipe works, menu opens/closes and goes to each page, current page is marked, lemon cards show, form on `order.html` shows errors and the success state (you can mock the Web3Forms request), no console errors, no horizontal scroll. Then check 1440px.
