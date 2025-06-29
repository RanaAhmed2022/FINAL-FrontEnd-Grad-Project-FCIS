import { useState, useCallback } from 'react';
import faceVerificationService from '../services/faceVerificationService';

/**
 * Custom hook for face verification functionality
 * @returns {Object} - Hook state and methods
 */
export const useFaceVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if the face verification API is available
   */
  const checkApiStatus = useCallback(async () => {
    try {
      const status = await faceVerificationService.checkApiStatus();
      setApiStatus(status);
      return status;
    } catch (err) {
      setError('Failed to check API status');
      setApiStatus(false);
      return false;
    }
  }, []);

  /**
   * Extract face embeddings from an image - Workflow 1
   * @param {File} imageFile - The image file to process
   * @returns {Promise<Array|null>} - The face embeddings or null if failed
   */
  const extractEmbeddings = useCallback(async (imageFile) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate file first
      const validation = faceVerificationService.validateImageFile(imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const result = await faceVerificationService.extractEmbeddings(imageFile);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.embeddings;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify face against existing embeddings - Workflow 2
   * @param {File} imageFile - The image file to verify
   * @param {Array} existingEmbeddings - The existing embeddings to compare against
   * @returns {Promise<Object|null>} - Verification result or null if failed
   */
  const verifyFace = useCallback(async (imageFile, existingEmbeddings) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate file first
      const validation = faceVerificationService.validateImageFile(imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Validate embeddings
      if (!existingEmbeddings || !Array.isArray(existingEmbeddings) || existingEmbeddings.length === 0) {
        throw new Error('Valid existing embeddings are required');
      }

      console.log('📸 Starting face verification...');
      console.log(`   Image file: ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)} KB)`);
      console.log(`   Existing embeddings: ${existingEmbeddings.length} dimensions`);

      const result = await faceVerificationService.verifyFace(imageFile, existingEmbeddings);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        isMatch: result.isMatch,
        similarity: result.similarity,
        threshold: result.threshold,
        accuracyPercentage: result.accuracyPercentage,
        message: result.message
      };
    } catch (err) {
      console.error('❌ Face verification error:', err.message);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify ID and compare face with ID photo
   * @param {File} idImageFile - The uploaded ID image
   * @param {File} faceImageFile - The captured face image
   * @returns {Promise<Object|null>} - Verification result with extracted NID or null if failed
   */
  const verifyIdAndFace = useCallback(async (idImageFile, faceImageFile) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate both files
      const idValidation = faceVerificationService.validateImageFile(idImageFile);
      if (!idValidation.valid) {
        throw new Error(`ID Image: ${idValidation.error}`);
      }

      const faceValidation = faceVerificationService.validateImageFile(faceImageFile);
      if (!faceValidation.valid) {
        throw new Error(`Face Image: ${faceValidation.error}`);
      }

      console.log('🆔 Starting ID verification and face comparison...');
      console.log(`   ID Image: ${idImageFile.name} (${(idImageFile.size / 1024).toFixed(1)} KB)`);
      console.log(`   Face Image: ${faceImageFile.name} (${(faceImageFile.size / 1024).toFixed(1)} KB)`);

      const result = await faceVerificationService.verifyIdAndFace(idImageFile, faceImageFile);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ ID verification completed successfully:');
      console.log(`   Extracted NID: ${result.extractedNid}`);
      console.log(`   Face Match: ${result.faceVerification.faces_match}`);
      console.log(`   Face Similarity: ${result.faceVerification.accuracy_percentage}%`);
      console.log(`   ID Authenticity: ${result.authenticityCheck.is_real ? 'Real' : 'Fake'}`);

      return {
        extractedNid: result.extractedNid,
        faceVerification: result.faceVerification,
        authenticityCheck: result.authenticityCheck,
        message: result.message
      };
    } catch (err) {
      console.error('❌ ID verification error:', err.message);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Process registration workflow: extract embeddings and return them for blockchain storage
   * @param {File} imageFile - The registration image
   * @returns {Promise<Array|null>} - Embeddings for storage or null if failed
   */
  const processRegistration = useCallback(async (imageFile) => {
    try {
      const embeddings = await extractEmbeddings(imageFile);
      if (embeddings) {
        console.log('Registration embeddings extracted successfully. Ready for blockchain storage.');
      }
      return embeddings;
    } catch (err) {
      console.error('Registration processing failed:', err);
      return null;
    }
  }, [extractEmbeddings]);

  /**
   * Process login workflow: verify face against stored embeddings
   * @param {File} imageFile - The login image
   * @param {Array} storedEmbeddings - Embeddings retrieved from blockchain
   * @returns {Promise<boolean>} - Whether verification passed
   */
  const processLogin = useCallback(async (imageFile, storedEmbeddings) => {
    try {
      const result = await verifyFace(imageFile, storedEmbeddings);
      if (result) {
        // Enhanced console logging with detailed accuracy information
        const accuracyPercentage = result.accuracyPercentage || (result.similarity * 100).toFixed(2);
        const thresholdPercentage = (result.threshold * 100).toFixed(2);
        
        console.log('🎯 FACE VERIFICATION RESULTS:');
        console.log(`   Status: ${result.isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Accuracy Score: ${accuracyPercentage}%`);
        console.log(`   Threshold: ${thresholdPercentage}%`);
        console.log(`   Raw Similarity: ${result.similarity.toFixed(4)}`);
        console.log(`   Message: ${result.message}`);
        console.log('─'.repeat(50));
        
        return result.isMatch;
      }
      return false;
    } catch (err) {
      console.error('❌ Login processing failed:', err);
      return false;
    }
  }, [verifyFace]);

  return {
    // State
    isLoading,
    error,
    apiStatus,
    
    // Methods
    clearError,
    checkApiStatus,
    extractEmbeddings,
    verifyFace,
    verifyIdAndFace,
    processRegistration,
    processLogin,
    
    // Utilities
    validateImageFile: faceVerificationService.validateImageFile
  };
}; 