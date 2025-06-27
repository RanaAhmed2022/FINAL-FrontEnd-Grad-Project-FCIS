import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVotingContract } from '../../hooks/useVotingContract';
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

    // Get voter embeddings when component mounts
    useEffect(() => {
        const fetchEmbeddings = async () => {
            console.log('Fetching voter embeddings...');
            try {
                setLoading(true);
                setError('');
                
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout: Failed to fetch embeddings')), 10000)
                );
                
                const embeddingsPromise = getVoterEmbeddings();
                const embeddings = await Promise.race([embeddingsPromise, timeoutPromise]);
                
                console.log('Voter embeddings fetched:', embeddings);
                setVoterEmbeddings(embeddings);
            } catch (err) {
                console.error('Error fetching embeddings:', err);
                setError('Failed to get voter embeddings. You can still proceed with face verification.');
                // Don't block the user, allow them to continue
                setVoterEmbeddings([]);
            } finally {
                setLoading(false);
            }
        };

        // Only fetch once when component mounts
        if (userAddress && !voterEmbeddings && !loading) {
            fetchEmbeddings();
        }
    }, [userAddress]); // Only depend on userAddress

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

        setLoading(true);
        setError('');

        try {
            // Here we would normally send the captured image and voter embeddings to AI API
            // For now, we'll simulate the process and then redirect to home
            
            // TODO: Implement AI comparison API call
            // const response = await fetch('/api/verify-face', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         userAddress,
            //         capturedImage,
            //         voterEmbeddings
            //     }),
            // });
            
            // For now, just simulate success after a short delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Store verification status
            sessionStorage.setItem('face-verified', 'true');
            
            // Call completion callback
            if (onComplete) {
                onComplete();
            }
            
            // Navigate to home
            navigate('/home');
            
        } catch (err) {
            setError('Face verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const skipVerification = () => {
        // Allow user to skip for now (remove this in production)
        if (onComplete) {
            onComplete();
        }
        navigate('/home');
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
                    {error && <div className="error-message">{error}</div>}
                
                {!capturedImage ? (
                    <div className="capture-section">
                        <div className="camera-placeholder">
                            <p>Click below to start face capture</p>
                        </div>
                        <button 
                            className="start-camera-btn" 
                            onClick={startCamera}
                            disabled={loading}
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
                                disabled={loading}
                            >
                                Retake Photo
                            </button>
                            <button 
                                className="submit-btn" 
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Submit & Continue'}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Temporary skip button for development */}
                <button 
                    className="skip-btn" 
                    onClick={skipVerification}
                    disabled={loading}
                >
                    Skip Verification (Dev Only)
                </button>
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