import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useActiveAccount } from 'thirdweb/react';

const ProtectedRoute = ({ children }) => {
    const account = useActiveAccount();

    useEffect(() => {
        // If account exists, mark as connected in session storage and store address
        if (account) {
            sessionStorage.setItem('wallet-connected', 'true');
            if (account.address) {
                sessionStorage.setItem('wallet-address', account.address);
            }
        } else {
            // If no account, remove connection status but keep address for display
            sessionStorage.removeItem('wallet-connected');
        }
    }, [account]);

    // Check if user was previously connected this session
    const wasConnected = sessionStorage.getItem('wallet-connected') === 'true';

    // More strict check: require either active account OR both wasConnected and stored address
    const storedAddress = sessionStorage.getItem('wallet-address');
    const isAuthenticated = account || (wasConnected && storedAddress);

    // If not authenticated, redirect to welcome page
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // If authenticated, render protected content
    return children;
};

export default ProtectedRoute; 