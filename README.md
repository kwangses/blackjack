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
- **Traditional Chinese (繁中)** — Full UI localisation with casino terminology (zh-TW)
- **Variant Card Selector** — Card-style variant picker with rule pills instead of plain dropdown
- **localStorage Persistence** — Balance, stats, and preferences survive page refresh / app kill

### Animation & Audio

- **Shuffle Riffle** — 1.2 s visual riffle overlay before each deal
- **Arc Card Deal** — Cards arc from the shoe position with curved trajectory (`dealArc` keyframes)
- **3D Hole-Card Flip** — `perspective(600px)` 3D flip when the dealer reveals the hole card
- **Web Audio Card Sound** — Procedural 80 ms white-noise burst (no external audio files)
- **Dealer Draw Pacing** — 420 ms pause between each dealer hit, with sound and score update per card
- **Chip Stack Visual** — Denomination-based stacked ellipses in the bet area with bounce landing
- **Blackjack Celebration** — Golden inset glow on the table + 18-particle gold-coin burst
- **Win Celebration** — Gold coin particle burst
- **Lose / Bust FX** — Red vignette flash; bust hands trigger a card-scatter animation

### Strategy Advisor & Mistake Tracker

- **Basic Strategy Advisor** — Real-time optimal play recommendation displayed above action buttons during player turn. Covers hard totals (5–21), soft totals (13–21), and pair splits against all dealer upcards. Resolves chart codes (H/S/D/Ds/P/Rh/Rs/Rp) against available actions.
- **Instant Feedback** — ✓ CORRECT / ✗ WRONG flash after every player decision, comparing your action to the basic strategy chart.
- **Accuracy Tracking** — Running accuracy percentage displayed in the header (color-coded: green ≥80%, yellow ≥60%, red <60%).
- **Hand History Panel** — Slide-in panel (📜) showing up to 100 recent hands with player cards, dealer upcard, each action taken with correct/wrong indicators, outcome, and P&L.
- **Advisor Toggle** — Enable/disable the strategy advisor bar in Settings (on by default).

### Casino Table & Immersion

- **Casino Table Layout** — Realistic felt table with inner rail highlight, "INSURANCE PAYS 2:1" and "BLACKJACK PAYS 3:2" info strip, and circular bet area.
- **Dealer Hand Sprite** — Animated dealer hand with arm/cuff/finger elements that moves during deal and hole-card flip.
- **Chip Push Animations** — Chips visually push into the bet circle on deal, collect toward the player on win, and vanish upward on lose.

### AI Players

- **Up to 2 CPU Opponents** — Left and right seats beside the player, configurable via Settings panel.
- **Intelligence Levels** — Off / Low (~40% basic strategy accuracy) / Mid (~70%) / High (~95%).
- **Visible Gameplay** — AI seats display name, cards, score, balance, bet, and outcome for each hand.
- **Auto-Rebuy** — AI players automatically rebuy when they go broke.

### Wallet & Banking

- **Bank Balance** — Separate bank account ($10,000 default) tracked across sessions.
- **Buy-In Modal** — Quick-buy buttons ($500/$1K/$2.5K/$5K) or manual entry with table limits info.
- **Table Limits** — Min $5, Max bet $500, Max buy-in $5,000.
- **Rebuy Prompt** — When out of chips, prompts to buy more or leave the table.
- **Cash Out** — Leave table button returns remaining balance to bank.

### Auto-Bet

- **Auto-Bet Toggle** — Tick to auto-repeat last bet amount and auto-deal after each hand.
- **Smart Limits** — Respects table min/max and current balance.

## Updating the App

To push a new version and force clients to re-cache:

1. Edit `sw.js` — change `const CACHE = 'blackjack-v1'` → `'blackjack-v2'`
2. Deploy: `vercel --prod`

Clients will download the new cache on next visit.
