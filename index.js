const { AlphaRouter } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { ethers } = require('ethers');
const JSBI = require('jsbi');
const axios = require('axios');
require('dotenv').config();

const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';
const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

const INFURA_TEST_URL = process.env.INFURA_TEST_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const web3Provider = new ethers.providers.JsonRpcProvider(INFURA_TEST_URL);
const chainId = 1;

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

async function fetchGasPrices() {
  try {
    const response = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`);
    const gasData = response.data.result;
    return {
      low: gasData.SafeGasPrice,
      average: gasData.ProposeGasPrice,
      high: gasData.FastGasPrice,
    };
  } catch (error) {
    console.error("Error fetching gas prices:", error);
    return { low: 10, average: 20, high: 30 };  // Default values in gwei
  }
}

async function checkPoolLiquidity(tokenA, tokenB) {
  try {
    const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, [
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ], web3Provider);
    const poolAddress = await factoryContract.getPool(tokenA.address, tokenB.address, 3000); // Use appropriate fee tier

    if (!poolAddress || poolAddress === ethers.constants.AddressZero) {
      throw new Error("Pool does not exist.");
    }

    const poolContract = new ethers.Contract(poolAddress, [
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function liquidity() external view returns (uint128)'
    ], web3Provider);

    const [slot0, liquidity] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity()
    ]);

    return {
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: slot0.tick,
      liquidity: liquidity.toString()
    };
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
    console.log(`Pool Liquidity: ${JSON.stringify(liquidity)}`);

    const route = await router.route(
      inputAmount,
      UNI,
      TradeType.EXACT_INPUT,
      {
        recipient: '0x0000000000000000000000000000000000000000',  // Ensure a valid recipient address
        slippageTolerance: new Percent(25, 100),  // Adjust as necessary
        deadline: Math.floor(Date.now() / 1000 + 1800),  // Ensure this is appropriately set
        gasPrice: ethers.utils.parseUnits(gasPrices.average, 'gwei')  // Set gas price
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
