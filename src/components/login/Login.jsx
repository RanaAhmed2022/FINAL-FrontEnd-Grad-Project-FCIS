// import React, { useEffect, useRef, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { ThirdwebSDK } from '@thirdweb-dev/sdk/evm';
// import { ethers } from 'ethers';
// import './Login.css';
// import './../../index'

// const Login = () => {
//     const [walletAddress, setWalletAddress] = useState('');
//     const [photoCaptured, setPhotoCaptured] = useState(false);
//     const [photo, setPhoto] = useState(null);

//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);

//     useEffect(() => {
//         navigator.mediaDevices.getUserMedia({ video: true })
//         .then((stream) => {
//             if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             }
//         })
//         .catch((err) => {
//             console.error('Error accessing webcam:', err);
//         });
//     }, []);

//     const connectWithMetaMask = async () => {
//         try {
//         if (!window.ethereum) {
//             alert('Please Download MetaMask first');
//             return;
//         }

//         const provider = new ethers.providers.Web3Provider(window.ethereum);

//         await provider.send("eth_requestAccounts", []);
//         const signer = await provider.getSigner();
//         const address = await signer.getAddress();

//         setWalletAddress(address);
//         const sdk = new ThirdwebSDK(signer);
//         console.log("Wallet Connected:", address);

//         } catch (err) {
//         console.error("There is an error in MetaMask:", err.message || err);
//         }
//     };

//     const capturePhoto = () => {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;

//     if (!video || !canvas) return;

//     const context = canvas.getContext('2d');

//     if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
//         alert("Camera not available or failed to access.");
//         return;
//     }

//     video.pause();
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     context.drawImage(video, 0, 0, canvas.width, canvas.height);

//     const imgData = canvas.toDataURL('image/png');

//     if (imgData && imgData !== 'data:,') {
//         setPhoto(imgData);
//         setPhotoCaptured(true);
//     } else {
//         alert("Failed to capture photo. Make sure your camera is working.");
//     }
// };

//     const tryAgain = () => {
//         setPhoto(null);
//         setPhotoCaptured(false);
//         if (videoRef.current) {
//         videoRef.current.play();
//         }
//     };

//     const submitForm = (e) => {
//         e.preventDefault();
//         // Handle form data
//     };

//     return (
//         <div className="login-container">
//             <div className="layer">
//                 <div className="login-box">
//                     <div className="login-options">
//                         <div className="wallet-login">
//                             <button onClick={connectWithMetaMask} className="wallet-button">
//                                 <img src="/assets/images/metaMask.jpg" className="icon" alt="MetaMask" /> MetaMask
//                             </button>
//                             {walletAddress && <p>Address: {walletAddress}</p>}
//                             <button className="wallet-button">
//                                 <img src="/assets/images/coinbase.jpg" className="icon" alt="Coinbase" /> Coinbase Wallet
//                             </button>
//                             <button className="wallet-button">
//                                 <img src="/assets/images/rabby.png" className="icon" alt="Rabby" /> Rabby
//                             </button>
//                         </div>

//                         <div className="auth-login">
//                             <div className="social-icons">
//                                 <button className="icon-button"><img src="/assets/images/google-icon.png" className="social-icon" alt="Google" /></button>
//                                 <button className="icon-button"><img src="/assets/images/apple-icon.png" className="social-icon" alt="Apple" /></button>
//                                 <button className="icon-button"><img src="/assets/images/facebook-icon.png" className="social-icon" alt="Facebook" /></button>
//                                 <button className="icon-button"><img src="/assets/images/gitHub-icon.png" className="social-icon" alt="GitHub" /></button>
//                             </div>
//                             <p className="or-divider">_______ or _______</p>

//                             <form onSubmit={submitForm}>
//                                 <input type="text" placeholder="Phone Number" pattern="^(011|012|010|015)\d{8}$" required />
//                                 <input type="email" placeholder="Email" pattern=".*@gmail\.com$" required />

//                                 {/* <div className="camera-section">
//                                     <video ref={videoRef} autoPlay playsInline></video>
//                                     {!photoCaptured && (
//                                         <button type="button" className="camera-frame" onClick={capturePhoto}>Capture Photo</button>
//                                     )}

//                                     {photoCaptured && (
//                                     <button type="button" onClick={tryAgain} className="camera_try">Try Again</button>
//                                     )}
//                                     <canvas ref={canvasRef} hidden></canvas>
//                                 </div> */}

                                

//                                 <button type="submit"><Link to="/home">Next</Link></button>
//                             </form>

//                             <p className="terms-text">Create a new account, <Link to="/registration">Sign up</Link></p>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Login;
