const { ethers } = require('ethers');
const { Pool } = require('@uniswap/v3-sdk');
const { Token, Price } = require('@uniswap/sdk-core');

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Replace with your Erigon node URL

// Replace these with the addresses of the tokens you're interested in
const tokenA = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI');
const tokenB = new Token(1, '0x853d955aCEf822Db058eb8505911ED77F175b99e', 6, 'USDC', 'USDC');

// Replace with the address of the Uniswap V3 pool
const poolAddress = '0x97e7d56A0408570bA1a7852De36350f7713906ec';

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

  // Correcting the interpretation of the pool price based on token ordering
  let ethToUsdc, usdcToEth;

  if (immutables.token0.toLowerCase() === tokenA.address.toLowerCase()) {
    ethToUsdc = pool.token0Price;
    usdcToEth = pool.token1Price;
  } else {
    ethToUsdc = pool.token1Price;
    usdcToEth = pool.token0Price;
  }

  const ethToUsdcPrice = ethToUsdc.toSignificant(6);
  const usdcToEthPrice = usdcToEth.toSignificant(6);

  console.log(`1 ETH = ${ethToUsdcPrice} USDC`);
  console.log(`1 USDC = ${usdcToEthPrice} ETH`);
}

getSwapPrice().catch(console.error);
