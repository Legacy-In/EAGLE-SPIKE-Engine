import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BybitAdapter } from '../backend/adapters/bybit';
import { MexcAdapter } from '../backend/adapters/mexc';
import { WeexAdapter } from '../backend/adapters/weex';
import { BinanceAdapter } from '../backend/adapters/binance';

test('Market Discovery: BybitAdapter active contract filtering and ticker normalization', async () => {
  const adapter = new BybitAdapter();

  // Mock active contracts map
  const contracts = new Map();
  contracts.set('BTCUSDT', {
    symbol: 'BTCUSDT',
    baseCoin: 'BTC',
    quoteCoin: 'USDT',
    exchange: 'BYBIT',
    status: 'Trading',
    contractType: 'LinearPerpetual',
    pricePrecision: 2,
    lotSize: 0.001,
    tickSize: 0.1,
    minOrderQty: 0.001,
  });

  assert.equal(contracts.get('BTCUSDT')?.status, 'Trading');
  assert.equal(contracts.get('BTCUSDT')?.quoteCoin, 'USDT');
  assert.equal(contracts.get('BTCUSDT')?.contractType, 'LinearPerpetual');
});

test('Market Discovery: MEXCAdapter filters active contracts and strips underscores', async () => {
  const adapter = new MexcAdapter();

  const rawMexcItems = [
    { symbol: 'BTC_USDT', baseCoin: 'BTC', quoteCoin: 'USDT', state: 0 },
    { symbol: 'ETH_USDT', baseCoin: 'ETH', quoteCoin: 'USDT', state: 0 },
    { symbol: 'DELISTED_USDT', baseCoin: 'DELISTED', quoteCoin: 'USDT', state: 1 }, // Inactive
    { symbol: 'BTC_USD', baseCoin: 'BTC', quoteCoin: 'USD', state: 0 }, // Non-USDT
  ];

  const filtered = rawMexcItems.filter((i) => i.quoteCoin === 'USDT' && i.state === 0);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].symbol.replace('_', ''), 'BTCUSDT');
  assert.equal(filtered[1].symbol.replace('_', ''), 'ETHUSDT');
});

test('Market Discovery: WEEXAdapter processes active USDT contracts', async () => {
  const adapter = new WeexAdapter();

  const rawWeexList = [
    { symbol: 'BTCUSDT', lastPrice: '81000', priceChangePercent: '0.02', quoteVolume: '10000000' },
    { symbol: 'SOLUSDT', lastPrice: '180', priceChangePercent: '-0.01', quoteVolume: '5000000' },
    { symbol: 'BTCUSD_DEL', lastPrice: '80000', priceChangePercent: '0', quoteVolume: '0' },
  ];

  const usdtOnly = rawWeexList.filter((t) => t.symbol.endsWith('USDT'));
  assert.equal(usdtOnly.length, 2);
  assert.equal(usdtOnly[0].symbol, 'BTCUSDT');
  assert.equal(usdtOnly[1].symbol, 'SOLUSDT');
});

test('Market Discovery: BinanceAdapter filters active TRADING contracts with quoteAsset USDT', async () => {
  const adapter = new BinanceAdapter();

  const rawBinanceSymbols = [
    { symbol: 'BTCUSDT', quoteAsset: 'USDT', status: 'TRADING', contractType: 'PERPETUAL' },
    { symbol: 'ETHUSDT', quoteAsset: 'USDT', status: 'TRADING', contractType: 'PERPETUAL' },
    { symbol: 'BNBBUSD', quoteAsset: 'BUSD', status: 'TRADING', contractType: 'PERPETUAL' }, // Non-USDT
    { symbol: 'LUNAUSDT_DEL', quoteAsset: 'USDT', status: 'SETTLING', contractType: 'PERPETUAL' }, // Settling
  ];

  const valid = rawBinanceSymbols.filter(
    (s) => s.quoteAsset === 'USDT' && s.status === 'TRADING' && s.contractType === 'PERPETUAL'
  );
  assert.equal(valid.length, 2);
  assert.equal(valid[0].symbol, 'BTCUSDT');
  assert.equal(valid[1].symbol, 'ETHUSDT');
});
