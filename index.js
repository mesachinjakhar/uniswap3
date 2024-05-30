const { ethers } = require('ethers');
const { Pool, Route, Trade } = require('@uniswap/v3-sdk');
const { Token, CurrencyAmount, TradeType } = require('@uniswap/sdk-core');

// Load config
const config = {
  DEFAULT_API_PORT: 5001,
  DEFAULT_NODE_URL: "http://127.0.0.1:8545",
  UNISWAPV3_FACTORY_ADDRESS: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  UNISWAPV3_QUOTER_ADDRESS: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  WETH_ADDRESS_MAINNET: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  CUSTOM_AMOUNT: "500000000000000000" // 0.5 WETH in Wei
};

async function getSwapPrice() {
  try {
    // Connect to local Erigon node
    const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

    // Token definitions
    const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');
    const WETH = new Token(1, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');

    // Get pool data from Uniswap V3
    const poolAddress = await getPoolAddress(provider, DAI, WETH, 3000); // 0.3% fee tier
    console.log(`Pool address: ${poolAddress}`);
    
    if (!poolAddress || poolAddress === ethers.constants.AddressZero) {
      throw new Error('Pool address not found');
    }

    const poolContract = new ethers.Contract(poolAddress, [
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function liquidity() external view returns (uint128)'
    ], provider);

    const slot0 = await poolContract.slot0();
    const liquidity = await poolContract.liquidity();
    console.log(`Slot0: ${JSON.stringify(slot0)}`);
    console.log(`Liquidity: ${liquidity}`);

    const pool = new Pool(
      DAI,
      WETH,
      3000,
      slot0.sqrtPriceX96.toString(),
      liquidity.toString(),
      slot0.tick
    );

    console.log(`Pool: ${JSON.stringify(pool)}`);

    // Create trade route and execute trade
    const route = new Route([pool], WETH, DAI);
    console.log(`Route: ${JSON.stringify(route)}`);

    const amountIn = CurrencyAmount.fromRawAmount(WETH, ethers.BigNumber.from(config.CUSTOM_AMOUNT));
    console.log(`Amount In: ${JSON.stringify(amountIn)}`);

    // Ensure route, amountIn, input, and output currencies are properly defined
    if (!route || !amountIn || !route.input || !route.output) {
      throw new Error('Route, AmountIn, or route input/output is not properly defined');
    }

    // Log properties of amountIn
    console.log(`amountIn numerator: ${amountIn.numerator}`);
    console.log(`amountIn denominator: ${amountIn.denominator}`);

    // Check if amountIn properties are properly defined
    if (!amountIn.numerator || !amountIn.denominator) {
      throw new Error('AmountIn numerator or denominator is not properly defined');
    }

    const trade = new Trade(route, amountIn, TradeType.EXACT_INPUT);
    console.log(`Trade: ${JSON.stringify(trade)}`);
    console.log(`1 WETH to DAI: ${trade.outputAmount.toSignificant(6)} DAI`);
  } catch (error) {
    console.error('Error creating trade:', error);
  }
}

// Helper function to get pool address
async function getPoolAddress(provider, tokenA, tokenB, fee) {
  const factoryContract = new ethers.Contract(config.UNISWAPV3_FACTORY_ADDRESS, [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
  ], provider);

  return await factoryContract.getPool(tokenA.address, tokenB.address, fee);
}

getSwapPrice().catch(console.error);

