import React, { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { isGasSponsoringEnabled, getGasLimit } from "../../config/paymasterConfig";
import { useVotingContract } from "../../hooks/useVotingContract";
import './AccountAbstractionDemo.css';

const AccountAbstractionDemo = () => {
    const account = useActiveAccount();
    const wallet = useActiveWallet();
    const { getProposalCount, loading } = useVotingContract();
    const [proposalCount, setProposalCount] = useState(0);
    const [accountInfo, setAccountInfo] = useState({});

    useEffect(() => {
        const loadAccountInfo = async () => {
            if (account) {
                setAccountInfo({
                    address: account.address,
                    type: account.type || 'external',
                    isSmartAccount: account.type === 'smartAccount',
                });

                // Load proposal count to test read operations
                try {
                    const count = await getProposalCount();
                    setProposalCount(count);
                } catch (err) {
                    console.log('Error loading proposal count:', err);
                }
            }
        };

        loadAccountInfo();
    }, [account, getProposalCount]);

    if (!account) {
        return (
            <div className="aa-demo-container">
                <div className="aa-demo-card">
                    <h3>Account Abstraction Demo</h3>
                    <p>Please connect your wallet to see account abstraction features.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="aa-demo-container">
            <div className="aa-demo-card">
                <h3>🚀 Account Abstraction Status</h3>
                
                <div className="info-grid">
                    <div className="info-item">
                        <label>Wallet Address:</label>
                        <span className="address">{accountInfo.address?.slice(0, 6)}...{accountInfo.address?.slice(-4)}</span>
                    </div>
                    
                    <div className="info-item">
                        <label>Account Type:</label>
                        <span className={`account-type ${accountInfo.isSmartAccount ? 'smart' : 'external'}`}>
                            {accountInfo.isSmartAccount ? '🧠 Smart Account' : '👤 External Account'}
                        </span>
                    </div>
                    
                    <div className="info-item">
                        <label>Gas Sponsoring:</label>
                        <span className={`status ${isGasSponsoringEnabled() ? 'enabled' : 'disabled'}`}>
                            {isGasSponsoringEnabled() ? '✅ Enabled' : '❌ Disabled'}
                        </span>
                    </div>
                    
                    <div className="info-item">
                        <label>Network:</label>
                        <span className="network">zkSync Sepolia</span>
                    </div>
                </div>

                <div className="gas-limits-section">
                    <h4>Gas Limits by Operation</h4>
                    <div className="gas-limits-grid">
                        <div className="gas-item">
                            <span className="operation">Create Proposal:</span>
                            <span className="limit">{getGasLimit('createProposal').toLocaleString()}</span>
                        </div>
                        <div className="gas-item">
                            <span className="operation">Cast Vote:</span>
                            <span className="limit">{getGasLimit('castVote').toLocaleString()}</span>
                        </div>
                        <div className="gas-item">
                            <span className="operation">Change Vote:</span>
                            <span className="limit">{getGasLimit('changeVote').toLocaleString()}</span>
                        </div>
                        <div className="gas-item">
                            <span className="operation">Retract Vote:</span>
                            <span className="limit">{getGasLimit('retractVote').toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="contract-info">
                    <h4>Contract Information</h4>
                    <div className="contract-stats">
                        <div className="stat-item">
                            <label>Total Proposals:</label>
                            <span className="stat-value">
                                {loading ? '...' : proposalCount}
                            </span>
                        </div>
                    </div>
                </div>

                {isGasSponsoringEnabled() && (
                    <div className="benefits-section">
                        <h4>✨ Benefits of Gas Sponsoring</h4>
                        <ul className="benefits-list">
                            <li>🆓 No ETH required for gas fees</li>
                            <li>🚀 Seamless voting experience</li>
                            <li>💡 Smart contract interactions without barriers</li>
                            <li>🔒 Secure transactions with account abstraction</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountAbstractionDemo; 