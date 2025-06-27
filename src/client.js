// src/client.ts
import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.REACT_PUBLIC_THIRDWEB_CLIENT_ID,
});
