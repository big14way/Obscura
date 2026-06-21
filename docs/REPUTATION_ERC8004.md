# Confidential Reputation (ERC-8004)

Obscura exposes **encrypted** on-chain agent reputation via a minimal ERC-8004-style registry on the Zama Protocol (FHEVM). The credit score is a Fully Homomorphic Encryption ciphertext (`euint64`) — only the agent can decrypt it via EIP-712 user decryption.

## Contract
`ReputationRegistry.sol`

## Read the encrypted score

```ts
import { useObscura } from '@/hooks/useObscura';
import { CONTRACTS } from '@/lib/evmContracts';

const { address, decrypt } = useObscura();

// Returns a bytes32 handle, not a number
const handle = await readContract({
  address: CONTRACTS.reputation,
  abi: [{ name: 'scoreOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'bytes32' }] }],
  functionName: 'scoreOf',
  args: [address],
});

// EIP-712 user decryption — only the agent can reveal their own score
const score = await decrypt(handle, CONTRACTS.reputation); // bigint
```

In the UI, show the score masked as `•••••` with a **Decrypt** button that calls `decrypt(handle, CONTRACTS.reputation)`.

## Updates
- The encrypted score improves with on-chain repayment history.
- It is adjusted on Gradual Auto-Deleveraging (GAD) events.
- The registry is updated by `ObscuraLending` after repayments and by `ObscuraGAD` after deleveraging — all computed homomorphically over ciphertexts so the score itself is never exposed.

## Confidentiality
- The score is stored as `euint64`; no plaintext getter exists.
- Reputation comparisons used in credit decisions run over ciphertexts, which is part of why **approval and denial of a loan are computationally indistinguishable on-chain**.
