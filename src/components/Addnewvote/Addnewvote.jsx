import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { getVotingFacadeContract, VoteMutability, CONTRACT_FUNCTIONS } from "../../config/contractConfig";
import { useVotingContract } from "../../hooks/useVotingContract";
import UserProfile from '../UserProfile/UserProfile';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './Addnewvote.css';

const AddNewVote = () => {
    const navigate = useNavigate();
    const account = useActiveAccount();
    const { createProposal, getProposalCount } = useVotingContract();
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        startDate: null,
        endDate: null,
        voteMutability: 'IMMUTABLE'
    });
    
    const [options, setOptions] = useState(['', '']);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdProposalId, setCreatedProposalId] = useState(null);
    const [copied, setCopied] = useState(false);

    // Contract configuration
    const contract = getVotingFacadeContract();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
        
        // Clear option errors
        if (errors[`option${index}`]) {
            setErrors(prev => ({
                ...prev,
                [`option${index}`]: ''
            }));
        }
    };

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Title validation
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.trim().length < 5) {
            newErrors.title = 'Title must be at least 5 characters long';
        }
        
        // Date validation
        const now = new Date();
        
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        } else if (formData.startDate <= now) {
            newErrors.startDate = 'Start date must be in the future';
        }
        
        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        } else if (formData.endDate <= formData.startDate) {
            newErrors.endDate = 'End date must be after start date';
        }
        
        // Options validation
        const validOptions = options.filter(option => option.trim() !== '');
        if (validOptions.length < 2) {
            newErrors.options = 'At least 2 options are required';
        }
        
        // Check for duplicate options
        const uniqueOptions = [...new Set(validOptions.map(opt => opt.trim().toLowerCase()))];
        if (uniqueOptions.length !== validOptions.length) {
            newErrors.options = 'Options must be unique';
        }
        
        // Individual option validation
        options.forEach((option, index) => {
            if (option.trim() === '' && index < 2) {
                newErrors[`option${index}`] = `Option ${index + 1} is required`;
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitForm = async (e) => {
        e.preventDefault();
        
        if (!account) {
            setErrors({ submit: 'Please connect your wallet' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        
        try {
            // Create the proposal using our custom hook
            const proposalId = await createProposal(
                formData.title,
                options.filter(option => option.trim() !== ''),
                formData.voteMutability,
                formData.startDate,
                formData.endDate
            );
            
            console.log('Created proposal ID:', proposalId);
            setCreatedProposalId(proposalId);
            
            // Show success modal
            setShowSuccessModal(true);
            
            // Reset form
            setFormData({
                title: '',
                startDate: null,
                endDate: null,
                voteMutability: 'IMMUTABLE'
            });
            setOptions(['', '']);
            
        } catch (err) {
            console.error('Error creating proposal:', err);
            setErrors({ submit: parseContractError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
        setCopied(false); // Reset copied state when closing modal
        navigate('/home');
    };

    const copyProposalIdToClipboard = async () => {
        if (!createdProposalId) return;

        try {
            await navigator.clipboard.writeText(createdProposalId.toString());
            setCopied(true);
            console.log('Proposal ID copied to clipboard:', createdProposalId);
            
            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy proposal ID:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = createdProposalId.toString();
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
            document.body.removeChild(textArea);
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

    const goBack = () => navigate(-1);

    return (
        <>
            <header>
                <div className="logo">
                    <button onClick={goBack} className="back-button">
                        <img className="arrow" src="/assets/images/arrow.png" title="Go back" alt="Back"/>
                    </button>
                    <Link to="/home">
                        <img className="logo" src="/assets/images/EV-Logo.png" alt="Logo"/>
                    </Link>
                </div>

                <nav className="navdefault">
                    <ul>
                        <li><Link to="/home">Home</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/search-proposals">Search Proposals</Link></li>
                        <li><Link className="act" to="/addnewvote">Add New Vote</Link></li>
                        <li>
                            <UserProfile />
                        </li>
                    </ul>
                </nav>
            </header>

            <div className="create-proposal-container">
                <div className="form-section">
                    <div className="form-header">
                        <h1 className="page-title">Create New Proposal</h1>
                        <p className="page-subtitle">Set up your voting proposal with all necessary details</p>
                    </div>

                    <form onSubmit={submitForm} className="proposal-form">
                        {/* Title Section */}
                        <div className="form-group">
                            <label htmlFor="title" className="form-label">
                                Proposal Title
                                <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Enter your proposal title..."
                                className={`form-input ${errors.title ? 'error' : ''}`}
                                maxLength={200}
                            />
                            {errors.title && <span className="error-text">{errors.title}</span>}
                            <div className="char-count">{formData.title.length}/200</div>
                        </div>

                        {/* Date Section */}
                        <div className="date-group">
                            <div className="form-group">
                                <label htmlFor="startDate" className="form-label">
                                    Start Date & Time
                                    <span className="required">*</span>
                                </label>
                                <DatePicker
                                    selected={formData.startDate}
                                    onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                                    showTimeSelect
                                    timeFormat="h:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    minDate={new Date()}
                                    placeholderText="Select start date and time"
                                    className={`form-input date-picker-input ${errors.startDate ? 'error' : ''}`}
                                    wrapperClassName="date-picker-wrapper"
                                    popperClassName="date-picker-popper"
                                    popperPlacement="bottom-start"
                                />
                                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="endDate" className="form-label">
                                    End Date & Time
                                    <span className="required">*</span>
                                </label>
                                <DatePicker
                                    selected={formData.endDate}
                                    onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                                    showTimeSelect
                                    timeFormat="h:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    minDate={formData.startDate || new Date()}
                                    placeholderText="Select end date and time"
                                    className={`form-input date-picker-input ${errors.endDate ? 'error' : ''}`}
                                    wrapperClassName="date-picker-wrapper"
                                    popperClassName="date-picker-popper"
                                    popperPlacement="bottom-start"
                                />
                                {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                            </div>
                        </div>

                        {/* Options Section */}
                        <div className="form-group">
                            <label className="form-label">
                                Voting Options
                                <span className="required">*</span>
                            </label>
                            <div className="options-container">
                        {options.map((option, index) => (
                                    <div key={index} className="option-input-group">
                                        <div className="option-input-wrapper">
                                <input
                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                placeholder={`Option ${index + 1}...`}
                                                className={`form-input option-input ${errors[`option${index}`] ? 'error' : ''}`}
                                                maxLength={100}
                                            />
                                            {options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(index)}
                                                    className="remove-option-btn"
                                                    title="Remove option"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                        {errors[`option${index}`] && <span className="error-text">{errors[`option${index}`]}</span>}
                            </div>
                        ))}

                                {options.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={addOption}
                                        className="add-option-btn"
                                    >
                                        + Add Another Option
                                    </button>
                                )}
                                
                                {errors.options && <span className="error-text">{errors.options}</span>}
                            </div>
                        </div>

                        {/* Vote Mutability Section */}
                        <div className="form-group">
                            <label className="form-label">
                                Vote Mutability
                                <span className="required">*</span>
                            </label>
                            <div className="radio-group">
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="voteMutability"
                                        value="IMMUTABLE"
                                        checked={formData.voteMutability === 'IMMUTABLE'}
                                        onChange={handleInputChange}
                                        className="radio-input"
                                    />
                                    <span className="radio-label">Immutable</span>
                                </label>
                                
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="voteMutability"
                                        value="MUTABLE"
                                        checked={formData.voteMutability === 'MUTABLE'}
                                        onChange={handleInputChange}
                                        className="radio-input"
                                    />
                                    <span className="radio-label">Mutable</span>
                                </label>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="submit-section">
                            {errors.submit && <div className="error-message">{errors.submit}</div>}
                            
                            <div className="button-group">
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="cancel-btn"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={isSubmitting || !account}
                                >
                                    {isSubmitting ? 'Creating Proposal...' : 'Create Proposal'}
                                </button>
                            </div>
                            
                            {!account && (
                                <div className="wallet-warning">
                                    Please connect your wallet to create a proposal
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">✅</div>
                        <h2>Proposal Created Successfully!</h2>
                        <p>Your proposal has been created and will be available for voting according to your schedule.</p>
                        {createdProposalId && (
                            <div className="proposal-id-section">
                                <div className="proposal-id-label">Proposal ID:</div>
                                <div 
                                    className={`proposal-id-value ${copied ? 'copied' : ''}`}
                                    onClick={copyProposalIdToClipboard}
                                    title="Click to copy to clipboard"
                                >
                                    {createdProposalId}
                                    <div className="copy-icon">
                                        {copied ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <p className="proposal-id-note">
                                    {copied ? 'ID copied! Share it with others or save for later' : 'Click to copy • Save this ID to search for your proposal later'}
                                </p>
                            </div>
                        )}
                        <button onClick={closeSuccessModal} className="modal-btn">
                            Continue
                        </button>
            </div>
        </div>
            )}
        </>
    );
};

export default AddNewVote;