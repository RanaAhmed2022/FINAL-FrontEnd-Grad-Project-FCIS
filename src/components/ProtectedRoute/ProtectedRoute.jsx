import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useActiveAccount } from 'thirdweb/react';
import { useVerificationStatus } from '../../hooks/useVerificationStatus';

const ProtectedRoute = ({ children }) => {
    const account = useActiveAccount();
    const { isChecking, isVerified, hasChecked, hasWalletConnected } = useVerificationStatus();

    // Update wallet connection status in session storage
    useEffect(() => {
        if (account) {
            sessionStorage.setItem('wallet-connected', 'true');
            if (account.address) {
                sessionStorage.setItem('wallet-address', account.address);
            }
        } else {
            sessionStorage.removeItem('wallet-connected');
        }
    }, [account]);

    // Check if user was previously connected this session (for reconnection scenarios)
    const wasConnected = sessionStorage.getItem('wallet-connected') === 'true';
    const storedAddress = sessionStorage.getItem('wallet-address');
    const hasWalletConnection = hasWalletConnected || (wasConnected && storedAddress);

    // If no wallet connection, redirect to welcome page
    if (!hasWalletConnection) {
        console.log('🚫 No wallet connection - redirecting to welcome');
        return <Navigate to="/" replace />;
    }

    // If still checking verification status, show loading
    if (isChecking) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5'
            }}>
                <div style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <p style={{ 
                    fontSize: '16px', 
                    color: '#666', 
                    margin: '0',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    🔍 Checking verification status...
                </p>
                <p style={{ 
                    fontSize: '14px', 
                    color: '#999', 
                    margin: '5px 0 0 0',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    Please wait while we verify your registration
                </p>
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
            </div>
        );
    }

    // If verification check completed but user is not verified, redirect to registration
    if (hasChecked && !isVerified) {
        console.log('🚫 User not verified - redirecting to registration');
        return <Navigate to="/registration" replace />;
    }

    // If authenticated and verified, render protected content
    console.log('✅ User authenticated and verified - allowing access');
    return children;
};

export default ProtectedRoute; 