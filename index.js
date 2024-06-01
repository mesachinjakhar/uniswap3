const JSBI = require('jsbi')
const { TickMath, FullMath } = require('@uniswap/v3-sdk')

const baseToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
const quoteToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // WBTC

async function main(
  baseToken,
  quoteToken,
  inputAmount,
  currentTick,
  baseTokenDecimals,
  quoteTokenDecimals
) {
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(currentTick)
  const ratioX192 = JSBI.multiply(sqrtRatioX96, sqrtRatioX96)

  const baseAmount = JSBI.BigInt( inputAmount * (10 ** baseTokenDecimals))

  const shift = JSBI.leftShift( JSBI.BigInt(1), JSBI.BigInt(192))

  const quoteAmount = FullMath.mulDivRoundingUp(ratioX192, baseAmount, shift)
  console.log('quoteAmount', quoteAmount.toString() / (10**quoteTokenDecimals))

  return quoteAmount
}

main(
  baseToken,
  quoteToken,
  1,
  193914,
  8,
  18,
)
