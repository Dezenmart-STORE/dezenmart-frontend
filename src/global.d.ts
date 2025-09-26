export {};
declare module "*.svg" {
  import React from "react";
  export const ReactComponent: React.ElementType;
  const src: string;
  export default src;
}

declare global {
  interface Window {
    ethereum: any;
    connectMetaMask: () => Promise<string>;
    connectGoogle: () => Promise<string>;
    connectEmail: (
      email: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPhone: (
      phone: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPasskey: () => Promise<string>;
    connectGuest: () => Promise<string>;
  }
}
