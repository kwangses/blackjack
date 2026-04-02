/**
 * ============================================================
 *  BLACKJACK PRACTICE APP — Phase 1
 *  Single-file React artifact (.jsx)
 * ============================================================
 *
 *  Architecture is intentionally modular to support:
 *    Phase 2 → Multiplayer Gaming App
 *    Phase 3 → DeFi Casino / Smart Contract integration
 *
 *  Sections:
 *   1. GameRules  — variant configs (pure data)
 *   2. GameEngine — deck + hand logic (pure functions, no UI)
 *   3. BettingSystem — chip/bet helpers (swappable for wallet later)
 *   4. Constants & helpers
 *   5. React UI components
 *   6. App root (GameState lives here)
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   1. GAME RULES — variant configurations
   ============================================================ */

export const VARIANTS = {
  VEGAS_STRIP: "VEGAS_STRIP",
  ATLANTIC_CITY: "ATLANTIC_CITY",
  EUROPEAN: "EUROPEAN",
  VEGAS_DOWNTOWN: "VEGAS_DOWNTOWN",
  SINGLE_DECK: "SINGLE_DECK",
};

export const GameRules = {
  [VARIANTS.VEGAS_STRIP]: {
    label: "Vegas Strip",
    numDecks: 4,
    dealerHitsSoft17: false,
    blackjackPays: 1.5,        // 3:2
    blackjackPayLabel: "3:2",
    doubleAfterSplit: true,
    resplitLimit: 3,           // total hands allowed
    resplitAces: false,
    lateSurrender: false,
    noHoleCard: false,         // ENHC
    doubleRestriction: null,   // any two cards
    insurance: true,
    description: [
      "4 Decks",
      "Dealer stands soft 17",
      "Blackjack pays 3:2",
      "Double after split ✓",
      "Re-split up to 3 hands",
      "No re-split aces",
    ],
  },
  [VARIANTS.ATLANTIC_CITY]: {
    label: "Atlantic City",
    numDecks: 8,
    dealerHitsSoft17: false,
    blackjackPays: 1.5,
    blackjackPayLabel: "3:2",
    doubleAfterSplit: true,
    resplitLimit: 3,
    resplitAces: false,
    lateSurrender: true,
    noHoleCard: false,
    doubleRestriction: null,
    insurance: true,
    description: [
      "8 Decks",
      "Dealer stands soft 17",
      "Blackjack pays 3:2",
      "Late surrender ✓",
      "Double after split ✓",
    ],
  },
  [VARIANTS.EUROPEAN]: {
    label: "European",
    numDecks: 2,
    dealerHitsSoft17: false,
    blackjackPays: 1.5,
    blackjackPayLabel: "3:2",
    doubleAfterSplit: false,
    resplitLimit: 1,
    resplitAces: false,
    lateSurrender: false,
    noHoleCard: true,          // No hole card dealt (ENHC)
    doubleRestriction: null,
    insurance: false,
    description: [
      "2 Decks",
      "Dealer stands soft 17",
      "Blackjack pays 3:2",
      "No hole card (ENHC)",
      "No surrender",
      "No double after split",
    ],
  },
  [VARIANTS.VEGAS_DOWNTOWN]: {
    label: "Vegas Downtown",
    numDecks: 2,
    dealerHitsSoft17: true,
    blackjackPays: 1.5,
    blackjackPayLabel: "3:2",
    doubleAfterSplit: true,
    resplitLimit: 3,
    resplitAces: false,
    lateSurrender: false,
    noHoleCard: false,
    doubleRestriction: [9, 10, 11], // double on 9/10/11 only
    insurance: true,
    description: [
      "2 Decks",
      "Dealer hits soft 17",
      "Blackjack pays 3:2",
      "Double on 9/10/11 only",
      "Double after split ✓",
    ],
  },
  [VARIANTS.SINGLE_DECK]: {
    label: "Single Deck",
    numDecks: 1,
    dealerHitsSoft17: true,
    blackjackPays: 1.2,       // 6:5
    blackjackPayLabel: "6:5",
    doubleAfterSplit: false,
    resplitLimit: 1,
    resplitAces: false,
    lateSurrender: false,
    noHoleCard: false,
    doubleRestriction: null,
    insurance: true,
    description: [
      "1 Deck",
      "Dealer hits soft 17",
      "Blackjack pays 6:5",
      "No double after split",
    ],
  },
};

/* ============================================================
   2. GAME ENGINE — pure JS, no React, no UI coupling
   ============================================================ */

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Hi-Lo card counting values
const HI_LO_COUNT = {
  "2": 1, "3": 1, "4": 1, "5": 1, "6": 1,
  "7": 0, "8": 0, "9": 0,
  "10": -1, "J": -1, "Q": -1, "K": -1, "A": -1,
};

export const GameEngine = {
  /** Build and shuffle a shoe of N decks */
  createShoe(numDecks) {
    const cards = [];
    for (let d = 0; d < numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          cards.push({ rank, suit, id: `${rank}${suit}-${d}`, faceUp: true });
        }
      }
    }
    return GameEngine.shuffle(cards);
  },

  shuffle(cards) {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  cardValue(rank) {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "A") return 11;
    return parseInt(rank, 10);
  },

  /** Returns { total, soft } for a hand array */
  evaluateHand(cards) {
    const visible = cards.filter((c) => c.faceUp);
    let total = 0;
    let aces = 0;
    for (const card of visible) {
      total += GameEngine.cardValue(card.rank);
      if (card.rank === "A") aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    const soft = aces > 0 && total <= 21 && visible.some((c) => c.rank === "A");
    return { total, soft };
  },

  isBust(cards) {
    return GameEngine.evaluateHand(cards).total > 21;
  },

  isBlackjack(cards) {
    if (cards.length !== 2) return false;
    const vals = cards.map((c) => c.rank);
    return vals.includes("A") && vals.some((r) => ["10", "J", "Q", "K"].includes(r));
  },

  /** Running Hi-Lo count for all face-up cards seen */
  computeRunningCount(seenCards) {
    return seenCards
      .filter((c) => c.faceUp)
      .reduce((acc, c) => acc + (HI_LO_COUNT[c.rank] ?? 0), 0);
  },

  trueCount(runningCount, decksRemaining) {
    if (decksRemaining <= 0) return runningCount;
    return Math.round((runningCount / decksRemaining) * 10) / 10;
  },

  /** Determine what actions are valid given game state */
  validActions(playerHand, dealerUpCard, shoe, rules, handIndex, hands, bet, balance, isFirstAction) {
    const { total, soft } = GameEngine.evaluateHand(playerHand);
    const actions = { hit: false, stand: false, double: false, split: false, surrender: false, insurance: false };

    if (total >= 21) {
      actions.stand = true;
      return actions;
    }

    actions.hit = true;
    actions.stand = true;

    // Double down
    const canDoubleCards = playerHand.length === 2;
    if (canDoubleCards && balance >= bet) {
      if (rules.doubleRestriction) {
        const hardTotal = GameEngine.evaluateHand(playerHand.map((c) => ({ ...c }))).total;
        // For doubleRestriction, check the hard total (aces counted as 11 initially)
        const rawTotal = playerHand.reduce((a, c) => a + GameEngine.cardValue(c.rank), 0);
        const effectiveTotal = rawTotal > 21 ? rawTotal - 10 : rawTotal;
        actions.double = rules.doubleRestriction.includes(effectiveTotal) || rules.doubleRestriction.includes(hardTotal);
      } else {
        actions.double = true;
      }
      // Double after split restriction
      if (handIndex > 0 && !rules.doubleAfterSplit) {
        actions.double = false;
      }
    }

    // Split
    if (
      playerHand.length === 2 &&
      playerHand[0].rank === playerHand[1].rank &&
      hands.length < rules.resplitLimit + 1 &&
      balance >= bet
    ) {
      // No re-split aces
      if (playerHand[0].rank === "A" && handIndex > 0 && !rules.resplitAces) {
        actions.split = false;
      } else {
        actions.split = true;
      }
    }

    // Surrender (late surrender, first action of hand, not after split)
    if (rules.lateSurrender && isFirstAction && handIndex === 0) {
      actions.surrender = true;
    }

    // Insurance — first action, dealer shows Ace, rule allows it, not already insured
    if (
      rules.insurance &&
      dealerUpCard?.rank === "A" &&
      isFirstAction &&
      handIndex === 0 &&
      balance >= Math.floor(bet / 2)
    ) {
      actions.insurance = true;
    }

    return actions;
  },

  /** Dealer play logic — returns final dealer hand */
  dealerPlay(hand, shoe, rules) {
    let h = [...hand];
    let s = [...shoe];
    // Reveal hole card
    h = h.map((c) => ({ ...c, faceUp: true }));

    while (true) {
      const { total, soft } = GameEngine.evaluateHand(h);
      if (total > 21) break;
      if (total > 17) break;
      if (total === 17) {
        if (!soft) break;
        if (!rules.dealerHitsSoft17) break;
      }
      const [next, ...rest] = s;
      h.push({ ...next, faceUp: true });
      s = rest;
    }
    return { hand: h, shoe: s };
  },
};

