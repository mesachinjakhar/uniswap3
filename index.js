const Web3 = require('web3');
const { Token } = require('@uniswap/sdk-core');
const { abi: QuoterABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');

const config = {
    DEFAULT_API_PORT: 5001,
    DEFAULT_NODE_URL: "ws://127.0.0.1:8545",
    UNISWAPV3_FACTORY_ADDRESS: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    UNISWAPV3_QUOTER_ADDRESS: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    WETH_ADDRESS_MAINNET: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    DAI_ADDRESS_MAINNET: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    CUSTOM_AMOUNT: "1000000000000000000" // 1 ETH in wei
};

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

const WETH = new Token(1, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
const DAI = new Token(1, config.DAI_ADDRESS_MAINNET, 18, 'DAI', 'Dai Stablecoin');
const quoter = new web3.eth.Contract(QuoterABI, config.UNISWAPV3_QUOTER_ADDRESS);
const amountIn = config.CUSTOM_AMOUNT;

// Simulate a 0% fee by using the 0.05% fee pool and adjusting the output
const simulatedZeroFeeTier = 500; // 0.05% pool fee tier

const fetchPrices = async () => {
    try {
        const amountOutWithFee = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            DAI.address,
            simulatedZeroFeeTier, // Using the 0.05% fee pool to simulate
            amountIn,
            0
        ).call();

        const amountOutWithoutFee = web3.utils.fromWei(amountOutWithFee, 'ether');

        // Calculate the fee amount (0.05% of the output)
        const feeAmount = (0.05 / 100) * amountOutWithoutFee;

        // Simulate the amount out for a 0% fee by adding the fee back
        const amountOutZeroFee = parseFloat(amountOutWithoutFee) + feeAmount;

        console.log(`Simulated price for swapping 1 ETH to DAI with 0% fee: ${amountOutZeroFee.toFixed(6)} DAI`);

    } catch (error) {
        console.error('Error fetching quote:', error);
    }
};

const main = async () => {
    // Initial price fetch
    await fetchPrices();

    // Subscribe to new block headers
    web3.eth.subscribe('newBlockHeaders', async (error, result) => {
        if (!error) {
            console.log(`New block detected: ${result.number}`);
            await fetchPrices();
        } else {
            console.error('Error subscribing to new block headers:', error);
        }
    });
};

main().catch(console.error);

