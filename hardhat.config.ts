import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.7.5",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 50
    },
  }
};

export default config;
