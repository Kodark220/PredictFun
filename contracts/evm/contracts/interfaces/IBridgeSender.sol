// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBridgeSender {
    function sendToGenLayer(
        address _targetContract,
        bytes calldata _data,
        bytes calldata _options
    ) external payable returns (bytes32 messageId);

    function quoteSendToGenLayer(
        address _targetContract,
        bytes calldata _data,
        bytes calldata _options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee);
}
