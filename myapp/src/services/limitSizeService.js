import axios from '../plugins/axios';

const API_BASE_URL = '/api/limit-size';

export const limitSizeService = {
  getAllLimitSizes: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching all limit sizes:', error);
      throw error;
    }
  },


  getActiveLimitSizes: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/active`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active limit sizes:', error);
      throw error;
    }
  },

  getLimitSizeById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching limit size by ID:', error);
      throw error;
    }
  },

  getFileUploadLimit: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/file-upload-limit`);
      return response.data;
    } catch (error) {
      console.error('Error fetching file upload limit:', error);
      // Fallback to default value if API fails
      return { maxSizeMb: 10, maxSizeBytes: 10485760 };
    }
  },

  createLimitSize: async (limitSizeData) => {
    try {
      const response = await axios.post(API_BASE_URL, limitSizeData);
      return response.data;
    } catch (error) {
      console.error('Error creating limit size:', error);
      throw error;
    }
  },

  updateLimitSize: async (id, limitSizeData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, limitSizeData);
      return response.data;
    } catch (error) {
      console.error('Error updating limit size:', error);
      throw error;
    }
  },

  deleteLimitSize: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting limit size:', error);
      throw error;
    }
  },

  permanentDeleteLimitSize: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}/permanent`);
      return response.data;
    } catch (error) {
      console.error('Error permanently deleting limit size:', error);
      throw error;
    }
  },

  toggleLimitSizeStatus: async (id) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/${id}/toggle`);
      return response.data;
    } catch (error) {
      console.error('Error toggling limit size status:', error);
      throw error;
    }
  },

  checkFileSize: async (fileSizeInBytes, settingName = 'FILE_UPLOAD_LIMIT') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/check-file-size`, {
        fileSizeInBytes,
        settingName
      });
      return response.data;
    } catch (error) {
      console.error('Error checking file size:', error);
      throw error;
    }
  },

  initDefaultSettings: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/init-default`);
      return response.data;
    } catch (error) {
      console.error('Error initializing default settings:', error);
      throw error;
    }
  }
};

export default limitSizeService;
