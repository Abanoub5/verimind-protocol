// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title IZKVerifier
/// @notice Interface that the on-chain Halo2/Plonky3 SNARK verifier must implement
///         (whitepaper Section 4). NOT YET IMPLEMENTED — see contracts/mocks/MockZKVerifier.sol
///         for the stand-in used by tests, and docs/ROADMAP.md for the build plan.
/// @dev The real implementation will be a specialized EVM precompile call or a
///      generated Solidity verifier from the Halo2/Plonky3 circuit's verifying key,
///      as described in whitepaper Section 4.1.
interface IZKVerifier {
    /// @notice Verifies a succinct zero-knowledge proof of a model forward pass.
    /// @param proof The compressed SNARK proof bytes (~1.5KB-12KB per whitepaper Section 4.1)
    /// @param publicInputs ABI-encoded public inputs: prompt hash, model ID hash, output commitment
    /// @return valid True if the proof is cryptographically valid
    function verifyProof(bytes calldata proof, bytes calldata publicInputs) external view returns (bool valid);
}
