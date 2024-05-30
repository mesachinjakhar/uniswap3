const { ethers } = require('ethers');
const { Route, Trade, TokenAmount, TradeType } = require('@uniswap/sdk');
const { ChainId } = require('@uniswap/sdk');

require('dotenv').config();

// Use local Erigon node URL
const provider = new ethers.providers.WebSocketProvider(process.env.WS_URL);

const main = async () => {
  try {
    const WETH = {
      chainId: ChainId.MAINNET,
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
    };
    const DAI = {
      chainId: ChainId.MAINNET,
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18,
    };

    const pair = new Route([{
      input: new TokenAmount(WETH, '1000000000000000000'), // 1 ETH in wei
      output: new TokenAmount(DAI, '1'),
    }], WETH);

    const trade = new Trade(pair, new TokenAmount(WETH, '1000000000000000000'), TradeType.EXACT_INPUT);

    console.log(`Best price for swapping 1 ETH to DAI: ${trade.executionPrice.toSignificant(6)} DAI`);
  } catch (error) {
    console.error('Error:', error);
  }
};

main().catch(console.error);
