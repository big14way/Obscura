"use client";

/**
 * Placeholder demo-runner hook. The real confidential flows (encrypt -> write -> userDecrypt)
 * live in the Dashboard via useObscura(). See app/src/lib/fhe.ts.
 */
export function useObscuraDemo() {
  return {
    runDemo: async () => "0x",
    running: false,
  };
}
