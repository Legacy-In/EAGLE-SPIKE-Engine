# Eagle Flash — Pre-Pump ডিটেকশন + Bybit Demo অটো পেপার ট্রেডিং
### এজেন্টের জন্য স্টেপ-বাই-স্টেপ বিল্ড ইনস্ট্রাকশন

**লক্ষ্য:** Bybit, Binance, MEXC, WEEX — এই ৪টা এক্সচেঞ্জের ডেটা থেকে ভলিউম স্পাইক (সম্ভাব্য পাম্পের আগের লক্ষণ) ধরা → সিগন্যাল তৈরি → Bybit **Demo Trading** অ্যাকাউন্টে অটো পজিশন → লাভ/লস অ্যাপে লাইভ দেখানো।

---

## ০. শুরুর আগে বাস্তবতা (এজেন্ট ও ইউজার দুজনেরই পড়া দরকার)

1. **"পাম্পের আগে ধরা" মানে সম্ভাবনা, নিশ্চয়তা নয়।** ভলিউম স্পাইক সাধারণত পাম্প শুরুর সময় বা সামান্য আগে দেখা যায়। তাই আমরা খুঁজব *early signature*: **ভলিউম বাড়ছে, কিন্তু দাম এখনো বেশি সরেনি** (accumulation), সাথে OI বাড়ছে।
2. **স্ক্রিনশটে প্রায় সব কয়েনের RVOL ≈ 1.0x।** মানে স্ক্যানার এখন সবকিছু দেখাচ্ছে, স্পাইক নয়। ডিফল্ট ভিউ হবে "RVOL ≥ 2x" ফিল্টার।
3. **Bybit Demo শুধু Bybit-এ লিস্টেড কয়েন ট্রেড করতে পারে।** MEXC/WEEX/Binance-এ ধরা পড়া অনেক কয়েন Bybit-এ নেই। সেগুলোর সিগন্যাল **রেকর্ড হবে, কিন্তু ট্রেড হবে না** (status = `UNTRADABLE_ON_BYBIT`)।
4. **Demo রেজাল্ট বাস্তবের চেয়ে ভালো দেখাবে** (স্লিপেজ কম, ছোট কয়েনে ফিল অপ্টিমিস্টিক)। তাই কস্ট-মডেল রাখুন, আর **কমপক্ষে ১০০টা ক্লোজড ট্রেডের আগে** থ্রেশহোল্ড টিউন বা "স্ট্র্যাটেজি কাজ করছে" সিদ্ধান্ত নেবেন না।
5. ছোট কয়েনে pump-and-dump হয়; স্টপ-লস গ্যাপ করে পার হয়ে যেতে পারে। এটা আর্থিক পরামর্শ নয়।

---

## ১. আর্কিটেকচার

```
৪ এক্সচেঞ্জের public data (REST/WS)
        ▼
[Scanner Worker]  ক্যান্ডেল + ফিচার + স্কোর  ──►  signals টেবিল (Supabase)
        ▼
[Risk Gate]  লিকুইডিটি/এক্সপোজার/ডেইলি-লস চেক
        ▼
[Execution Worker]  Bybit Demo REST দিয়ে অর্ডার
        ▼
[Sync Worker]  Bybit private WS + REST reconcile  ──►  paper_trades টেবিল
        ▼
[App UI]  Supabase Realtime + live mark price → লাইভ PnL
```

- সবকিছু **সার্ভার-সাইডে** চলবে (Next.js backend / worker)। Bybit API key কখনো ফ্রন্টএন্ড বান্ডেলে বা HTML-এ যাবে না — শুধু env var।
- UI শুধু Supabase থেকে পড়বে + পাবলিক প্রাইস WS থেকে mark price নেবে। UI থেকে সরাসরি Bybit-এ অর্ডার যাবে না।

---

## ২. Step 1 — Bybit Demo সেটআপ ও যাচাই

