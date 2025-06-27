import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { zkSyncSepoliaWithPaymaster } from "./config/paymasterConfig";

const client = createThirdwebClient({
  clientId: "6e30bbf1a276f1c78c5cecf1b785929b",
});

// Account abstraction configuration for zkSync
export const accountAbstractionConfig = {
  chain: zkSyncSepoliaWithPaymaster,
  sponsorGas: true,
  // You can add a paymaster URL here if you have one
  // paymasterUrl: "https://your-paymaster-url.com"
};

// Smart wallet configuration with account abstraction
const smartWalletConfig = {
  chain: zkSyncSepoliaWithPaymaster,
  sponsorGas: true,
};

const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "google", 'apple', 'x'],
    },
    buyWithCard: false,
    smartAccount: smartWalletConfig, // Enable account abstraction
  }),
  createWallet("io.metamask", {
    smartAccount: smartWalletConfig, // Enable account abstraction for MetaMask too
  }),
];

export { client, wallets };
