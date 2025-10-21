import React from 'react';
import SOPPermissionModal from './SOPPermissionModal';

export default function SOPGlobalPermissionModal(props) {
  return <SOPPermissionModal {...props} globalMode={true} />;
}


