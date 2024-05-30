const Web3 = require('web3');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Replace with actual addresses from your Uniswap V3 deployment or use public addresses on mainnet/testnet
const UNISWAPV3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; // Example mainnet address
const UNISWAPV3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'; // Example mainnet address

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IUniswapV3QuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;

const web3 = new Web3('http://127.0.0.1:8545');
const provider = new ethers.providers.Web3Provider(web3.currentProvider);
const signer = provider.getSigner();

async function main() {
    try {
        // Initialize Uniswap V3 Factory and Quoter contracts
        const factory = new ethers.Contract(UNISWAPV3_FACTORY_ADDRESS, IUniswapV3FactoryAbi, signer);
        const quoter = new ethers.Contract(UNISWAPV3_QUOTER_ADDRESS, IUniswapV3QuoterAbi, signer);

        // Example token addresses (WETH and DAI on mainnet)
        const tokenIn = '0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2'; // WETH
        const tokenOut = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI
        const amountIn = ethers.utils.parseUnits('1', 18); // 1 WETH

        // Fetch the price quote
        const amountOut = await quoter.callStatic.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            3000, // Pool fee tier: 0.3%
            amountIn,
            0
        );

        console.log(`Quote for swapping ${ethers.utils.formatUnits(amountIn, 18)} WETH to DAI: ${ethers.utils.formatUnits(amountOut, 18)} DAI`);
    } catch (error) {
        console.error('Error in script:', error);
    }
}

main();
