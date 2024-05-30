const { ethers } = require('@ethersproject/providers');
const { Contract } = require('@ethersproject/contracts');
const { UniswapV3Factory, Quoter } = require('@uniswap/v3-periphery');

// Replace with your provider URL (likely "ws://127.0.0.1:8545")
const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL);

// Load addresses from config.json (assuming it's in the same directory)
const configData = require('./config.json');

const factoryAddress = configData.UNISWAPV3_FACTORY_ADDRESS;
const quoterAddress = configData.UNISWAPV3_QUOTER_ADDRESS;
const wethAddress = configData.WETH_ADDRESS_MAINNET;

// Define the DIA token address (replace with actual DIA address)
const diaAddress = '0x...'; // Replace with the actual DIA contract address

async function main() {
  const signer = provider.getSigner(); // (Optional) If using a signing provider

  // Create Uniswap v3 Factory and Quoter contracts
  const factory = new UniswapV3Factory(factoryAddress, provider);
  const quoter = new Quoter(quoterAddress, provider);

  // Get ETH and DIA token information
  const eth = new Contract(wethAddress, ERC20_ABI, provider);
  const dia = new Contract(diaAddress, ERC20_ABI, provider);

  // Define amount of ETH to swap (1 ETH in wei)
  const ethAmount = ethers.utils.parseUnits('1', 18);  // 1 ETH in wei

  // Get the pool for the ETH-DIA pair
  const pool = await factory.getPool(wethAddress, diaAddress, 3000); // Fee tier (adjust if needed)

  // Get the quote for swapping ETH to DIA
  const quote = await quoter.callStatic(
    quoter.quoteExactInputSingle(
      ethAddress,
      diaAddress,
      3000, // Fee tier
      ethAmount,
      false // Use the best pool along the route (optional, set to true for specific paths)
    )
  );

  // Convert raw quote data to human-readable format
  const amountOut = parseFloat(ethers.utils.formatUnits(quote.amountOut, dia.decimals));

  console.log(`Swapping 1 ETH for approximately ${amountOut} DIA`);
}

// Replace with actual ERC20 ABI (you can find it online)
const ERC20_ABI = [
  // ... ERC20 token ABI definition (functions like balanceOf, transfer, etc.)
];

// Run the main function
main().catch((error) => {
  console.error(error);
});
