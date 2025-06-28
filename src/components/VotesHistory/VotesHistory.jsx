import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { readContract, prepareContractCall, simulateTransaction, sendTransaction } from "thirdweb";
import { getVotingFacadeContract, statusDisplayMap, mutabilityDisplayMap, CONTRACT_FUNCTIONS } from "../../config/contractConfig";
import UserProfile from '../UserProfile/UserProfile';
import './VotesHistory.css';

const VotesHistory = () => {
    const account = useActiveAccount();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('created');
    const [createdProposals, setCreatedProposals] = useState([]);
    const [participatedProposals, setParticipatedProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [selectedOption, setSelectedOption] = useState('');
    const [userVote, setUserVote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [proposalFinalized, setProposalFinalized] = useState(false);
    const [voteCounts, setVoteCounts] = useState({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [proposalVoteCounts, setProposalVoteCounts] = useState({});
    const [loadingProposalCounts, setLoadingProposalCounts] = useState({});

    const contract = getVotingFacadeContract();

    const formatDate = (timestamp) => {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    const goBack = () => navigate(-1);

    // Load proposals when component mounts or account changes
    useEffect(() => {
        if (account) {
            loadProposals();
        }
    }, [account]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedProposal) {
                closeProposalModal();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedProposal]);

    const loadProposals = async () => {
        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const accountAddress = account?.address;
            
            if (!accountAddress) {
                setError('No wallet address found. Please reconnect your wallet.');
                return;
            }

            // Get created and participated proposal IDs
            const [createdIds, participatedIds] = await Promise.all([
                readContract({
                    contract,
                    method: CONTRACT_FUNCTIONS.GET_VOTER_CREATED_PROPOSALS,
                    params: [],
                    from: accountAddress
                }),
                readContract({
                    contract,
                    method: CONTRACT_FUNCTIONS.GET_VOTER_PARTICIPATED_PROPOSALS,
                    params: [],
                    from: accountAddress
                })
            ]);

            // Get full details for each proposal including finalization check
            const createdProposalDetails = await Promise.all(
                createdIds.map(async (id) => {
                    try {
                        const details = await readContract({
                            contract,
                            method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                            params: [id],
                            from: accountAddress
                        });

                        // Check if proposal is finalized
                        let isFinalized = false;
                        try {
                            isFinalized = await readContract({
                                contract,
                                method: CONTRACT_FUNCTIONS.IS_PROPOSAL_FINALIZED,
                                params: [id],
                                from: accountAddress
                            });
                        } catch (finalizedCheckError) {
                            isFinalized = details[5] === 4;
                        }

                        const proposal = {
                            id: Number(id),
                            title: details[1],
                            status: details[5],
                            startDate: details[3],
                            endDate: details[4],
                            options: details[2],
                            winners: details[7],
                            isDraw: details[8],
                            isFinalized: true // For now, treat all proposals as finalized
                        };

                        // Always fetch vote counts for all proposals
                        if (details[2]?.length > 0) {
                            fetchProposalVoteCounts(Number(id), details[2], accountAddress);
                        }

                        return proposal;
                    } catch (err) {
                        console.error(`Error loading proposal ${id}:`, err);
                        return null;
                    }
                })
            );

            const participatedProposalDetails = await Promise.all(
                participatedIds.map(async (id) => {
                    try {
                        const details = await readContract({
                            contract,
                            method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                            params: [id],
                            from: accountAddress
                        });

                        // Check if proposal is finalized
                        let isFinalized = false;
                        try {
                            isFinalized = await readContract({
                                contract,
                                method: CONTRACT_FUNCTIONS.IS_PROPOSAL_FINALIZED,
                                params: [id],
                                from: accountAddress
                            });
                        } catch (finalizedCheckError) {
                            isFinalized = details[5] === 4;
                        }

                        const proposal = {
                            id: Number(id),
                            title: details[1],
                            status: details[5],
                            startDate: details[3],
                            endDate: details[4],
                            options: details[2],
                            winners: details[7],
                            isDraw: details[8],
                            isFinalized: true // For now, treat all proposals as finalized
                        };

                        // Always fetch vote counts for all proposals
                        if (details[2]?.length > 0) {
                            fetchProposalVoteCounts(Number(id), details[2], accountAddress);
                        }

                        return proposal;
                    } catch (err) {
                        console.error(`Error loading proposal ${id}:`, err);
                        return null;
                    }
                })
            );

            // Filter out null values (failed loads)
            setCreatedProposals(createdProposalDetails.filter(p => p !== null));
            setParticipatedProposals(participatedProposalDetails.filter(p => p !== null));

        } catch (error) {
            console.error('Error loading proposals:', error);
            setError('Failed to load proposals. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const openProposalModal = async (proposalId) => {
        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        setLoading(true);
        setError('');
        setSelectedProposal(null);
        setUserVote('');
        setSelectedOption('');

        try {
            const accountAddress = account?.address;
            
            if (!accountAddress) {
                setError('No wallet address found. Please reconnect your wallet.');
                return;
            }

            // Update proposal status (silent operation)
            try {
                const updateStatusTransaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.UPDATE_PROPOSAL_STATUS,
                    params: [proposalId]
                });

                const updateResult = await sendTransaction({
                    transaction: updateStatusTransaction,
                    account
                });
                
                await updateResult.wait();
                
            } catch (statusUpdateError) {
                // Silent failure - status update is optional
            }

            // Get full proposal details
            let proposalDetails;
            
            try {
                proposalDetails = await readContract({
                    contract,
                    method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                    params: [proposalId],
                    from: accountAddress
                });
            } catch (readError) {
                const proposalDetailsTransaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                    params: [proposalId],
                });
                
                const proposalDetailsResult = await simulateTransaction({
                    transaction: proposalDetailsTransaction,
                    account: account
                });

                proposalDetails = proposalDetailsResult.returnValue;
            }

            // Get user's current vote
            let currentVote = '';
            try {
                try {
                    currentVote = await readContract({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTER_SELECTED_OPTION,
                        params: [proposalId],
                        from: accountAddress
                    });
                } catch (readError) {
                    const userVoteTransaction = prepareContractCall({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTER_SELECTED_OPTION,
                        params: [proposalId],
                    });
                    
                    const userVoteResult = await simulateTransaction({
                        transaction: userVoteTransaction,
                        account: account
                    });
                    
                    currentVote = userVoteResult.returnValue;
                }
            } catch (err) {
                // Non-critical error - user might not have voted
            }

            // Check if proposal is finalized using contract function
            let isFinalized = false;
            try {
                isFinalized = await readContract({
                    contract,
                    method: CONTRACT_FUNCTIONS.IS_PROPOSAL_FINALIZED,
                    params: [proposalId],
                    from: accountAddress
                });
            } catch (finalizedCheckError) {
                // If we can't check finalization status, fallback to status check
                isFinalized = proposalDetails[5] === 4;
            }
            
            // For now, treat all proposals as finalized to show vote results
            setProposalFinalized(true);

            // Structure the proposal data
            const proposal = {
                id: proposalId,
                owner: proposalDetails[0],
                title: proposalDetails[1],
                options: proposalDetails[2],
                startDate: proposalDetails[3],
                endDate: proposalDetails[4],
                status: proposalDetails[5],
                voteMutability: proposalDetails[6],
                winners: proposalDetails[7],
                isDraw: proposalDetails[8]
            };

            setSelectedProposal(proposal);

            // Always fetch vote counts for all proposals
            fetchVoteCounts(proposalId, proposalDetails[2], accountAddress);
            setUserVote(currentVote || '');

        } catch (error) {
            console.error('Error loading proposal details:', error);
            setError('Failed to load proposal details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchVoteCounts = async (proposalId, options, accountAddress) => {
        setLoadingCounts(true);
        setVoteCounts({});
        setTotalVotes(0);

        try {
            const counts = {};
            let total = 0;

            for (const option of options) {
                try {
                    const count = await readContract({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTE_COUNT,
                        params: [proposalId, option],
                        from: accountAddress
                    });
                    const voteCount = Number(count);
                    counts[option] = voteCount;
                    total += voteCount;
                } catch (err) {
                    console.error(`Error getting vote count for option "${option}":`, err);
                    counts[option] = 0;
                }
            }

            setVoteCounts(counts);
            setTotalVotes(total);
        } catch (err) {
            console.error('Error fetching vote counts:', err);
        } finally {
            setLoadingCounts(false);
        }
    };

    const fetchProposalVoteCounts = async (proposalId, options, accountAddress) => {
        setLoadingProposalCounts(prev => ({ ...prev, [proposalId]: true }));

        try {
            const counts = {};
            let total = 0;

            for (const option of options) {
                try {
                    const count = await readContract({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTE_COUNT,
                        params: [proposalId, option],
                        from: accountAddress
                    });
                    const voteCount = Number(count);
                    counts[option] = voteCount;
                    total += voteCount;
                } catch (err) {
                    console.error(`Error getting vote count for option "${option}" in proposal ${proposalId}:`, err);
                    counts[option] = 0;
                }
            }

            setProposalVoteCounts(prev => ({
                ...prev,
                [proposalId]: { counts, total }
            }));
        } catch (err) {
            console.error(`Error fetching vote counts for proposal ${proposalId}:`, err);
        } finally {
            setLoadingProposalCounts(prev => ({ ...prev, [proposalId]: false }));
        }
    };

    const closeProposalModal = () => {
        setSelectedProposal(null);
        setUserVote('');
        setSelectedOption('');
        setError('');
        setVoteCounts({});
        setTotalVotes(0);
        setLoadingCounts(false);
    };

    const canVote = () => {
        return selectedProposal && selectedProposal.status === 2; // Active status
    };

    const isMutable = () => {
        return selectedProposal && selectedProposal.voteMutability === 1; // Mutable
    };

    const submitVote = async () => {
        if (!selectedOption) {
            setError('Please select an option');
            return;
        }

        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            let transaction;
            
            if (userVote) {
                // User has already voted, change vote
                transaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.CHANGE_VOTE,
                    params: [Number(selectedProposal.id), selectedOption]
                });
            } else {
                // First time voting
                transaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.CAST_VOTE,
                    params: [Number(selectedProposal.id), selectedOption]
                });
            }

            const result = await sendTransaction({
                transaction,
                account
            });

            console.log('Vote submitted:', result);
            setUserVote(selectedOption);
            setError('');
            alert(userVote ? 'Vote changed successfully!' : 'Vote submitted successfully!');
            
        } catch (err) {
            console.error('Vote submission failed:', err);
            const errorMessage = parseContractError(err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const retractVote = async () => {
        if (!userVote) {
            setError('No vote to retract');
            return;
        }

        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.RETRACT_VOTE,
                params: [Number(selectedProposal.id)]
            });

            const result = await sendTransaction({
                transaction,
                account
            });

            console.log('Vote retracted:', result);
            setUserVote('');
            setSelectedOption('');
            setError('');
            alert('Vote retracted successfully!');
            
        } catch (err) {
            console.error('Vote retraction failed:', err);
            const errorMessage = parseContractError(err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeUserProposal = async (proposalId) => {
        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        // Confirmation dialog
        const confirmDelete = window.confirm(
            `Are you sure you want to delete proposal #${proposalId}? This action cannot be undone.`
        );

        if (!confirmDelete) {
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const transaction = prepareContractCall({
                contract,
                method: CONTRACT_FUNCTIONS.REMOVE_USER_PROPOSAL,
                params: [Number(proposalId)]
            });

            const result = await sendTransaction({
                transaction,
                account
            });

            console.log('Proposal deleted:', result);
            
            // Remove the proposal from local state
            setCreatedProposals(prev => prev.filter(p => p.id !== proposalId));
            
            setError('');
            alert('Proposal deleted successfully!');
            
        } catch (err) {
            console.error('Proposal deletion failed:', err);
            const errorMessage = parseContractError(err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const parseContractError = (error) => {
        // Log the full error for debugging
        console.log('Full error object:', error);
        
        // Try to extract from different error properties
        let errorMessage = '';
        
        // Check various error properties that might contain the revert reason
        const messageSources = [
            error?.message,
            error?.reason,
            error?.data?.message,
            error?.error?.message,
            error?.cause?.message,
            error?.details,
            error?.info?.error?.message,
            JSON.stringify(error)
        ];

        for (const source of messageSources) {
            if (source && typeof source === 'string') {
                errorMessage += source + ' ';
            }
        }

        console.log('Combined error message:', errorMessage);
        
        const errorLower = errorMessage.toLowerCase();

        // Enhanced patterns to catch revert messages
        const revertPatterns = [
            // Standard revert patterns
            /revert\s+(.+?)(?:\n|$|,|\s*\(|;)/i,
            /execution reverted:\s*(.+?)(?:\n|$|,|;)/i,
            /reverted with reason string\s*['"`](.+?)['"`]/i,
            /reverted with custom error\s*['"`](.+?)['"`]/i,
            /vm exception while processing transaction:\s*revert\s*(.+?)(?:\n|$|,)/i,
            /user op reverted:\s*(.+?)(?:\n|$|,)/i,
            
            // Thirdweb/Web3 specific patterns
            /call revert exception[\s\S]*?reason:\s*['"`](.+?)['"`]/i,
            /transaction reverted.*?reason:\s*['"`](.+?)['"`]/i,
            /contract call reverted.*?reason:\s*(.+?)(?:\n|$|,)/i,
            
            // Direct reason extraction
            /reason:\s*['"`](.+?)['"`]/i,
            /message:\s*['"`](.+?)['"`]/i,
            
            // Error message in quotes
            /['"`]([^'"`]*(?:not|invalid|unauthorized|failed|denied|expired|ended|exists)[^'"`]*)['"`]/i
        ];

        for (const pattern of revertPatterns) {
            const match = errorMessage.match(pattern);
            if (match && match[1]) {
                let revertReason = match[1].trim();
                
                // Clean up technical prefixes but keep the actual message
                revertReason = revertReason
                    .replace(/^execution reverted:?\s*/i, '')
                    .replace(/^vm exception while processing transaction:?\s*/i, '')
                    .replace(/^revert\s*/i, '')
                    .replace(/^reason:\s*/i, '')
                    .replace(/^message:\s*/i, '')
                    .replace(/[\[\]]/g, '') // Remove brackets but keep quotes for now
                    .trim();
                
                // Final cleanup
                if (revertReason.startsWith('"') && revertReason.endsWith('"')) {
                    revertReason = revertReason.slice(1, -1);
                }
                if (revertReason.startsWith("'") && revertReason.endsWith("'")) {
                    revertReason = revertReason.slice(1, -1);
                }
                
                // If we have a meaningful message, return it directly
                if (revertReason && 
                    revertReason !== 'undefined' && 
                    revertReason.length > 2 && 
                    !revertReason.includes('0x') &&
                    !/^[a-f0-9]+$/i.test(revertReason)) {
                    
                    console.log('Extracted revert reason:', revertReason);
                    return revertReason;
                }
            }
        }

        // Fallback for common wallet/network issues (non-contract related)
        if (errorLower.includes('user rejected') || errorLower.includes('user denied')) {
            return 'Transaction was cancelled.';
        }
        
        if (errorLower.includes('insufficient funds') || errorLower.includes('insufficient balance')) {
            return 'Insufficient funds to complete the transaction.';
        }
        
        if (errorLower.includes('network') || errorLower.includes('connection')) {
            return 'Network connection error. Please check your internet connection.';
        }
        
        if (errorLower.includes('nonce')) {
            return 'Please refresh the page and try again.';
        }
        
        if (errorLower.includes('gas')) {
            return 'Transaction failed due to gas issues. Please try again.';
        }
        
        // If no specific revert message found, return a simple message
        console.log('No revert reason found, using fallback');
        return 'Transaction failed. Please try again.';
    };

    const currentProposals = activeTab === 'created' ? createdProposals : participatedProposals;

    return (
        <>
            <header>
                <div className="logo">
                    <button onClick={goBack} className="back-button" title="Go Back">
                        <img src="/assets/images/arrow.png" alt="Back" className="arrow" />
                    </button>
                    <Link to="/">
                        <img src="/assets/images/EV-Logo.png" alt="Logo" />
                    </Link>
                </div>

                <nav className="navdefault">
                    <ul>
                        <li><Link to="/home">Home</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/search-proposals">Search Proposals</Link></li>
                        <li><Link to="/addnewvote">Add New Vote</Link></li>
                        <li><Link className="act" to="/voteshistory">Votes History</Link></li>
                        <li>
                            <UserProfile />
                        </li>
                    </ul>
                </nav>
            </header>

            <div className="votes-history-container">
                <div className="votes-history-section">
                    <div className="votes-history-header">
                        <h1 className="page-title">Your Voting History</h1>
                        <p className="page-subtitle">Track proposals you've created and participated in</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'created' ? 'active' : ''}`}
                            onClick={() => setActiveTab('created')}
                        >
                            Created by Me ({createdProposals.length})
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'participated' ? 'active' : ''}`}
                            onClick={() => setActiveTab('participated')}
                        >
                            Participated In ({participatedProposals.length})
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <div className="error-icon">⚠️</div>
                            <div className="error-content">
                                <strong>Error</strong>
                                <p>{error}</p>
                            </div>
                            <button 
                                className="error-close"
                                onClick={() => setError('')}
                                title="Dismiss error"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="loading-message">
                            <div className="loading-spinner"></div>
                            <p>Loading proposals...</p>
                        </div>
                    )}

                    {/* Proposals Grid */}
                    {!loading && (
                        <div className="proposals-grid">
                            {currentProposals.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📋</div>
                                    <h3>No proposals found</h3>
                                    <p>
                                        {activeTab === 'created' 
                                            ? "You haven't created any proposals yet." 
                                            : "You haven't participated in any proposals yet."
                                        }
                                    </p>
                                </div>
                            ) : (
                                currentProposals.map((proposal) => (
                                    <div 
                                        key={proposal.id} 
                                        className="proposal-summary-card"
                                        onClick={() => openProposalModal(proposal.id)}
                                    >
                                        <div className="proposal-summary-header">
                                            <h3 className="proposal-summary-title">{proposal.title}</h3>
                                            {/* Delete Button - Only show for created proposals */}
                                            {activeTab === 'created' && (
                                                <button
                                                    className={`delete-proposal-btn ${isSubmitting ? 'loading' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent card click
                                                        removeUserProposal(proposal.id);
                                                    }}
                                                    disabled={isSubmitting}
                                                    title={isSubmitting ? "Deleting..." : "Delete this proposal permanently"}
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                        <div className="proposal-status-section">
                                            <span className={`status-badge status-${proposal.status === 3 ? 'ended' : statusDisplayMap[proposal.status].toLowerCase()}`}>
                                                {proposal.status === 3 ? 'ENDED' : statusDisplayMap[proposal.status]}
                                            </span>
                                            {proposal.isFinalized && proposal.winners && proposal.winners.length > 0 && (
                                                <div className="winner-badge">
                                                    🎉 Winner: {proposal.winners.join(', ')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Vote Results for Finalized Proposals */}
                                        {proposal.isFinalized && proposal.options && (
                                            <div className="proposal-summary-results">
                                                <h4>📊 Vote Results</h4>
                                                {loadingProposalCounts[proposal.id] ? (
                                                    <div className="summary-loading">Loading vote counts...</div>
                                                ) : (
                                                    <div className="summary-options">
                                                        {proposal.options.map((option, index) => {
                                                            const proposalData = proposalVoteCounts[proposal.id];
                                                            const voteCount = proposalData?.counts[option] || 0;
                                                            const totalVotes = proposalData?.total || 0;
                                                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                                            const isWinner = proposal.winners && proposal.winners.includes(option);

                                                            return (
                                                                <div 
                                                                    key={index} 
                                                                    className={`summary-option ${isWinner ? 'summary-winner' : ''}`}
                                                                >
                                                                    <div className="summary-option-header">
                                                                        <span className="summary-option-name">
                                                                            {isWinner && <span className="mini-crown">👑</span>}
                                                                            {option}
                                                                        </span>
                                                                        <span className="summary-vote-count">
                                                                            {voteCount} votes ({percentage}%)
                                                                        </span>
                                                                    </div>
                                                                    <div className="summary-progress-container">
                                                                        <div 
                                                                            className={`summary-progress-bar ${isWinner ? 'summary-winner-bar' : ''}`}
                                                                            style={{ width: `${percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {proposalVoteCounts[proposal.id] && (
                                                            <div className="summary-total">
                                                                Total Votes: <strong>{proposalVoteCounts[proposal.id].total}</strong>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="proposal-summary-dates">
                                            <div className="date-item">
                                                <span className="date-label">Start:</span>
                                                <span className="date-value">{formatDate(proposal.startDate)}</span>
                                            </div>
                                            <div className="date-item">
                                                <span className="date-label">End:</span>
                                                <span className="date-value">{formatDate(proposal.endDate)}</span>
                                            </div>
                                        </div>
                                        <div className="proposal-summary-footer">
                                            <span className="proposal-id">ID: {proposal.id}</span>
                                            <span className="click-hint">Click to view details</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Full Proposal Details Modal (reused from ProposalSearch) */}
                {selectedProposal && (
                    <div 
                        className="proposal-card-section"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                closeProposalModal();
                            }
                        }}
                    >
                        <div className="proposal-card">
                            {/* Close Button */}
                            <button 
                                className="proposal-close-btn"
                                onClick={closeProposalModal}
                                title="Close proposal details"
                            >
                                ×
                            </button>
                            
                            {/* Card Header */}
                            <div className="proposal-card-header">
                                <h2 className="proposal-title">{selectedProposal.title}</h2>
                                <div className="proposal-badges">
                                    <span className={`status-badge status-${selectedProposal.status === 3 ? 'ended' : statusDisplayMap[selectedProposal.status].toLowerCase()}`}>
                                        {selectedProposal.status === 3 ? 'ENDED' : statusDisplayMap[selectedProposal.status]}
                                    </span>
                                </div>
                            </div>

                            {/* Proposal Information */}
                            <div className="proposal-info-grid">
                                <div className="info-card">
                                    <label>Proposal Owner</label>
                                    <span 
                                        className="owner-address-clickable" 
                                        title={`${selectedProposal.owner} (Click to copy)`}
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedProposal.owner).then(() => {
                                                setShowCopyToast(true);
                                                setTimeout(() => setShowCopyToast(false), 2000);
                                            }).catch(err => {
                                                console.error('Failed to copy: ', err);
                                            });
                                        }}
                                    >
                                        {selectedProposal.owner.slice(0, 12)}...{selectedProposal.owner.slice(-6)}
                                    </span>
                                </div>
                                <div className="info-card">
                                    <label>Start Date</label>
                                    <span>{formatDate(selectedProposal.startDate)}</span>
                                </div>
                                <div className="info-card">
                                    <label>End Date</label>
                                    <span>{formatDate(selectedProposal.endDate)}</span>
                                </div>
                                <div className="info-card">
                                    <label>Vote Type</label>
                                    <span className={`vote-type ${mutabilityDisplayMap[selectedProposal.voteMutability].toLowerCase()}`}>
                                        {mutabilityDisplayMap[selectedProposal.voteMutability]}
                                    </span>
                                </div>
                            </div>

                            {/* Results Summary (if finalized) */}
                            {proposalFinalized && (
                                <div className="results-summary">
                                    <h3>Final Results</h3>
                                    {selectedProposal.isDraw ? (
                                        <div className="draw-message">
                                            🤝 The vote ended in a draw! Total votes: <strong>{totalVotes}</strong>
                                        </div>
                                    ) : (
                                        <div className="winners-display">
                                            <strong>🎉 Winner(s):</strong> {selectedProposal.winners.map(winner => {
                                                const winnerVotes = voteCounts[winner] || 0;
                                                return `${winner}, with votes ${winnerVotes} out of ${totalVotes}`;
                                            }).join(' | ')}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Current Vote Display */}
                            {userVote && (
                                <div className="current-vote-section">
                                    <div className="current-vote-card">
                                        <span className="vote-label">Your Current Vote:</span>
                                        <span className="current-vote-value">{userVote}</span>
                                    </div>
                                </div>
                            )}

                            {/* Voting Section */}
                            <div className="voting-section">
                                <h3>🗳️ Cast Your Vote</h3>
                                
                                {/* Error Message */}
                                {error && (
                                    <div className="error-message">
                                        <div className="error-icon">⚠️</div>
                                        <div className="error-content">
                                            <strong>Error</strong>
                                            <p>{error}</p>
                                        </div>
                                        <button 
                                            className="error-close"
                                            onClick={() => setError('')}
                                            title="Dismiss error"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                                
                                {!canVote() && (
                                    <div className="voting-disabled">
                                        <p>
                                            {selectedProposal.status === 1 && "⏳ Voting hasn't started yet"}
                                            {selectedProposal.status === 3 && "⏰ Voting period has ended"}
                                            {selectedProposal.status === 4 && "✅ Voting is finalized"}
                                            {selectedProposal.status === 0 && "❌ Invalid proposal status"}
                                        </p>
                                    </div>
                                )}

                                <div className="options-grid">
                                    {selectedProposal.options.map((option, index) => {
                                        const voteCount = voteCounts[option] || 0;
                                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                        const isWinner = selectedProposal.winners && selectedProposal.winners.includes(option);
                                        
                                        return (
                                            <label key={index} className={`option-card ${selectedOption === option ? 'selected' : ''} ${!canVote() || (userVote && !isMutable()) ? 'disabled' : ''} ${proposalFinalized && isWinner ? 'winner' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="vote-option"
                                                    value={option}
                                                    checked={selectedOption === option}
                                                    onChange={(e) => setSelectedOption(e.target.value)}
                                                    disabled={!canVote() || (userVote && !isMutable())}
                                                    className="radio-input"
                                                />
                                                <div className="option-content">
                                                    <div className="option-header">
                                                        <span className="option-text">{option}</span>
                                                        {proposalFinalized && isWinner && <span className="winner-crown">👑</span>}
                                                        {selectedOption === option && <span className="check-icon">✓</span>}
                                                    </div>
                                                    
                                                    {/* Vote count display for finalized proposals */}
                                                    {proposalFinalized && (
                                                        <div className="vote-results-inline">
                                                            {loadingCounts ? (
                                                                <div className="loading-votes">Loading...</div>
                                                            ) : (
                                                                <>
                                                                    <div className="vote-stats">
                                                                        <span className="vote-count">{voteCount} votes</span>
                                                                        <span className="vote-percentage">({percentage}%)</span>
                                                                    </div>
                                                                    <div className="progress-bar-container">
                                                                        <div 
                                                                            className={`progress-bar ${isWinner ? 'winner-bar' : ''}`}
                                                                            style={{ width: `${percentage}%` }}
                                                                        >
                                                                            {percentage > 20 && (
                                                                                <span className="progress-text">{percentage}%</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Action Buttons */}
                                {canVote() && (
                                    <div className="voting-actions">
                                        {/* Warning message for immutable proposals before voting */}
                                        {!userVote && !isMutable() && (
                                            <div className="immutable-warning-message">
                                                ⚠️ Warning: This vote will be final and cannot be changed or retracted once submitted.
                                            </div>
                                        )}

                                        {/* Show buttons based on vote state and mutability */}
                                        {(!userVote || isMutable()) && (
                                            <>
                                                {/* If user has voted on mutable proposal, show both buttons side by side */}
                                                {userVote && isMutable() ? (
                                                    <div className="button-group">
                                                        <button
                                                            onClick={retractVote}
                                                            disabled={isSubmitting}
                                                            className="retract-btn"
                                                        >
                                                            {isSubmitting ? 'Retracting...' : 'Retract Vote'}
                                                        </button>
                                                        <button
                                                            onClick={submitVote}
                                                            disabled={!selectedOption || isSubmitting}
                                                            className="submit-btn"
                                                        >
                                                            {isSubmitting ? 'Changing Vote...' : 'Change Vote'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Show single submit button for first-time voting */
                                                    <button
                                                        onClick={submitVote}
                                                        disabled={!selectedOption || isSubmitting}
                                                        className="submit-btn"
                                                    >
                                                        {isSubmitting ? 'Submitting Vote...' : 'Submit Vote'}
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {/* Show message for immutable proposals with existing votes */}
                                        {userVote && !isMutable() && (
                                    <div className="immutable-vote-message">
                                        <strong>Vote is final</strong>
                                        <p>This proposal is immutable. Your vote cannot be changed or retracted.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Wallet Connection Warning */}
                {!account && (
                    <div className="wallet-warning">
                        <p>Please connect your wallet to view your voting history.</p>
                    </div>
                )}

                {/* Copy Toast Notification */}
                {showCopyToast && (
                    <div className="copy-toast">
                        <span className="toast-icon">✅</span>
                        Address copied to clipboard!
                    </div>
                )}
            </div>
        </>
    );
};

export default VotesHistory; 