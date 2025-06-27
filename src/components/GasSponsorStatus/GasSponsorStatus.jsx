import React from 'react';
import { useActiveAccount } from "thirdweb/react";
import { isGasSponsoringEnabled } from "../../config/paymasterConfig";
import './GasSponsorStatus.css';

const GasSponsorStatus = () => {
    const account = useActiveAccount();
    const gasSponsoringEnabled = isGasSponsoringEnabled();

    // Check if the account is a smart account (account abstraction)
    const isSmartAccount = account?.address && account?.type === 'smartAccount';

    if (!account) {
        return null;
    }

    return (
        <div className="gas-sponsor-status">
            <div className="status-container">
                <div className="status-icon">
                    {gasSponsoringEnabled ? (
                        <svg className="icon-success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="icon-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    )}
                </div>
                
                <div className="status-info">
                    <div className="status-text">
                        {gasSponsoringEnabled ? (
                            <>
                                <span className="status-title">⚡ Gas Sponsored</span>
                                <span className="status-subtitle">Free transactions on zkSync</span>
                            </>
                        ) : (
                            <>
                                <span className="status-title">⛽ Gas Required</span>
                                <span className="status-subtitle">ETH needed for transactions</span>
                            </>
                        )}
                    </div>
                    
                    {isSmartAccount && (
                        <div className="aa-badge">
                            <span className="aa-text">Smart Account</span>
                        </div>
                    )}
                </div>
            </div>
            
            {gasSponsoringEnabled && (
                <div className="sponsor-details">
                    <div className="sponsor-info">
                        <span className="info-icon">ℹ️</span>
                        <span className="info-text">
                            All voting transactions are sponsored. You don't need ETH for gas fees!
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GasSponsorStatus; 