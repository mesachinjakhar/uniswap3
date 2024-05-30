const { ethers } = require('ethers');

const config = {
    DEFAULT_API_PORT: 5001,
    DEFAULT_NODE_URL: 'http://127.0.0.1:8545',
    UNISWAPV3_FACTORY_ADDRESS: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    UNISWAPV3_QUOTER_ADDRESS: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    WETH_ADDRESS_MAINNET: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    CUSTOM_AMOUNT: '1000000000000000000' // 1 ETH in wei
};

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);
    const signer = provider.getSigner();

    // Use eth_requestAccounts method instead of eth_accounts
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const uniswapQuoter = new ethers.Contract(config.UNISWAPV3_QUOTER_ADDRESS, ['function quoteExactInput(bytes path, uint256 amountIn) external view returns (uint256 amountOut)'], signer);

    const path = [config.WETH_ADDRESS_MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F']; // Replace 'TOKEN_ADDRESS_OF_DIA' with the actual DIA token address
    const amountIn = config.CUSTOM_AMOUNT;

    const amountOut = await uniswapQuoter.quoteExactInput(ethers.utils.defaultAbiCoder.encode(['address[]'], [path]), amountIn);

    console.log(`Amount out: ${amountOut.toString()}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
