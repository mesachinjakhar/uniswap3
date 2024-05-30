const Web3 = require('web3');
const { Quoter, Pool, Route, Trade, Token, TradeType, Fetcher, Percent } = require('@uniswap/v3-sdk');
const { TokenAmount } = require('@uniswap/sdk-core');

const config = {
    DEFAULT_API_PORT: 5001,
    DEFAULT_NODE_URL: "ws://127.0.0.1:8545",
    UNISWAPV3_FACTORY_ADDRESS: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    UNISWAPV3_QUOTER_ADDRESS: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    WETH_ADDRESS_MAINNET: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    CUSTOM_AMOUNT: "1000000000000000000" // 0.5 ETH in wei
};

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

const main = async () => {
    const WETH = new Token(1, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
    const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

    const quoter = new web3.eth.Contract([
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
    ], config.UNISWAPV3_QUOTER_ADDRESS);

    const amountIn = config.CUSTOM_AMOUNT;

    const amountOut = await quoter.methods.quoteExactInputSingle(
        config.WETH_ADDRESS_MAINNET,
        DAI.address,
        3000, // Pool fee
        amountIn,
        0
    ).call();

    console.log(`Price for swapping 1 ETH to DAI: ${web3.utils.fromWei(amountOut, 'ether')} DAI`);
};

main().catch(console.error);



