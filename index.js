const Web3 = require('web3');
const { abi: QuoterABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');

const config = {
  DEFAULT_API_PORT: 5001,
  DEFAULT_NODE_URL: "ws://127.0.0.1:8545",
  UNISWAPV3_FACTORY_ADDRESS: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  UNISWAPV3_QUOTER_ADDRESS: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  WETH_ADDRESS_MAINNET: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  CUSTOM_AMOUNT: "500000000000000000"
};

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));
const quoter = new web3.eth.Contract(QuoterABI, config.UNISWAPV3_QUOTER_ADDRESS);

async function fetchUniswapV3Prices() {
  const tokenIn = config.WETH_ADDRESS_MAINNET;
  const tokenOut = "0x84ca8bc7997272c7cfb4d0cd3d55cd942b3fe1d5"; // DIA token address (checksum-less)
  const amountIn = config.CUSTOM_AMOUNT;

  try {
    const quoteResult = await quoter.methods.quoteExactInputSingle(
      tokenIn,
      tokenOut,
      3000, // fee tier
      amountIn,
      0 // sqrtPriceLimitX96
    ).call();

    const amountOut = quoteResult.amountOut;
    const ethAmount = web3.utils.fromWei(amountIn, 'ether');
    const diaAmount = web3.utils.fromWei(amountOut, 'ether');

    console.log(`Swapping 1 ETH for DIA:
    ETH Amount: ${ethAmount}
    DIA Amount: ${diaAmount}`);
  } catch (error) {
    console.error('Error fetching Uniswap V3 prices:', error);
  }
}

fetchUniswapV3Prices();
