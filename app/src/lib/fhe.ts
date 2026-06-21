'use client';

// Zama Relayer SDK integration for Obscura.
// Pin @zama-fhe/relayer-sdk to a 0.4.x release — the createEIP712 / userDecrypt signatures
// below match 0.4.x. (0.5.0-rc adds a mandatory `extraData` arg via getExtraData().)

import type { WalletClient } from 'viem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let instancePromise: Promise<any> | null = null;

/** Lazily init the TFHE WASM + relayer instance (client-only). */
export async function getFheInstance() {
  if (typeof window === 'undefined') throw new Error('FHE instance is client-only');
  if (!instancePromise) {
    instancePromise = (async () => {
      // `initSDK` is exported ONLY from the /bundle (web) entry.
      const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/bundle');
      await initSDK();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createInstance({ ...SepoliaConfig, network: (window as any).ethereum });
    })();
  }
  return instancePromise;
}

export type EncryptedAmount = { handle: `0x${string}`; inputProof: `0x${string}` };

/** Encrypt a uint64 amount for a contract call: returns the handle + input proof. */
export async function encryptAmount(
  contractAddress: string,
  userAddress: string,
  amount: bigint
): Promise<EncryptedAmount> {
  const instance = await getFheInstance();
  const buf = instance.createEncryptedInput(contractAddress, userAddress);
  buf.add64(amount);
  const enc = await buf.encrypt();
  return { handle: enc.handles[0], inputProof: enc.inputProof };
}

/** EIP-712 user-decryption: reveal encrypted handles the caller is allowed to decrypt. */
export async function userDecrypt(
  pairs: { handle: string; contractAddress: string }[],
  walletClient: WalletClient,
  account: `0x${string}`
): Promise<Record<string, bigint>> {
  const instance = await getFheInstance();
  const keypair = instance.generateKeypair();
  const contractAddresses = [...new Set(pairs.map((p) => p.contractAddress))];
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '7';

  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
  const signature = await walletClient.signTypedData({
    account,
    domain: eip712.domain,
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    primaryType: 'UserDecryptRequestVerification',
    message: eip712.message,
  });

  return instance.userDecrypt(
    pairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contractAddresses,
    account,
    startTimeStamp,
    durationDays
  );
}

/** Convenience: decrypt a single handle to a bigint. */
export async function decryptOne(
  handle: string,
  contractAddress: string,
  walletClient: WalletClient,
  account: `0x${string}`
): Promise<bigint> {
  const res = await userDecrypt([{ handle, contractAddress }], walletClient, account);
  return BigInt(res[handle] ?? 0);
}
