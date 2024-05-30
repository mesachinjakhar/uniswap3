const WebSocket = require("ws");

const erigonUrl = "ws://localhost:8545"; // Replace with your Erigon WS URL
const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Uniswap V3 Factory
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH contract address
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // Replace with DAI contract address 
const poolFee = 3000; // Pool fee (0.3%)

async function getSwapAmount() {
  try {
    const ws = new WebSocket(erigonUrl);

    ws.onopen = async () => {
      const payload = {
        "method": "eth_call",
        "params": [
          {
            "to": factoryAddress,
            "data": "0x00000070f8bbd8e1e14b88d2bb0af6c21bdde2c785aece9a7e867141bf0b49c1a", // Function selector for getPool(address, address, uint24)
            "arguments": [WETH_ADDRESS, DAI_ADDRESS, poolFee]
          }
        ],
        "id": 1
      };

      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id === 1) {
        const poolAddress = "0x" + data.result.slice(26); // Extract pool address from response

        const poolContractPayload = {
          "method": "eth_call",
          "params": [
            {
              "to": poolAddress,
              "data": "0x0dfe1321e2ef4c21b90bapeer579b416f96afc506ef44b5b5e10c0364d1e9d4d8", // Function selector for slot0()
              "arguments": []
            }
          ],
          "id": 2
        };

        ws.send(JSON.stringify(poolContractPayload));
      } else if (data.id === 2) {
        const poolData = data.result.slice(2); // Extract pool data
        const sqrtPriceX96 = parseInt(poolData.slice(128, 192), 16); // Extract sqrtPriceX96

        const amountIn = ethers.utils.parseUnits("1", 18); // 1 ETH

        const amountOut = calculateAmountOut(amountIn, sqrtPriceX96, poolFee);

        const formattedAmountOut = ethers.utils.formatUnits(amountOut, 18);
        console.log(`1 ETH = ${formattedAmountOut} DAI (estimated)`);
        ws.close(); // Close connection after getting data
      }
    };
  } catch (error) {
    console.error("Error fetching swap amount:", error);
  }
}

function calculateAmountOut(amountIn, sqrtPriceX96, fee) {
  const numerator = amountIn * sqrtPriceX96;
  const denominator = 1 << (96 - fee) + 1;
  return Math.floor(numerator / denominator);
}

getSwapAmount();

// Note: This code uses simplified error handling and assumes successful connections.

