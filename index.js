const { ethers } = require('ethers');
const JSBI = require('jsbi');
const { TickMath, FullMath } = require('@uniswap/v3-sdk');
const { Pool, nearestUsableTick } = require('@uniswap/v3-sdk');
const { Fetcher, Route, Trade, Token, TokenAmount, TradeType } = require('@uniswap/sdk');

// Local Erigon node provider setup
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

// Example token addresses: WETH and USDT
const baseToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
const quoteToken = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT
const poolAddress = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'; // WETH/USDT pool address

async function getPoolState(poolAddress) {
  const poolAbi = [
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() view returns (uint128)'
  ];

  const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);

  const slot0 = await poolContract.slot0();
  const liquidity = await poolContract.liquidity();

  return {
    sqrtPriceX96: slot0.sqrtPriceX96,
    tick: slot0.tick,
    liquidity: liquidity
  };
}

async function main() {
  const poolState = await getPoolState(poolAddress);
  const currentTick = poolState.tick;

  // Get sqrtRatioX96 from the current tick
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(currentTick);
  const ratioX192 = JSBI.multiply(sqrtRatioX96, sqrtRatioX96);

  // Input amount of 1 ETH
  const inputAmount = 1;
  const baseTokenDecimals = 18;
  const quoteTokenDecimals = 6;

  // Convert input amount to base token's smallest unit
  const baseAmount = JSBI.BigInt(inputAmount * (10 ** baseTokenDecimals));

  // Calculate the shift value
  const shift = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(192));

  // Calculate the quote amount
  const quoteAmount = FullMath.mulDivRoundingUp(ratioX192, baseAmount, shift);

  // Convert quote amount to human-readable format
  const quoteAmountHumanReadable = quoteAmount.toString() / (10 ** quoteTokenDecimals);

  console.log('quoteAmount', quoteAmountHumanReadable);

  return quoteAmountHumanReadable;
}

main().catch(console.error);
