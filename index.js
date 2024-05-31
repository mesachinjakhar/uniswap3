const { AlphaRouter } = require('@uniswap/smart-order-router')
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core')
const { ethers, BigNumber } = require('ethers')
const JSBI  = require('jsbi') // jsbi@3.2.5

const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

require('dotenv').config()
const INFURA_TEST_URL = process.env.ERIGON_URL

const web3Provider = new ethers.providers.JsonRpcProvider(INFURA_TEST_URL) // Ropsten

const chainId = 3
const router = new AlphaRouter({ chainId: chainId, provider: web3Provider})

const name0 = 'Wrapped Ether'
const symbol0 = 'WETH'
const decimals0 = 18
const address0 = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

const name1 = 'DAI Token'
const symbol1 = 'DAI'
const decimals1 = 18
const address1 = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'

const WETH = new Token(chainId, address0, decimals0, symbol0, name0)
const UNI = new Token(chainId, address1, decimals1, symbol1, name1)

const wei = ethers.utils.parseUnits('1', 18)
const inputAmount = CurrencyAmount.fromRawAmount(WETH, JSBI.BigInt(wei))

async function main() {
  try {
    const route = await router.route(
      inputAmount,
      UNI,
      TradeType.EXACT_INPUT,
      {
        recipient: '0x0000000000000000000000000000000000000000', // dummy recipient address
        slippageTolerance: new Percent(25, 100),
        deadline: Math.floor(Date.now()/1000 + 1800)
      }
    )

    if (!route) {
      console.log("No route found for the specified tokens.")
      return
    }

    console.log(`Quote Exact In: ${route.quote.toFixed(10)}`)
  } catch (error) {
    console.error("Error:", error)
  }
}

main()
