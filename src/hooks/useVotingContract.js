import { useState, useCallback } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { getVotingFacadeContract, VoteMutability, CONTRACT_FUNCTIONS, statusDisplayMap, mutabilityDisplayMap, VOTING_FACADE_ADDRESS } from "../config/contractConfig";
import { getTransactionOptions, isGasSponsoringEnabled } from "../config/paymasterConfig";
import { ethers } from 'ethers';

export const useVotingContract = () => {
    const account = useActiveAccount();
    const contract = getVotingFacadeContract();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Helper function to parse contract errors
    const parseContractError = (error) => {
        console.log('Full error object:', error);
        
        let errorMessage = '';
        
        // Check various error properties
        if (error?.message) {
            errorMessage = error.message;
        } else if (error?.reason) {
            errorMessage = error.reason;
        } else if (error?.data?.message) {
            errorMessage = error.data.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        // Extract meaningful error messages
        if (errorMessage.includes('User denied')) {
            return 'Transaction was cancelled by user';
        } else if (errorMessage.includes('insufficient funds')) {
            return 'Insufficient funds for transaction';
        } else if (errorMessage.includes('gas')) {
            return 'Transaction failed due to gas issues';
        } else if (errorMessage.includes('revert')) {
            const revertMatch = errorMessage.match(/revert (.+?)(?:\s|$)/);
            if (revertMatch) {
                return `Contract error: ${revertMatch[1]}`;
            }
        }
        
        return errorMessage || 'An unknown error occurred';
    };

    // Create a new proposal
    const createProposal = async (title, options, voteMutability, startDate, endDate) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const validOptions = options.filter(option => option.trim() !== '');
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(endDate.getTime() / 1000);
            const mutability = voteMutability === 'MUTABLE' ? VoteMutability.MUTABLE : VoteMutability.IMMUTABLE;
            
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.CREATE_PROPOSAL,
                params: [
                    title.trim(),
                    validOptions,
                    mutability,
                    startTimestamp,
                    endTimestamp
                ]
            });

            const result = await sendTransaction({
                transaction,
                account,
                ...getTransactionOptions('createProposal')
            });

            // Wait for the transaction receipt to get the event logs
            const receipt = await waitForReceipt({
                client: contract.client,
                chain: contract.chain,
                transactionHash: result.transactionHash
            });

            // Extract the proposal ID from the ProposalCreated event
            console.log('Transaction receipt:', receipt);
            
            if (receipt && receipt.logs) {
                console.log('Found', receipt.logs.length, 'logs in transaction receipt');
                
                for (let i = 0; i < receipt.logs.length; i++) {
                    const log = receipt.logs[i];
                    console.log(`Log ${i}:`, log);
                    
                    try {
                        // Check if this log has the expected structure for an event
                        if (log.topics && log.topics.length >= 3) {
                            console.log(`Log ${i} topics:`, log.topics);
                            
                            // The first topic is the event signature hash
                            // The second topic is the indexed proposalId  
                            // The third topic is the indexed owner (creator) address
                            
                            // Extract and compare the creator address from the event
                            const creatorFromEvent = '0x' + log.topics[2].slice(26); // Remove the padding from the address
                            console.log(`Log ${i} creator from event:`, creatorFromEvent);
                            console.log('Current account address:', account.address);
                            
                            if (creatorFromEvent.toLowerCase() === account.address.toLowerCase()) {
                                // Extract the proposal ID from the second topic
                                const proposalIdHex = log.topics[1];
                                const proposalId = parseInt(proposalIdHex, 16);
                                console.log(`Successfully extracted proposal ID from event log ${i}:`, proposalId);
                                return proposalId;
                            }
                        }
                    } catch (eventParseError) {
                        console.warn(`Error parsing event log ${i}:`, eventParseError);
                        continue;
                    }
                }
            } else {
                console.warn('No receipt or logs found in transaction result');
            }

            // Enhanced fallback: if we can't extract from events, try to get the transaction result differently
            console.warn('Could not extract proposal ID from transaction events, transaction result:', result);
            
            // If all else fails, throw an error rather than returning wrong data
            throw new Error('Failed to determine the created proposal ID from transaction events');
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Get proposal details
    const getProposalDetails = async (proposalId) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const proposalDetails = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                params: [proposalId]
            });

            return {
                owner: proposalDetails[0],
                title: proposalDetails[1],
                options: proposalDetails[2],
                startDate: proposalDetails[3],
                endDate: proposalDetails[4],
                status: Number(proposalDetails[5]),
                voteMutability: Number(proposalDetails[6]),
                winners: proposalDetails[7],
                isDraw: proposalDetails[8]
            };
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Get user's selected option for a proposal
    const getUserVote = async (proposalId) => {
        if (!account) {
            return '';
        }

        try {
            const currentVote = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_VOTER_SELECTED_OPTION,
                params: [proposalId]
            });
            return currentVote;
        } catch (err) {
            // User hasn't voted yet or other error
            console.log('No existing vote found');
            return '';
        }
    };

    // Cast a vote
    const castVote = async (proposalId, option) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.CAST_VOTE,
                params: [proposalId, option]
            });

            const result = await sendTransaction({
                transaction,
                account,
                ...getTransactionOptions('castVote')
            });

            return result;
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Change a vote
    const changeVote = async (proposalId, newOption) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.CHANGE_VOTE,
                params: [proposalId, newOption]
            });

            const result = await sendTransaction({
                transaction,
                account,
                ...getTransactionOptions('changeVote')
            });

            return result;
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Retract a vote
    const retractVote = async (proposalId) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.RETRACT_VOTE,
                params: [proposalId]
            });

            const result = await sendTransaction({
                transaction,
                account,
                ...getTransactionOptions('retractVote')
            });

            return result;
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Get proposal count
    const getProposalCount = async () => {
        try {
            const count = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_PROPOSAL_COUNT,
                params: []
            });
            return Number(count);
        } catch (err) {
            console.error('Error getting proposal count:', err);
            return 0;
        }
    };

    // Get vote count for a specific option
    const getVoteCount = async (proposalId, option) => {
        try {
            const count = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_VOTE_COUNT,
                params: [proposalId, option]
            });
            return Number(count);
        } catch (err) {
            console.error('Error getting vote count:', err);
            return 0;
        }
    };

    // Get user's participated proposals
    const getUserParticipatedProposals = async () => {
        if (!account) {
            return [];
        }

        try {
            const proposals = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_VOTER_PARTICIPATED_PROPOSALS,
                params: []
            });
            return proposals.map(Number);
        } catch (err) {
            console.error('Error getting participated proposals:', err);
            return [];
        }
    };

    // Get user's created proposals
    const getUserCreatedProposals = async () => {
        if (!account) {
            return [];
        }

        try {
            const proposals = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.GET_VOTER_CREATED_PROPOSALS,
                params: []
            });
            return proposals.map(Number);
        } catch (err) {
            console.error('Error getting created proposals:', err);
            return [];
        }
    };

    // Format date helper
    const formatDate = (timestamp) => {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    // Check if voter is verified
    const isVoterVerified = async (voterAddress) => {
        try {
            console.log('Checking verification for address:', voterAddress);
            console.log('Contract:', contract);
            
            const isVerified = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.IS_VOTER_VERIFIED,
                params: [voterAddress]
            });
            
            console.log('Verification result:', isVerified);
            return Boolean(isVerified);
        } catch (err) {
            console.error('Error checking voter verification:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                voterAddress,
                contractAddress: contract?.address
            });
            
            // In case of error, return false to redirect to registration
            return false;
        }
    };

    /**
     * Get voter embeddings using raw ethers.js with proper signer context
     */
    const getVoterEmbeddings = useCallback(async () => {
        if (!contract || !account?.address) {
            throw new Error('Contract or account not available');
        }

        try {
            // Use raw ethers.js with Web3Provider and signer for proper msg.sender context
            if (typeof window !== 'undefined' && window.ethereum) {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const signerAddress = await signer.getAddress();
                
                if (signerAddress.toLowerCase() !== account.address.toLowerCase()) {
                    throw new Error('Signer address mismatch');
                }

                // Minimal ABI for getVoterEmbeddings function
                const contractABI = [
                    "function getVoterEmbeddings() external view returns (int256[] memory)"
                ];

                const contractWithSigner = new ethers.Contract(
                    VOTING_FACADE_ADDRESS,
                    contractABI,
                    signer
                );

                const result = await contractWithSigner.getVoterEmbeddings();
                
                // Convert BigNumber objects to regular numbers and divide by 1e18
                const convertedEmbeddings = result.map(bigNum => Number(bigNum) / 1e18);
                
                return convertedEmbeddings;
            } else {
                throw new Error('Ethereum provider not available');
            }
        } catch (error) {
            console.error('Error getting voter embeddings:', error);
            throw error;
        }
    }, [contract, account?.address]);

    // Check if NID is already registered
    const isNIDRegistered = async (hashedNID) => {
        try {
            const isRegistered = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.IS_NID_REGISTERED,
                params: [hashedNID]
            });
            
            console.log('NID registration check result:', isRegistered);
            return Boolean(isRegistered);
        } catch (err) {
            console.error('Error checking NID registration:', err);
            // In case of error, return false to allow continuation
            return false;
        }
    };

    // Register voter
    const registerVoter = async (voterAddress, hashedNID, embeddings) => {
        if (!account) {
            throw new Error('Please connect your wallet');
        }

        setLoading(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.REGISTER_VOTER,
                params: [voterAddress, hashedNID, embeddings]
            });

            const result = await sendTransaction({
                transaction,
                account,
                ...getTransactionOptions('registerVoter')
            });

            return result;
        } catch (err) {
            const errorMsg = parseContractError(err);
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Status display helpers
    const getStatusDisplay = (status) => statusDisplayMap[status] || 'UNKNOWN';
    const getMutabilityDisplay = (mutability) => mutabilityDisplayMap[mutability] || 'UNKNOWN';

    return {
        // State
        loading,
        error,
        account,
        
        // Contract functions
        createProposal,
        getProposalDetails,
        getUserVote,
        castVote,
        changeVote,
        retractVote,
        getProposalCount,
        getVoteCount,
        getUserParticipatedProposals,
        getUserCreatedProposals,
        
        // Verification functions
        isVoterVerified,
        getVoterEmbeddings,
        isNIDRegistered,
        registerVoter,
        
        // Helpers
        formatDate,
        getStatusDisplay,
        getMutabilityDisplay,
        parseContractError
    };
}; 