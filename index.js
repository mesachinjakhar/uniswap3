const { Token, TradeType, TokenAmount, Percent, Route } = require('@uniswap/sdk-core');
const { Fetcher } = require('@uniswap/v3-sdk/dist/fetcher');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const ethers = require('ethers');

const chainId = 1; // Mainnet
const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI token address

async function getSwapPrice(tokenIn, tokenOut, amount) {
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // Replace with your local Erigon node URL

  const tokenInInstance = new Token(chainId, tokenIn, 18);
  const tokenOutInstance = new Token(chainId, tokenOut, 18);

  const pair = await Fetcher.fetchPairData(tokenInInstance, tokenOutInstance, provider);

  const route = new Route([pair], tokenInInstance);

  const trade = new Trade(
    route,
    new TokenAmount(tokenInInstance, amount),
    TradeType.EXACT_INPUT
  );

  const slippageTolerance = new Percent('50', '10000'); // 0.5% slippage tolerance
  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;

  const path = [tokenInInstance.address, tokenOutInstance.address];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const value = trade.inputAmount.raw;
  const gasPrice = await provider.getGasPrice();
  const accounts = await provider.listAccounts();

  const uniswapContract = new ethers.Contract(pair.liquidityToken.address, IUniswapV3PoolABI, provider);
  const methodParameters = {
    path,
    recipient: accounts[0],
    deadline,
    amountIn: value,
    amountOutMinimum: amountOutMin.toString(),
  };

  const data = uniswapContract.interface.encodeFunctionData('swapExactTokensForTokens', [
    methodParameters.amountIn,
    methodParameters.amountOutMinimum,
    methodParameters.path,
    methodParameters.recipient,
    methodParameters.deadline,
  ]);

  const tx = {
    data,
    to: pair.liquidityToken.address,
    value: value,
    gasPrice: gasPrice,
  };

  const estimation = await provider.estimateGas(tx);
  const gasLimit = estimation.toNumber() * 2; // Double the gas limit

  const swapPriceOut = trade.outputAmount.raw.toString();
  const swapPriceInMax = trade.maximumAmountIn(slippageTolerance).raw.toString();

  console.log(`
    Swap Price (in):  ${ethers.utils.formatUnits(value, 'ether')} ETH
    Swap Price (out): ${ethers.utils.formatUnits(swapPriceOut, 'ether')} ${tokenOutInstance.symbol}
    Swap Price (in max): ${ethers.utils.formatUnits(swapPriceInMax, 'ether')} ETH
    Gas Limit: ${gasLimit}
  `);
}

getSwapPrice('0x0000000000000000000000000000000000000000', tokenAddress, ethers.utils.parseUnits('1', 'ether'));