**অফিসিয়াল ডকে যা নিশ্চিত (Bybit v5 Demo Trading Service):**
- Demo একটা **আলাদা অ্যাকাউন্ট** (আলাদা user ID)। মেইন Bybit অ্যাকাউন্টে লগইন → **Demo Trading-এ সুইচ** → প্রোফাইল আইকনে হোভার → **API** → key/secret তৈরি। Testnet সাইটে demo key বানাবেন না।
- REST: `https://api-demo.bybit.com`
- Private WebSocket: `wss://stream-demo.bybit.com/v5/private` (শুধু private চ্যানেল)। **Public market data নিন mainnet `wss://stream.bybit.com` থেকে।**
- **WebSocket Trade (WS দিয়ে অর্ডার) Demo-তে সাপোর্টেড নয়** → অর্ডার শুধু REST।
- সব API demo-তে নেই। বেসিক ট্রেডিং রুল রিয়েলের মতোই।
- **Demo-র অর্ডার মাত্র ৭ দিন থাকে** → Bybit-এর হিস্ট্রির ওপর নির্ভর করবেন না; প্রতিটা ট্রেড নিজের DB-তে সংরক্ষণ করুন।
- ডেমো ফান্ড: `POST /v5/account/demo-apply-money` (host: `api-demo.bybit.com`, ৫ req/sec)।
- Rate limit ডিফল্ট, বাড়ানো যায় না।

**Env vars:**
```
BYBIT_DEMO_API_KEY=
BYBIT_DEMO_API_SECRET=
BYBIT_DEMO_REST=https://api-demo.bybit.com
BYBIT_DEMO_PRIVATE_WS=wss://stream-demo.bybit.com/v5/private
BYBIT_PUBLIC_WS=wss://stream.bybit.com/v5/public/linear
```

**Smoke test স্ক্রিপ্ট (এটা পাস না করে পরের ধাপে যাবেন না):**
1. `demo-apply-money` দিয়ে ফান্ড নিন → `GET /v5/account/wallet-balance?accountType=UNIFIED` এ ব্যালেন্স দেখুন
2. `GET /v5/market/instruments-info?category=linear` থেকে BTCUSDT-এর `tickSize`, `qtyStep`, `minOrderQty` পড়ুন
3. ন্যূনতম সাইজে BTCUSDT Market Buy দিন (`orderLinkId` সহ)
4. `POST /v5/position/trading-stop` দিয়ে SL/TP বসান
5. `GET /v5/position/list` এ পজিশন দেখুন → reduce-only Market দিয়ে ক্লোজ করুন
6. `GET /v5/position/closed-pnl` এ ক্লোজড PnL আসছে কিনা দেখুন

**নোট:** অর্ডার-ক্রিয়েটের সময় সরাসরি `takeProfit/stopLoss` পাঠানো Demo-তে কাজ করে কিনা smoke test-এ যাচাই করুন। কাজ না করলে (কিছু ইন্টিগ্রেশনে conditional-order TP/SL demo-তে denied হয়) অর্ডার ফিলের পর `trading-stop` দিয়ে বসান। এই ডিটেইল ডকের বর্তমান ভার্সনের সাথে মিলিয়ে নিন।

---

## ৩. Step 2 — Pre-Pump ডিটেকশন স্ট্র্যাটেজি

**টাইমফ্রেম:** 5m ও 15m ক্যান্ডেল। **ট্রেডের জন্য ক্যান্ডেল-ক্লোজ কনফার্মেশন;** ফর্মিং ক্যান্ডেলে প্রোরেটেড ভলিউম দিয়ে শুধু "Early Alert" (ট্রেড নয়) দেওয়া যাবে।

**ফিচার (প্রতি সিম্বল, প্রতি টাইমফ্রেম):**

