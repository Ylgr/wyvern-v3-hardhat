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
    const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]
    const atomicizerInterface = new ethers.utils.Interface(abi)
    describe("atomicMatch", () => {
      it("matches two nft + erc20 orders", async () => {
          // Pre-check asset
          const nftBefore = await erc721.balanceOf(accounts[0].address)
          expect(nftBefore.toString()).to.be.equal('3')
          const nftBefore6 = await erc721.balanceOf(accounts[6].address)
          expect(nftBefore6.toString()).to.be.equal('0')
          const nftBefore2 = await erc721.balanceOf(accounts[2].address)
          expect(nftBefore2.toString()).to.be.equal('0')

          await registry.registerProxy()
          let proxy = await registry.proxies(accounts[0].address)
          await erc20.approve(proxy, 100000)
          await erc721.setApprovalForAll(proxy, true)

          const amount = randomUint() + 2
          await erc20.mint(accounts[0].address,amount)

          const erc20Before = await erc20.balanceOf(accounts[0].address)
          expect(erc20Before.toString()).to.be.equal(amount.toString())

          console.log('1')
          const selector = statici.interface.getSighash('any')
          console.log('2')

          const one = {registry: registry.address, maker: accounts[0].address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
          const two = {registry: registry.address, maker: accounts[0].address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}
          const sig = NULL_SIG

          console.log('3')

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

          // After execute asset
          const nftAfter = await erc721.balanceOf(accounts[0].address)
          expect(nftAfter.toString()).to.be.equal('1')
          const nftAfter6 = await erc721.balanceOf(accounts[6].address)
          expect(nftAfter6.toString()).to.be.equal('1')
          const nftAfter2 = await erc721.balanceOf(accounts[2].address)
          expect(nftAfter2.toString()).to.be.equal('1')
          const erc20After = await erc20.balanceOf(accounts[0].address)
          expect(erc20After.toString()).to.be.equal((amount-4).toString())
          const erc20After2 = await erc20.balanceOf(accounts[2].address)
          expect(erc20After2.toString()).to.be.equal((2).toString())
          const erc20After6 = await erc20.balanceOf(accounts[6].address)
          expect(erc20After6.toString()).to.be.equal((2).toString())
      })

        it('matches two nft + erc20 orders, real static call', async () => {
            await registry.registerProxy()
            let proxy = await registry.proxies(accounts[0].address)
            await erc20.approve(proxy, 100000)
            await erc721.setApprovalForAll(proxy, true)
            await registry.connect(accounts[6]).registerProxy()
            let proxy6 = await registry.connect(accounts[6]).proxies(accounts[6].address)
            await erc20.connect(accounts[6]).approve(proxy6, 100000)
            await erc721.connect(accounts[6]).setApprovalForAll(proxy6, true)

            const amount = randomUint() + 2
            await erc20.mint(accounts[0].address,amount)
            await erc721.transferFrom(accounts[0].address, accounts[6].address, nfts[0])
            const selectorOne = statici.interface.getSighash('split')
            const selectorOneA = statici.interface.getSighash('sequenceExact')
            const selectorOneB = statici.interface.getSighash('sequenceExact')
            const firstEDSelector = statici.interface.getSighash('transferERC20Exact')
            const firstEDParams = statici.interface._abiCoder.encode(['address', 'uint256'], [erc20.address, '2'])
            const secondEDSelector = statici.interface.getSighash('transferERC721Exact')
            const secondEDParams = statici.interface._abiCoder.encode(['address', 'uint256'], [erc721.address, nfts[2]])
            const extradataOneA = statici.interface._abiCoder.encode(
                ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
                [[statici.address, statici.address],
                    [(firstEDParams.length - 2) / 2, (secondEDParams.length - 2) / 2],
                    [firstEDSelector, secondEDSelector],
                    firstEDParams + secondEDParams.slice(2)]
            )
            const bEDParams = statici.interface._abiCoder.encode(['address', 'uint256'], [erc721.address, nfts[0]])
            const bEDSelector = statici.interface.getSighash('transferERC721Exact')
            const extradataOneB = statici.interface._abiCoder.encode(
                ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
                [[statici.address], [(bEDParams.length - 2) / 2], [bEDSelector], bEDParams]
            )
            const paramsOneA = statici.interface._abiCoder.encode(
                ['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
                [[statici.address, statici.address],
                    [selectorOneA, selectorOneB],
                    extradataOneA, extradataOneB]
            )
            const extradataOne = paramsOneA
            const selectorTwo = statici.interface.getSighash('any')
            const extradataTwo = '0x'
            const one = {registry: registry.address, maker: accounts[0].address, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
            const two = {registry: registry.address, maker: accounts[6].address, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
            const sig = NULL_SIG
            const firstERC20Call = erc20.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[6].address, 2])
            const firstERC721Call = erc721.interface.encodeFunctionData('transferFrom', [accounts[0].address, accounts[6].address, nfts[2]])
            const firstData = atomicizerInterface.encodeFunctionData('atomicize',[
                [erc20.address, erc721.address],
                [0, 0],
                [(firstERC20Call.length - 2) / 2, (firstERC721Call.length - 2) / 2],
                firstERC20Call + firstERC721Call.slice(2)
            ])

            const secondERC721Call = erc721.interface.encodeFunctionData('transferFrom', [accounts[6].address, accounts[0].address, nfts[0]])
            const secondData = atomicizerInterface.encodeFunctionData('atomicize',[
                [erc721.address],
                [0],
                [(secondERC721Call.length - 2) / 2],
                secondERC721Call
            ])

            const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}
            const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}
            console.log('1')
            let twoSig = await exchange.sign(two, accounts[6])
            console.log('2')

            await exchange.atomicMatch(one, sig, firstCall, two, twoSig, secondCall, ZERO_BYTES32)


            expect((await erc20.balanceOf(accounts[6].address)).toString()).to.be.equal('2')
        })
    })
})
