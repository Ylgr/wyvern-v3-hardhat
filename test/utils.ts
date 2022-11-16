import {ethers} from "hardhat";

const ethUtil = require('ethereumjs-util')

export const deploy = async (contractName: string, ...args: any) => {
    const artifact = await ethers.getContractFactory(contractName)
    return artifact.deploy(...args)
}
const abi = ethers.utils.defaultAbiCoder;
function structHash (name, fields, data) {
    return ethUtil.sha3(encodeData(name, fields, data))
}
function typeHash (name, fields) {
    return ethUtil.sha3(encodeType(name, fields))
}
function encodeType (name, fields) {
    return `${name}(${fields.map(({name, type}) => `${type} ${name}`).join(',')})`
}
function signHash (typedData) {
    return ethUtil.sha3(
        Buffer.concat([
            Buffer.from('1901', 'hex'),
            structHash(eip712Domain.name, eip712Domain.fields, typedData.domain),
            structHash(typedData.name, typedData.fields, typedData.data)
        ])
    )
}
const hashToSign = (order, exchange) => {
    return '0x' + signHash(structToSign(order, exchange)).toString('hex')
}
const structToSign = (order, exchange) => {
    return {
        name: eip712Order.name,
        fields: eip712Order.fields,
        domain: {
            name: 'Wyvern Exchange',
            version: '3.1',
            chainId: 50,
            verifyingContract: exchange
        },
        data: order
    }
}

function encodeData (name, fields, data) {
    let encTypes = []
    let encValues = []

    // Add typehash
    encTypes.push('bytes32')
    encValues.push(typeHash(name, fields))

    // Add field contents
    for (let field of fields) {
        let value = data[field.name]
        if (field.type === 'string' || field.type === 'bytes') {
            encTypes.push('bytes32')
            value = ethUtil.sha3(value)
            encValues.push(value)
        } else {
            encTypes.push(field.type)
            encValues.push(value)
        }
    }

    return abi.rawEncode(encTypes, encValues)
}

const hashOrder = (order) => {
    return '0x' + structHash(eip712Order.name, eip712Order.fields, order).toString('hex')
}

const parseSig = (bytes) => {
    bytes = bytes.substr(2)
    const r = '0x' + bytes.slice(0, 64)
    const s = '0x' + bytes.slice(64, 128)
    const v = parseInt('0x' + bytes.slice(128, 130), 16)
    return {v, r, s}
}

const eip712Order = {
    name: 'Order',
    fields: [
        { name: 'registry', type: 'address' },
        { name: 'maker', type: 'address' },
        { name: 'staticTarget', type: 'address' },
        { name: 'staticSelector', type: 'bytes4' },
        { name: 'staticExtradata', type: 'bytes' },
        { name: 'maximumFill', type: 'uint256' },
        { name: 'listingTime', type: 'uint256' },
        { name: 'expirationTime', type: 'uint256' },
        { name: 'salt', type: 'uint256' }
    ]
}
const eip712Domain = {
    name: 'EIP712Domain',
    fields: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
    ]
}
export const randomUint = () => {
    return Math.floor(Math.random() * 1e10)
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const NULL_SIG = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
export const CHAIN_ID = 50

export const wrap = (inst) => {
    const obj = {
        inst: inst,
        hashOrder: (order) => inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
        hashToSign: (order) => {
            return inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt).then(hash => {
                return inst.hashToSign_.call(hash)
            })
        },
        validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
        validateOrderAuthorization: (hash, maker, sig, misc) => inst.validateOrderAuthorization_.call(hash, maker, abi.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''), misc),
        approveOrderHash: (hash) => inst.approveOrderHash_(hash),
        approveOrder: (order, inclusion, misc) => inst.approveOrder_(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt, inclusion, misc),
        setOrderFill: (order, fill) => inst.setOrderFill_(hashOrder(order), fill),
        atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch_(
            [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
                counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
            [order.staticSelector, counterorder.staticSelector],
            order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
            [call.howToCall, countercall.howToCall],
            metadata,
            abi.encode(['bytes', 'bytes'], [
                abi.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
                abi.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
            ])
        ),
        atomicMatchWith: (order, sig, call, counterorder, countersig, countercall, metadata, misc) => inst.atomicMatch_(
            [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
                counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
            [order.staticSelector, counterorder.staticSelector],
            order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
            [call.howToCall, countercall.howToCall],
            metadata,
            abi.encode(['bytes', 'bytes'], [
                abi.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
                abi.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
            ]),
            misc
        )
    }
    obj.sign = (order, account) => {
        const str = structToSign(order, inst.address)
        return account._signTypedData(
            str.domain,
            eip712Domain.fields,
            order
        ).si(account, {
            types: {
                EIP712Domain: eip712Domain.fields,
                Order: eip712Order.fields
            },
            domain: str.domain,
            primaryType: 'Order',
            message: order
        }).then(sigBytes => {
            return parseSig(sigBytes)
        })
    }
    obj.personalSign = (order, account) => {
        const calculatedHashToSign = hashToSign(order, inst.address)
        return account.sign(calculatedHashToSign, account).then(sigBytes => {
            let sig = parseSig(sigBytes)
            sig.v += 27
            sig.suffix = '03' // EthSign suffix like 0xProtocol
            return sig
        })
    }
    return obj
}
