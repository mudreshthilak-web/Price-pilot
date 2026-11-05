# Price Pilot: fixes and additions

## Search (the reported bugs)
- `src/lib/catalog.ts` (new): a real catalog of named products (current iPhone 17/18 lineup, Galaxy S26,
  Pixel, OnePlus, laptops, TVs, headphones, appliances). Add new models here.
- `src/lib/search.ts` (new): multi-word AND matching, category words ("phones", "laptop", "tv"),
  brand search, typo tolerance, budgets ("phones under 30000"), newest-first, brand mixing.
- Removed the code that invented "Generic"/"AudioTech" products for unknown queries.
- Fixed duplicate iPhone 15 entries, wrong retailer search URLs, and the 90-day history being pinned to a fixed date.

## New features (existing look unchanged)
- Search button and Enter key now work; arrow-key navigation; "See all N results"; no-results message; recent searches.
- New `/search` results page with sort (best match / newest / price) and brand filters; "New" badge on recent launches.

## Other bugs found and fixed
- Basket headline totals were hard-coded and disagreed with the rows below them. Now computed.
- Evaluation page showed invented "measured" accuracy figures and a hard-coded "7/7 tests". Now measured or marked "Not yet measured".
- Opening the Alerts page erased every saved alert (placeholder view overwrote storage). Fixed.
- Header overflowed 3px on phones, causing sideways scroll on every page. Fixed.
- Unknown product URLs now 404 instead of fuzzy-matching a different product.
- Stale search responses could overwrite newer ones; dropdown now closes on outside click.

## Deploy
`netlify.toml` pins Node 22 and regenerates `test-results.json` on every build. `.gitignore` added.
Run `npm test` (30 tests) and `npm run build` before deploying.
