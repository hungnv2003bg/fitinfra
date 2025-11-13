import axios from '../plugins/axios';

const API_BASE_URL = '/api/attendance';

export const attendanceService = {
  // Lấy tất cả bản ghi điểm danh theo ngày
  getAttendanceByDate: async (date) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/date/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      throw error;
    }
  },

  // Lấy bản ghi điểm danh của một user theo ngày
  getAttendanceByUserAndDate: async (userId, date) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}/date/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance by user and date:', error);
      throw error;
    }
  },

  // Lấy tất cả bản ghi điểm danh của một user
  getAttendanceByUser: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance by user:', error);
      throw error;
    }
  },

  // Lấy bản ghi điểm danh trong khoảng thời gian
  getAttendanceByDateRange: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/range`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      throw error;
    }
  },

  // Tạo mới bản ghi điểm danh
  createAttendance: async (attendanceData) => {
    try {
      const response = await axios.post(API_BASE_URL, attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
  },

  // Cập nhật bản ghi điểm danh
  updateAttendance: async (id, attendanceData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  },

  // Xóa bản ghi điểm danh
  deleteAttendance: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting attendance:', error);
      throw error;
    }
  },

  // Tạo điểm danh cho 7 ngày tiếp theo
  createAttendanceForNext7Days: async (userId, shift = "Ngày") => {
    try {
      const response = await axios.post(`${API_BASE_URL}/create-next-7-days`, {
        userId: userId,
        shift
      });
      return response.data;
    } catch (error) {
      console.error('Error creating attendance for next 7 days:', error);
      throw error;
    }
  }
};

export default attendanceService;

