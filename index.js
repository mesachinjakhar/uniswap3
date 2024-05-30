const { ethers } = require('ethers');
const { computePoolAddress } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json').abi;

// Define token constants
const WETH_TOKEN = new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether');
const DAI_TOKEN = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

// Configuration
const config = {
  rpc: {
    local: 'http://localhost:8545', // Update with your Erigon node URL
  },
  tokens: {
    in: WETH_TOKEN,
    out: DAI_TOKEN,
    poolFee: 500,
  },
  POOL_FACTORY_CONTRACT_ADDRESS: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // Uniswap V3 factory address
};

async function getSwapPrice() {
  try {
    // Connect to provider
    const provider = new ethers.providers.JsonRpcProvider(config.rpc.local);

    // Compute pool address
    const currentPoolAddress = computePoolAddress({
      factoryAddress: config.POOL_FACTORY_CONTRACT_ADDRESS,
      tokenA: config.tokens.in,
      tokenB: config.tokens.out,
      fee: config.tokens.poolFee,
    });

    // Instantiate Pool contract
    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3PoolABI,
      provider
    );

    // Fetch current swap price
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = ethers.BigNumber.from(slot0.sqrtPriceX96.toString());
    const price = sqrtPriceX96.mul(sqrtPriceX96).div(2 ** 192).toString();

    console.log(`1 ETH = ${ethers.utils.formatUnits(price, config.tokens.out.decimals)} ${config.tokens.out.symbol}`);
  } catch (error) {
    console.error('Error getting swap price:', error);
  }
}

getSwapPrice();
