export const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('quyenList');
  localStorage.removeItem('refreshToken');
};

export const isAuthenticated = () => {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  return !!(user && token);
};

export const getAuthData = () => {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  const quyenList = localStorage.getItem('quyenList');
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (user && token) {
    try {
      return {
        token: token,
        quyenList: quyenList ? JSON.parse(quyenList) : [],
        nguoiDung: JSON.parse(user),
        refreshToken: refreshToken
      };
    } catch (error) {
      clearAuthData();
      return null;
    }
  }
  
  return null;
};

