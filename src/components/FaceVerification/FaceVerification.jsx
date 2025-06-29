import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVotingContract } from '../../hooks/useVotingContract';
import { useFaceVerification } from '../../hooks/useFaceVerification';
import './FaceVerification.css';

const FaceVerification = ({ userAddress, onComplete }) => {
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
    const [voterEmbeddings, setVoterEmbeddings] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const { getVoterEmbeddings } = useVotingContract();
    
    const { 
        processLogin, 
        isLoading: faceLoading, 
        error: faceError, 
        clearError,
        checkApiStatus 
    } = useFaceVerification();

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

    // Verify embeddings are properly scaled (should be float values, not large integers)
    const verifyEmbeddingsScaled = (embeddings) => {
        if (!embeddings || embeddings.length === 0) return false;
        return embeddings.every(value => 
            typeof value === 'number' && Math.abs(value) <= 10
        );
    };

    // Get voter embeddings when component mounts
    useEffect(() => {
        const fetchEmbeddings = async () => {
            try {
                const embeddings = await getVoterEmbeddings();
                
                if (embeddings && embeddings.length > 0) {
                    setVoterEmbeddings(embeddings);
                } else {
                    setError('No face data found. Please register first.');
                }
            } catch (err) {
                console.error('Error fetching embeddings:', err);
                setError('Failed to get voter embeddings. Please try again.');
            }
        };

        // Only fetch if we have an address and haven't fetched before
        if (userAddress && voterEmbeddings === null) {
            fetchEmbeddings();
        }
    }, [userAddress, getVoterEmbeddings, voterEmbeddings]);

    // Function to stop camera stream
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    // Handle camera access
    useEffect(() => {
        if (showCamera) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user'
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
                    setError("Camera access is required for face verification. Please allow camera permissions in your browser settings.");
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

    const skipVerification = () => {
        if (onComplete) {
            onComplete();
        }
        navigate('/home');
    };

    // Add keyboard shortcut for skip verification (CTRL+ALT+S)
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey && event.altKey && event.key === 's') {
                event.preventDefault();
                skipVerification();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const startCamera = () => {
        if (cameraPermissionDenied) {
            setError("Camera is blocked. Please allow access to take a photo.");
            return;
        }
        setError('');
        setShowCamera(true);
    };

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
            stopCamera();
            setShowCamera(false);
        }
    };

    const retakePhoto = () => {
        stopCamera();
        setCapturedImage(null);
        setShowCamera(true);
    };

    const closeCamera = () => {
        stopCamera();
        setShowCamera(false);
    };

    const handleSubmit = async () => {
        if (!capturedImage) {
            setError('Please capture a photo before proceeding.');
            return;
        }

        if (!voterEmbeddings || voterEmbeddings.length === 0) {
            setError('No stored face data found. Please contact support or re-register.');
            return;
        }

        setLoading(true);
        setError('');
        clearError();

        try {
            const imageFile = dataURLtoFile(capturedImage, 'verification-photo.png');
            
            if (!verifyEmbeddingsScaled(voterEmbeddings)) {
                setError('Face data validation failed. Please try again or contact support.');
                return;
            }
            
            const verificationPassed = await processLogin(imageFile, voterEmbeddings);
            
            if (verificationPassed) {
                sessionStorage.setItem('face-verified', 'true');
                if (onComplete) {
                    onComplete();
                }
                navigate('/home');
            } else {
                setError('Face verification failed. The captured photo does not match your registered face. Please try again.');
            }
            
        } catch (err) {
            console.error('Face verification error:', err);
            setError(`Face verification failed: ${err.message || 'Unknown error occurred'}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !capturedImage && !error) {
        return (
            <div className="face-verification-container">
                <div className="face-verification-box">
                    <div className="form-header">
                        <h2>Face Verification</h2>
                        <p>Please wait while we prepare your verification...</p>
                    </div>
                    <div className="verification-content">
                        <div className="loading-spinner">
                            <p>Loading voter data...</p>
                            <button 
                                className="skip-btn" 
                                onClick={() => {
                                    setLoading(false);
                                    setVoterEmbeddings([]);
                                }}
                                style={{marginTop: '20px'}}
                            >
                                Continue Without Loading Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="face-verification-container">
            <div className="face-verification-box">
                <div className="form-header">
                    <h2>Face Verification</h2>
                    <p>Please capture a photo of your face for identity verification.</p>
                </div>
                
                <div className="verification-content">
                    {(error || faceError) && (
                        <div className="error-message">
                            {error || faceError}
                        </div>
                    )}
                
                {!capturedImage ? (
                    <div className="capture-section">
                        <div className="camera-placeholder">
                            <p>Click below to start face capture</p>
                        </div>
                        <button 
                            className="start-camera-btn" 
                            onClick={startCamera}
                            disabled={loading || faceLoading}
                        >
                            Start Camera
                        </button>
                    </div>
                ) : (
                    <div className="preview-section">
                        <img 
                            src={capturedImage} 
                            alt="Captured face" 
                            className="captured-face-preview"
                        />
                        <div className="preview-actions">
                            <button 
                                className="retake-btn" 
                                onClick={retakePhoto}
                                disabled={loading || faceLoading}
                            >
                                Retake Photo
                            </button>
                            <button 
                                className="submit-btn" 
                                onClick={handleSubmit}
                                disabled={loading || faceLoading}
                            >
                                {(loading || faceLoading) ? 'Verifying...' : 'Submit & Continue'}
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="camera-modal">
                    <div className="camera-content">
                        <video ref={videoRef} autoPlay className="camera-video" />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="camera-controls">
                            <button className="capture-btn" onClick={capturePhoto}>
                                Capture Photo
                            </button>
                            <button className="close-camera-btn" onClick={closeCamera}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceVerification; 