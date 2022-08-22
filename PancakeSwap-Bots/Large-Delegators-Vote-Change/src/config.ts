export interface NetworkData {
  cakeAddress: string;
}

export const DATA: Record<number, NetworkData> = {
  56: {
    cakeAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", //BSC Mainnet contract address
  },
  97: {
    cakeAddress: "0xecd485df69906De0684Ecc71c4eB08d96337c468", //BSC Testnet test contract address
  },
};
