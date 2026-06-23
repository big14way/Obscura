'use client';

// Zama Relayer SDK integration for Obscura.
// Pin @zama-fhe/relayer-sdk to a 0.4.x release — the createEIP712 / userDecrypt signatures
// below match 0.4.x. (0.5.0-rc adds a mandatory `extraData` arg via getExtraData().)

import type { WalletClient } from 'viem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let instancePromise: Promise<any> | null = null;

// Read the FHE public key from Sepolia via a plain RPC — NOT window.ethereum. A second wallet
// extension (e.g. HashPack) can own window.ethereum and point at the wrong chain, which makes
// createInstance/encrypt fail before any tx is sent. Encryption needs the chain's FHE key + the
// relayer; it does not need the wallet (the wallet only signs the eventual tx / EIP-712 decrypt).
const FHE_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.drpc.org';

// The relayer SDK is loaded as a self-contained UMD <script> (served from /public), NOT bundled.
// Importing the npm ESM (/web) makes the bundler inline the 5MB TFHE WASM (turbopack hangs);
// the /bundle stub just reads window.relayerSDK. So we inject the UMD at runtime and read the
// global. The UMD fetches its WASM from the site root (/tfhe_bg.wasm, /kms_lib_bg.wasm), which
// we also serve from /public.
async function loadRelayerSDK(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initSDK: () => Promise<void>; createInstance: (cfg: any) => Promise<any>; SepoliaConfig: any;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.relayerSDK) return w.relayerSDK;
  await new Promise<void>((resolve, reject) => {
    const id = 'zama-relayer-sdk';
    const done = () => (w.relayerSDK ? resolve() : reject(new Error('relayer SDK global missing after load')));
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', done); existing.addEventListener('error', () => reject(new Error('relayer SDK script failed'))); return; }
    const s = document.createElement('script');
    s.id = id;
    s.src = '/relayer-sdk-js.umd.cjs';
    s.async = true;
    s.onload = done;
    s.onerror = () => reject(new Error('relayer SDK script failed to load'));
    document.head.appendChild(s);
  });
  return w.relayerSDK;
}

/** Lazily load the relayer UMD, init the TFHE WASM, and create the instance (client-only). */
export async function getFheInstance() {
  if (typeof window === 'undefined') throw new Error('FHE instance is client-only');
  if (!instancePromise) {
    instancePromise = (async () => {
      const sdk = await loadRelayerSDK();
      await sdk.initSDK();
      return sdk.createInstance({ ...sdk.SepoliaConfig, network: FHE_RPC });
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
