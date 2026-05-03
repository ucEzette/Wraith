const { ethers } = require("ethers");

const HOOK = "0x83cabbF63Cbe0b7EaF14824F4C7529480fAC8280".toLowerCase();
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F".toLowerCase();
const WETH = "0x4200000000000000000000000000000000000006".toLowerCase();
const QPHAN = "0x9d803A3066C858d714C4F5eE286eaa6249d451aB".toLowerCase();
const ECHO = "0x6586035D5e39e30bf37445451b43EEaEeAa1405a".toLowerCase();
const WRAITH = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174".toLowerCase();
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

console.log("1. WRAITH / USDC:", getPoolId(WRAITH, USDC));
console.log("2. QPHAN / USDC:", getPoolId(QPHAN, USDC));
console.log("3. ECHO / USDC:", getPoolId(ECHO, USDC));
console.log("4. WETH / USDC:", getPoolId(WETH, USDC));
console.log("5. ETH / USDC:", getPoolId(ETH, USDC));
