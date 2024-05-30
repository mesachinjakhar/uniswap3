const { ethers } = require('ethers');
const { ChainId, Token, TokenAmount, Route, Trade, TradeType, Pair } = require('@uniswap/sdk');

require('dotenv').config();

// Use local Erigon node URL
const provider = new ethers.providers.WebSocketProvider(process.env.WS_URL);

const main = async () => {
  try {
    const WETH = new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether');
    const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

    const pair = new Pair(new TokenAmount(WETH, '1000000000000000000'), new TokenAmount(DAI, '1000000000000000000000'));

    const route = new Route([pair], WETH);

    const trade = new Trade(route, new TokenAmount(WETH, '1000000000000000000'), TradeType.EXACT_INPUT);

    console.log(`Best price for swapping 1 ETH to DAI: ${trade.executionPrice.toSignificant(6)} DAI`);
  } catch (error) {
    console.error('Error:', error);
  }
};

main().catch(console.error);
