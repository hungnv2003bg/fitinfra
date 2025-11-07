import React, { useEffect, useState } from 'react';
import { limitSizeService } from '../services/limitSizeService';
import { getAuthData } from '../utils/authUtils';

const LimitSizeInitializer = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeDefaultSettings = async () => {
      // Check if user is authenticated before making API calls
      const authData = getAuthData();
      
      // If not authenticated, skip initialization and mark as initialized
      if (!authData || !authData.token) {
        setInitialized(true);
        return;
      }
      
      try {
        const activeLimits = await limitSizeService.getActiveLimitSizes();
        const fileUploadLimit = activeLimits.find(limit => limit.settingName === 'FILE_UPLOAD_LIMIT');
        if (!fileUploadLimit) {
          await limitSizeService.initDefaultSettings();
          console.log('Default limit size settings initialized');
        }
      } catch (error) {
        // Log error but don't block the app from loading
        console.warn('Failed to initialize default limit size settings:', error);
      } finally {
        // Always mark as initialized to prevent infinite loading
        setInitialized(true);
      }
    };

    initializeDefaultSettings();
  }, []);

  if (!initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Đang khởi tạo hệ thống...</div>
      </div>
    );
  }

  return children;
};

export default LimitSizeInitializer;
