const { ethers } = require("ethers");

const HOOK = "0x7Da6934Dc1231398C63DE28051588775B1b70280".toLowerCase();
const USDC = "0x06Afd270830607994D5a12248443B1f531393A22".toLowerCase();
const WETH = "0x4200000000000000000000000000000000000006".toLowerCase();
const QPHAN = "0x9d803A3066C858d714C4F5eE286eaa6249d451aB".toLowerCase();
const ECHO = "0x6586035D5e39e30bf37445451b43EEaEeAa1405a".toLowerCase();
const ETH = "0x0000000000000000000000000000000000000000".toLowerCase();

const FEE = 3000;
const TICK_SPACING = 60;

function getPoolId(tokenA, tokenB) {
    const tokens = [tokenA, tokenB].sort();
    const t0 = tokens[0];
    const t1 = tokens[1];
    
    const abiCoder = new ethers.AbiCoder();
    const encoded = abiCoder.encode(
        ["address", "address", "uint24", "int24", "address"],
        [t0, t1, FEE, TICK_SPACING, HOOK]
    );
    
    return ethers.keccak256(encoded);
}

console.log("1. ETH / USDC:", getPoolId(ETH, USDC));
console.log("2. WETH / USDC:", getPoolId(WETH, USDC));
console.log("3. QPHAN / USDC:", getPoolId(QPHAN, USDC));
console.log("4. ECHO / USDC:", getPoolId(ECHO, USDC));