| ফিচার | হিসাব | কেন |
|---|---|---|
| RVOL | বর্তমান ক্যান্ডেল ভলিউম ÷ আগের ৪৮ ক্যান্ডেলের **median** | median নিলে আগের স্পাইক বেসলাইন নষ্ট করে না |
| Volume Z-score | (vol − mean) ÷ stdev (২০–৪৮ ক্যান্ডেল) | স্পাইক কতটা অস্বাভাবিক |
| Price Displacement | \|close − open\| ÷ ATR(14) | **যত কম, তত "pump-এর আগে"** — ভলিউম বেশি কিন্তু দাম এখনো শান্ত |
| Range Compression | Bollinger bandwidth percentile (নিচু = squeeze) | ব্রেকআউটের আগের সংকোচন |
| OI Change | ১৫–৩০ মিনিটে OI % পরিবর্তন (Bybit tickers/OI endpoint) | নতুন পজিশন খুলছে কিনা |
| Cross-Exchange Confirm | একই সিম্বলে ≥২ এক্সচেঞ্জে স্পাইক | ৪টা এক্সচেঞ্জ কানেক্ট করার আসল সুবিধা |
| Funding | ফান্ডিং অতিরিক্ত পজিটিভ হলে লং-এ পেনাল্টি | ভিড়-করা লং এড়ানো |

**হার্ড ফিল্টার (পাস না করলে সিগন্যালই নয়):**
- 24h turnover ≥ **$2M** (শুরুর ডিফল্ট; কনফিগে)
- স্প্রেড ≤ 0.15%
- নতুন লিস্টিং (< ৭ দিন) বাদ; stablecoin/leveraged-token বাদ
- BTC মার্কেট-ফিল্টার: গত ১ ঘণ্টায় BTC ≤ −1.5% হলে নতুন LONG এন্ট্রি পজ

**স্কোর (০–১০০), শুরুর ওয়েট — এগুলো ডিফল্ট, ব্যাকটেস্ট করা নয়:**
RVOL 30 + Z-score 15 + Low-displacement 20 + OI 15 + Cross-exchange 10 + Liquidity quality 10। **থ্রেশহোল্ড ≥ 70।**

**ডিরেকশন:** v1 = LONG (pre-pump)। SHORT (volume spike + ব্রেকডাউন + OI↑) কনফিগ ফ্ল্যাগ `ENABLE_SHORTS` দিয়ে — ডিফল্ট বন্ধ; চালু করলে আলাদা টেস্ট দিন (আগের Journal-এ শর্ট কখনো ফায়ার না হওয়ার বাগ ছিল)।

**লাইফসাইকেল ও ডিডুপ:** `DETECTED → SKIPPED(reason) | ORDERED → OPEN → CLOSED_TP | CLOSED_SL | CLOSED_TIME | CLOSED_MANUAL | CLOSED_KILL`
- প্রতি নরম্যালাইজড সিম্বলে একসাথে একটাই ACTIVE সিগন্যাল/ট্রেড
- ক্লোজের পর ৬০–১২০ মিনিট cooldown
- সিম্বল নরম্যালাইজ ইনজেশনের সময় (`BASEUSDT`, আন্ডারস্কোর নয়)

---

## ৪. Step 3 — Risk Gate ও পজিশন সাইজিং (Demo হলেও রিয়েলের মতো)

| প্যারামিটার | ডিফল্ট |
|---|---|
| Risk per trade | ডেমো equity-র 0.5%–1% |
| Max concurrent positions | 5 |
| Leverage cap / margin | ≤ 3x, isolated |
| Stop Loss | `clamp(1.5 × ATR%, 1.5%, 5%)` |
| Take Profit v1 | 2R (একটা TP) |
| Time stop | ৪ ঘণ্টায় 0.5R-ও না এলে ক্লোজ |
| Daily loss limit | রিয়েলাইজড PnL ≤ −3% হলে সেদিনের নতুন এন্ট্রি বন্ধ (UTC দিন) |
| Chase guard | সিগন্যাল প্রাইস থেকে দাম > 0.5% সরে গেলে বা সিগন্যাল > ৬০ সেকেন্ড পুরনো হলে স্কিপ |

