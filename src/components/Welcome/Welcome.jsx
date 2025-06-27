import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client, wallets } from "../../thirdwebConfig";
import { zkSyncSepolia } from "thirdweb/chains";
import { useVotingContract } from "../../hooks/useVotingContract";
import FaceVerification from "../FaceVerification/FaceVerification";
import './Welcome.css';
import './../../index'

const Welcome = () => {
    const navigate = useNavigate();
    const account = useActiveAccount();
    const { isVoterVerified } = useVotingContract();
    
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [hasCheckedVerification, setHasCheckedVerification] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // Reset all states
    const resetStates = () => {
        setShowFaceVerification(false);
        setLoading(false);
        setVerificationError('');
        setHasCheckedVerification(false);
        setIsVerifying(false);
    };

    // Clear any lingering session storage when component mounts (ensures clean logout)
    useEffect(() => {
        sessionStorage.removeItem('wallet-connected');
        sessionStorage.removeItem('wallet-address');
        sessionStorage.removeItem('face-verified');
        resetStates();
    }, []);

    // Reset states when account changes or disconnects
    useEffect(() => {
        if (!account?.address) {
            resetStates();
        }
    }, [account?.address]);

    // Check verification status when wallet connects
    useEffect(() => {
        const checkVerificationStatus = async () => {
            if (account?.address && !isVerifying && !showFaceVerification && !hasCheckedVerification) {
                console.log('Checking verification for address:', account.address);
                setIsVerifying(true);
                setLoading(true);
                setVerificationError('');
                setHasCheckedVerification(true);
                
                try {
                    // Store wallet connection info
                    sessionStorage.setItem('wallet-connected', 'true');
                    sessionStorage.setItem('wallet-address', account.address);
                    
                    // Check if user is verified in the smart contract immediately
                    console.log('Starting verification check...');
                    const isVerified = await isVoterVerified(account.address);
                    console.log('Verification result:', isVerified);
                    
                    if (isVerified) {
                        // User is verified - show face verification immediately
                        console.log('User verified, showing face verification immediately');
                        setIsVerifying(false);
                        setLoading(false);
                        setShowFaceVerification(true);
                        return; // Exit early to prevent any navigation
                    } else {
                        // User is not verified - redirect to registration
                        console.log('User not verified, redirecting to registration');
                        setIsVerifying(false);
                        setLoading(false);
                        navigate('/registration');
                        return;
                    }
                } catch (error) {
                    console.error('Error checking verification status:', error);
                    setVerificationError('Failed to check verification status. Please try again.');
                    setIsVerifying(false);
                    setLoading(false);
                }
            }
        };

        // Only run if we have an account and haven't already checked
        if (account?.address && !hasCheckedVerification && !isVerifying) {
            checkVerificationStatus();
        }
    }, [account?.address, hasCheckedVerification, isVerifying, navigate]); // Include all state dependencies

    const handleFaceVerificationComplete = () => {
        setShowFaceVerification(false);
        navigate('/home');
    };

    // Show clean verification loading screen to prevent any flash of registration page
    if (isVerifying && account?.address) {
        return (
            <div className="welcome-container">
                <div className="text-container">
                    <h1 className="title-wel">Verifying Account...</h1>
                    <p className="subtitle">Please wait while we check your verification status on the blockchain.</p>
                    <div className="loading-message" style={{border: 'none', background: 'transparent'}}>
                        <p style={{animation: 'pulse 1.5s ease-in-out infinite alternate'}}>
                            🔍 Checking verification status...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show face verification modal if user is verified
    if (showFaceVerification && account?.address) {
        return (
            <FaceVerification 
                userAddress={account.address}
                onComplete={handleFaceVerificationComplete}
            />
        );
    }

    return (
        <div className="welcome-container">
            <div className="text-container">
                <h1 className="title-wel"> Welcome to Our <br /> E-Voting Platform</h1>
                <br />
                <br />
                <br />
                <p className="subtitle"> Our platform ensures <span className="highlight-developer">trust</span>, </p>
                <p className="subtitle">
                <span className="highlight-teams">accessibility</span>, and{' '}
                <span className="highlight-businesses">efficiency</span> at every step.
                </p>
                
                {verificationError && (
                    <div className="error-message">
                        {verificationError}
                        <div style={{marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
                            <button 
                                onClick={() => {
                                    setVerificationError('');
                                    setHasCheckedVerification(false);
                                    setLoading(false);
                                }}
                                style={{padding: '8px 16px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ff6b6b', background: 'transparent', color: '#ff6b6b'}}
                            >
                                Retry Check
                            </button>
                            <button 
                                onClick={() => {
                                    resetStates();
                                    navigate('/registration');
                                }}
                                style={{padding: '8px 16px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ff6b6b', background: '#ff6b6b', color: 'white'}}
                            >
                                Go to Registration
                            </button>
                        </div>
                    </div>
                )}
                
                {loading && (
                    <div className="loading-message">
                        <p>Checking verification status...</p>
                        <p style={{fontSize: '0.8rem', opacity: '0.8', marginTop: '10px'}}>
                            This may take a few seconds while we verify your account on the blockchain.
                        </p>
                        <button 
                            className="skip-btn" 
                            onClick={() => {
                                setLoading(false);
                                setVerificationError('');
                                resetStates();
                                navigate('/registration');
                            }}
                            style={{marginTop: '15px', background: 'transparent', color: 'white', border: '1px solid white', padding: '8px 16px', borderRadius: '4px', fontSize: '12px'}}
                        >
                            Skip to Registration
                        </button>
                    </div>
                )}
                
                {/* Development helper */}
                {process.env.NODE_ENV === 'development' && account?.address && !isVerifying && (
                    <div style={{marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px'}}>
                        <p>Debug Info:</p>
                        <p>Address: {account.address}</p>
                        <p>States: loading={String(loading)}, isVerifying={String(isVerifying)}, showFaceVerification={String(showFaceVerification)}</p>
                        <button 
                            onClick={() => {
                                resetStates();
                                navigate('/registration');
                            }}
                            style={{margin: '5px', padding: '5px 10px', fontSize: '12px'}}
                        >
                            Force Registration
                        </button>
                        <button 
                            onClick={() => {
                                resetStates();
                                setShowFaceVerification(true);
                            }}
                            style={{margin: '5px', padding: '5px 10px', fontSize: '12px'}}
                        >
                            Force Face Verification
                        </button>
                        <button 
                            onClick={resetStates}
                            style={{margin: '5px', padding: '5px 10px', fontSize: '12px', background: 'red'}}
                        >
                            Reset States
                        </button>
                    </div>
                )}
            </div>

            <div className="button-container">
                <ConnectButton 
                    client={client} 
                    wallets={wallets}
                    connectModal={{ size: "compact" }}
                    accountAbstraction={{
                        chain: zkSyncSepolia,
                        sponsorGas: true,
                    }}
                    detailsModal={{
                        payOptions: {
                            buyWithCrypto: false,
                            buyWithFiat: false,
                            buyWithCard: false,
                        },
                        hideBuyButton: true,
                        hideReceiveButton: true,
                        hideSendButton: true,
                        hideTransferButton: true,
                        hideDisconnect: true,
                        hideBalance: true,
                        hideTestnetFaucet: true,
                        hidePrivateKey: true,
                        hideSeedPhrase: true,
                    }}
                    connectButton={{
                        label: "Login / SignUp",
                    }}
                    detailsButton={{
                        displayBalanceToken: false,
                        style: {
                            display: "none"
                        }
                    }}
                />
                

            </div>
        </div>
    );
};

export default Welcome;
