import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Registration.css';
import './../../index';

const Registration = () => {

    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);



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

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
        setFormData({ ...formData, [name]: files[0] });
        setFileNames({ ...fileNames, [name]: files[0].name });
        } else {
        setFormData({ ...formData, [name]: value });
        }
    };

    const validateAndSubmit = (e) => {
        e.preventDefault();

        const { idNumber, idFront, userImage } = formData;

        if (!/^\d{14}$/.test(idNumber)) {
        alert('ID must be exactly 14 digits.');
        return;
        }

        if (!idFront) {
            alert('Please upload the front image of your national ID.');
            return;
        }

        if (!userImage) {
            alert('Please capture a photo before submitting.');
            return;
        }


        alert('Registration successful!');
        console.log({ idNumber, idFront, userImage });
    };

    return (
        <div className="reg-container">
            <div className="reg-box">

                <form onSubmit={validateAndSubmit}>
                    <div className="form-header">
                        <h1 className="form-title">User Registration</h1>
                        <p className="form-subtitle">Complete your registration to access the voting platform</p>
                    </div>

                    <div className="floating-label-input">
                        <input type="text" name="idNumber" id="idNumber" value={formData.idNumber} onChange={handleChange} placeholder="" pattern="\d{14}" required />
                        <label htmlFor="idNumber">National ID</label>
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


                    <button type="submit">Register</button>
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