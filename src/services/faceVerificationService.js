// Face Verification API Service
const FACE_API_BASE_URL = 'http://localhost:5000';

class FaceVerificationService {
  /**
   * Workflow 1: Extract face embeddings from an image
   * @param {File} imageFile - The image file to extract embeddings from
   * @returns {Promise<Object>} - Response with embeddings or error
   */
  async extractEmbeddings(imageFile) {
    try {
      const formData = new FormData();
      formData.append('face_image', imageFile);

      const response = await fetch(`${FACE_API_BASE_URL}/extract_embeddings`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        embeddings: data.embeddings,
        message: data.message
      };
    } catch (error) {
      console.error('Error extracting embeddings:', error);
      return {
        success: false,
        error: error.message || 'Failed to extract face embeddings'
      };
    }
  }

  /**
   * Workflow 2: Verify face against existing embeddings
   * @param {File} imageFile - The image file to verify
   * @param {Array} existingEmbeddings - The existing face embeddings to compare against
   * @returns {Promise<Object>} - Response with verification result
   */
  async verifyFace(imageFile, existingEmbeddings) {
    try {
      console.log('🔄 Making API call to /verify_face...');
      
      // Detailed debugging of embeddings before sending to API
      console.log('📊 EMBEDDINGS DEBUG INFO:');
      console.log('   - Type:', typeof existingEmbeddings);
      console.log('   - Is Array:', Array.isArray(existingEmbeddings));
      console.log('   - Length:', existingEmbeddings?.length);
      console.log('   - First 10 values:', existingEmbeddings?.slice(0, 10));
      console.log('   - Sample value types:', existingEmbeddings?.slice(0, 5).map(v => typeof v));
      console.log('   - Has NaN values:', existingEmbeddings?.some(v => isNaN(v)));
      console.log('   - Has Infinity values:', existingEmbeddings?.some(v => !isFinite(v)));
      console.log('   - Min value:', existingEmbeddings?.length > 0 ? Math.min(...existingEmbeddings) : 'N/A');
      console.log('   - Max value:', existingEmbeddings?.length > 0 ? Math.max(...existingEmbeddings) : 'N/A');
      
      // Validate embeddings before sending
      if (!existingEmbeddings || !Array.isArray(existingEmbeddings)) {
        throw new Error('Invalid embeddings: not an array');
      }
      
      if (existingEmbeddings.length === 0) {
        throw new Error('Invalid embeddings: empty array');
      }
      
      if (existingEmbeddings.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) {
        console.error('❌ Invalid values found in embeddings');
        const invalidValues = existingEmbeddings.filter(v => typeof v !== 'number' || isNaN(v) || !isFinite(v));
        console.error('Invalid values sample:', invalidValues.slice(0, 10));
        throw new Error('Invalid embeddings: contains non-numeric, NaN, or infinite values');
      }
      
      console.log('✅ Embeddings validation passed');
      
      const embeddingsJson = JSON.stringify(existingEmbeddings);
      console.log('📤 JSON string length:', embeddingsJson.length);
      console.log('📤 JSON string preview:', embeddingsJson.substring(0, 200) + '...');
      
      const formData = new FormData();
      formData.append('face_image', imageFile);
      formData.append('existing_embeddings', embeddingsJson);

      console.log('🌐 Sending request to API...');
      const response = await fetch(`${FACE_API_BASE_URL}/verify_face`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response received from API');
      const data = await response.json();
      
      console.log('📡 API Response received:', {
        status: response.status,
        ok: response.ok,
        similarity: data.similarity,
        threshold: data.threshold,
        is_match: data.is_match,
        accuracy_percentage: data.accuracy_percentage
      });
      
      // If response is not ok, log the full error details
      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        isMatch: data.is_match,
        similarity: data.similarity,
        threshold: data.threshold,
        accuracyPercentage: data.accuracy_percentage,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error verifying face:', error);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Failed to verify face'
      };
    }
  }

  /**
   * Verify ID and compare face with ID photo
   * @param {File} idImageFile - The uploaded ID image file
   * @param {File} faceImageFile - The captured face image file
   * @returns {Promise<Object>} - Response with verification result and extracted NID
   */
  async verifyIdAndFace(idImageFile, faceImageFile) {
    try {
      console.log('🔄 Making API call to /verify_id_and_face...');
      console.log(`📷 ID Image: ${idImageFile.name} (${(idImageFile.size / 1024).toFixed(1)} KB)`);
      console.log(`📷 Face Image: ${faceImageFile.name} (${(faceImageFile.size / 1024).toFixed(1)} KB)`);

      const formData = new FormData();
      formData.append('id_image', idImageFile);
      formData.append('face_image', faceImageFile);

      console.log('🌐 Sending request to API...');
      const response = await fetch(`${FACE_API_BASE_URL}/verify_id_and_face`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response received from API');
      console.log(`📊 Response Status: ${response.status} (${response.ok ? 'OK' : 'ERROR'})`);
      console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      
      console.log('📡 Full API Response received:');
      console.log('  Raw response data:', data);
      console.log('  Response breakdown:', {
        status: response.status,
        ok: response.ok,
        success: data.success,
        extracted_nid: data.extracted_nid,
        face_verification: data.face_verification,
        authenticity_check: data.authenticity_check,
        error: data.error,
        details: data.details
      });
      
      // If response is not ok, log the full error details
      if (!response.ok) {
        console.error('❌ API ERROR DETAILS:');
        console.error('  Status Code:', response.status);
        console.error('  Status Text:', response.statusText);
        console.error('  Full Error Response:', data);
        console.error('  Error Message:', data.error || 'No error message provided');
        console.error('  Error Details:', data.details || 'No error details provided');
        
        // Enhanced error message with all available details
        const errorMessage = data.error || `HTTP error! status: ${response.status}`;
        const errorDetails = data.details ? ` Details: ${data.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return {
        success: true,
        extractedNid: data.extracted_nid,
        faceVerification: data.face_verification,
        authenticityCheck: data.authenticity_check,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error verifying ID and face:', error);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Failed to verify ID and face'
      };
    }
  }

  /**
   * Check if the face verification API is available
   * @returns {Promise<boolean>} - Whether the API is available
   */
  async checkApiStatus() {
    try {
      const response = await fetch(`${FACE_API_BASE_URL}/`);
      const data = await response.json();
      return response.ok && data.status === 'running';
    } catch (error) {
      console.error('Face verification API is not available:', error);
      return false;
    }
  }

  /**
   * Validate image file
   * @param {File} file - The file to validate
   * @returns {Object} - Validation result
   */
  validateImageFile(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Please upload a JPEG or PNG image.' };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large. Maximum size is 10MB.' };
    }

    return { valid: true };
  }
}

export default new FaceVerificationService(); 