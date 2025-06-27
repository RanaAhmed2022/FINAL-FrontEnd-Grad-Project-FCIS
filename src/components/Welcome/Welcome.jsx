import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from "thirdweb/react";
import { client, wallets } from "../../thirdwebConfig";
import { zkSyncSepolia } from "thirdweb/chains";
import './Welcome.css';
import './../../index'

const Welcome = () => {
    const navigate = useNavigate();

    // Clear any lingering session storage when component mounts (ensures clean logout)
    useEffect(() => {
        sessionStorage.removeItem('wallet-connected');
        sessionStorage.removeItem('wallet-address');
    }, []);

    const handleConnect = (wallet) => {
        // Store both connection status and address
        sessionStorage.setItem('wallet-connected', 'true');
        if (wallet?.getAccount?.()?.address) {
            sessionStorage.setItem('wallet-address', wallet.getAccount().address);
        }
        navigate('/home');
    };

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
                    label: "Log In",
                }}
                detailsButton={{
                    displayBalanceToken: false,
                    style: {
                        display: "none"
                    }
                }}
                onConnect={handleConnect}
            />
            <Link to="/registration" className="action-button">
            Sign Up
            </Link>
        </div>
        </div>
    );
};

export default Welcome;
