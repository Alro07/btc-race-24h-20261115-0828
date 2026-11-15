// Deep-dip V-recovery bot for btc-race-24h-20261115-0828.
//
// Idea: on 1-minute bars cbBTC whipsaws so badly that every fast trend
// rule (EMA cross, RSI bounce, Bollinger mean reversion) loses money on
// the dev window — the baselines lose between $41 and $135. The dev day
// instead grinds down ~4% and then snaps back in one sharp V (hour 16
// falls ~2%, hour 17 rallies ~2.8%). So this bot does almost nothing
// most of the day and waits for a capitulation dip, then buys the
// bounce and takes a quick profit:
//
//   - Entry: the close is at least 5% below the highest close of the
//     last 360 bars (6 hours) AND the bar closed up (a green bar — the
//     bounce has started, not just a falling knife).
//   - Exit: take profit at +4% over cost, or stop out at -1.5% under
//     cost. One position at a time, full size (100% of cash).
//   - Late fallback: if no trade has filled by bar 1080 (18 hours in),
//     widen the dip to 3% with a +2% / -1% exit, so a calm race day
//     still sees at least one trade instead of sitting in cash.
//   - Safety: after a stop-loss exit, wait 60 bars before re-entering;
//     stop entering entirely if equity has fallen 5% below the start.
//
// Every decision uses only the bars the harness has sent (hello, batch,
// orders, bar closes) — no clock, no network, no files, no randomness —
// so two runs on the same data give the same orders.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 100;

// Primary rule.
const LOOKBACK_BARS = 360; // 6 hours of 1-minute bars
const DIP_BPS = 500; // 5% below the 6-hour high
const TAKE_PROFIT_BPS = 400; // +4% over cost
const STOP_LOSS_BPS = 150; // -1.5% under cost

// Late fallback, only while no buy has ever filled.
const FALLBACK_BAR = 1080;
const FALLBACK_DIP_BPS = 300; // 3%
const FALLBACK_TP_BPS = 200; // +2%
const FALLBACK_SL_BPS = 100; // -1%

const COOLDOWN_BARS = 60; // bars to wait after a stop-loss exit
const EQUITY_BRAKE_BPS = 9500; // stop entering below 95% of starting equity

const closes: number[] = [];
let filledBuys = 0;
let lastStopBar = -1_000_000;
let entryFallback = false; // whether the open position entered on the late fallback rule

function rollingMax(n: number): number | null {
  if (closes.length < n) return null;
  let m = -Infinity;
  for (let i = closes.length - n; i < closes.length; i++) if (closes[i] > m) m = closes[i];
  return m;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    for (const fill of batch.fills) {
      if (fill.side === 'buy' && fill.status === 'filled') filledBuys++;
    }
    for (const bar of batch.bars) closes.push(Number(bar.c) / 1e5);
    if (state.warmingUp) return [];

    const c = closes[closes.length - 1];
    const prev = closes.length > 1 ? closes[closes.length - 2] : c;
    const held = state.positions.get(SYMBOL);
    const orders: (BuyInput | SellInput)[] = [];
    const { fees } = state.hello;

    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (value > 0n) {
        const v = Number(value) / 1e6;
        const cost = Number(held.cost) / 1e6;
        const fallback = entryFallback;
        const tp = (fallback ? FALLBACK_TP_BPS : TAKE_PROFIT_BPS) / 10000;
        const sl = (fallback ? FALLBACK_SL_BPS : STOP_LOSS_BPS) / 10000;
        if (v >= cost * (1 + tp) || v <= cost * (1 - sl)) {
          if (v <= cost * (1 - sl)) lastStopBar = state.seq;
          entryFallback = false;
          orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
      }
      return orders;
    }

    // Flat: look for a capitulation dip.
    const startEquity = Number(state.hello.capital.quote_units) / 1e6;
    if (Number(state.equity) / 1e6 < (startEquity * EQUITY_BRAKE_BPS) / 10000) return orders;
    if (state.seq - lastStopBar < COOLDOWN_BARS) return orders;

    const late = filledBuys === 0 && state.seq >= FALLBACK_BAR;
    const dipBps = late ? FALLBACK_DIP_BPS : DIP_BPS;
    const mx = rollingMax(LOOKBACK_BARS);
    if (mx !== null && c <= mx * (1 - dipBps / 10000) && c > prev) {
      let amt = state.cash;
      const byWeight = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / 10000n;
      if (amt > byWeight) amt = byWeight;
      if (amt >= BigInt(fees.min_notional_quote_units)) {
        entryFallback = late;
        orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: amt, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
    }
    return orders;
  },
});
