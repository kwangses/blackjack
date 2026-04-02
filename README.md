# Blackjack PWA

Casino-style Blackjack with 5 rule variants (Vegas Strip, Atlantic City, European, Vegas Downtown, Single Deck).  
Offline-capable PWA — works without internet after the first visit.

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Vercel will issue a URL like `https://blackjack-xxx.vercel.app`.

## iPhone — Add to Home Screen

1. Open the Vercel URL in **Safari**
2. Tap the Share button → **Add to Home Screen**
3. Tap **Add** — the icon appears on your home screen
4. Launch from home screen for full-screen, offline play ✅

## Project Structure

```
/
├── index.html      # Complete single-file app (game logic + UI)
├── manifest.json   # PWA manifest (name, icons, display mode)
├── sw.js           # Service worker — cache-first offline strategy
├── icon-192.png    # Home screen icon (192×192)
├── icon-512.png    # Splash / store icon (512×512)
├── vercel.json     # Vercel SPA rewrite rule
└── README.md
```

## Game Features

- **5 Rule Variants** — Vegas Strip, Atlantic City, European (ENHC), Vegas Downtown, Single Deck
- **Full Blackjack Actions** — Hit, Stand, Double Down, Split (multi-hand), Surrender, Insurance
- **Hi-Lo Card Counting** — Running count, true count, decks remaining (toggle in Settings)
- **Session Stats** — Hands played, win rate, streak, net P&L, and more
- **Chip Denominations** — $5 / $25 / $100 / $500 (realistic casino-chip styling)
- **Keyboard Shortcuts** — H (Hit), S (Stand), D (Double), P (Split), R (Surrender), Enter (Deal)
- **Deal Animation** — Card-by-card deal, flip reveal, and dealer draw with async/await timing
- **Traditional Chinese (繁中)** — Full UI localisation with casino terminology (zh-TW)
- **Variant Card Selector** — Card-style variant picker with rule pills instead of plain dropdown
- **localStorage Persistence** — Balance, stats, and preferences survive page refresh / app kill

## Updating the App

To push a new version and force clients to re-cache:

1. Edit `sw.js` — change `const CACHE = 'blackjack-v1'` → `'blackjack-v2'`
2. Deploy: `vercel --prod`

Clients will download the new cache on next visit.
