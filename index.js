const JSBI = require('jsbi');
const { TickMath, FullMath } = require('@uniswap/v3-sdk');
const { ethers } = require('ethers');

// Example token addresses: WETH and USDT
const baseToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
const quoteToken = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT

async function main(
  baseToken,
  quoteToken,
  inputAmount,
  currentTick,
  baseTokenDecimals,
  quoteTokenDecimals
) {
  // Get sqrtRatioX96 from the current tick
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(currentTick);
  const ratioX192 = JSBI.multiply(sqrtRatioX96, sqrtRatioX96);

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

main(
  baseToken,
  quoteToken,
  1,           // 1 ETH
  193914,      // example tick value, should be fetched from current pool state
  18,          // WETH decimals
  6            // USDT decimals
).catch(console.error);
