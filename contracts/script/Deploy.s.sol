// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {FakexPersonalityNFT} from "../src/FakexPersonalityNFT.sol";

/// forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast
contract Deploy is Script {
    function run() external returns (FakexPersonalityNFT nft) {
        address treasury = vm.envAddress("NFT_TREASURY_ADDRESS");
        uint96 royaltyBps = uint96(vm.envUint("NFT_ROYALTY_BPS"));
        uint256 mintFee = vm.envUint("NFT_MINT_FEE_WEI");

        vm.startBroadcast();
        nft = new FakexPersonalityNFT(treasury, royaltyBps, mintFee);
        vm.stopBroadcast();
    }
}
