const { ethers } = require('ethers');
const { computePoolAddress } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const QuoterABI = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json').abi;
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json').abi;

// Define token constants
const WETH_TOKEN = new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether');
const DAI_TOKEN = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

// Configuration
const config = {
  rpc: {
    local: 'http://localhost:8545',
    mainnet: 'https://mainnet.infura.io/v3/0ac57a06f2994538829c14745750d721',
  },
  tokens: {
    in: WETH_TOKEN,
    amountIn: ethers.utils.parseEther('1'), // 1 ETH in wei
    out: DAI_TOKEN,
    poolFee: 500,
  },
  POOL_FACTORY_CONTRACT_ADDRESS: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // Uniswap V3 factory address
  QUOTER_CONTRACT_ADDRESS: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // Uniswap V3 Quoter address
};

async function getQuote() {
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

    // Fetch pool metadata
    const [token0, token1, fee, liquidity, slot0] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

    // Instantiate Quoter contract
    const quoterContract = new ethers.Contract(
      config.QUOTER_CONTRACT_ADDRESS,
      QuoterABI,
      provider
    );

    // Get quote using Quoter contract
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
      token0,
      token1,
      fee,
      config.tokens.amountIn.toString(),
      0
    );

    console.log(`Quoted amount out: ${quotedAmountOut.toString()} ${config.tokens.out.symbol}`);
  } catch (error) {
    console.error('Error getting quote:', error);
  }
}

getQuote();