/* ============================================================
   3. BETTING SYSTEM — abstracted chip/bet logic
   PHASE 3: Swap balance/bet for wallet token amounts
   ============================================================ */

export const BettingSystem = {
  CHIP_DENOMINATIONS: [5, 25, 100, 500],

  canBet(balance, currentBet, chip) {
    return balance >= chip;
  },

  addChip(currentBet, chip, balance) {
    if (balance < chip) return currentBet;
    return currentBet + chip;
  },

  clearBet() {
    return 0;
  },

  /** Returns updated { balance, sessionStats } after hand resolution */
  resolveHand(hands, dealerHand, rules, sessionStats) {
    const dealerResult = GameEngine.evaluateHand(dealerHand);
    const dealerBJ = GameEngine.isBlackjack(dealerHand);

    let totalDelta = 0;
    let totalPnl = 0;
    const updates = hands.map((hand) => {
      let delta = 0;
      let pnl = 0;
      let outcome = "";

      if (hand.surrendered) {
        delta = Math.floor(hand.bet / 2);        // return half stake
        pnl   = -Math.floor(hand.bet / 2);       // net loss = half bet
        outcome = "surrender";
      } else {
        const playerResult = GameEngine.evaluateHand(hand.cards);
        const playerBJ = GameEngine.isBlackjack(hand.cards) && hand.isOriginal;
        const playerBust = playerResult.total > 21;
        const dealerBust = dealerResult.total > 21;

        if (playerBust) {
          delta = 0; pnl = -hand.bet;             // bust — bet already gone
          outcome = "lose";
        } else if (playerBJ && dealerBJ) {
          delta = hand.bet; pnl = 0;              // both BJ — return stake
          outcome = "push";
        } else if (playerBJ) {
          delta = hand.bet + Math.floor(hand.bet * rules.blackjackPays);
          pnl = Math.floor(hand.bet * rules.blackjackPays);
          outcome = "blackjack";                  // stake + bonus
        } else if (dealerBJ) {
          delta = 0; pnl = -hand.bet;             // dealer BJ — bet gone
          outcome = "lose";
        } else if (dealerBust) {
          delta = hand.bet * 2; pnl = hand.bet;   // dealer bust
          outcome = "win";
        } else if (playerResult.total > dealerResult.total) {
          delta = hand.bet * 2; pnl = hand.bet;   // player wins
          outcome = "win";
        } else if (playerResult.total < dealerResult.total) {
          delta = 0; pnl = -hand.bet;             // dealer wins
          outcome = "lose";
        } else {
          delta = hand.bet; pnl = 0;              // push — return stake
          outcome = "push";
        }
      }

      totalDelta += delta;
      totalPnl += pnl;
      return { ...hand, delta, pnl, outcome };
    });

    // Update session stats
    const newStats = { ...sessionStats };
    newStats.handsPlayed += hands.length;
    updates.forEach((h) => {
      if (h.outcome === "win" || h.outcome === "blackjack") newStats.handsWon++;
      else if (h.outcome === "lose") newStats.handsLost++;
      else if (h.outcome === "push") newStats.handsPushed++;
      else if (h.outcome === "surrender") newStats.handsSurrendered++;
      if (h.outcome === "blackjack") newStats.blackjacksHit++;
    });
    if (totalPnl > 0) {
      newStats.currentStreak = Math.max(0, newStats.currentStreak) + 1;
      newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
      newStats.biggestWin = Math.max(newStats.biggestWin, totalPnl);
    } else if (totalPnl < 0) {
      newStats.currentStreak = Math.min(0, newStats.currentStreak) - 1;
    } else {
      newStats.currentStreak = 0;
    }
    newStats.sessionPnL += totalPnl;

    return { resolvedHands: updates, totalDelta, totalPnl, sessionStats: newStats };
  },

  resolveInsurance(dealerHand, insuranceBet) {
    const dealerBJ = GameEngine.isBlackjack(dealerHand.map((c) => ({ ...c, faceUp: true })));
    return dealerBJ ? insuranceBet * 3 : 0;  // premium pre-deducted; 3× = return + 2:1 payout
  },
};

/* ============================================================
   2b. BASIC STRATEGY — optimal play lookup tables
   H=Hit, S=Stand, D=Double(hit if can't), Ds=Double(stand if can't),
   P=Split, Rh=Surrender(hit), Rs=Surrender(stand), Rp=Surrender(split)
   ============================================================ */
const BasicStrategy = {
  //                        2    3    4    5    6    7    8    9    10   A
  _hard: {
    5:['H','H','H','H','H','H','H','H','H','H'],
    6:['H','H','H','H','H','H','H','H','H','H'],
    7:['H','H','H','H','H','H','H','H','H','H'],
    8:['H','H','H','H','H','H','H','H','H','H'],
    9:['H','D','D','D','D','H','H','H','H','H'],
    10:['D','D','D','D','D','D','D','D','H','H'],
    11:['D','D','D','D','D','D','D','D','D','D'],
    12:['H','H','S','S','S','H','H','H','H','H'],
    13:['S','S','S','S','S','H','H','H','H','H'],
    14:['S','S','S','S','S','H','H','H','H','H'],
    15:['S','S','S','S','S','H','H','H','Rh','Rh'],
    16:['S','S','S','S','S','H','H','Rh','Rh','Rh'],
    17:['S','S','S','S','S','S','S','S','S','Rs'],
    18:['S','S','S','S','S','S','S','S','S','S'],
    19:['S','S','S','S','S','S','S','S','S','S'],
    20:['S','S','S','S','S','S','S','S','S','S'],
    21:['S','S','S','S','S','S','S','S','S','S'],
  },
  _soft: {
    13:['H','H','H','D','D','H','H','H','H','H'],
    14:['H','H','H','D','D','H','H','H','H','H'],
    15:['H','H','D','D','D','H','H','H','H','H'],
    16:['H','H','D','D','D','H','H','H','H','H'],
    17:['H','D','D','D','D','H','H','H','H','H'],
    18:['Ds','Ds','Ds','Ds','Ds','S','S','H','H','H'],
    19:['S','S','S','S','Ds','S','S','S','S','S'],
    20:['S','S','S','S','S','S','S','S','S','S'],
    21:['S','S','S','S','S','S','S','S','S','S'],
  },
  _pair: {
    2:['P','P','P','P','P','P','H','H','H','H'],
    3:['P','P','P','P','P','P','H','H','H','H'],
    4:['H','H','H','P','P','H','H','H','H','H'],
    5:['D','D','D','D','D','D','D','D','H','H'],
    6:['P','P','P','P','P','H','H','H','H','H'],
    7:['P','P','P','P','P','P','H','H','H','H'],
    8:['P','P','P','P','P','P','P','P','P','Rp'],
    9:['P','P','P','P','P','S','P','P','S','S'],
    10:['S','S','S','S','S','S','S','S','S','S'],
    11:['P','P','P','P','P','P','P','P','P','P'],
  },
  _col(dealerUpCard) {
    const v = GameEngine.cardValue(dealerUpCard.rank);
    return v === 11 ? 9 : v - 2;
  },
  _resolve(code, canDouble, canSurrender, canSplit) {
    switch (code) {
      case 'H': return { action:'hit', reason:'' };
      case 'S': return { action:'stand', reason:'' };
      case 'D': return canDouble ? { action:'double', reason:'EV+ double' } : { action:'hit', reason:'Double→hit' };
      case 'Ds': return canDouble ? { action:'double', reason:'Double if allowed' } : { action:'stand', reason:'Double→stand' };
      case 'P': return canSplit ? { action:'split', reason:'Split improves EV' } : { action:'hit', reason:'Can\'t split→hit' };
      case 'Rh': return canSurrender ? { action:'surrender', reason:'Surrender saves ½' } : { action:'hit', reason:'No surr.→hit' };
      case 'Rs': return canSurrender ? { action:'surrender', reason:'Surrender saves ½' } : { action:'stand', reason:'No surr.→stand' };
      case 'Rp': return canSurrender ? { action:'surrender', reason:'Surrender preferred' } : canSplit ? { action:'split', reason:'No surr.→split' } : { action:'hit', reason:'Fallback' };
      default: return { action:'hit', reason:'' };
    }
  },
  getOptimal(playerCards, dealerUpCard, rules, canSplit, canDouble, canSurrender) {
    const col = BasicStrategy._col(dealerUpCard);
    const { total, soft } = GameEngine.evaluateHand(playerCards);
    if (playerCards.length === 2 && playerCards[0].rank === playerCards[1].rank && canSplit) {
      const pv = GameEngine.cardValue(playerCards[0].rank);
      const code = BasicStrategy._pair[pv]?.[col];
      if (code) { const r = BasicStrategy._resolve(code, canDouble, canSurrender, canSplit); if (r.action === 'split') return r; }
    }
    if (soft && total >= 13 && total <= 21) {
      const code = BasicStrategy._soft[total]?.[col];
      if (code) return BasicStrategy._resolve(code, canDouble, canSurrender, false);
    }
    const row = Math.max(5, Math.min(21, total));
    return BasicStrategy._resolve(BasicStrategy._hard[row]?.[col] || 'H', canDouble, canSurrender, false);
  },
};

