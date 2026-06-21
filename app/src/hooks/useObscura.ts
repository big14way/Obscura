"use client";

import { useAccount, useWalletClient } from "wagmi";
import { encryptAmount, decryptOne, type EncryptedAmount } from "@/lib/fhe";

/**
 * Obscura FHE hook — binds the relayer SDK encrypt/decrypt helpers to the connected wallet.
 *
 *   const { encrypt, decrypt } = useObscura();
 *   const { handle, inputProof } = await encrypt(lending, parseUnits("1000", 6));
 *   await writeContract({ ...borrow, args: [token, handle, inputProof] });
 *   const debt = await decrypt(debtHandle, lending); // EIP-712 user decryption
 */
export function useObscura() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return {
    address,
    connected: isConnected,
    encrypt: (contractAddress: string, amount: bigint): Promise<EncryptedAmount> => {
      if (!address) throw new Error("connect wallet");
      return encryptAmount(contractAddress, address, amount);
    },
    decrypt: (handle: string, contractAddress: string): Promise<bigint> => {
      if (!address || !walletClient) throw new Error("connect wallet");
      return decryptOne(handle, contractAddress, walletClient, address);
    },
  };
}
