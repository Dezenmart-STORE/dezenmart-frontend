declare module "@wagmi/core" {
  export function readContract(config: any, parameters: any): Promise<any>;
  export function simulateContract(config: any, parameters: any): Promise<any>;
  export function waitForTransactionReceipt(
    config: any,
    parameters: any
  ): Promise<any>;
  export function writeContract(config: any, parameters: any): Promise<any>;
}
