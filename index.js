const { ethers } = require('ethers');

// Raw addresses
const tokenAAddressRaw = '0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2';
const tokenBAddressRaw = '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48';

// Validate and format addresses using ethers.js
try {
  const tokenAAddress = ethers.utils.getAddress(tokenAAddressRaw);
  const tokenBAddress = ethers.utils.getAddress(tokenBAddressRaw);

  console.log('Token A Address:', tokenAAddress); // Should log: 0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2
  console.log('Token B Address:', tokenBAddress); // Should log: 0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48
} catch (error) {
  console.error('Address validation error:', error);
}