- **সাইজ:** `qty = (equity × risk%) ÷ (entry × SL%)` → `qtyStep`/`minOrderQty`/`tickSize` অনুযায়ী round।
- v2 (পরে): TP1 এ ৫০% ক্লোজ, +1R-এ SL breakeven, বাকিটা trailing।
- প্রতিটা স্কিপের কারণ `signals.skip_reason`-এ লিখুন।

---

## ৫. Step 4 — Execution Worker

1. `POST /v5/position/set-leverage` (+ isolated মোড; demo-তে সাপোর্ট smoke test-এ যাচাই)
2. `POST /v5/order/create` — `category=linear`, `side=Buy/Sell`, `orderType=Market`, `qty`, `positionIdx=0`, **`orderLinkId = signal_id`**
3. ফিল কনফার্ম হলে `POST /v5/position/trading-stop` — `stopLoss`, `takeProfit`, `slTriggerBy=MarkPrice`, `tpslMode=Full`
4. **Idempotency:** `orderLinkId` অনন্য → রিট্রাই/ডুপ্লিকেট সিগন্যালে দ্বিতীয় অর্ডার যাবে না
5. HMAC স্বাক্ষর, `recv_window`, সার্ভার-টাইম sync; `retCode ≠ 0` হ্যান্ডলিং; 429-এ exponential backoff
6. SL/TP বসাতে ব্যর্থ হলে **পজিশন খোলা রাখবেন না** → সাথে সাথে reduce-only Market-এ ক্লোজ করে `EXEC_FAILED` লগ করুন

---

## ৬. Step 5 — Sync, PnL ও ডেটাবেস

- Private WS (`wss://stream-demo.bybit.com/v5/private`) সাবস্ক্রাইব: `order`, `execution`, `position`, `wallet`। প্রতি ~২০ সেকেন্ডে ping; ডিসকানেক্টে backoff রিকানেক্ট।
- **রিকানেক্টের পর বা প্রতি ৬০ সেকেন্ডে REST reconcile:** `/v5/position/list`, `/v5/order/realtime`, `/v5/execution/list`, `/v5/position/closed-pnl`। অসঙ্গতি পেলে: Bybit-এ আছে কিন্তু DB-তে নেই → `ORPHAN` ফ্ল্যাগ; DB-তে OPEN কিন্তু Bybit-এ নেই → closed-pnl থেকে ক্লোজ আপডেট।

**`paper_trades` টেবিল (সব ফিল্ড):**
`id, signal_id, symbol, side, qty, leverage, entry_avg, sl, tp, opened_at, closed_at, exit_price, exit_reason, gross_pnl, fees, funding, net_pnl, net_pnl_pct, r_multiple, mfe_pct, mae_pct, score_at_detection, features_json, source_exchanges[], config_version, bybit_order_id, order_link_id`

- ফি `execFee` থেকে, ফান্ডিং Bybit রেকর্ড থেকে — অনুমান নয়।
- সব থ্রেশহোল্ড **একটা ভার্সনড কনফিগে**; প্রতি ট্রেডে `config_version` সেভ, যাতে পরে "কোন সেটিংসে কী ফল" তুলনা করা যায়।

---

## ৭. Step 6 — অ্যাপ UI (মোবাইল-ফার্স্ট, কোনো ডামি ডেটা নয়)

