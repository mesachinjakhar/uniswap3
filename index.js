const { ethers } = require('ethers');
const { Token } = require('@uniswap/sdk-core');
const JSBI = require('jsbi');

// Configuration
const RPC_URL = 'http://localhost:8545'; // Your Erigon node URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Uniswap contract addresses and ABI
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
const QUOTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint24",
        "name": "fee",
        "type": "uint24"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint160",
        "name": "sqrtPriceLimitX96",
        "type": "uint160"
      }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Tokens
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const CHAIN_ID = 1; // Mainnet

async function getSwapPrice() {
  // Define the tokens
  const weth = new Token(CHAIN_ID, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
  const dai = new Token(CHAIN_ID, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

  // Create the quoter contract
  const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);

  // Amount of WETH to swap (1 ETH)
  const amountIn = ethers.utils.parseUnits('1', weth.decimals);

  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  let bestAmountOut = ethers.BigNumber.from(0);

  try {
    // Get the quote for each fee tier and find the best amount out
    for (const fee of feeTiers) {
      const quotedAmountOut = await quoter.callStatic.quoteExactInputSingle(
        WETH_ADDRESS,
        DAI_ADDRESS,
        fee,
        amountIn.toString(),
        0
      );

      if (quotedAmountOut.gt(bestAmountOut)) {
        bestAmountOut = quotedAmountOut;
      }
    }

    // Format the output with proper precision
    const amountOut = ethers.utils.formatUnits(bestAmountOut, dai.decimals);
    console.log(`1 ETH = ${amountOut} DAI`);
  } catch (error) {
    console.error('Error getting swap price:', error);
  }
}

getSwapPrice();
