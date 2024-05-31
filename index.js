const { ethers } = require('ethers');
const { Pool } = require('@uniswap/v3-sdk');
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

async function getSwapPrice() {
  const immutables = await getPoolImmutables();
  const state = await getPoolState();

  const pool = new Pool(
    tokenA,
    tokenB,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );

  const token0Price = pool.token0Price.toSignificant(6);
  const token1Price = pool.token1Price.toSignificant(6);

  // Calculate the price in a more interpretable format
  const ethToUsdc = (1 / parseFloat(token1Price)).toFixed(2); // 1 ETH in USDC
  const usdcToEth = parseFloat(token1Price).toFixed(6);       // 1 USDC in ETH

  console.log(`1 ETH = ${ethToUsdc} USDC`);
  console.log(`1 USDC = ${usdcToEth} ETH`);
}

getSwapPrice().catch(console.error);