- টপ বারের **"PAPER $10K"** চিপ: এটা এখন লোকাল সিমুলেটেড ব্যালেন্স কিনা চেক করুন। হলে বদলে `BYBIT DEMO` লেবেল + `wallet-balance` থেকে আসল equity দেখান। যে সংখ্যা Bybit Demo থেকে আসেনি তা এখানে থাকবে না।
- **Signals ট্যাব:** প্রতি সিগন্যালে স্ট্যাটাস ব্যাজ — `DETECTED / TRADED / SKIPPED(কারণ) / UNTRADABLE_ON_BYBIT`
- **Paper Trading ড্যাশবোর্ড** (Futures বা Fleet ট্যাবে — এজেন্ট যেটা মানায় বেছে নেবে):
  - Equity, আজকের PnL, ওপেন পজিশন সংখ্যা, মোট এক্সপোজার
  - ওপেন পজিশন কার্ড: সিম্বল, সাইড, entry, mark, **লাইভ uPnL ($ ও %)**, SL↔TP গেজ, বয়স, `[CLOSE]`
  - ক্লোজড ট্রেড লিস্ট + exit reason
  - পারফরম্যান্স: ট্রেড সংখ্যা, win rate, avg win/loss, profit factor, expectancy (R), max drawdown, equity curve; **স্কোর-বাকেট (70–79 / 80–89 / 90+) অনুযায়ী** ও **এক্সচেঞ্জ অনুযায়ী** ফলাফল
  - ১০০ ক্লোজড ট্রেডের কম হলে লাল সতর্কতা: "নমুনা অপর্যাপ্ত — সিদ্ধান্ত নেবেন না"
  - **Auto-Trade ON/OFF** টগল; **Kill Switch** (কনফার্ম মডাল → সব পজিশন reduce-only Market-এ ক্লোজ + নতুন এন্ট্রি বন্ধ + ইভেন্ট লগ)
  - হেলথ লাইন: শেষ স্ক্যান, WS স্ট্যাটাস, শেষ Bybit sync, শেষ reconcile (প্রতিটার টাইমস্ট্যাম্প)
- লাইভ uPnL = পাবলিক WS-এর mark price থেকে ক্লায়েন্টে হিসাব; **চূড়ান্ত PnL = Bybit-এর closed-pnl/DB**।
- খালি স্টেট সৎভাবে দেখান ("কোনো ওপেন পজিশন নেই")। শিমার স্কেলিটন ঠিক আছে, ফেক সংখ্যা নয়।

---

## ৮. Step 7 — টেস্ট ও অ্যাকসেপ্টেন্স

**ইউনিট টেস্ট:** ফিচার ক্যালকুলেশন (ফিক্সচার ক্যান্ডেল দিয়ে), স্কোরিং, সাইজিং রাউন্ডিং, ডিডুপ, **একই সিগন্যাল দুবার → একটাই অর্ডার**।
**ইন্টিগ্রেশন:** Step 1-এর smoke test পুরোটা পাস।
**ফেইলিওর ইনজেকশন:**
- ট্রেড খোলা অবস্থায় WS কেটে দিন → রিকানেক্ট + reconcile-এ ঠিক হয়
- 429 → backoff, ডুপ্লিকেট অর্ডার নয়
- SL/TP বসানো ব্যর্থ → পজিশন অটো-ক্লোজ
- Kill Switch → সব ক্লোজ, নতুন এন্ট্রি বন্ধ

**লাইভ ফেজ:** ১–২ সপ্তাহ Auto-Trade চালান → ১০০+ ক্লোজড ট্রেড → স্কোর-বাকেট/এক্সচেঞ্জ অনুযায়ী ফল দেখে তবেই থ্রেশহোল্ড টিউন।

**ফাইনাল চেকলিস্ট:**
- [ ] Smoke test পাস (ফান্ড → অর্ডার → SL/TP → ক্লোজ → closed-pnl)
- [ ] কোনো API key ফ্রন্টএন্ড কোডে/HTML-এ নেই (সিকিউরিটি অডিট পাস)
- [ ] UI-র প্রতিটা PnL/equity সংখ্যা Bybit Demo বা DB থেকে আসছে
- [ ] ডুপ্লিকেট ACTIVE ট্রেড নেই; সিম্বল ফরম্যাট একরকম
- [ ] Reconcile ৬০ সেকেন্ডে চলছে, টাইমস্ট্যাম্প UI-তে দৃশ্যমান
- [ ] Kill Switch সত্যিই ক্লোজ করে (টেস্ট করা)
- [ ] ব্রাউজার কনসোলে নতুন এরর নেই
