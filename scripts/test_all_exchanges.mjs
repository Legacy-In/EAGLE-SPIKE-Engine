
async function testBybit() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = json?.result?.list || [];
    const btc = list.find(t => t.symbol === 'BTCUSDT');
    return {
      exchange: 'Bybit Linear V5',
      status: 'OK',
      latency: `${latency}ms`,
      totalPairs: list.length,
      samplePrice: btc ? `$${parseFloat(btc.lastPrice).toLocaleString()} (${btc.price24hPcnt >= 0 ? '+' : ''}${(parseFloat(btc.price24hPcnt)*100).toFixed(2)}%)` : 'N/A',
      sampleTurnover24h: btc ? `$${(parseFloat(btc.turnover24h)/1e6).toFixed(1)}M USDT` : 'N/A',
      isLive: list.length > 500 && !!btc,
      details: `Retrieved ${list.length} perpetual contracts. Top pair: BTCUSDT @ ${btc?.lastPrice}`
    };
  } catch (err) {
    return {
      exchange: 'Bybit Linear V5',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testBinanceSpot() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      exchange: 'Binance Spot V3',
      status: 'OK',
      latency: `${latency}ms`,
      samplePrice: `$${parseFloat(data.lastPrice).toLocaleString()} (${parseFloat(data.priceChangePercent) >= 0 ? '+' : ''}${parseFloat(data.priceChangePercent).toFixed(2)}%)`,
      volume24h: `${parseFloat(data.volume).toFixed(2)} BTC`,
      isLive: parseFloat(data.lastPrice) > 10000,
      details: `24h High: $${parseFloat(data.highPrice).toLocaleString()}, 24h Low: $${parseFloat(data.lowPrice).toLocaleString()}`
    };
  } catch (err) {
    return {
      exchange: 'Binance Spot V3',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testBinanceFutures() {
  const start = Date.now();
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      exchange: 'Binance USDⓈ-M Futures',
      status: 'OK',
      latency: `${latency}ms`,
      samplePrice: `$${parseFloat(data.lastPrice).toLocaleString()}`,
      volume24h: `${parseFloat(data.volume).toFixed(2)} BTC`,
      isLive: parseFloat(data.lastPrice) > 10000,
      details: `Mark/Last Price: $${data.lastPrice}, Quote Volume: $${(parseFloat(data.quoteVolume)/1e6).toFixed(1)}M`
    };
  } catch (err) {
    return {
      exchange: 'Binance USDⓈ-M Futures',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testBinanceWebSocket() {
  return new Promise((resolve) => {
    const start = Date.now();
    let timeout;
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
      timeout = setTimeout(() => {
        ws.terminate();
        resolve({
          exchange: 'Binance WebSocket Trade Stream',
          status: 'TIMEOUT',
          latency: '>5000ms',
          isLive: false,
          error: 'Connection timed out after 5s'
        });
      }, 5000);

      ws.on('open', () => {
        // Connected
      });

      ws.on('message', (msg) => {
        const latency = Date.now() - start;
        clearTimeout(timeout);
        ws.close();
        try {
          const parsed = JSON.parse(msg.toString());
          resolve({
            exchange: 'Binance WebSocket Trade Stream',
            status: 'OK',
            latency: `${latency}ms`,
            isLive: !!parsed.p,
            details: `Received live trade packet: price $${parseFloat(parsed.p).toLocaleString()}, qty ${parsed.q} BTC, tradeTime ${new Date(parsed.T).toISOString()}`
          });
        } catch (e) {
          resolve({
            exchange: 'Binance WebSocket Trade Stream',
            status: 'ERROR',
            error: e.message
          });
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          exchange: 'Binance WebSocket Trade Stream',
          status: 'FAILED',
          error: err.message
        });
      });
    } catch (err) {
      clearTimeout(timeout);
      resolve({
        exchange: 'Binance WebSocket Trade Stream',
        status: 'FAILED',
        error: err.message
      });
    }
  });
}

async function testMexc() {
  const start = Date.now();
  try {
    const apiKey = '6c164b31390e4c0484cdda7f9d6dd0ea';
    const res = await fetch('https://contract.mexc.com/api/v1/contract/ticker', {
      headers: {
        'ApiKey': apiKey,
        'User-Agent': 'EAGLE-FLASH/2.0'
      }
    });
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = json?.data || [];
    const btc = list.find(t => t.symbol && t.symbol.includes('BTC'));
    return {
      exchange: 'MEXC Contract V1',
      status: 'OK',
      latency: `${latency}ms`,
      totalPairs: list.length,
      samplePrice: btc ? `$${parseFloat(btc.lastPrice).toLocaleString()} (${btc.riseFallRate >= 0 ? '+' : ''}${(parseFloat(btc.riseFallRate)*100).toFixed(2)}%)` : 'N/A',
      isLive: list.length > 500 && !!btc,
      details: `Retrieved ${list.length} perpetual contracts. Top pair: ${btc?.symbol} @ $${btc?.lastPrice}`
    };
  } catch (err) {
    return {
      exchange: 'MEXC Contract V1',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testWeex() {
  const start = Date.now();
  try {
    const apiKey = 'weex_48ca99a066414970ce63820f55970691';
    const res = await fetch('https://api-contract.weex.com/capi/v3/market/ticker/24hr', {
      headers: {
        'ACCESS-KEY': apiKey,
        'User-Agent': 'EAGLE-FLASH/2.0'
      }
    });
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('Response is not an array');
    const btc = list.find(t => t.symbol && t.symbol.includes('BTC'));
    return {
      exchange: 'WEEX Contract V3',
      status: 'OK',
      latency: `${latency}ms`,
      totalPairs: list.length,
      samplePrice: btc ? `$${parseFloat(btc.lastPrice || btc.close).toLocaleString()}` : 'N/A',
      isLive: list.length > 500,
      details: `Retrieved ${list.length} perpetual contracts. Top pair: ${btc?.symbol} @ $${btc?.lastPrice || btc?.close}`
    };
  } catch (err) {
    return {
      exchange: 'WEEX Contract V3',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testOkx() {
  const start = Date.now();
  try {
    const res = await fetch('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const ticker = json?.data?.[0];
    return {
      exchange: 'OKX Spot / Perp',
      status: 'OK',
      latency: `${latency}ms`,
      samplePrice: ticker ? `$${parseFloat(ticker.last).toLocaleString()}` : 'N/A',
      isLive: !!ticker && parseFloat(ticker.last) > 10000,
      details: `OKX Inst: ${ticker?.instId}, 24h Vol: ${ticker?.vol24h} BTC, 24h High: $${ticker?.high24h}`
    };
  } catch (err) {
    return {
      exchange: 'OKX Spot / Perp',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testCoinGecko() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      exchange: 'CoinGecko Global Aggregator',
      status: 'OK',
      latency: `${latency}ms`,
      samplePrice: `BTC: $${data.bitcoin?.usd?.toLocaleString()} (${data.bitcoin?.usd_24h_change?.toFixed(2)}%), ETH: $${data.ethereum?.usd?.toLocaleString()}`,
      isLive: !!data.bitcoin?.usd,
      details: `Global aggregated crypto spot benchmark`
    };
  } catch (err) {
    return {
      exchange: 'CoinGecko Global Aggregator',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function testAlternativeMe() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const latency = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const item = json?.data?.[0];
    return {
      exchange: 'Alternative.me Sentiment (Fear & Greed)',
      status: 'OK',
      latency: `${latency}ms`,
      sentimentValue: `${item?.value} (${item?.value_classification})`,
      isLive: !!item?.value,
      details: `Index: ${item?.value}/100, Classification: ${item?.value_classification}, Timestamp: ${new Date(item?.timestamp * 1000).toISOString()}`
    };
  } catch (err) {
    return {
      exchange: 'Alternative.me Sentiment (Fear & Greed)',
      status: 'FAILED',
      latency: `${Date.now() - start}ms`,
      error: err.message
    };
  }
}

async function main() {
  console.log('====================================================');
  console.log('🦅 EAGLE FLASH & SIGMA EXCHANGE API VERIFICATION LAB');
  console.log('TESTING ALL CONNECTED EXCHANGES WITH LIVE MARKET DATA');
  console.log('====================================================\n');

  console.log('Testing live endpoints concurrently...\n');
  const results = await Promise.all([
    testBybit(),
    testBinanceSpot(),
    testBinanceFutures(),
    testBinanceWebSocket(),
    testMexc(),
    testWeex(),
    testOkx(),
    testCoinGecko(),
    testAlternativeMe()
  ]);

  console.log('RESULTS:');
  console.log('----------------------------------------------------');
  results.forEach((r, i) => {
    console.log(`[${i + 1}] ${r.exchange}`);
    console.log(`    Status:  ${r.status === 'OK' ? '✅ ONLINE (LIVE DATA)' : '❌ ' + r.status}`);
    console.log(`    Latency: ${r.latency}`);
    if (r.samplePrice) console.log(`    Price:   ${r.samplePrice}`);
    if (r.totalPairs) console.log(`    Pairs:   ${r.totalPairs} contracts`);
    if (r.sentimentValue) console.log(`    Value:   ${r.sentimentValue}`);
    if (r.details) console.log(`    Details: ${r.details}`);
    if (r.error) console.log(`    Error:   ${r.error}`);
    console.log('');
  });

  const allPassed = results.every(r => r.status === 'OK');
  console.log('----------------------------------------------------');
  console.log(`SUMMARY: ${results.filter(r => r.status === 'OK').length} / ${results.length} Exchange Feeds Active.`);
  if (allPassed) {
    console.log('🎉 ALL EXCHANGE APIS WORK PROPERLY WITH REAL LIVE DATA!');
  } else {
    console.log('⚠️ Some feeds failed. Review error output above.');
  }
}

main();
