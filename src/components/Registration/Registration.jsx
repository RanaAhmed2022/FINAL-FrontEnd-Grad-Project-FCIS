import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { keccak256, toBytes } from "thirdweb/utils";
import { useFaceVerification } from '../../hooks/useFaceVerification';
import { useVotingContract } from '../../hooks/useVotingContract';
import './Registration.css';
import './../../index';

const Registration = () => {
    const navigate = useNavigate();
    const account = useActiveAccount();
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addressCopied, setAddressCopied] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [nidValidation, setNidValidation] = useState({
        isChecking: false,
        isRegistered: false,
        hasChecked: false
    });
    
    // Face verification hook
    const { 
        processRegistration, 
        isLoading: faceLoading, 
        error: faceError, 
        clearError,
        checkApiStatus 
    } = useFaceVerification();
    
    // Voting contract hook
    const { registerVoter, isNIDRegistered } = useVotingContract();

    // Check face verification API status on mount
    useEffect(() => {
        checkApiStatus();
    }, [checkApiStatus]);

    // Copy wallet address to clipboard
    const copyAddressToClipboard = async () => {
        if (!account?.address) return;
        
        try {
            await navigator.clipboard.writeText(account.address);
            setAddressCopied(true);
            setTimeout(() => setAddressCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy address:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = account.address;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setAddressCopied(true);
            setTimeout(() => setAddressCopied(false), 2000);
        }
    };



    // Function to stop camera stream
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('Camera track stopped:', track.kind);
            });
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        if (showCamera) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user' // Front camera
                } 
            })
                .then(stream => {
                    setCameraPermissionDenied(false);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Camera error:", err);
                    setCameraPermissionDenied(true);
                    alert("Camera access is required for registration. Please allow camera permissions in your browser settings.");
                    setShowCamera(false);
                });
        } else {
            stopCamera();
        }
    }, [showCamera]);

    // Cleanup camera when component unmounts
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const capturePhoto = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/png');
            setCapturedImage(dataURL);
            setFormData({ ...formData, userImage: dataURL }); // Save in form
            
            // Immediately stop camera after capture
            if (video.srcObject) {
                const stream = video.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => {
                    track.stop();
                    console.log('Camera track stopped after capture:', track.kind);
                });
                video.srcObject = null;
            }
            setShowCamera(false);
        }
    };

    const closeCamera = () => {
        // Immediately stop camera before state change
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('Camera track stopped immediately:', track.kind);
            });
            videoRef.current.srcObject = null;
            
            // Small delay to ensure browser processes the cleanup
            setTimeout(() => {
                setShowCamera(false);
            }, 100);
        } else {
            setShowCamera(false);
        }
    };


    const [formData, setFormData] = useState({
        idNumber: '',
        idFront: null,
        userImage: null,
    });

    
    const [fileNames, setFileNames] = useState({
        idFront: 'No file chosen',
        userImage: 'No file chosen'
    });

    // Check if NID is already registered
    const checkNIDRegistration = async (nidValue) => {
        if (!nidValue || nidValue.length !== 14) {
            setNidValidation({
                isChecking: false,
                isRegistered: false,
                hasChecked: false
            });
            return;
        }

        setNidValidation(prev => ({
            ...prev,
            isChecking: true
        }));

        try {
            // Hash the NID to check registration status
            const hashedNID = keccak256(toBytes(nidValue));
            const isRegistered = await isNIDRegistered(hashedNID);
            
            setNidValidation({
                isChecking: false,
                isRegistered: isRegistered,
                hasChecked: true
            });
        } catch (error) {
            console.error('Error checking NID registration:', error);
            setNidValidation({
                isChecking: false,
                isRegistered: false,
                hasChecked: true
            });
        }
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
        setFormData({ ...formData, [name]: files[0] });
        setFileNames({ ...fileNames, [name]: files[0].name });
        } else {
            setFormData({ ...formData, [name]: value });
            
            // Check NID registration when user enters NID
            if (name === 'idNumber') {
                // Debounce the check by adding a small delay
                setTimeout(() => {
                    checkNIDRegistration(value);
                }, 500);
            }
        }
    };

    // Convert data URL to File object
    const dataURLtoFile = (dataURL, filename) => {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const validateAndSubmit = async (e) => {
        e.preventDefault();

        const { idNumber, idFront, userImage } = formData;

        // Validation
        if (!/^\d{14}$/.test(idNumber)) {
            alert('ID must be exactly 14 digits.');
            return;
        }

        // Check if NID is already registered
        if (nidValidation.hasChecked && nidValidation.isRegistered) {
            alert('This National ID is already registered. Please use a different National ID.');
            return;
        }

        // If we haven't checked yet, check now
        if (!nidValidation.hasChecked) {
            await checkNIDRegistration(idNumber);
            // Re-check after the validation
            if (nidValidation.isRegistered) {
                alert('This National ID is already registered. Please use a different National ID.');
                return;
            }
        }

        if (!idFront) {
            alert('Please upload the front image of your national ID.');
            return;
        }

        if (!userImage) {
            alert('Please capture a photo before submitting.');
            return;
        }

        if (!account) {
            alert('Please connect your wallet first.');
            return;
        }

        setIsSubmitting(true);
        clearError();

        try {
            // Convert captured image to File object for face verification API
            const imageFile = dataURLtoFile(userImage, 'user-photo.png');
            
            // Extract face embeddings
            console.log('Extracting face embeddings...');
            const embeddings = await processRegistration(imageFile);
            
            if (!embeddings) {
                throw new Error('Failed to extract face embeddings. Please try again with a clearer photo.');
            }

            console.log('Face embeddings extracted successfully, registering voter...');
            console.log('Extracted face embeddings:', embeddings);
            console.log('Embeddings length:', embeddings.length);
            console.log('First 10 embedding values:', embeddings.slice(0, 10));
            
            // Scale embeddings by 1e18 for blockchain storage (convert float to int)
            const scaledEmbeddings = embeddings.map(value => Math.round(value * 1e18));
            console.log('Scaled embeddings (first 10):', scaledEmbeddings.slice(0, 10));
            console.log('Scaling factor applied: 1e18');
            
            // Hash the national ID to bytes32 for blockchain storage
            const hashedNID = keccak256(toBytes(idNumber));
            
            console.log('Hashing NID:', idNumber, '→', hashedNID);
            
            // Call registerVoter with voter address, hashed national ID, and scaled embeddings
            await registerVoter(account.address, hashedNID, scaledEmbeddings);
            
            console.log('Registration completed successfully');
            
            // Show success message and prepare for redirect
            alert('Registration successful! Face verification has been set up. Redirecting to home page...');
            
            setIsRedirecting(true);
            
            // Navigate to home page after a short delay
            setTimeout(() => {
                navigate('/home');
            }, 1500);
            
        } catch (error) {
            console.error('Registration failed:', error);
            alert(`Registration failed: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setIsSubmitting(false);
            setIsRedirecting(false);
        }
    };

    return (
        <div className="reg-container">
            <div className="reg-box">

                <form onSubmit={validateAndSubmit}>
                    <div className="form-header">
                        <h1 className="form-title">User Registration</h1>
                        <p className="form-subtitle">Complete your registration to access the voting platform</p>
                        
                        {/* Wallet Connection Status */}
                        {!account ? (
                            <div className="wallet-warning" style={{ 
                                color: '#ff6b6b', 
                                backgroundColor: '#ffe0e0', 
                                padding: '10px', 
                                borderRadius: '5px', 
                                marginBottom: '15px',
                                textAlign: 'center'
                            }}>
                                ⚠️ Please connect your wallet to continue with registration
                            </div>
                        ) : (
                            <div className="wallet-connected" style={{ 
                                color: '#4caf50', 
                                backgroundColor: '#e8f5e8', 
                                padding: '10px', 
                                borderRadius: '5px', 
                                marginBottom: '15px',
                                textAlign: 'center'
                            }}>
                                ✅ Wallet connected: {' '}
                                <span 
                                    onClick={copyAddressToClipboard}
                                    style={{
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        fontWeight: 'bold',
                                        color: '#2e7d32',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: addressCopied ? '#c8e6c9' : 'transparent',
                                        border: addressCopied ? '1px solid #4caf50' : '1px solid transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!addressCopied) {
                                            e.target.style.backgroundColor = '#e8f5e8';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!addressCopied) {
                                            e.target.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    title={addressCopied ? 'Address copied!' : 'Click to copy full address'}
                                >
                                    {addressCopied ? '📋 Copied!' : `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="floating-label-input">
                        <input 
                            type="text" 
                            name="idNumber" 
                            id="idNumber" 
                            value={formData.idNumber} 
                            onChange={handleChange} 
                            placeholder="" 
                            pattern="\d{14}" 
                            required 
                            style={{
                                borderColor: nidValidation.hasChecked ? 
                                    (nidValidation.isRegistered ? '#ff6b6b' : '#4caf50') : 
                                    '#ddd'
                            }}
                        />
                        <label htmlFor="idNumber">National ID</label>
                        
                        {/* NID validation feedback */}
                        {formData.idNumber && formData.idNumber.length === 14 && (
                            <div style={{ 
                                marginTop: '5px', 
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                {nidValidation.isChecking && (
                                    <span style={{ color: '#2196f3' }}>
                                        🔄 Checking NID availability...
                                    </span>
                                )}
                                {nidValidation.hasChecked && !nidValidation.isChecking && (
                                    <span style={{ 
                                        color: nidValidation.isRegistered ? '#ff6b6b' : '#4caf50' 
                                    }}>
                                        {nidValidation.isRegistered ? 
                                            '❌ This NID is already registered' : 
                                            '✅ NID is available'
                                        }
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="file-input-container-reg">
                        <label htmlFor="idFront" className="file-label-reg">Upload National ID Front Image</label>
                        <input type="file" name="idFront" id="idFront" className="file-input-reg" onChange={handleChange} />
                        <p className="file-name-reg">{fileNames.idFront}</p>
                    </div>

                    <div className="file-input-container-reg">
                        {!capturedImage ? (
                            <div className="capture-section-reg">
                                <div className="camera-placeholder-reg">
                                    <p>Click below to capture your photo</p>
                                </div>
                                <label
                                    className="file-label-reg capture-photo-btn"
                                    onClick={() => {
                                        if (cameraPermissionDenied) {
                                            alert("Camera is blocked. Please allow access to take a photo.");
                                        } 
                                        else {
                                            setShowCamera(true); 
                                        }
                                    }}>
                                    Capture Your Photo
                                </label>
                            </div>
                        ) : (
                            <div className="preview-section-reg">
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    className="captured-preview-reg"
                                />
                                <div className="preview-actions-reg">
                                    <button 
                                        type="button"
                                        className="retake-btn-reg" 
                                        onClick={() => {
                                            // Stop any existing camera stream before retaking
                                            if (videoRef.current && videoRef.current.srcObject) {
                                                const stream = videoRef.current.srcObject;
                                                const tracks = stream.getTracks();
                                                tracks.forEach(track => {
                                                    track.stop();
                                                    console.log('Camera track stopped before retake:', track.kind);
                                                });
                                                videoRef.current.srcObject = null;
                                            }
                                            setCapturedImage(null);
                                            setFormData({ ...formData, userImage: null });
                                            setShowCamera(true);
                                        }}
                                    >
                                        Retake Photo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>


                    {faceError && (
                        <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>
                            {faceError}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={!account || isSubmitting || faceLoading || isRedirecting || (nidValidation.hasChecked && nidValidation.isRegistered)}
                        style={{ 
                            opacity: (!account || isSubmitting || faceLoading || isRedirecting || (nidValidation.hasChecked && nidValidation.isRegistered)) ? 0.6 : 1 
                        }}
                    >
                        {!account ? 'Connect Wallet First' : 
                         (nidValidation.hasChecked && nidValidation.isRegistered) ? 'NID Already Registered' :
                         isRedirecting ? 'Redirecting to Home...' :
                         (isSubmitting || faceLoading ? 'Processing...' : 'Register')}
                    </button>
                    <p className="acountlogin-reg">Already have an account? Please <Link to="/login">Login</Link></p>
                </form>
            </div>
        

        {showCamera && (
            <div className="camera-modal-reg">
                <div className="camera-content-reg">
                    <video ref={videoRef} autoPlay className="camera-video-reg" />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="camera-controls-reg">
                        <button className="capture-btn-reg" onClick={capturePhoto}>
                            Capture Photo
                        </button>
                        <button className="close-camera-btn-reg" onClick={closeCamera}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
        
    );
};

export default Registration;