const { Token, TradeType, TokenAmount, Percent, Route } = require('@uniswap/sdk-core');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const ethers = require('ethers');

const chainId = 1; // Mainnet
const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI token address

async function getSwapPrice(tokenIn, tokenOut, amount) {
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

  const tokenInInstance = new Token(chainId, tokenIn, 18);
  const tokenOutInstance = new Token(chainId, tokenOut, 18);

  const poolAddress = await getPoolAddress(tokenInInstance, tokenOutInstance, provider);
  const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

  const [reserve0, reserve1] = await poolContract.slot0();
  const [token0, token1] = tokenInInstance.address.toLowerCase() < tokenOutInstance.address.toLowerCase()
    ? [tokenInInstance, tokenOutInstance]
    : [tokenOutInstance, tokenInInstance];

  const amountIn = ethers.utils.parseUnits(amount.toString(), token0.decimals);
  const amountOut = await getAmountOut(
    amountIn,
    reserve0.toString(),
    reserve1.toString(),
    token0.decimals,
    token1.decimals
  );

  console.log(`Swap Price (in): ${ethers.utils.formatUnits(amountIn, token0.decimals)} ${token0.symbol}`);
  console.log(`Swap Price (out): ${ethers.utils.formatUnits(amountOut, token1.decimals)} ${token1.symbol}`);
}

async function getPoolAddress(token0, token1, provider) {
  const poolAddressProvider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');
  const poolAddressFinder = new ethers.Contract(
    '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ['function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'],
    poolAddressProvider
  );
  const poolAddress = await poolAddressFinder.getPool(token0.address, token1.address, 3000);
  return poolAddress;
}

function getAmountOut(amountIn, reserveIn, reserveOut, decimalsIn, decimalsOut) {
  const amountInWithFee = amountIn.mul(ethers.BigNumber.from(997));
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(ethers.BigNumber.from(1000)).add(amountInWithFee);
  const amountOut = numerator.div(denominator);
  return amountOut;
}

getSwapPrice('0x0000000000000000000000000000000000000000', tokenAddress, '1');
