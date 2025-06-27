import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { readContract, prepareContractCall, sendTransaction, simulateTransaction } from "thirdweb";
import { getVotingFacadeContract, statusDisplayMap, mutabilityDisplayMap, CONTRACT_FUNCTIONS } from "../../config/contractConfig";
import UserProfile from '../UserProfile/UserProfile';
import './ProposalSearch.css';

const ProposalSearch = () => {
    const account = useActiveAccount();
    const location = useLocation();
    const navigate = useNavigate();
    const [proposalId, setProposalId] = useState('');
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedOption, setSelectedOption] = useState('');
    const [userVote, setUserVote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);

    // Check if we received a proposal ID from navigation
    useEffect(() => {
        if (location.state?.proposalId) {
            setProposalId(location.state.proposalId);
            // Auto-search if we have an ID from navigation
            setTimeout(() => {
                const searchId = String(location.state.proposalId);
                if (searchId.trim()) {
                    searchProposal(location.state.proposalId);
                }
            }, 100);
        }
    }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && proposal) {
                setProposal(null);
                setUserVote('');
                setSelectedOption('');
                setError('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [proposal]);

    // Contract configuration
    const contract = getVotingFacadeContract();

    const formatDate = (timestamp) => {
        return new Date(Number(timestamp) * 1000).toLocaleString();
    };

    const goBack = () => navigate(-1);

    const searchProposal = async (idToSearch = null) => {
        // If it's an event object (button click), ignore it and use state
        // If it's a direct value, use that value
        let inputValue;
        
        if (idToSearch === null || idToSearch === undefined || (typeof idToSearch === 'object' && idToSearch.target)) {
            // Use the proposalId state (for button clicks or no parameter)
            inputValue = proposalId;
        } else {
            // Use the provided value (for direct calls)
            inputValue = idToSearch;
        }
        
        // Simple validation - just check if we have something
        if (!inputValue || inputValue === '' || inputValue === null || inputValue === undefined) {
            setError('Please enter a proposal ID');
            return;
        }

        // Convert to number for contract calls
        const searchId = parseInt(inputValue, 10);
        
        // Simple check - just needs to be a positive number
        if (isNaN(searchId) || searchId < 1) {
            setError('Please enter a valid number greater than 0');
            return;
        }

        if (!account) {
            setError('Please connect your wallet');
            return;
        }

        setLoading(true);
        setError('');
        setProposal(null);
        setUserVote('');
        setSelectedOption('');

        try {
            // Check if we have a valid address
            const accountAddress = account?.address;
            
            if (!accountAddress) {
                setError('No wallet address found. Please reconnect your wallet.');
                return;
            }
            
            // First check if proposal exists using isProposalExists
            const proposalExists = await readContract({
                contract,
                method: CONTRACT_FUNCTIONS.IS_PROPOSAL_EXISTS,
                params: [searchId],
                account: account
            });
            
            if (!proposalExists) {
                setError('Proposal not found. Please check the Proposal ID and try again.');
                return;
            }

            // Update proposal status before getting details (silent operation)
            try {
                const updateStatusTransaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.UPDATE_PROPOSAL_STATUS,
                    params: [searchId]
                });

                const updateResult = await sendTransaction({
                    transaction: updateStatusTransaction,
                    account
                });
                
                // Wait for transaction confirmation
                await updateResult.wait();
                
            } catch (statusUpdateError) {
                // Don't show error to user - the status update is optional
                // Status update failed, but this is non-critical
            }

            // Try different approaches to get proposal details
            let proposalDetails;
            
            try {
                // Method 1: Try readContract with from parameter (if supported)
                proposalDetails = await readContract({
                    contract,
                    method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                    params: [searchId],
                    from: accountAddress
                });
            } catch (readError) {
                try {
                    // Method 2: Use simulateTransaction as fallback
                    const proposalDetailsTransaction = prepareContractCall({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_PROPOSAL_DETAILS,
                        params: [searchId],
                    });
                    
                    const proposalDetailsResult = await simulateTransaction({
                        transaction: proposalDetailsTransaction,
                        account: account
                    });

                    proposalDetails = proposalDetailsResult.returnValue;
                } catch (simError) {
                    throw simError; // Re-throw to be caught by outer try-catch
                }
            }

            // Get user's current vote using multiple methods
            let currentVote = '';
            try {
                try {
                    // Method 1: Try readContract with from parameter
                    currentVote = await readContract({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTER_SELECTED_OPTION,
                        params: [searchId],
                        from: accountAddress
                    });
                } catch (readError) {
                    // Method 2: Use simulateTransaction as fallback
                    const userVoteTransaction = prepareContractCall({
                        contract,
                        method: CONTRACT_FUNCTIONS.GET_VOTER_SELECTED_OPTION,
                        params: [searchId],
                    });
                    
                    const userVoteResult = await simulateTransaction({
                        transaction: userVoteTransaction,
                        account: account
                    });
                    
                    currentVote = userVoteResult.returnValue;
                }
            } catch (err) {
                // Error getting user vote - this is non-critical
            }

            setProposal({
                owner: proposalDetails[0],
                title: proposalDetails[1],
                options: proposalDetails[2],
                startDate: proposalDetails[3],
                endDate: proposalDetails[4],
                status: Number(proposalDetails[5]),
                voteMutability: Number(proposalDetails[6]),
                winners: proposalDetails[7],
                isDraw: proposalDetails[8]
            });
            
            setUserVote(currentVote);
            if (currentVote) {
                setSelectedOption(currentVote);
            }

        } catch (err) {
            console.error('Contract call failed:', err);
            
            // Use the existing parseContractError function to extract meaningful error messages
            const errorMessage = parseContractError(err);
            
            // Set user-friendly error message
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
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
                    params: [Number(proposalId), selectedOption]
                });
            } else {
                // First time voting
                transaction = prepareContractCall({
                    contract,
                    method: CONTRACT_FUNCTIONS.CAST_VOTE,
                    params: [Number(proposalId), selectedOption]
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
                params: [Number(proposalId)]
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

    const canVote = () => {
        return proposal && proposal.status === 2; // ACTIVE status
    };

    const isMutable = () => {
        return proposal && proposal.voteMutability === 1; // MUTABLE
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
                        <li><Link className="act" to="/search-proposals">Search Proposals</Link></li>
                        <li><Link to="/addnewvote">Add New Vote</Link></li>
                        <li><Link to="/voteshistory">Votes History</Link></li>
                        <li>
                            <UserProfile />
                        </li>
                    </ul>
                </nav>
            </header>

            <div className="search-proposal-container">
                {/* Merged Header and Search Section */}
                <div className="search-section">
                    <div className="search-form-section">
                        <div className="form-header">
                            <h1 className="page-title">Search & Vote on Proposals</h1>
                            <p className="page-subtitle">Find and participate in active proposals</p>
                        </div>
                        <div className="search-form-group">
                            <label className="form-label" htmlFor="proposalId">
                                Proposal ID <span className="required">*</span>
                            </label>
                            <div className="search-input-container">
                                <input
                                    id="proposalId"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={proposalId}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setProposalId(newValue);
                                        // Clear any existing errors when user types
                                        if (error) setError('');
                                    }}
                                    placeholder="Enter Proposal ID to search..."
                                    className="form-input search-input"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            searchProposal();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={searchProposal}
                                    disabled={loading || !proposalId.trim()}
                                    className="search-button"
                                >
                                    {loading ? 'Searching...' : 'Search Proposal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <div className="error-icon">⚠️</div>
                        <div className="error-content">
                            <strong>Transaction Failed</strong>
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

                {/* Proposal Details Card */}
                {proposal && (
                    <div 
                        className="proposal-card-section"
                        onClick={(e) => {
                            // Close modal when clicking backdrop (not the card itself)
                            if (e.target === e.currentTarget) {
                                setProposal(null);
                                setUserVote('');
                                setSelectedOption('');
                                setError('');
                            }
                        }}
                    >
                        <div className="proposal-card">
                            {/* Close Button */}
                            <button 
                                className="proposal-close-btn"
                                onClick={() => {
                                    setProposal(null);
                                    setUserVote('');
                                    setSelectedOption('');
                                    setError('');
                                }}
                                title="Close proposal details"
                            >
                                ×
                            </button>
                            
                            {/* Card Header */}
                            <div className="proposal-card-header">
                                <h2 className="proposal-title">{proposal.title}</h2>
                                <div className="proposal-badges">
                                    <span className={`status-badge status-${proposal.status === 3 ? 'ended' : statusDisplayMap[proposal.status].toLowerCase()}`}>
                                        {proposal.status === 3 ? 'ENDED' : statusDisplayMap[proposal.status]}
                                    </span>
                                </div>
                            </div>

                            {/* Proposal Information */}
                            <div className="proposal-info-grid">
                                <div className="info-card">
                                    <label>Proposal Owner</label>
                                    <span 
                                        className="owner-address-clickable" 
                                        title={`${proposal.owner} (Click to copy)`}
                                        onClick={() => {
                                            navigator.clipboard.writeText(proposal.owner).then(() => {
                                                setShowCopyToast(true);
                                                setTimeout(() => setShowCopyToast(false), 2000);
                                            }).catch(err => {
                                                console.error('Failed to copy: ', err);
                                            });
                                        }}
                                    >
                                        {proposal.owner.slice(0, 12)}...{proposal.owner.slice(-6)}
                                    </span>
                                </div>
                                <div className="info-card">
                                    <label>Start Date</label>
                                    <span>{formatDate(proposal.startDate)}</span>
                                </div>
                                <div className="info-card">
                                    <label>End Date</label>
                                    <span>{formatDate(proposal.endDate)}</span>
                                </div>
                                <div className="info-card">
                                    <label>Vote Type</label>
                                    <span className={`vote-type ${mutabilityDisplayMap[proposal.voteMutability].toLowerCase()}`}>
                                        {mutabilityDisplayMap[proposal.voteMutability]}
                                    </span>
                                </div>
                            </div>

                            {/* Results Section (if finalized) */}
                            {proposal.status === 4 && proposal.winners.length > 0 && (
                                <div className="results-section">
                                    <h3>📊 Final Results</h3>
                                    {proposal.isDraw ? (
                                        <div className="draw-message">
                                            🤝 The vote ended in a draw!
                                        </div>
                                    ) : (
                                        <div className="winners-display">
                                            <strong>🎉 Winner(s):</strong> {proposal.winners.join(', ')}
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
                                
                                {!canVote() && (
                                    <div className="voting-disabled">
                                        <p>
                                            {proposal.status === 1 && "⏳ Voting hasn't started yet"}
                                            {proposal.status === 3 && "⏰ Voting period has ended"}
                                            {proposal.status === 4 && "✅ Voting is finalized"}
                                            {proposal.status === 0 && "❌ Invalid proposal status"}
                                        </p>
                                    </div>
                                )}

                                <div className="options-grid">
                                    {proposal.options.map((option, index) => (
                                        <label key={index} className={`option-card ${selectedOption === option ? 'selected' : ''} ${!canVote() || (userVote && !isMutable()) ? 'disabled' : ''}`}>
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
                                                <span className="option-text">{option}</span>
                                                {selectedOption === option && <span className="check-icon">✓</span>}
                                            </div>
                                        </label>
                                    ))}
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
                        <p>Please connect your wallet to search and vote on proposals.</p>
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

export default ProposalSearch;