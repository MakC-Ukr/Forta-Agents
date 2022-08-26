//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

contract TestHubPool{
    event LivenessSet(uint256 newLiveness);

    function emitSingleEvent() public
    {
        emit LivenessSet(1);
    }
}

contract TestSpokePool{
    event SetXDomainAdmin(address indexed newAdmin);

    function emitSingleEvent() public
    {
        emit SetXDomainAdmin(0x1Abf3a6C41035C1d2A3c74ec22405B54450f5e13);
    }
}

contract TestBoth{

    function emitMultipleEvents(address hubPool, address spokePool) public
    {
        TestHubPool(hubPool).emitSingleEvent();
        TestSpokePool(spokePool).emitSingleEvent();
    }
}