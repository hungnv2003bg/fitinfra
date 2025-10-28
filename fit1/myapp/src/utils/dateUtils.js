


export const formatDateVN = (dateValue, options = {}) => {
  if (!dateValue) return "-";
  
  try {
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) return "-";
    
    const defaultOptions = {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    return date.toLocaleString('vi-VN', formatOptions);
  } catch (error) {
    return "-";
  }
};

export const formatDateShortVN = (dateValue) => {
  return formatDateVN(dateValue, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};


export const formatDateOnlyVN = (dateValue) => {
  return formatDateVN(dateValue, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};


export const getCurrentDateVN = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
};

