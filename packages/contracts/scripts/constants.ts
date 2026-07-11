/**
 * HashKey Chain addresses and network constants for MultiMarkets.
 */

export const HASHKEY_MAINNET = {
  chainId: 177,
  rpc: "https://mainnet.hsk.xyz",
  explorer: "https://hashkey.blockscout.com",
  tokens: {
    USDT: "0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029",
    USDC: "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
    WHSK: "0xB210D2120d57b758EE163cFfb43e73728c471Cf1",
  },
  apro: {
    "BTC/USD": "0x204ED500ab56A2E19B051561258E3A45c850360F",
    "USDT/USD": "0x823d7f90f7A3498DB6595886b6B5dC95E6B0B7f3",
    "USDC/USD": "0x244Ce344df8837c9d938867E2Ffbf0E4B0169B56",
    "HSK/USD": "0x86CE42c1b714149Dc3A7b17169EF67b5F78A224b",
  },
  supra: {
    pull: "0x16f70cAD28dd621b0072B5A8a8c392970E87C3dD",
  },
} as const;

export const HASHKEY_TESTNET = {
  chainId: 133,
  rpc: "https://testnet.hsk.xyz",
  explorer: "https://testnet-explorer.hsk.xyz",
} as const;
