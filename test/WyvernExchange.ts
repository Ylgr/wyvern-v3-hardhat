import {expect} from "chai";
import {ethers} from "hardhat";
import {deploy, wrap} from './utils';
describe("WyvernExchange", () => {
    let exchange,statici,registry,atomicizer,erc20,erc721,erc1271,smartContractWallet;
    beforeEach(async () => {
        registry = await deploy('WyvernRegistry')
        atomicizer = await deploy('WyvernAtomicizer')
        statici = await deploy('WyvernStatic', atomicizer.address)

        erc20 = await deploy('TestERC20')
        erc721 = await deploy('TestERC721')
        erc1271 = await deploy('TestERC1271')
        smartContractWallet = await deploy('TestSmartContractWallet')

        exchange = wrap(await deploy('WyvernExchange', 50, [registry.address, '0xa5409ec958C83C3f309868babACA7c86DCB077c1'], Buffer.from("\x19Ethereum Signed Message:\n",'binary')))

    })

    describe("atomicMatch", () => {
      it("matches two nft + erc20 orders", async () => {

      })
    })
})
