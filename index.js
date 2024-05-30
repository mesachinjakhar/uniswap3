const { ethers } = require('ethers');
const { Pool, Route, Trade, TradeType } = require('@uniswap/v3-sdk');
const { Token, CurrencyAmount } = require('@uniswap/sdk-core');

// Load config
const config = {
  DEFAULT_API_PORT: 5001,
  DEFAULT_NODE_URL: "http://127.0.0.1:8545",
  UNISWAPV3_FACTORY_ADDRESS: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  UNISWAPV3_QUOTER_ADDRESS: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  WETH_ADDRESS_MAINNET: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  CUSTOM_AMOUNT: "500000000000000000"
};

async function getSwapPrice() {
  // Connect to local Erigon node
  const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

  // Token definitions
  const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');
  const WETH = new Token(1, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');

  // Get pool data from Uniswap V3
  const poolAddress = await getPoolAddress(provider, DAI, WETH, 3000); // 0.3% fee tier
  const poolContract = new ethers.Contract(poolAddress, [
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() external view returns (uint128)'
  ], provider);

  const slot0 = await poolContract.slot0();
  const liquidity = await poolContract.liquidity();

  const pool = new Pool(
    DAI,
    WETH,
    3000,
    slot0.sqrtPriceX96.toString(),
    liquidity.toString(),
    slot0.tick
  );

  // Create trade route and execute trade
  const route = new Route([pool], WETH, DAI);
  const amountIn = CurrencyAmount.fromRawAmount(WETH, config.CUSTOM_AMOUNT);
  const trade = new Trade(route, amountIn, TradeType.EXACT_INPUT);

  console.log(`1 ETH to DAI: ${trade.outputAmount.toSignificant(6)} DAI`);
}

// Helper function to get pool address
async function getPoolAddress(provider, tokenA, tokenB, fee) {
  const factoryContract = new ethers.Contract(config.UNISWAPV3_FACTORY_ADDRESS, [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
  ], provider);

  return await factoryContract.getPool(tokenA.address, tokenB.address, fee);
}

getSwapPrice().catch(console.error);
