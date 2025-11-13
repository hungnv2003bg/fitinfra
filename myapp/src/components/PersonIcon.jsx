import React from 'react';

const PersonIcon = ({ status, size = 'md' }) => {
  const sizeMap = {
    sm: { width: 32, height: 48 },
    md: { width: 48, height: 72 },
    lg: { width: 64, height: 96 },
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  // Map trạng thái tiếng Việt sang format
  const getStatusType = () => {
    if (!status) return 'default';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('có mặt') || statusLower.includes('present')) {
      return 'present';
    }
    if (statusLower.includes('đi muộn') || statusLower.includes('late')) {
      return 'late';
    }
    if (statusLower.includes('nửa ngày') || statusLower.includes('halfday') || statusLower.includes('half')) {
      return 'halfday';
    }
    if (statusLower.includes('vắng') || statusLower.includes('absent')) {
      return 'absent';
    }
    if (statusLower.includes('nghỉ phép') || statusLower.includes('leave')) {
      return 'leave';
    }
    if (
      statusLower.includes('nghỉ cn') ||
      statusLower.includes('nghi cn') ||
      statusLower.includes('chu nhat') ||
      statusLower.includes('周日')
    ) {
      return 'weekend';
    }
    return 'default';
  };

  const statusType = getStatusType();

  const getColors = () => {
    switch (statusType) {
      case 'present':
      case 'late':
        return { head: '#22c55e', body: '#22c55e' }; // Green
      case 'absent':
      case 'leave':
        return { head: '#ef4444', body: '#ef4444' }; // Red
      case 'weekend':
        return { head: '#3b82f6', body: '#3b82f6' }; // Blue
      case 'halfday':
        return { head: '#22c55e', body: '#ef4444' }; // Half green, half red
      default:
        return { head: '#9ca3af', body: '#9ca3af' }; // Gray
    }
  };

  const colors = getColors();

  return (
    <svg
      viewBox="0 0 24 36"
      width={dimensions.width}
      height={dimensions.height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block' }}
    >
      {/* Head */}
      <circle cx="12" cy="7" r="5" fill={colors.head} />
      
      {/* Body */}
      {statusType === 'halfday' ? (
        <>
          {/* Top half - green */}
          <path
            d="M 4 14 C 4 14 4 12 12 12 C 20 12 20 14 20 14 L 20 23 L 12 23 L 4 23 Z"
            fill="#22c55e"
          />
          {/* Bottom half - red */}
          <path
            d="M 4 23 L 12 23 L 20 23 L 18 34 L 6 34 Z"
            fill="#ef4444"
          />
        </>
      ) : (
        <path
          d="M 4 14 C 4 14 4 12 12 12 C 20 12 20 14 20 14 L 18 34 L 6 34 Z"
          fill={colors.body}
        />
      )}
      
      {/* Arms */}
      <rect x="2" y="16" width="3" height="10" rx="1.5" fill={statusType === 'halfday' ? colors.body : colors.body} />
      <rect x="19" y="16" width="3" height="10" rx="1.5" fill={statusType === 'halfday' ? colors.body : colors.body} />
      
      {/* Legs */}
      <rect x="7" y="32" width="4" height="4" rx="1" fill={colors.body} />
      <rect x="13" y="32" width="4" height="4" rx="1" fill={colors.body} />
    </svg>
  );
};

export default PersonIcon;

