import {expect} from "chai";
import {ethers} from "hardhat";
import {deploy, NULL_SIG, randomUint, wrap, ZERO_BYTES32} from './utils';
describe("WyvernExchange", () => {
    let exchange,statici,registry,atomicizer,erc20,erc721,erc1271,smartContractWallet, accounts: any[];
    const nfts = [1, 2, 3];
    beforeEach(async () => {
        registry = await deploy('WyvernRegistry')
        atomicizer = await deploy('WyvernAtomicizer')
        statici = await deploy('WyvernStatic', atomicizer.address)

        erc20 = await deploy('TestERC20')
        erc721 = await deploy('TestERC721')
        erc1271 = await deploy('TestERC1271')
        smartContractWallet = await deploy('TestSmartContractWallet')

        exchange = wrap(await deploy('WyvernExchange', 50, [registry.address, '0xa5409ec958C83C3f309868babACA7c86DCB077c1'], Buffer.from("\x19Ethereum Signed Message:\n",'binary')))
        await registry.grantInitialAuthentication(exchange.inst.address)
        accounts = await ethers.getSigners();

    })

    describe("atomicMatch", () => {
      it("matches two nft + erc20 orders", async () => {
          const amount = randomUint() + 2
          await erc20.mint(accounts[0].address,amount)
            console.log('1')
          const selector = statici.interface.getSighash('any')
          console.log('2')

          const one = {registry: registry.address, maker: accounts[0].address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
          const two = {registry: registry.address, maker: accounts[0].address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}
          const sig = NULL_SIG

          console.log('3')
          const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]

          const atomicizerInterface = new ethers.utils.Interface(abi)

          const firstERC20Call = erc20.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[6].address, 2])
          const firstERC721Call = erc721.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[6].address, nfts[0]])
          const firstData = atomicizerInterface.encodeFunctionData('atomicize',[
              [erc20.address, erc721.address],
              [0, 0],
              [(firstERC20Call.length - 2) / 2, (firstERC721Call.length - 2) / 2],
              firstERC20Call + firstERC721Call.slice(2)
          ])
          console.log('4')

          const secondERC20Call = erc20.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[2].address, 2])
          const secondERC721Call = erc721.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[2].address, nfts[1]])
          const secondData = atomicizerInterface.encodeFunctionData('atomicize',[
              [erc721.address, erc20.address],
              [0, 0],
              [(secondERC721Call.length - 2) / 2, (secondERC20Call.length - 2) / 2],
              secondERC721Call + secondERC20Call.slice(2)
          ])

          const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}
          const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}
          console.log('5')
          await exchange.atomicMatch(one, sig, firstCall, two, sig, secondCall, ZERO_BYTES32)

      })
    })
})
