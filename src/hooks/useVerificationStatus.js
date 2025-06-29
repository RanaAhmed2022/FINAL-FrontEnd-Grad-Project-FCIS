import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useVotingContract } from './useVotingContract';

export const useVerificationStatus = () => {
    const account = useActiveAccount();
    const { isVoterVerified } = useVotingContract();
    const [verificationStatus, setVerificationStatus] = useState({
        isChecking: true,
        isVerified: false,
        hasChecked: false,
        lastChecked: null
    });

    const checkVerificationStatus = useCallback(async (forceRefresh = false) => {
        if (!account?.address) {
            setVerificationStatus({
                isChecking: false,
                isVerified: false,
                hasChecked: true,
                lastChecked: new Date()
            });
            return false;
        }

        // Don't check again if we just checked recently (unless forced)
        if (!forceRefresh && verificationStatus.lastChecked && 
            (new Date() - verificationStatus.lastChecked) < 30000) { // 30 seconds
            return verificationStatus.isVerified;
        }

        setVerificationStatus(prev => ({
            ...prev,
            isChecking: true
        }));

        try {
            console.log('🔍 Checking verification status for:', account.address);
            const verified = await isVoterVerified(account.address);
            console.log('✅ Verification result:', verified);
            
            setVerificationStatus({
                isChecking: false,
                isVerified: verified,
                hasChecked: true,
                lastChecked: new Date()
            });
            
            return verified;
        } catch (error) {
            console.error('❌ Error checking verification status:', error);
            setVerificationStatus({
                isChecking: false,
                isVerified: false,
                hasChecked: true,
                lastChecked: new Date()
            });
            return false;
        }
    }, [account?.address, isVoterVerified, verificationStatus.lastChecked, verificationStatus.isVerified]);

    // Auto-check when account changes
    useEffect(() => {
        checkVerificationStatus();
    }, [account?.address]); // Don't include checkVerificationStatus to avoid infinite loops

    const refreshVerificationStatus = () => {
        return checkVerificationStatus(true);
    };

    return {
        ...verificationStatus,
        refreshVerificationStatus,
        hasWalletConnected: !!account?.address
    };
}; 