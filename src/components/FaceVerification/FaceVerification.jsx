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
    
    // Face verification hook
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
        
        // Check if values are in expected float range (typically -1 to 1 for face embeddings)
        const isProperlyScaled = embeddings.every(value => 
            typeof value === 'number' && Math.abs(value) <= 10
        );
        
        if (!isProperlyScaled) {
            console.warn('⚠️ Warning: Embeddings may not be properly scaled down!');
            console.warn('Expected: float values between -10 and 10');
            console.warn('Actual sample values:', embeddings.slice(0, 5));
            return false;
        }
        
        console.log('✅ Embeddings scale verification passed - values are in expected float range');
        return true;
    };

    // Get voter embeddings when component mounts
    useEffect(() => {
        const fetchEmbeddings = async () => {
            try {
                setLoading(true);
                setError('');
                
                const embeddings = await getVoterEmbeddings();
                
                // Scale down embeddings from blockchain (they were scaled by 1e18)
                const scaledDownEmbeddings = embeddings.map(value => Number(value) / 1e18);
                
                // Verify the scaling was successful
                verifyEmbeddingsScaled(scaledDownEmbeddings);
                
                setVoterEmbeddings(scaledDownEmbeddings);
            } catch (err) {
                console.error('Error fetching embeddings:', err);
                setError('Failed to get voter embeddings. You can still proceed with face verification.');
                setVoterEmbeddings([]);
            } finally {
                setLoading(false);
            }
        };

        if (userAddress && !voterEmbeddings && !loading) {
            fetchEmbeddings();
        }
    }, [userAddress]);

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

    // Handle camera access
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
        // Allow user to skip for now (accessible via CTRL+ALT+S)
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
                console.log('Skip verification shortcut activated (CTRL+ALT+S)');
                skipVerification();
            }
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup event listener on unmount
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

    const retakePhoto = () => {
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
        setShowCamera(true);
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
            // Convert captured image to File object for face verification API
            const imageFile = dataURLtoFile(capturedImage, 'verification-photo.png');
            
            // Final verification before sending to API
            const areEmbeddingsScaled = verifyEmbeddingsScaled(voterEmbeddings);
            if (!areEmbeddingsScaled) {
                console.error('❌ Embeddings verification failed - aborting verification');
                setError('Embeddings are not properly scaled. Please try again or contact support.');
                return;
            }
            
            const verificationPassed = await processLogin(imageFile, voterEmbeddings);
            
            if (verificationPassed) {
                console.log('Face verification successful!');
                
                // Store verification status
                sessionStorage.setItem('face-verified', 'true');
                
                // Call completion callback
                if (onComplete) {
                    onComplete();
                }
                
                // Navigate to home
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