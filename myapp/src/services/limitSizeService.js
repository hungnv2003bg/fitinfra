import axios from '../plugins/axios';

const API_BASE_URL = '/api/limit-size';

export const limitSizeService = {
  // Lấy tất cả limit size settings
  getAllLimitSizes: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching all limit sizes:', error);
      throw error;
    }
  },

  // Lấy tất cả limit size settings đang active
  getActiveLimitSizes: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/active`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active limit sizes:', error);
      throw error;
    }
  },

  // Lấy limit size theo ID
  getLimitSizeById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching limit size by ID:', error);
      throw error;
    }
  },

  // Lấy giới hạn kích thước file upload hiện tại
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

  // Tạo mới limit size setting
  createLimitSize: async (limitSizeData) => {
    try {
      const response = await axios.post(API_BASE_URL, limitSizeData);
      return response.data;
    } catch (error) {
      console.error('Error creating limit size:', error);
      throw error;
    }
  },

  // Cập nhật limit size setting
  updateLimitSize: async (id, limitSizeData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, limitSizeData);
      return response.data;
    } catch (error) {
      console.error('Error updating limit size:', error);
      throw error;
    }
  },

  // Xóa limit size setting (soft delete)
  deleteLimitSize: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting limit size:', error);
      throw error;
    }
  },

  // Xóa vĩnh viễn limit size setting
  permanentDeleteLimitSize: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}/permanent`);
      return response.data;
    } catch (error) {
      console.error('Error permanently deleting limit size:', error);
      throw error;
    }
  },

  // Kích hoạt/tắt limit size setting
  toggleLimitSizeStatus: async (id) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/${id}/toggle`);
      return response.data;
    } catch (error) {
      console.error('Error toggling limit size status:', error);
      throw error;
    }
  },

  // Kiểm tra kích thước file có vượt quá giới hạn không
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

  // Khởi tạo setting mặc định cho file upload limit
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
