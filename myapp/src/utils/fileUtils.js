
import { limitSizeService } from "../services/limitSizeService";

let cachedFileUploadLimit = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export const getMaxFileSizeMB = async () => {
  const now = Date.now();
  
  if (cachedFileUploadLimit && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedFileUploadLimit;
  }

  try {
    const response = await limitSizeService.getFileUploadLimit();
    cachedFileUploadLimit = response.maxSizeMb;
    lastFetchTime = now;
    
    localStorage.setItem('maxFileSizeMB', cachedFileUploadLimit.toString());
    
    return cachedFileUploadLimit;
  } catch (error) {
    console.warn('Failed to fetch file upload limit from API, using localStorage fallback:', error);
    
    const stored = localStorage.getItem('maxFileSizeMB');
    const fallbackValue = stored ? parseInt(stored) : 10;
    cachedFileUploadLimit = fallbackValue;
    lastFetchTime = now;
    
    return fallbackValue;
  }
};

export const getMaxFileSizeMBSync = () => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('maxFileSizeMB') : null;
    const parsed = stored ? parseInt(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 10;
  } catch (e) {
    return 10;
  }
};

export const validateFileSize = (file, lang = (typeof localStorage !== 'undefined' ? (localStorage.getItem('language') || 'vi') : 'vi')) => {
  const maxSizeMB = getMaxFileSizeMBSync();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const viMsg = `File "${file.name}" vượt quá giới hạn kích thước cho phép (${maxSizeMB}MB). Kích thước hiện tại: ${sizeMB}MB`;
    const zhMsg = `文件 "${file.name}" 超过允许的大小限制 (${maxSizeMB}MB)。当前大小：${sizeMB}MB`;

    return {
      isValid: false,
      errorMessage: lang === 'zh' ? zhMsg : viMsg
    };
  }

  return { isValid: true };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileSizeLimitMessage = (lang = (typeof localStorage !== 'undefined' ? (localStorage.getItem('language') || 'vi') : 'vi')) => {
  const maxSizeMB = getMaxFileSizeMBSync();
  return lang === 'zh' ? `文件大小限制：${maxSizeMB}MB` : `Giới hạn kích thước file: ${maxSizeMB}MB`;
};

export const validateFileSizeAsync = async (file, lang = (typeof localStorage !== 'undefined' ? (localStorage.getItem('language') || 'vi') : 'vi')) => {
  const maxSizeMB = await getMaxFileSizeMB();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const viMsg = `File "${file.name}" vượt quá giới hạn kích thước cho phép (${maxSizeMB}MB). Kích thước hiện tại: ${sizeMB}MB`;
    const zhMsg = `文件 "${file.name}" 超过允许的大小限制 (${maxSizeMB}MB)。当前大小：${sizeMB}MB`;

    return {
      isValid: false,
      errorMessage: lang === 'zh' ? zhMsg : viMsg
    };
  }

  return { isValid: true };
};

