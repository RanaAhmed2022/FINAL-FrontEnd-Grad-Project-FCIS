import { defineChain } from "thirdweb/chains";
import { zkSyncSepolia } from "thirdweb/chains";

// zkSync Sepolia chain configuration with paymaster support
export const zkSyncSepoliaWithPaymaster = defineChain({
  ...zkSyncSepolia,
  rpc: "https://sepolia.era.zksync.dev",
});

// Paymaster configuration for sponsored transactions
export const paymasterConfig = {
  // Enable gas sponsoring for all transactions
  sponsorGas: true,
  
  // Optional: Custom paymaster URL (if you have your own paymaster service)
  // paymasterUrl: "https://your-custom-paymaster.com/api/paymaster",
  
  // Gas limit configuration for different transaction types
  gasLimits: {
    createProposal: 500000,
    castVote: 200000,
    changeVote: 200000,
    retractVote: 150000,
    registerVoter: 300000,
  },
};

// Account abstraction settings
export const aaSettings = {
  chain: zkSyncSepoliaWithPaymaster,
  sponsorGas: true,
  
  // Smart account options
  smartAccount: {
    chain: zkSyncSepoliaWithPaymaster,
    sponsorGas: true,
  },
};

// Helper function to check if gas sponsoring is available
export const isGasSponsoringEnabled = () => {
  return paymasterConfig.sponsorGas;
};

// Helper function to get gas limit for specific operations
export const getGasLimit = (operation) => {
  return paymasterConfig.gasLimits[operation] || 300000; // Default gas limit
};

// Transaction options with paymaster support
export const getTransactionOptions = (operation) => ({
  gas: getGasLimit(operation),
  // Add paymaster data if needed
  paymaster: paymasterConfig.paymasterUrl ? {
    paymasterInput: "0x",
  } : undefined,
}); 