/* ============================================================
   4. CONSTANTS & HELPERS
   ============================================================ */

const PHASE = { BETTING: "BETTING", PLAYER_TURN: "PLAYER_TURN", DEALER_TURN: "DEALER_TURN", RESOLUTION: "RESOLUTION" };

const initialSessionStats = () => ({
  handsPlayed: 0,
  handsWon: 0,
  handsLost: 0,
  handsPushed: 0,
  handsSurrendered: 0,
  blackjacksHit: 0,
  currentStreak: 0,
  bestStreak: 0,
  biggestWin: 0,
  sessionPnL: 0,
});

const initialPlayerProfile = (balance = 1000) => ({
  id: `player-${Date.now()}`,   // PHASE 2: replace with auth UUID; PHASE 3: wallet address
  balance,
  stats: initialSessionStats(),
  preferences: { variant: VARIANTS.VEGAS_STRIP, showCount: false, showAdvisor: true, startingBalance: balance },
});

const suit_color = (suit) => (suit === "♥" || suit === "♦" ? "#c0392b" : "#1a1a2e");

const outcomeLabel = (outcome) => {
  if (!outcome) return "";
  const map = { win: "WIN", lose: "LOSE", push: "PUSH", blackjack: "BLACKJACK!", surrender: "SURRENDER" };
  return map[outcome] || outcome;
};

const outcomeColor = (outcome) => {
  const map = { win: "#C9A84C", lose: "#e74c3c", push: "#8899aa", blackjack: "#f7dc6f", surrender: "#f39c12" };
  return map[outcome] || "#fff";
};

/* ============================================================
   5. REACT UI COMPONENTS
   ============================================================ */

// ---- Inline CSS / style constants ----
const COLORS = {
  felt: "#1a472a",
  feltDark: "#133722",
  feltLight: "#1e5232",
  gold: "#C9A84C",
  goldLight: "#f0d070",
  goldDark: "#8B6914",
  cream: "#f5f0e0",
  darkBg: "#0d1117",
  panel: "#111820",
  panelBorder: "#2a3a4a",
  text: "#e8e0d0",
  textMuted: "#8899aa",
  cardBg: "#fffef5",
  cardBorder: "#c8c0a0",
  red: "#c0392b",
  black: "#1a1a2e",
  chip5: "#e74c3c",
  chip25: "#27ae60",
  chip100: "#2980b9",
  chip500: "#8e44ad",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${COLORS.darkBg};
    color: ${COLORS.text};
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .felt-texture {
    background-color: ${COLORS.felt};
    background-image:
      radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.03) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.2) 0%, transparent 60%),
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.03) 2px,
        rgba(0,0,0,0.03) 4px
      );
  }

  .cinzel { font-family: 'Cinzel', serif; }
  .playfair { font-family: 'Playfair Display', serif; }

  /* ---- Card / chip base animations ---- */
  @keyframes dealArc {
    0%   { opacity:0; transform:translate(120px,-80px) rotate(-15deg) scale(.7); }
    60%  { opacity:1; transform:translate(10px, 8px) rotate(3deg) scale(1.04); }
    100% { opacity:1; transform:translate(0,0) rotate(0) scale(1); }
  }
  @keyframes flipReveal3D {
    0%   { transform:perspective(600px) rotateY(180deg) scale(.95); opacity:.6; }
    50%  { transform:perspective(600px) rotateY(90deg)  scale(1.02); opacity:.8; }
    100% { transform:perspective(600px) rotateY(0deg)   scale(1);    opacity:1; }
  }
  @keyframes chipBounce {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  @keyframes pulseGold {
    0%, 100% { box-shadow: 0 0 8px 2px rgba(201,168,76,0.4); }
    50%       { box-shadow: 0 0 20px 6px rgba(201,168,76,0.8); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 600px; }
  }

  /* ---- Celebration / loss FX ---- */
  @keyframes goldenGlow {
    0%,100% { box-shadow: inset 0 0 0 0 transparent; }
    50%     { box-shadow: inset 0 0 60px 10px rgba(201,168,76,0.35); }
  }
  @keyframes redVignette {
    0%   { box-shadow: inset 0 0 0 0 transparent; }
    40%  { box-shadow: inset 0 0 80px 20px rgba(231,76,60,0.45); }
    100% { box-shadow: inset 0 0 0 0 transparent; }
  }
  @keyframes goldCoinBurst {
    0%   { opacity:1; transform:translate(0,0) rotate(0deg) scale(1); }
    100% { opacity:0; transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(.4); }
  }

  .card-deal { animation: dealArc 0.38s cubic-bezier(.25,.8,.25,1) both; }
  .card-flip { animation: flipReveal3D 0.45s ease both; }
  .chip-bounce { animation: chipBounce 0.25s ease; }
  .pulse-gold { animation: pulseGold 2s ease-in-out infinite; }
  .fade-in { animation: fadeIn 0.3s ease both; }
  .slide-down { animation: slideDown 0.4s ease both; }
  .fx-golden-glow  { animation: goldenGlow 1.5s ease 2; }
  .fx-red-vignette { animation: redVignette 0.5s ease both; }

  button:disabled { opacity: 0.38; cursor: not-allowed; }
  button { cursor: pointer; transition: all 0.15s ease; }
  button:not(:disabled):hover { filter: brightness(1.12); }
  button:not(:disabled):active { transform: scale(0.96); }

  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: ${COLORS.goldDark}; border-radius: 2px; }
