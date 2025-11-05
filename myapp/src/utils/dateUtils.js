


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
  if (!dateValue) return "-";
  try {
    const input = new Date(dateValue);
    if (isNaN(input.getTime())) return "-";

    // Convert to Vietnam timezone reliably, then format as dd/MM/yyyy HH:mm
    const vnDate = new Date(
      input.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    );

    const dd = String(vnDate.getDate()).padStart(2, '0');
    const mm = String(vnDate.getMonth() + 1).padStart(2, '0');
    const yyyy = vnDate.getFullYear();
    const HH = String(vnDate.getHours()).padStart(2, '0');
    const MM = String(vnDate.getMinutes()).padStart(2, '0');
    const SS = String(vnDate.getSeconds()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${HH}:${MM}:${SS}`;
  } catch {
    return "-";
  }
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

