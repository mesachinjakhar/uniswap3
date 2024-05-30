const { ethers } = require("ethers");
const { ChainId, Token, WETH, TradeType, Fetcher, Route, Trade, TokenAmount, Percent } = require('@uniswap/sdk');
const config = require('./config.json');

async function getSwapPrice() {
  // Connect to the local Erigon node
  const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

  // Define tokens
  const WETH = new Token(ChainId.MAINNET, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
  const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

  // Fetch the pair data
  const pair = await Fetcher.fetchPairData(WETH, DAI, provider);

  // Create a route
  const route = new Route([pair], WETH);

  // Create a trade
  const amountIn = ethers.utils.parseEther('1'); // 1 WETH
  const trade = new Trade(route, new TokenAmount(WETH, amountIn.toString()), TradeType.EXACT_INPUT);

  // Output the price
  console.log(`Swap 1 WETH to DAI: ${trade.executionPrice.toSignificant(6)} DAI`);
}

getSwapPrice().catch(console.error);



