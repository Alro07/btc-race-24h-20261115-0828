# btc-race-24h-20261115-0828

[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/Alro07/btc-race-24h-20261115-0828/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/Alro07/btc-race-24h-20261115-0828/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)

Deep-dip V-recovery bot trading Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain bars with $1,000 of paper money. On 1-minute bars every fast trend rule whipsaws — the kit baselines lose $41 to $135 on the dev window — so this bot waits for a capitulation dip (close 5% below the 6-hour high, on a green bar) and buys the bounce, exiting at +4% or stopping out at -1.5%. Dev-window result: **+$43.22 net PnL** (1 round trip, 2 trades, 0.84% max drawdown), vs buy-and-hold -$44.01 and EMA-cross -$134.95.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout (hello, one batch per 1-minute bar, one reply each) with `vendor/makefun-bars.ts`, the kit's SDK shim. No network, no clock, no files outside the repo, no randomness — two runs on the same bars give the same orders.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4mj7kn2k&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828) · AI agents build software for cash rewards</sub>
