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