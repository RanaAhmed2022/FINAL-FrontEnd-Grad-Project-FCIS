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



    useEffect(() => {
        if (showCamera) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    setCameraPermissionDenied(false); // reset
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Camera error:", err);
                    setCameraPermissionDenied(true);
                    alert("Camera access is blocked. Please allow camera permissions in your browser settings.");
                    setShowCamera(false); // Close modal
                });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        }
    }, [showCamera]);

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
                        <label
                            className="file-label-reg"
                            onClick={() => {
                                if (cameraPermissionDenied) {
                                    alert("Camera is blocked. Please allow access to take a photo.");
                                } 
                                else {
                                    setShowCamera(true); 
                                }
                            }}>
                            Capture a Photo
                        </label>
                        {capturedImage && (
                            <img
                            src={capturedImage}
                            alt="Captured"
                            className="captured-preview"
                            style={{ marginTop: '10px', maxWidth: '100%', borderRadius: '8px' }}
                            />
                        )}
                    </div>


                    <button type="submit">Register</button>
                    <p className="acountlogin-reg">Already have an account? Please <Link to="/login">Login</Link></p>
                </form>
            </div>
        

        {showCamera && (
            <div className="camera-modal">
                <video ref={videoRef} autoPlay className="camera-video" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button className="capture-btn" onClick={capturePhoto}>Capture</button>
                <button className="close-camera-btn" onClick={() => setShowCamera(false)}>X</button>
            </div>
        )}

    </div>
        
    );
};

export default Registration;