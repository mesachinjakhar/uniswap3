const { AlphaRouter } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { ethers } = require('ethers');
const JSBI = require('jsbi');
const axios = require('axios');  // To fetch gas prices

require('dotenv').config();

const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';

const INFURA_TEST_URL = process.env.INFURA_TEST_URL;  // Ensure this URL is correct
const web3Provider = new ethers.providers.JsonRpcProvider(INFURA_TEST_URL);
const chainId = 1;  // Set to the correct chain ID for mainnet or testnet

const router = new AlphaRouter({ chainId: chainId, provider: web3Provider });

const name0 = 'Wrapped Ether';
const symbol0 = 'WETH';
const decimals0 = 18;
const address0 = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const name1 = 'Uni token';
const symbol1 = 'UNI';
const decimals1 = 18;
const address1 = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

const WETH = new Token(chainId, address0, decimals0, symbol0, name0);
const UNI = new Token(chainId, address1, decimals1, symbol1, name1);

const wei = ethers.utils.parseUnits('0.01', 18);
const inputAmount = CurrencyAmount.fromRawAmount(WETH, JSBI.BigInt(wei));

// Function to fetch current gas prices
async function fetchGasPrices() {
  try {
    const response = await axios.get('https://ethgasstation.info/api/ethgasAPI.json');
    const gasData = response.data;
    return {
      low: gasData.safeLow / 10,
      average: gasData.average / 10,
      high: gasData.fast / 10,
    };
  } catch (error) {
    console.error("Error fetching gas prices:", error);
    return { low: 10, average: 20, high: 30 };  // Default values in gwei
  }
}

// Function to check pool liquidity
async function checkPoolLiquidity(tokenA, tokenB) {
  try {
    const pairAddress = ethers.utils.getAddress(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [tokenA.address, tokenB.address].sort()
    )));
    const pairContract = new ethers.Contract(pairAddress, [
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
    ], web3Provider);
    const reserves = await pairContract.getReserves();
    return { reserve0: reserves.reserve0.toString(), reserve1: reserves.reserve1.toString() };
  } catch (error) {
    console.error("Error checking pool liquidity:", error);
    return null;
  }
}

async function main() {
  try {
    const gasPrices = await fetchGasPrices();
    const liquidity = await checkPoolLiquidity(WETH, UNI);

    if (!liquidity) {
      console.log("Liquidity data is unavailable or insufficient.");
      return;
    }

    console.log(`Current Gas Prices (Gwei): Low: ${gasPrices.low}, Average: ${gasPrices.average}, High: ${gasPrices.high}`);
    console.log(`Pool Liquidity: WETH: ${liquidity.reserve0}, UNI: ${liquidity.reserve1}`);

    const route = await router.route(
      inputAmount,
      UNI,
      TradeType.EXACT_INPUT,
      {
        recipient: '0x0000000000000000000000000000000000000000',  // Ensure a valid recipient address
        slippageTolerance: new Percent(25, 100),  // Adjust as necessary
        deadline: Math.floor(Date.now() / 1000 + 1800),  // Ensure this is appropriately set
        gasPrice: ethers.utils.parseUnits(gasPrices.average.toString(), 'gwei')  // Set gas price
      }
    );

    if (!route) {
      console.log("No route found for the specified tokens.");
      return;
    }

    console.log(`Quote Exact In: ${route.quote.toFixed(10)}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
