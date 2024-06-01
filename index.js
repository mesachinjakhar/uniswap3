const JSBI = require('jsbi')
const { TickMath, FullMath } = require('@uniswap/v3-sdk')

const baseToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
const quoteToken = '0x6B175474E89094C44Da98b954EedeAC495271d0F' // WBTC

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
  -82408,
  8,
  18,
)
