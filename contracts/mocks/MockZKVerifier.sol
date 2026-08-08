// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "../interfaces/IZKVerifier.sol";

/// @title MockZKVerifier
/// @notice TEST-ONLY stand-in for the real Halo2/Plonky3 verifier.
/// @dev This contract performs NO cryptographic verification — it exists solely so the
///      InferenceManager lifecycle can be tested end-to-end before the real ZK circuits
///      (whitepaper Section 4) are implemented. It MUST NOT be deployed to any live network.
///      Proofs are accepted unless they are empty, so tests can also exercise the
///      "invalid proof" / slashing path.
contract MockZKVerifier is IZKVerifier {
    function verifyProof(bytes calldata proof, bytes calldata /* publicInputs */) external pure override returns (bool valid) {
        return proof.length > 0;
    }
}
