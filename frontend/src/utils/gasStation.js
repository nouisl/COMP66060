// imports
import { ethers } from 'ethers';

const GAS_STATION_URL = 'https://gasstation.polygon.technology/amoy';

// fetch gas prices from Polygon gas station
export async function fetchGasPrices() {
  if (!ethers) {
    throw new Error('Ethers library not available');
  }
  
  try {
    const response = await fetch(GAS_STATION_URL);
    if (!response.ok) {
      throw new Error(`Gas station API error: ${response.status}`);
    }
    const data = await response.json();
    
    // validate response
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid gas station response: not an object');
    }
    
    if (!data.safeLow || !data.standard || !data.fast) {
      throw new Error('Invalid gas station response format: missing speed tiers');
    }
    
    if (typeof data.safeLow.maxPriorityFee !== 'number' || typeof data.safeLow.maxFee !== 'number') {
      throw new Error('Invalid gas station response: invalid safeLow values');
    }
    
    if (typeof data.standard.maxPriorityFee !== 'number' || typeof data.standard.maxFee !== 'number') {
      throw new Error('Invalid gas station response: invalid standard values');
    }
    
    if (typeof data.fast.maxPriorityFee !== 'number' || typeof data.fast.maxFee !== 'number') {
      throw new Error('Invalid gas station response: invalid fast values');
    }
    
    return {
      safeLow: {
        maxPriorityFee: data.safeLow.maxPriorityFee,
        maxFee: data.safeLow.maxFee
      },
      standard: {
        maxPriorityFee: data.standard.maxPriorityFee,
        maxFee: data.standard.maxFee
      },
      fast: {
        maxPriorityFee: data.fast.maxPriorityFee,
        maxFee: data.fast.maxFee
      },
      estimatedBaseFee: data.estimatedBaseFee || 0,
      blockTime: data.blockTime || 0,
      blockNumber: data.blockNumber || 0
    };
  } catch (error) {
    throw new Error(`Failed to fetch gas prices: ${error.message}`);
  }
}

// test gas station API connection
export async function testGasStation() {
  try {
    const gasPrices = await fetchGasPrices();
    return {
      success: true,
      data: gasPrices,
      message: 'Gas station API is working correctly'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Gas station API is not accessible'
    };
  }
}

// get gas configuration for transaction
export function getGasConfig(gasPrices, speed = 'standard') {
  if (!ethers) {
    throw new Error('Ethers library not available');
  }
  
  // validate gas prices object
  if (!gasPrices || typeof gasPrices !== 'object') {
    throw new Error('Invalid gas prices object');
  }
  
  const config = gasPrices[speed];
  if (!config) {
    throw new Error(`Invalid gas speed: ${speed}`);
  }
  
  if (typeof config.maxFee !== 'number' || typeof config.maxPriorityFee !== 'number') {
    throw new Error(`Invalid gas config for speed ${speed}`);
  }
  
  if (config.maxFee <= 0 || config.maxPriorityFee <= 0) {
    throw new Error(`Invalid gas values for speed ${speed}: maxFee=${config.maxFee}, maxPriorityFee=${config.maxPriorityFee}`);
  }
  
  try {
    return {
      maxFeePerGas: ethers.parseUnits(config.maxFee.toString(), 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits(config.maxPriorityFee.toString(), 'gwei')
    };
  } catch (error) {
    throw new Error(`Failed to parse gas values: ${error.message}`);
  }
} 