`;

// ---- PlayingCard ----
function PlayingCard({ card, delay = 0, isNew = false, small = false }) {
  const faceDown = !card.faceUp;
  const size = small
    ? { width: 48, height: 68, fontSize: 13 }
    : { width: 72, height: 100, fontSize: 18 };

  const animClass = isNew ? (faceDown ? "" : "card-deal") : faceDown ? "" : "card-flip";

  return (
    <div
      className={animClass}
      style={{
        width: size.width,
        height: size.height,
        borderRadius: 8,
        border: `1.5px solid ${faceDown ? "#2a3a4a" : COLORS.cardBorder}`,
        background: faceDown
          ? "linear-gradient(135deg, #1a2a3a 0%, #0d1520 50%, #1a2a3a 100%)"
          : COLORS.cardBg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: faceDown ? 0 : "4px 6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        animationDelay: `${delay}s`,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {faceDown ? (
        // Back pattern
        <div style={{
          position: "absolute", inset: 4, borderRadius: 5,
          background: "repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 3px, #162d4a 3px, #162d4a 6px)",
          border: "1px solid #2a4a6a",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: COLORS.gold, fontSize: 18, opacity: 0.5 }}>♦</div>
        </div>
      ) : (
        <>
          <div style={{ color: suit_color(card.suit), fontSize: size.fontSize, fontWeight: 700, lineHeight: 1 }}>
            {card.rank}
          </div>
          <div style={{ color: suit_color(card.suit), fontSize: size.fontSize * 1.4, textAlign: "center", lineHeight: 1, marginTop: -4 }}>
            {card.suit}
          </div>
          <div style={{ color: suit_color(card.suit), fontSize: size.fontSize, fontWeight: 700, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>
            {card.rank}
          </div>
        </>
      )}
    </div>
  );
}

// ---- HandDisplay ----
function HandDisplay({ cards, label, score, isActive, outcome, small = false, isSplit = false }) {
  const { total, soft } = score ?? GameEngine.evaluateHand(cards);
  const bust = total > 21;
  const bj = GameEngine.isBlackjack(cards) && cards.every((c) => c.faceUp);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {label && (
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: 2, color: COLORS.gold, opacity: 0.8, textTransform: "uppercase"
        }}>{label}</div>
      )}
      {/* Cards row */}
      <div style={{ display: "flex", gap: isSplit ? 4 : 6, flexWrap: "wrap", justifyContent: "center" }}>
        {cards.map((card, i) => (
          <PlayingCard key={card.id} card={card} delay={i * 0.08} isNew={true} small={small || isSplit} />
        ))}
      </div>
      {/* Score badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6
      }}>
        <div style={{
          background: isActive ? COLORS.gold : "rgba(0,0,0,0.5)",
          color: isActive ? COLORS.darkBg : COLORS.textMuted,
          borderRadius: 12, padding: "2px 10px", fontSize: 13, fontWeight: 700,
          border: `1px solid ${isActive ? COLORS.gold : COLORS.panelBorder}`,
          boxShadow: isActive ? "0 0 10px rgba(201,168,76,0.5)" : "none",
          transition: "all 0.3s",
        }}>
          {bj ? "BJ" : soft ? `${total} soft` : bust ? "BUST" : total}
        </div>
        {outcome && (
          <div className="fade-in" style={{
            color: outcomeColor(outcome), fontFamily: "'Cinzel', serif",
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
          }}>
            {outcomeLabel(outcome)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- ChipButton ----
function ChipButton({ value, onClick, disabled }) {
  const colors = {
    5: COLORS.chip5,
    25: COLORS.chip25,
    100: COLORS.chip100,
    500: COLORS.chip500,
  };
  const bg = colors[value] || "#555";
  const ref = useRef(null);
  const bounce = () => {
    if (ref.current) {
      ref.current.classList.remove("chip-bounce");
      void ref.current.offsetWidth;
      ref.current.classList.add("chip-bounce");
    }
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      onClick={() => { bounce(); onClick(); }}
      title={`Add $${value} chip`}
      style={{
        width: 56, height: 56, borderRadius: "50%", border: `3px solid ${bg}`,
        background: `radial-gradient(circle at 35% 35%, ${bg}cc, ${bg}88)`,
        color: "#fff", fontWeight: 800, fontSize: 13,
        boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 2px ${bg}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
        position: "relative", flexShrink: 0,
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>${value}</span>
    </button>
  );
}

// ---- ActionButton ----
function ActionButton({ label, onClick, disabled, variant = "default", small = false }) {
  const styles = {
    default: { bg: "rgba(255,255,255,0.08)", border: COLORS.panelBorder, color: COLORS.text },
    primary: { bg: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`, border: COLORS.gold, color: COLORS.darkBg },
    danger:  { bg: "rgba(231,76,60,0.18)", border: "#e74c3c", color: "#e74c3c" },
    warn:    { bg: "rgba(243,156,18,0.18)", border: "#f39c12", color: "#f39c12" },
    info:    { bg: "rgba(41,128,185,0.18)", border: "#2980b9", color: "#7fb3d3" },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: small ? "6px 14px" : "10px 22px",
        borderRadius: 8,
        border: `1.5px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontFamily: "'Cinzel', serif",
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        minWidth: small ? 70 : 90,
        backdropFilter: "blur(4px)",
      }}
    >
      {label}
    </button>
  );
}

// ---- BetDisplay ----
function BetDisplay({ bet }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(0,0,0,0.4)", borderRadius: 12,
      border: `1px solid ${COLORS.panelBorder}`, padding: "8px 20px",
    }}>
      <span style={{ color: COLORS.textMuted, fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: 2 }}>BET</span>
      <span style={{ color: COLORS.gold, fontFamily: "'Cinzel',serif", fontSize: 22, fontWeight: 700 }}>
        ${bet.toLocaleString()}
      </span>
    </div>
  );
}

// ---- BalanceDisplay ----
function BalanceDisplay({ balance }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-end",
    }}>
      <span style={{ color: COLORS.textMuted, fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 2 }}>BALANCE</span>
      <span style={{ color: COLORS.goldLight, fontFamily: "'Cinzel',serif", fontSize: 20, fontWeight: 700 }}>
        ${balance.toLocaleString()}
      </span>
    </div>
  );
}

// ---- CountDisplay ----
function CountDisplay({ running, trueCount, decksRemaining, visible }) {
  if (!visible) return null;
  const color = trueCount >= 2 ? "#2ecc71" : trueCount <= -2 ? "#e74c3c" : COLORS.textMuted;
  return (
    <div className="fade-in" style={{
      background: "rgba(0,0,0,0.6)", border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 8, padding: "6px 14px", display: "flex", gap: 14, alignItems: "center",
    }}>
      <span style={{ color: COLORS.textMuted, fontSize: 10, fontFamily: "'Cinzel',serif", letterSpacing: 1 }}>HI-LO</span>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ color, fontSize: 13, fontWeight: 700 }}>RC: {running >= 0 ? "+" : ""}{running}</span>
        <span style={{ color: COLORS.panelBorder }}>|</span>
        <span style={{ color, fontSize: 13, fontWeight: 700 }}>TC: {trueCount >= 0 ? "+" : ""}{trueCount}</span>
        <span style={{ color: COLORS.panelBorder }}>|</span>
        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{decksRemaining.toFixed(1)}D left</span>
      </div>
    </div>
  );
}

// ---- StatsPanel ----
function StatsPanel({ stats, visible, onClose }) {
  if (!visible) return null;
  const winRate = stats.handsPlayed > 0
    ? ((stats.handsWon / stats.handsPlayed) * 100).toFixed(1)
    : "0.0";
  const rows = [
    ["Hands Played", stats.handsPlayed],
    ["Won", stats.handsWon],
    ["Lost", stats.handsLost],
    ["Pushed", stats.handsPushed],
    ["Surrendered", stats.handsSurrendered],
    ["Blackjacks", stats.blackjacksHit],
    ["Win Rate", `${winRate}%`],
    ["Current Streak", stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak],
    ["Best Streak", stats.bestStreak],
    ["Biggest Win", `$${stats.biggestWin.toLocaleString()}`],
    ["Session P&L", `${stats.sessionPnL >= 0 ? "+" : ""}$${stats.sessionPnL.toLocaleString()}`],
  ];
  return (
    <div className="slide-down" style={{
      position: "absolute", top: 50, right: 0, zIndex: 200,
      background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 12, padding: "16px 20px", minWidth: 220,
      boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: COLORS.gold, fontSize: 13, letterSpacing: 2 }}>SESSION STATS</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 18, padding: 0 }}>×</button>
      </div>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${COLORS.panelBorder}22` }}>
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{label}</span>
          <span style={{
            color: label === "Session P&L"
              ? (stats.sessionPnL >= 0 ? COLORS.gold : "#e74c3c")
              : COLORS.text,
            fontSize: 12, fontWeight: 600,
          }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

// ---- SettingsPanel ----
function SettingsPanel({ visible, currentVariant, onSelectVariant, onClose, showCount, onToggleCount, showAdvisor, onToggleAdvisor, startingBalance, onSetBalance, onResetSession }) {
  const [balInput, setBalInput] = useState(String(startingBalance));
  if (!visible) return null;
  return (
    <div className="slide-down" style={{
      position: "absolute", top: 50, left: 0, zIndex: 200,
      background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 12, padding: "16px 20px", minWidth: 260,
      boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: COLORS.gold, fontSize: 13, letterSpacing: 2 }}>SETTINGS</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 18, padding: 0 }}>×</button>
      </div>

      {/* Variant selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1, marginBottom: 8 }}>RULE VARIANT</div>
        {Object.values(VARIANTS).map((v) => {
          const rule = GameRules[v];
          const active = v === currentVariant;
          return (
            <button
              key={v}
              onClick={() => onSelectVariant(v)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 10px", marginBottom: 4, borderRadius: 6,
                border: `1px solid ${active ? COLORS.gold : COLORS.panelBorder}`,
                background: active ? `${COLORS.gold}18` : "transparent",
                color: active ? COLORS.gold : COLORS.text, fontSize: 13, cursor: "pointer",
                fontFamily: "'Cinzel',serif", letterSpacing: 0.5,
              }}
            >
              {rule.label}
              <span style={{ color: COLORS.textMuted, fontSize: 10, float: "right", fontFamily: "'Inter',sans-serif" }}>
                {rule.numDecks}D · {rule.blackjackPayLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Variant details */}
      <div style={{ marginBottom: 16, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "8px 10px" }}>
        <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1, marginBottom: 6 }}>ACTIVE RULES</div>
        {GameRules[currentVariant].description.map((d) => (
          <div key={d} style={{ color: COLORS.text, fontSize: 11, padding: "2px 0" }}>· {d}</div>
        ))}
      </div>

      {/* Count toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ color: COLORS.text, fontSize: 13 }}>Show Hi-Lo Count</span>
        <button
          onClick={onToggleCount}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: showCount ? COLORS.gold : COLORS.panelBorder,
            border: "none", position: "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            position: "absolute", top: 2, left: showCount ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      {/* Advisor toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ color: COLORS.text, fontSize: 13 }}>Strategy Advisor</span>
        <button
          onClick={onToggleAdvisor}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: showAdvisor ? COLORS.gold : COLORS.panelBorder,
            border: "none", position: "relative", transition: "background 0.2s",
          }}
        >
          <div style={{
            position: "absolute", top: 2, left: showAdvisor ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      {/* Starting balance */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1, marginBottom: 6 }}>STARTING BALANCE</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            value={balInput}
            min={100}
            max={1000000}
            step={100}
            onChange={(e) => setBalInput(e.target.value)}
            style={{
              flex: 1, background: "rgba(0,0,0,0.4)", border: `1px solid ${COLORS.panelBorder}`,
              borderRadius: 6, padding: "6px 10px", color: COLORS.text, fontSize: 13,
              fontFamily: "'Cinzel',serif",
            }}
          />
          <button
            onClick={() => {
              const v = Math.max(100, parseInt(balInput, 10) || 1000);
              onSetBalance(v);
            }}
            style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.gold}`,
              background: `${COLORS.gold}22`, color: COLORS.gold, fontSize: 12, fontFamily: "'Cinzel',serif", cursor: "pointer",
            }}
          >
            Set
          </button>
        </div>
      </div>

      {/* Reset session */}
      <button
        onClick={onResetSession}
        style={{
          width: "100%", padding: "8px", borderRadius: 6,
          border: "1px solid #e74c3c44", background: "rgba(231,76,60,0.12)",
          color: "#e74c3c", fontSize: 12, fontFamily: "'Cinzel',serif", letterSpacing: 1, cursor: "pointer",
        }}
      >
        RESET SESSION
      </button>
    </div>
  );
}

// ---- MessageOverlay ----
function MessageOverlay({ message, color }) {
  if (!message) return null;
  return (
    <div className="fade-in" style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      background: "rgba(0,0,0,0.85)", borderRadius: 16,
      padding: "20px 40px", border: `2px solid ${color || COLORS.gold}`,
      color: color || COLORS.gold, fontFamily: "'Cinzel',serif",
      fontSize: 28, fontWeight: 700, letterSpacing: 3, textAlign: "center",
      boxShadow: `0 0 40px ${color || COLORS.gold}66`,
      zIndex: 100, pointerEvents: "none", whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

// ---- InsurancePrompt ----
function InsurancePrompt({ bet, onAccept, onDecline }) {
  return (
    <div className="fade-in" style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)", zIndex: 150,
      background: COLORS.panel, border: `1px solid ${COLORS.gold}`,
      borderRadius: 16, padding: "24px 32px", textAlign: "center",
      boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
    }}>
      <div style={{ fontFamily: "'Cinzel',serif", color: COLORS.gold, fontSize: 16, letterSpacing: 2, marginBottom: 8 }}>
        INSURANCE?
      </div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>
        Dealer shows Ace · Cost: ${Math.floor(bet / 2)}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <ActionButton label="Accept" variant="primary" onClick={onAccept} />
        <ActionButton label="Decline" variant="danger" onClick={onDecline} />
      </div>
    </div>
  );
}

/* ============================================================
   6. MAIN APP — GameState lives here
   PHASE 2: Lift GameState into Zustand/Redux + add socket.io hooks
   PHASE 3: Replace BettingSystem balance with wallet token balance
   ============================================================ */

export default function BlackjackApp() {
  // ---- Player Profile ----
  const [player, setPlayer] = useState(() => initialPlayerProfile(1000));

  // ---- Game State ----
  const [shoe, setShoe] = useState(() => GameEngine.createShoe(GameRules[VARIANTS.VEGAS_STRIP].numDecks));
  const [seenCards, setSeenCards] = useState([]);
  const [phase, setPhase] = useState(PHASE.BETTING);
  const [currentBet, setCurrentBet] = useState(0);
  const [hands, setHands] = useState([]); // array of { cards, bet, surrendered, isOriginal, outcome, delta }
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const insuranceBetRef = useRef(0); // ref for stale-closure-safe access in advanceHand
  const [showInsurance, setShowInsurance] = useState(false);
  const [isFirstAction, setIsFirstAction] = useState(true);
  const [overlayMsg, setOverlayMsg] = useState(null);
  const [overlayColor, setOverlayColor] = useState(null);
  const [tableFxClass, setTableFxClass] = useState("");

  // ---- UI State ----
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [variant, setVariant] = useState(VARIANTS.VEGAS_STRIP);
  const [advisorFeedback, setAdvisorFeedback] = useState(null); // {isCorrect, action}
  const [mistakeLog, setMistakeLog] = useState([]); // [{playerCards, dealerUp, actions:[], outcome, pnl}]
  const [sessionDecisions, setSessionDecisions] = useState({total:0, correct:0});
  const rules = GameRules[variant];

  // ---- Derived ----
  const decksRemaining = Math.max(0.5, shoe.length / 52);
  const runningCount = GameEngine.computeRunningCount(seenCards);
  const trueCount = GameEngine.trueCount(runningCount, decksRemaining);
  const dealerUpCard = dealerHand[0] ?? null;
  const activeHand = hands[activeHandIndex];

  const validActions = phase === PHASE.PLAYER_TURN && activeHand
    ? GameEngine.validActions(
        activeHand.cards, dealerUpCard, shoe, rules,
        activeHandIndex, hands, activeHand.bet,
        player.balance, isFirstAction
      )
    : {};

  // ---- Advisor: compute optimal action ----
  const currentOptimal = (phase === PHASE.PLAYER_TURN && activeHand && dealerUpCard)
    ? BasicStrategy.getOptimal(
        activeHand.cards, dealerUpCard, rules,
        !!validActions.split, !!validActions.double, !!validActions.surrender
      )
    : null;

  const currentHandActionsRef = useRef([]);

  const recordAction = (playerAction) => {
    if (!currentOptimal) return;
    const isCorrect = playerAction === currentOptimal.action;
    currentHandActionsRef.current.push({ playerAction, optimalAction: currentOptimal.action, isCorrect });
    setSessionDecisions(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }));
    setAdvisorFeedback({ isCorrect, action: currentOptimal.action });
    setTimeout(() => setAdvisorFeedback(null), 1200);
  };

  // ---- Helpers ----
  const drawCard = (currentShoe, faceUp = true) => {
    if (currentShoe.length < 10) {
      // Reshuffle: maintain running count reset signal
      currentShoe = GameEngine.createShoe(rules.numDecks);
    }
    const [card, ...rest] = currentShoe;
    return { card: { ...card, faceUp }, shoe: rest };
  };

  const showOverlay = (msg, color, duration = 1800) => {
    setOverlayMsg(msg); setOverlayColor(color);
    setTimeout(() => { setOverlayMsg(null); setOverlayColor(null); }, duration);
  };

  const advanceHand = useCallback((handsArr, nextIndex, dealerH, shoeArr, seenArr) => {
    if (nextIndex >= handsArr.length) {
      // All player hands done — dealer plays
      setPhase(PHASE.DEALER_TURN);
      // Small delay for drama
      setTimeout(() => {
        const allBust = handsArr.every((h) => h.surrendered || GameEngine.isBust(h.cards));
        let finalDealer = dealerH;
        let finalShoe = shoeArr;
        if (!allBust) {
          const result = GameEngine.dealerPlay(dealerH, shoeArr, rules);
          finalDealer = result.hand;
          finalShoe = result.shoe;
        } else {
          finalDealer = dealerH.map((c) => ({ ...c, faceUp: true }));
        }

        const newSeen = [...seenArr, ...finalDealer];

        // Use functional updater so we always get fresh player stats
        setPlayer((p) => {
          const { resolvedHands, totalDelta, sessionStats } = BettingSystem.resolveHand(handsArr, finalDealer, rules, p.stats);
          // Insurance payout: 2:1 if dealer has BJ, else forfeit (already deducted)
          const insurancePayout = insuranceBetRef.current > 0
            ? BettingSystem.resolveInsurance(finalDealer, insuranceBetRef.current)
            : 0;
          insuranceBetRef.current = 0;

          setDealerHand(finalDealer);
          setShoe(finalShoe);
          setSeenCards(newSeen);
          setHands(resolvedHands);
          setPhase(PHASE.RESOLUTION);

          // Display overlay + celebration FX
          const primaryOutcome = resolvedHands[0]?.outcome;
          const totalWinLoss = resolvedHands.reduce((a, h) => a + (h.delta ?? 0), 0);
          if (primaryOutcome === "blackjack") {
            showOverlay("BLACKJACK!", COLORS.goldLight, 2500);
            setTableFxClass("fx-golden-glow");
          } else if (primaryOutcome === "win") {
            showOverlay(`+$${totalWinLoss}`, COLORS.gold, 1800);
          } else if (primaryOutcome === "lose") {
            showOverlay(`-$${Math.abs(totalWinLoss)}`, "#e74c3c", 1800);
            setTableFxClass("fx-red-vignette");
          } else if (primaryOutcome === "push") {
            showOverlay("PUSH", COLORS.textMuted, 1500);
          } else if (primaryOutcome === "surrender") {
            showOverlay("SURRENDERED", "#f39c12", 1500);
          }
          setTimeout(() => setTableFxClass(""), 2000);

          // Finalize hand history for MistakeTracker
          const handEntry = {
            playerCards: handsArr[0]?.cards.map(c => `${c.rank}${c.suit}`),
            dealerUp: finalDealer[0] ? `${finalDealer[0].rank}${finalDealer[0].suit}` : '?',
            actions: [...currentHandActionsRef.current],
            outcome: primaryOutcome,
            pnl: totalWinLoss + insurancePayout,
            time: Date.now(),
          };
          setMistakeLog(prev => [handEntry, ...prev].slice(0, 100));

          return { ...p, balance: p.balance + totalDelta + insurancePayout, stats: sessionStats };
        });
      }, 400);
    } else {
      setActiveHandIndex(nextIndex);
      setIsFirstAction(true);
      // Check if split aces — auto-stand (per standard rules, one card only per ace)
      if (handsArr[nextIndex]?.cards.length === 2 && handsArr[nextIndex].cards[0].rank === "A") {
        setTimeout(() => advanceHand(handsArr, nextIndex + 1, dealerH, shoeArr, seenArr), 600);
      }
    }
  }, [rules]);

  // ---- Actions ----
  const handleAddChip = (chip) => {
    if (phase !== PHASE.BETTING) return;
    if (!BettingSystem.canBet(player.balance, currentBet, chip)) return;
    setCurrentBet((b) => BettingSystem.addChip(b, chip, player.balance - b));
  };

  const handleClearBet = () => { if (phase === PHASE.BETTING) setCurrentBet(0); };

  const handleDeal = () => {
    if (currentBet <= 0 || phase !== PHASE.BETTING) return;
    if (currentBet > player.balance) return;

    let s = [...shoe];
    let seen = [...seenCards];
    const deal = (shoe, faceUp = true) => {
      const r = drawCard(shoe, faceUp);
      seen.push(r.card);
      return { card: r.card, shoe: r.shoe };
    };

    // Deal: P1, D(up), P2, D(down — skipped for European ENHC)
    let r1 = deal(s); s = r1.shoe;
    let r2 = deal(s); s = r2.shoe;
    let r3 = deal(s); s = r3.shoe;

    // European ENHC: dealer only gets upcard, no hole card drawn
    let dealerCards;
    if (rules.noHoleCard) {
      dealerCards = [{ ...r2.card, faceUp: true }];
    } else {
      const r4 = deal(s, false); s = r4.shoe; // hole card face down
      dealerCards = [{ ...r2.card, faceUp: true }, { ...r4.card, faceUp: false }];
    }

    const playerCards = [r1.card, r3.card];
    const initHand = { cards: playerCards, bet: currentBet, surrendered: false, isOriginal: true, outcome: null };

    // Deduct bet from balance immediately
    setPlayer((p) => ({ ...p, balance: p.balance - currentBet }));
    setShoe(s);
    setSeenCards(seen);
    setDealerHand(dealerCards);
    setHands([initHand]);
    setActiveHandIndex(0);
    setInsuranceBet(0);
    setIsFirstAction(true);
    setPhase(PHASE.PLAYER_TURN);
    currentHandActionsRef.current = [];

    // Check insurance offer
    const dealerUp = dealerCards[0];
    if (rules.insurance && dealerUp?.rank === "A" && currentBet >= 2) {
      setTimeout(() => setShowInsurance(true), 500);
    } else {
      // Check immediate blackjack
      if (GameEngine.isBlackjack(playerCards)) {
        setTimeout(() => {
          handleAutoBlackjack([initHand], dealerCards, s, seen);
        }, 600);
      }
    }
  };

  const handleAutoBlackjack = (handsArr, dealerH, shoeArr, seenArr) => {
    advanceHand(handsArr, handsArr.length, dealerH, shoeArr, seenArr);
  };

  const handleInsuranceAccept = () => {
    const cost = Math.floor(activeHand.bet / 2);
    setInsuranceBet(cost);
    insuranceBetRef.current = cost;
    // Deduct insurance premium from balance; payout handled during resolution
    setPlayer((p) => ({ ...p, balance: p.balance - cost }));
    setShowInsurance(false);
    // Check BJ after insurance
    if (GameEngine.isBlackjack(hands[0].cards)) {
      setTimeout(() => handleAutoBlackjack(hands, dealerHand, shoe, seenCards), 300);
    }
  };

  const handleInsuranceDecline = () => {
    setShowInsurance(false);
    if (GameEngine.isBlackjack(hands[0].cards)) {
      setTimeout(() => handleAutoBlackjack(hands, dealerHand, shoe, seenCards), 300);
    }
  };

  const handleHit = () => {
    if (!validActions.hit) return;
    recordAction('hit');
    let s = [...shoe];
    const { card, shoe: newShoe } = drawCard(s);
    s = newShoe;
    const newSeen = [...seenCards, card];

    const updatedHands = hands.map((h, i) =>
      i === activeHandIndex ? { ...h, cards: [...h.cards, card] } : h
    );

    setShoe(s);
    setSeenCards(newSeen);
    setHands(updatedHands);
    setIsFirstAction(false);

    const newCards = updatedHands[activeHandIndex].cards;
    if (GameEngine.isBust(newCards) || GameEngine.evaluateHand(newCards).total === 21) {
      setTimeout(() => advanceHand(updatedHands, activeHandIndex + 1, dealerHand, s, newSeen), 400);
    }
  };

  const handleStand = () => {
    if (!validActions.stand) return;
    recordAction('stand');
    setIsFirstAction(false);
    advanceHand(hands, activeHandIndex + 1, dealerHand, shoe, seenCards);
  };

  const handleDouble = () => {
    if (!validActions.double) return;
    recordAction('double');
    const extraBet = activeHand.bet;
    setPlayer((p) => ({ ...p, balance: p.balance - extraBet }));

    let s = [...shoe];
    const { card, shoe: newShoe } = drawCard(s);
    s = newShoe;
    const newSeen = [...seenCards, card];

    const updatedHands = hands.map((h, i) =>
      i === activeHandIndex
        ? { ...h, cards: [...h.cards, card], bet: h.bet + extraBet }
        : h
    );
    setShoe(s);
    setSeenCards(newSeen);
    setHands(updatedHands);
    setIsFirstAction(false);
    setTimeout(() => advanceHand(updatedHands, activeHandIndex + 1, dealerHand, s, newSeen), 400);
  };

  const handleSplit = () => {
    if (!validActions.split) return;
    recordAction('split');
    const hand = activeHand;
    const [c1, c2] = hand.cards;
    const extraBet = hand.bet;
    setPlayer((p) => ({ ...p, balance: p.balance - extraBet }));

    let s = [...shoe];
    const seen = [...seenCards];
    const draw = (shoe) => {
      const r = drawCard(shoe);
      seen.push(r.card);
      return { card: r.card, shoe: r.shoe };
    };

    const r1 = draw(s); s = r1.shoe;
    const r2 = draw(s); s = r2.shoe;

    const newHand1 = { cards: [c1, r1.card], bet: hand.bet, surrendered: false, isOriginal: false, outcome: null };
    const newHand2 = { cards: [c2, r2.card], bet: extraBet, surrendered: false, isOriginal: false, outcome: null };

    const newHands = [
      ...hands.slice(0, activeHandIndex),
      newHand1,
      newHand2,
      ...hands.slice(activeHandIndex + 1),
    ];

    setShoe(s);
    setSeenCards(seen);
    setHands(newHands);
    setIsFirstAction(true);
    setActiveHandIndex(activeHandIndex);
  };

  const handleSurrender = () => {
    if (!validActions.surrender) return;
    recordAction('surrender');
    const updatedHands = hands.map((h, i) =>
      i === activeHandIndex ? { ...h, surrendered: true } : h
    );
    setHands(updatedHands);
    setIsFirstAction(false);
    setTimeout(() => advanceHand(updatedHands, activeHandIndex + 1, dealerHand, shoe, seenCards), 300);
  };

  const handleNewHand = () => {
    if (player.balance <= 0) return;
    setPhase(PHASE.BETTING);
    setCurrentBet(0);
    setHands([]);
    setDealerHand([]);
    setActiveHandIndex(0);
    setInsuranceBet(0);
    insuranceBetRef.current = 0;
    setShowInsurance(false);
    setIsFirstAction(true);
  };

  const handleVariantChange = (v) => {
    setVariant(v);
    setPlayer((p) => ({ ...p, preferences: { ...p.preferences, variant: v } }));
    // Reshuffle for new variant
    setShoe(GameEngine.createShoe(GameRules[v].numDecks));
    setSeenCards([]);
    setPhase(PHASE.BETTING);
    setCurrentBet(0);
    setHands([]);
    setDealerHand([]);
    setShowSettings(false);
  };

  const handleResetSession = () => {
    const bal = player.preferences.startingBalance;
    setPlayer(initialPlayerProfile(bal));
    setShoe(GameEngine.createShoe(rules.numDecks));
    setSeenCards([]);
    setPhase(PHASE.BETTING);
    setCurrentBet(0);
    setHands([]);
    setDealerHand([]);
    setShowSettings(false);
    setSessionDecisions({total:0, correct:0});
    setMistakeLog([]);
  };

  const handleSetBalance = (bal) => {
    setPlayer((p) => ({
      ...p,
      balance: bal,
      preferences: { ...p.preferences, startingBalance: bal },
    }));
    handleResetSession();
  };

  const handleToggleCount = () => {
    setPlayer((p) => ({
      ...p,
      preferences: { ...p.preferences, showCount: !p.preferences.showCount },
    }));
  };

  const handleToggleAdvisor = () => {
    setPlayer((p) => ({
      ...p,
      preferences: { ...p.preferences, showAdvisor: !p.preferences.showAdvisor },
    }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showInsurance || showSettings || showStats || showHistory) return;
      if (phase === PHASE.PLAYER_TURN) {
        if (e.key === "h" || e.key === "H") handleHit();
        if (e.key === "s" || e.key === "S") handleStand();
        if (e.key === "d" || e.key === "D") { if (validActions.double) handleDouble(); }
        if (e.key === "p" || e.key === "P") { if (validActions.split) handleSplit(); }
        if (e.key === "r" || e.key === "R") { if (validActions.surrender) handleSurrender(); }
      }
      if (phase === PHASE.BETTING) {
        if (e.key === "Enter") handleDeal();
        if (e.key === "Backspace") handleClearBet();
      }
      if (phase === PHASE.RESOLUTION) {
        if (e.key === "Enter" || e.key === " ") handleNewHand();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Close panels on outside click
  const headerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setShowStats(false);
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canDeal = currentBet > 0 && currentBet <= player.balance && phase === PHASE.BETTING;
  const isSplit = hands.length > 1;

  // ---- Render ----
  return (
    <>
      <style>{globalStyle}</style>
      <div style={{
        minHeight: "100vh", background: COLORS.darkBg,
        display: "flex", flexDirection: "column",
      }}>

        {/* ===== HEADER ===== */}
        <header ref={headerRef} style={{
          background: COLORS.panel, borderBottom: `1px solid ${COLORS.panelBorder}`,
          padding: "0 20px", height: 52, display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "relative", zIndex: 100,
          flexShrink: 0,
        }}>
          {/* Settings button + panel */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setShowSettings((v) => !v); setShowStats(false); }}
              style={{
                background: "none", border: `1px solid ${COLORS.panelBorder}`,
                borderRadius: 6, padding: "5px 12px", color: COLORS.textMuted,
                fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: 1, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              ⚙ SETTINGS
            </button>
            <SettingsPanel
              visible={showSettings}
              currentVariant={variant}
              onSelectVariant={handleVariantChange}
              onClose={() => setShowSettings(false)}
              showCount={player.preferences.showCount}
              onToggleCount={handleToggleCount}
              showAdvisor={player.preferences.showAdvisor}
              onToggleAdvisor={handleToggleAdvisor}
              startingBalance={player.preferences.startingBalance}
              onSetBalance={handleSetBalance}
              onResetSession={handleResetSession}
            />
          </div>

          {/* Title */}
          <div style={{ textAlign: "center" }}>
            <div className="cinzel" style={{ color: COLORS.gold, fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
              BLACKJACK
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 9, letterSpacing: 3, fontFamily: "'Cinzel',serif", marginTop: -2 }}>
              {rules.label.toUpperCase()}
            </div>
          </div>

          {/* Stats + History buttons */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Accuracy badge */}
            {sessionDecisions.total > 0 && (
              <span style={{
                fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1, padding: "3px 8px",
                borderRadius: 6,
                color: (sessionDecisions.correct / sessionDecisions.total) >= 0.8 ? "#27ae60" : (sessionDecisions.correct / sessionDecisions.total) >= 0.6 ? "#f39c12" : "#e74c3c",
                border: `1px solid ${(sessionDecisions.correct / sessionDecisions.total) >= 0.8 ? "#27ae6044" : (sessionDecisions.correct / sessionDecisions.total) >= 0.6 ? "#f39c1244" : "#e74c3c44"}`,
              }}>
                {Math.round((sessionDecisions.correct / sessionDecisions.total) * 100)}%
              </span>
            )}
            {/* History button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setShowHistory((v) => !v); setShowStats(false); setShowSettings(false); }}
                style={{
                  background: "none", border: `1px solid ${COLORS.panelBorder}`,
                  borderRadius: 6, padding: "5px 12px", color: COLORS.textMuted,
                  fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: 1, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                📜 HISTORY
              </button>
            </div>
            {/* Stats button + panel */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setShowStats((v) => !v); setShowSettings(false); setShowHistory(false); }}
                style={{
                  background: "none", border: `1px solid ${COLORS.panelBorder}`,
                  borderRadius: 6, padding: "5px 12px", color: COLORS.textMuted,
                  fontFamily: "'Cinzel',serif", fontSize: 11, letterSpacing: 1, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                📊 STATS
              </button>
              <StatsPanel
                visible={showStats}
                stats={player.stats}
                onClose={() => setShowStats(false)}
              />
            </div>
          </div>
        </header>

        {/* ===== FELT TABLE ===== */}
        <main
          className={`felt-texture ${tableFxClass}`}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            display: "flex", flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Elliptical table edge decoration */}
          <div style={{
            position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)",
            width: "110%", height: 120, borderRadius: "50%",
            background: "transparent", border: `4px solid ${COLORS.goldDark}44`,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)",
            width: "115%", height: 140, borderRadius: "50%",
            background: "transparent", border: `2px solid ${COLORS.goldDark}22`,
            pointerEvents: "none",
          }} />

          {/* Center logo watermark */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            pointerEvents: "none", opacity: 0.05,
            fontFamily: "'Cinzel',serif", fontSize: 72, fontWeight: 700, color: COLORS.gold,
            letterSpacing: 8, whiteSpace: "nowrap",
          }}>♠ ♥ ♦ ♣</div>

          {/* ===== CONTENT LAYOUT ===== */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "space-between", padding: "16px 20px 12px",
            maxWidth: 800, margin: "0 auto", width: "100%", position: "relative",
          }}>

            {/* DEALER AREA */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {dealerHand.length > 0 && (
                <HandDisplay
                  cards={dealerHand}
                  label="Dealer"
                  isActive={phase === PHASE.DEALER_TURN}
                  outcome={null}
                />
              )}
              {phase === PHASE.BETTING && (
                <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="cinzel" style={{ color: COLORS.goldDark, fontSize: 13, letterSpacing: 4, opacity: 0.6 }}>
                    PLACE YOUR BET
                  </div>
                </div>
              )}
            </div>

            {/* CENTER INFO (count) */}
            <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
              <CountDisplay
                running={runningCount}
                trueCount={trueCount}
                decksRemaining={decksRemaining}
                visible={player.preferences.showCount}
              />
            </div>

            {/* PLAYER AREA */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {/* Split hands */}
              {isSplit ? (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {hands.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px", borderRadius: 12,
                        border: `1.5px solid ${i === activeHandIndex && phase === PHASE.PLAYER_TURN ? COLORS.gold : COLORS.panelBorder}`,
                        background: i === activeHandIndex && phase === PHASE.PLAYER_TURN
                          ? `${COLORS.gold}10` : "rgba(0,0,0,0.2)",
                        transition: "all 0.2s",
                      }}
                    >
                      <HandDisplay
                        cards={h.cards}
                        label={`Hand ${i + 1} · $${h.bet}`}
                        isActive={i === activeHandIndex && phase === PHASE.PLAYER_TURN}
                        outcome={h.outcome}
                        isSplit={true}
                        small={true}
                      />
                    </div>
                  ))}
                </div>
              ) : hands.length === 1 ? (
                <HandDisplay
                  cards={hands[0].cards}
                  label="Your Hand"
                  isActive={phase === PHASE.PLAYER_TURN}
                  outcome={hands[0].outcome}
                />
              ) : null}
            </div>
          </div>

          {/* Overlay message */}
          <MessageOverlay message={overlayMsg} color={overlayColor} />

          {/* Insurance prompt */}
          {showInsurance && (
            <InsurancePrompt
              bet={currentBet}
              onAccept={handleInsuranceAccept}
              onDecline={handleInsuranceDecline}
            />
          )}
        </main>

        {/* ===== BOTTOM CONTROLS ===== */}
        <div style={{
          background: COLORS.panel, borderTop: `1px solid ${COLORS.panelBorder}`,
          padding: "12px 20px 16px", flexShrink: 0,
        }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>

            {/* Balance + Bet row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <BalanceDisplay balance={player.balance} />
              {(phase === PHASE.BETTING || phase === PHASE.PLAYER_TURN || phase === PHASE.RESOLUTION) && (
                <BetDisplay bet={activeHand?.bet ?? currentBet} />
              )}
              {/* Insurance bet indicator */}
              {insuranceBet > 0 && (
                <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                  Insurance: ${insuranceBet}
                </div>
              )}
            </div>

            {/* BETTING PHASE CONTROLS */}
            {phase === PHASE.BETTING && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  {BettingSystem.CHIP_DENOMINATIONS.map((chip) => (
                    <ChipButton
                      key={chip}
                      value={chip}
                      onClick={() => handleAddChip(chip)}
                      disabled={player.balance < chip || currentBet + chip > player.balance}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <ActionButton label="Clear" onClick={handleClearBet} disabled={currentBet === 0} variant="warn" small />
                  <ActionButton
                    label="Deal"
                    onClick={handleDeal}
                    disabled={!canDeal}
                    variant="primary"
                  />
                </div>
                <div style={{ textAlign: "center", color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1 }}>
                  ENTER to deal · BACKSPACE to clear
                </div>
              </div>
            )}

            {/* PLAYER TURN CONTROLS */}
            {phase === PHASE.PLAYER_TURN && !showInsurance && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
                {/* Strategy Advisor Bar */}
                {player.preferences.showAdvisor && currentOptimal && (
                  <div style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "6px 12px", marginBottom: 4,
                    background: "rgba(201,168,76,0.12)", border: `1px solid ${COLORS.gold}44`,
                    borderRadius: 8, fontFamily: "'Inter',sans-serif",
                  }}>
                    <span style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1 }}>OPTIMAL</span>
                    <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 14, textTransform: "uppercase" }}>{currentOptimal.action}</span>
                    {currentOptimal.reason && <span style={{ color: COLORS.textMuted, fontSize: 10 }}>({currentOptimal.reason})</span>}
                  </div>
                )}
                {/* Advisor Feedback Flash */}
                {advisorFeedback && (
                  <div style={{
                    position: "absolute", top: -32, left: "50%", transform: "translateX(-50%)",
                    padding: "4px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                    background: advisorFeedback.isCorrect ? "rgba(39,174,96,0.85)" : "rgba(231,76,60,0.85)",
                    color: "#fff", whiteSpace: "nowrap", zIndex: 50,
                    animation: "fadeIn 0.2s ease-out",
                  }}>
                    {advisorFeedback.isCorrect ? "✓ CORRECT" : "✗ WRONG"}
                  </div>
                )}
                <ActionButton label="Hit" onClick={handleHit} disabled={!validActions.hit} variant="default" />
                <ActionButton label="Stand" onClick={handleStand} disabled={!validActions.stand} variant="primary" />
                <ActionButton label="Double" onClick={handleDouble} disabled={!validActions.double} variant="info" />
                <ActionButton label="Split" onClick={handleSplit} disabled={!validActions.split} variant="info" />
                {rules.lateSurrender && (
                  <ActionButton label="Surrender" onClick={handleSurrender} disabled={!validActions.surrender} variant="danger" />
                )}
                <div style={{ width: "100%", textAlign: "center", color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1, marginTop: 2 }}>
                  H·Hit&nbsp; S·Stand&nbsp; D·Double&nbsp; P·Split{rules.lateSurrender ? "&nbsp; R·Surrender" : ""}
                </div>
              </div>
            )}

            {/* DEALER TURN — waiting display */}
            {phase === PHASE.DEALER_TURN && (
              <div style={{ textAlign: "center", color: COLORS.gold, fontFamily: "'Cinzel',serif", fontSize: 14, letterSpacing: 3 }}>
                DEALER PLAYING...
              </div>
            )}

            {/* RESOLUTION — next hand */}
            {phase === PHASE.RESOLUTION && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
                {/* Outcome summary */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {hands.map((h, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      {hands.length > 1 && (
                        <div style={{ color: COLORS.textMuted, fontSize: 11 }}>Hand {i + 1}</div>
                      )}
                      <div style={{
                        color: outcomeColor(h.outcome), fontFamily: "'Cinzel',serif",
                        fontSize: 15, fontWeight: 700, letterSpacing: 1,
                      }}>
                        {outcomeLabel(h.outcome)}
                        {h.delta !== undefined && (
                          <span style={{ fontSize: 12, marginLeft: 8 }}>
                            {h.delta >= 0 ? "+" : ""}${h.delta}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {player.balance > 0 ? (
                  <ActionButton
                    label="Next Hand"
                    onClick={handleNewHand}
                    variant="primary"
                  />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#e74c3c", fontFamily: "'Cinzel',serif", fontSize: 16, marginBottom: 10 }}>OUT OF CHIPS</div>
                    <ActionButton label="Reset Session" onClick={handleResetSession} variant="primary" />
                  </div>
                )}
                <div style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "'Cinzel',serif", letterSpacing: 1 }}>
                  ENTER or SPACE for next hand
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== HISTORY PANEL ===== */}
        {showHistory && (
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 320, maxWidth: "90vw",
            background: COLORS.panel, borderLeft: `1px solid ${COLORS.panelBorder}`,
            zIndex: 300, overflowY: "auto", padding: "16px 20px",
            boxShadow: "-8px 0 30px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Cinzel',serif", color: COLORS.gold, fontSize: 14, letterSpacing: 2 }}>HAND HISTORY</span>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            {/* Accuracy summary */}
            {sessionDecisions.total > 0 && (
              <div style={{
                background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Accuracy</span>
                <span style={{
                  fontSize: 16, fontWeight: 700, fontFamily: "'Cinzel',serif",
                  color: (sessionDecisions.correct / sessionDecisions.total) >= 0.8 ? "#27ae60" : (sessionDecisions.correct / sessionDecisions.total) >= 0.6 ? "#f39c12" : "#e74c3c",
                }}>
                  {Math.round((sessionDecisions.correct / sessionDecisions.total) * 100)}% ({sessionDecisions.correct}/{sessionDecisions.total})
                </span>
              </div>
            )}
            {/* History entries */}
            {mistakeLog.length === 0 ? (
              <div style={{ color: COLORS.textMuted, textAlign: "center", fontSize: 13, marginTop: 40 }}>No hands played yet</div>
            ) : (
              mistakeLog.map((entry, i) => (
                <div key={i} style={{
                  background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 8,
                  border: `1px solid ${COLORS.panelBorder}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: COLORS.text, fontSize: 12 }}>{entry.playerCards?.join(' ')}</span>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>vs {entry.dealerUp}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                    {entry.actions.map((a, j) => (
                      <span key={j} style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        background: a.isCorrect ? "rgba(39,174,96,0.2)" : "rgba(231,76,60,0.2)",
                        color: a.isCorrect ? "#27ae60" : "#e74c3c",
                        border: `1px solid ${a.isCorrect ? "#27ae6044" : "#e74c3c44"}`,
                      }}>
                        {a.playerAction}{!a.isCorrect && ` → ${a.optimalAction}`}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 11, textTransform: "uppercase",
                      color: entry.outcome === "win" || entry.outcome === "blackjack" ? COLORS.gold : entry.outcome === "lose" ? "#e74c3c" : COLORS.textMuted,
                    }}>{entry.outcome}</span>
                    <span style={{
                      fontSize: 11,
                      color: (entry.pnl ?? 0) >= 0 ? "#27ae60" : "#e74c3c",
                    }}>{(entry.pnl ?? 0) >= 0 ? "+" : ""}${entry.pnl ?? 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </>
  );
}
