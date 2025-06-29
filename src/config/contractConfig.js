import { getContract } from "thirdweb";
import { client } from "../thirdwebConfig";
import { zkSyncSepoliaWithPaymaster } from "./paymasterConfig";

// VotingFacade contract address
export const VOTING_FACADE_ADDRESS = "0x080b2492B403758aDe9a249FDf245302C860BD63";

// Contract configuration
export const getVotingFacadeContract = () => {
    return getContract({
        client,
        chain: zkSyncSepoliaWithPaymaster,
        address: VOTING_FACADE_ADDRESS,
    });
};

// Enum mappings to match smart contract
export const VoteMutability = {
    IMMUTABLE: 0,
    MUTABLE: 1
};

export const ProposalStatus = {
    NONE: 0,
    PENDING: 1,
    ACTIVE: 2,
    CLOSED: 3,
    FINALIZED: 4
};

// Status and mutability display mappings
export const statusDisplayMap = {
    0: 'NONE',
    1: 'PENDING',
    2: 'ACTIVE',
    3: 'CLOSED',
    4: 'FINALIZED'
};

export const mutabilityDisplayMap = {
    0: 'IMMUTABLE',
    1: 'MUTABLE'
};

// Contract ABI snippets for commonly used functions
export const CONTRACT_FUNCTIONS = {
    CREATE_PROPOSAL: "function createProposal(string calldata title, string[] memory options, uint8 voteMutability, uint256 startTime, uint256 endTime) external returns (uint256)",
    CAST_VOTE: "function castVote(uint256 proposalId, string memory option) external",
    CHANGE_VOTE: "function changeVote(uint256 proposalId, string memory newOption) external",
    RETRACT_VOTE: "function retractVote(uint256 proposalId) external",
    GET_PROPOSAL_DETAILS: "function getProposalDetails(uint256 proposalId) external view returns (address owner, string memory title, string[] memory options, uint256 startDate, uint256 endDate, uint8 status, uint8 voteMutability, string[] memory winners, bool isDraw)",
    GET_VOTER_SELECTED_OPTION: "function getVoterSelectedOption(uint256 proposalId) external view returns (string memory)",
    GET_PROPOSAL_COUNT: "function getProposalCount() external view returns (uint256)",
    GET_VOTE_COUNT: "function getVoteCount(uint256 proposalId, string memory option) external view returns (uint256)",
    REGISTER_VOTER: "function registerVoter(address voter, bytes32 nid, int256[] memory embeddings) external",
    IS_NID_REGISTERED: "function isNidRegistered(bytes32 nid) external view returns (bool)",
    GET_VOTER_PARTICIPATED_PROPOSALS: "function getVoterParticipatedProposals() external view returns (uint256[] memory)",
    GET_VOTER_CREATED_PROPOSALS: "function getVoterCreatedProposals() external view returns (uint256[] memory)",
    UPDATE_PROPOSAL_STATUS: "function updateProposalStatus(uint256 proposalId) external",
    IS_PROPOSAL_FINALIZED: "function isProposalFinalized(uint256 proposalId) external view returns (bool)",
    GET_VOTER_EMBEDDINGS: "function getVoterEmbeddings() external view returns (int256[] memory)",
    IS_PROPOSAL_EXISTS: "function isProposalExists(uint256 proposalId) external view returns (bool)",
    VERIFY_VOTER: "function verifyVoter(address voter) external",
    IS_VOTER_VERIFIED: "function isVoterVerified(address voter) external view returns (bool)",
    REMOVE_USER_PROPOSAL: "function removeProposal(uint256 proposalId) external",
    GET_PROPOSAL_WINNERS: "function getProposalWinners(uint256 proposalId) external view returns (string[] memory winners, bool isDraw)"
}; 