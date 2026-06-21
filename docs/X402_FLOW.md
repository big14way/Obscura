# Confidential x402 Flow

Machine-to-machine payments using HTTP 402, settled with **encrypted** amounts on the Zama Protocol (FHEVM). The payment value is stored as an `euint64` ciphertext — only the payer (and authorized parties) can decrypt the receipt.

Minimal flow used in the demo:

1. Agent requests a compute / data API
2. API returns **402 Payment Required**
3. Agent encrypts the payment amount and pays in confidential cUSDT (ERC-7984)
4. Request is retried with proof of payment
5. An **encrypted receipt** is recorded on-chain via `X402Receipt.record`

## Recording an encrypted receipt

```ts
import { useObscura } from '@/hooks/useObscura';
import { CONTRACTS } from '@/lib/evmContracts';
import { parseUnits } from 'viem';

const { encrypt } = useObscura();

// Encrypt the payment amount for the X402 contract (the reader)
const { handle, inputProof } = await encrypt(CONTRACTS.x402, parseUnits('1.5', 6));

await writeContract({
  address: CONTRACTS.x402,
  abi: [{ name: 'record', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'paymentId', type: 'bytes32' },
    { name: 'payer', type: 'address' },
    { name: 'recipient', type: 'address' },
    { name: 'enc', type: 'bytes32' },       // externalEuint64 handle
    { name: 'inputProof', type: 'bytes' },
  ], outputs: [] }],
  functionName: 'record',
  args: [paymentId, payer, recipient, handle, inputProof],
});
```

## Confidentiality

- Payment **amounts** are encrypted (`euint64`); they are never revealed on-chain.
- The `paymentId`, `payer`, and `recipient` are public so receipts can be referenced, but the value is private.
- Settlement uses **cUSDT** (confidential ERC-7984) — see `docs/USDC.md`.
- Authorization for the transfer uses `setOperator(spender, until)`, not ERC-20 `approve`.
