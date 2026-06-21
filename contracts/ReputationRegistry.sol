// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, euint128, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ReputationRegistry
 * @notice Confidential ERC-8004-style agent reputation. An agent's creditworthiness
 *         (score, total repaid) is encrypted and decryptable ONLY by the agent — who can
 *         selectively disclose it to a lender/auditor by granting FHE.allow off-chain.
 * @dev Writes are gated to authorized contracts (Lending / GAD). The GAD penalty is applied
 *      HOMOMORPHICALLY: GAD passes an encrypted `eligible` flag and the penalty is added via
 *      FHE.select — so a no-op crank on a healthy position cannot grief an agent's score
 *      (the score is unchanged when eligible == false, indistinguishable on-chain).
 *      score = successfulRepayments*50 - gadPenalty (floored at 0).
 */
contract ReputationRegistry is ZamaEthereumConfig {
    struct Reputation {
        euint64 score;
        uint256 successfulRepayments; // plaintext count (the agent's own repay actions)
        euint128 totalRepaidUsd6; // scaled value (USD6 * 10**SCALE_DEC); euint128 to avoid overflow
        euint64 gadPenalty; // encrypted, only grows on an *eligible* crank
        uint256 lastUpdate;
    }

    address public admin;
    mapping(address => bool) public writers; // Lending / GAD
    mapping(address => Reputation) internal reputations;

    event ReputationUpdated(address indexed agent, uint256 successfulRepayments);
    event WriterSet(address indexed writer, bool allowed);

    modifier onlyWriter() {
        require(writers[msg.sender], "not writer");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setWriter(address writer, bool allowed) external {
        require(msg.sender == admin, "not admin");
        writers[writer] = allowed;
        emit WriterSet(writer, allowed);
    }

    /// @notice Increase reputation on a successful (partial) repayment. `repaidUsd6` is encrypted (scaled).
    function updateOnRepay(address agent, euint128 repaidUsd6) external onlyWriter {
        Reputation storage r = reputations[agent];
        _init(r);
        r.successfulRepayments += 1;
        r.totalRepaidUsd6 = FHE.add(r.totalRepaidUsd6, repaidUsd6);
        r.lastUpdate = block.timestamp;
        r.score = _calcScore(r);
        _allow(r, agent);
        emit ReputationUpdated(agent, r.successfulRepayments);
    }

    /**
     * @notice Apply a deleveraging penalty IFF the (encrypted) position was actually eligible.
     * @param eligible encrypted flag from GAD; penalty is added via FHE.select so a healthy
     *        (eligible == false) crank is a true no-op on the score.
     */
    function updateOnGad(address agent, ebool eligible) external onlyWriter {
        require(FHE.isSenderAllowed(eligible), "bad eligible acl");
        Reputation storage r = reputations[agent];
        _init(r);
        euint64 penaltyDelta = FHE.select(eligible, FHE.asEuint64(100), FHE.asEuint64(0));
        r.gadPenalty = FHE.add(r.gadPenalty, penaltyDelta);
        r.lastUpdate = block.timestamp;
        r.score = _calcScore(r);
        _allow(r, agent);
        emit ReputationUpdated(agent, r.successfulRepayments);
    }

    /// @notice Returns the agent's reputation. The euint64 fields are only decryptable by the agent.
    function getReputation(address agent) external view returns (Reputation memory) {
        return reputations[agent];
    }

    function scoreOf(address agent) external view returns (euint64) {
        return reputations[agent].score;
    }

    function _init(Reputation storage r) internal {
        if (!FHE.isInitialized(r.totalRepaidUsd6)) {
            r.totalRepaidUsd6 = FHE.asEuint128(0);
            r.gadPenalty = FHE.asEuint64(0);
            r.score = FHE.asEuint64(0);
        }
    }

    /// @dev score = repayments*50 - gadPenalty, floored at 0 (underflow guard via ebool + select).
    function _calcScore(Reputation storage r) internal returns (euint64) {
        euint64 base = FHE.asEuint64(uint64(r.successfulRepayments) * 50);
        ebool covers = FHE.ge(base, r.gadPenalty);
        return FHE.select(covers, FHE.sub(base, r.gadPenalty), FHE.asEuint64(0));
    }

    function _allow(Reputation storage r, address agent) internal {
        FHE.allowThis(r.score);
        FHE.allowThis(r.totalRepaidUsd6);
        FHE.allowThis(r.gadPenalty);
        FHE.allow(r.score, agent);
        FHE.allow(r.totalRepaidUsd6, agent);
    }
}
