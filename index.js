const Web3 = require('web3');
const { Token, TradeType, Route, Trade, Fetcher } = require('@uniswap/sdk');
const { abi: QuoterABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const { abi: SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { abi: FactoryABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json');

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
const poolFees = [500, 3000, 10000]; // 0.05%, 0.30%, 1% fee tiers

const fetchPrices = async () => {
    for (const fee of poolFees) {
        try {
            const amountOut = await quoter.methods.quoteExactInputSingle(
                config.WETH_ADDRESS_MAINNET,
                config.DAI_ADDRESS_MAINNET,
                fee, // Pool fee
                amountIn,
                0
            ).call();

            console.log(`Price for swapping 1 ETH to DAI with ${fee / 10000}% fee: ${web3.utils.fromWei(amountOut, 'ether')} DAI`);
        } catch (error) {
            console.error(`Error fetching quote with fee tier ${fee}:`, error);
        }
    }
};

const main = async () => {
    // Initial price fetch
    await fetchPrices();

    // Subscribe to new block headers
    web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
            console.log(`New block detected: ${result.number}`);
            fetchPrices();
        } else {
            console.error('Error subscribing to new block headers:', error);
        }
    });
};

main().catch(console.error);
