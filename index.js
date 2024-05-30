const { ethers } = require("ethers");
const { AlphaRouter, ChainId, SwapType } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent, WETH9 } = require('@uniswap/sdk-core');
const config = require('./config.json');

async function getSwapPrice() {
  // Connect to the local Erigon node
  const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

  // Define tokens
  const chainId = ChainId.MAINNET;
  const WETH = new Token(chainId, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
  const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

  // Create a router instance
  const router = new AlphaRouter({ chainId, provider });

  // Define the amount of WETH to swap
  const amountIn = CurrencyAmount.fromRawAmount(WETH, ethers.utils.parseEther('1').toString());

  // Define swap options
  const swapOptions = {
    recipient: config.wallet.address,
    slippageTolerance: new Percent(50, 10000), // 0.5%
    deadline: Math.floor(Date.now() / 1000 + 1800), // 30 minutes from the current Unix time
    type: SwapType.SWAP_ROUTER_02,
  };

  // Create a route
  const route = await router.route(
    amountIn,
    DAI,
    TradeType.EXACT_INPUT,
    swapOptions
  );

  if (!route || !route.methodParameters) {
    console.error("No route found or method parameters missing.");
    return;
  }

  // Print the amount of DAI for 1 WETH
  const amountOut = route.quote.toFixed(6);
  console.log(`Swap 1 WETH to DAI: ${amountOut} DAI`);

  // If you want to execute the trade, uncomment the following lines and make sure you have set up your wallet and approvals:
  /*
  const wallet = new ethers.Wallet(config.wallet.privateKey, provider);

  // Approve the SwapRouter to spend WETH
  const tokenContract = new ethers.Contract(WETH.address, [
    "function approve(address spender, uint256 amount) external returns (bool)"
  ], wallet);
  const approvalAmount = ethers.utils.parseEther('1').toString();
  await tokenContract.approve(config.UNISWAPV3_QUOTER_ADDRESS, approvalAmount);

  // Execute the trade
  const tx = await wallet.sendTransaction({
    data: route.methodParameters.calldata,
    to: route.methodParameters.to,
    value: route.methodParameters.value,
    from: config.wallet.address,
    gasPrice: await provider.getGasPrice(),
  });

  console.log('Transaction hash:', tx.hash);
  */
}

getSwapPrice().catch(console.error);

