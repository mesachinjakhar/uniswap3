const { ethers } = require('ethers');
const { Pool, TickMath, encodeSqrtRatioX96 } = require('@uniswap/v3-sdk');
const { Token, Price } = require('@uniswap/sdk-core');

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Replace with your Erigon node URL

// Replace these with the addresses of the tokens you're interested in
const tokenA = new Token(1, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'WETH');
const tokenB = new Token(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'USDC');

// Replace with the address of the Uniswap V3 pool
const poolAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';

async function getPoolImmutables() {
  const poolContract = new ethers.Contract(
    poolAddress,
    [
      'function factory() external view returns (address)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)',
      'function fee() external view returns (uint24)',
      'function tickSpacing() external view returns (int24)',
      'function maxLiquidityPerTick() external view returns (uint128)',
    ],
    provider
  );

  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
    poolContract.factory(),
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.tickSpacing(),
    poolContract.maxLiquidityPerTick(),
  ]);

  return {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  };
}

async function getPoolState() {
  const poolContract = new ethers.Contract(
    poolAddress,
    [
      'function liquidity() external view returns (uint128)',
      'function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)',
    ],
    provider
  );

  const [liquidity, slot0] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

  return {
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
    observationIndex: slot0[2],
    observationCardinality: slot0[3],
    observationCardinalityNext: slot0[4],
    feeProtocol: slot0[5],
    unlocked: slot0[6],
  };
}

function calculatePriceFromSqrtPriceX96(sqrtPriceX96, decimals0, decimals1) {
  // Price = (sqrtPriceX96 ^ 2) / (2 ^ 192)
  // Convert sqrtPriceX96 to a human-readable price using the token decimals
  const price = (sqrtPriceX96 ** 2) / 2 ** 192;
  return price * (10 ** (decimals1 - decimals0));
}

async function getSwapPrice() {
  const immutables = await getPoolImmutables();
  const state = await getPoolState();

  console.log('Immutables:', immutables);
  console.log('State:', state);

  // Calculate the price from sqrtPriceX96
  const ethToUsdcPrice = calculatePriceFromSqrtPriceX96(state.sqrtPriceX96, tokenA.decimals, tokenB.decimals);
  const usdcToEthPrice = 1 / ethToUsdcPrice;

  console.log(`1 ETH = ${ethToUsdcPrice.toFixed(2)} USDC`);
  console.log(`1 USDC = ${usdcToEthPrice.toFixed(6)} ETH`);
}

getSwapPrice().catch(console.error);
