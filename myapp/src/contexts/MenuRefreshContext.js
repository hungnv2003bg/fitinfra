import React, { createContext, useContext, useState } from 'react';

const MenuRefreshContext = createContext();

export const useMenuRefresh = () => {
  const context = useContext(MenuRefreshContext);
  if (!context) {
    throw new Error('useMenuRefresh must be used within a MenuRefreshProvider');
  }
  return context;
};

export const MenuRefreshProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerMenuRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <MenuRefreshContext.Provider value={{ refreshKey, triggerMenuRefresh }}>
      {children}
    </MenuRefreshContext.Provider>
  );
};

