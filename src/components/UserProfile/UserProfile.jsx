import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveAccount, useDisconnect, useActiveWallet } from 'thirdweb/react';
import { client } from '../../thirdwebConfig';
import './UserProfile.css';

const UserProfile = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const account = useActiveAccount();
    const wallet = useActiveWallet();
    const { disconnect } = useDisconnect();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleCopyAddress = async () => {
        try {
            const addressToCopy = account?.address || sessionStorage.getItem('wallet-address') || '';
            await navigator.clipboard.writeText(addressToCopy);
            setCopied(true);
            // Reset copied state after 2 seconds
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy address:', error);
            // Fallback for older browsers
            const addressToCopy = account?.address || sessionStorage.getItem('wallet-address') || '';
            const textArea = document.createElement('textarea');
            textArea.value = addressToCopy;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleVotesHistory = () => {
        setDropdownOpen(false);
        navigate('/voteshistory');
    };

    const handleLogout = async () => {
        try {
            console.log('Attempting to disconnect...');
            setDropdownOpen(false);
            
            // Clear session storage first
            sessionStorage.removeItem('wallet-connected');
            sessionStorage.removeItem('wallet-address');
            
            // Try multiple disconnect methods for reliability
            if (wallet) {
                try {
                    await wallet.disconnect();
                    console.log('Wallet disconnected directly');
                } catch (walletError) {
                    console.log('Direct wallet disconnect failed, trying useDisconnect hook');
                }
            }
            
            // Use the hook-based disconnect as backup
            try {
                await disconnect();
                console.log('Disconnected via hook');
            } catch (hookError) {
                console.log('Hook-based disconnect failed');
            }
            
            // Navigate to welcome page using React Router
            console.log('Navigating to welcome page...');
            navigate('/', { replace: true });
            
        } catch (error) {
            console.error('Error during logout process:', error);
            // Ensure session storage is cleared and navigate
            sessionStorage.removeItem('wallet-connected');
            sessionStorage.removeItem('wallet-address');
            navigate('/', { replace: true });
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Store address in sessionStorage when account exists
    useEffect(() => {
        if (account?.address) {
            sessionStorage.setItem('wallet-address', account.address);
        }
    }, [account?.address]);

    // Check if user should see the profile (either connected or was connected)
    const wasConnected = sessionStorage.getItem('wallet-connected') === 'true';
    const storedAddress = sessionStorage.getItem('wallet-address');
    
    // Don't render if neither connected nor was previously connected
    if (!account && !wasConnected) {
        return null;
    }

    // Use current account address or stored address
    const displayAddress = account?.address || storedAddress || '';

    return (
        <div className="user-profile-container" ref={dropdownRef}>
            <div className="profile-info" onClick={toggleDropdown}>
                <span className="wallet-address">{formatAddress(displayAddress)}</span>
                <img 
                    src="/assets/images/User-icon.png" 
                    title="Profile Menu" 
                    alt="User Icon" 
                    className="profile-icon"
                />
                <svg 
                    className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                >
                    <path 
                        d="M3 4.5L6 7.5L9 4.5" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            
            {dropdownOpen && (
                <div className="profile-dropdown">
                    <button onClick={handleCopyAddress} className="profile-menu-btn copy-btn">
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            fill="none"
                        >
                            <path 
                                d="M11 1H3C2.44772 1 2 1.44772 2 2V11C2 11.5523 2.44772 12 3 12H4V13C4 14.1046 4.89543 15 6 15H13C14.1046 15 15 14.1046 15 13V5C15 3.89543 14.1046 3 13 3H12V2C12 1.44772 11.5523 1 11 1ZM10 3H6C4.89543 3 4 3.89543 4 5V10H3C2.44772 10 2 9.55228 2 9V2C2 1.44772 2.44772 1 3 1H11C11.5523 1 12 1.44772 12 2V3H10Z" 
                                fill="currentColor"
                            />
                        </svg>
                        {copied ? 'Copied!' : 'Copy Address'}
                    </button>
                    <button onClick={handleVotesHistory} className="profile-menu-btn">
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            fill="none"
                        >
                            <path 
                                d="M3 1C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V13C1 13.5304 1.21071 14.0391 1.58579 14.4142C1.96086 14.7893 2.46957 15 3 15H13C13.5304 15 14.0391 14.7893 14.4142 14.4142C14.7893 14.0391 15 13.5304 15 13V3C15 2.46957 14.7893 1.96086 14.4142 1.58579C14.0391 1.21071 13.5304 1 13 1H3ZM3 3H13V5H3V3ZM3 7H13V9H3V7ZM3 11H13V13H3V11Z" 
                                fill="currentColor"
                            />
                        </svg>
                        Votes History
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            fill="none"
                        >
                            <path 
                                d="M6 14H3C2.46957 14 1.96086 13.7893 1.58579 13.4142C1.21071 13.0391 1 12.5304 1 12V4C1 3.46957 1.21071 2.96086 1.58579 2.58579C1.96086 2.21071 2.46957 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" 
                                stroke="currentColor" 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserProfile; 