import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { clearAuthData } from "./utils/authUtils";

const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  try {
    const token = localStorage.getItem("token");
    const mergedHeaders = new Headers(init && init.headers ? init.headers : undefined);
    if (token && !mergedHeaders.has("Authorization")) {
      mergedHeaders.set("Authorization", `Bearer ${token}`);
    }
    const response = await originalFetch(input, { ...init, headers: mergedHeaders });
    
    const url = typeof input === 'string' ? input : input.url;
    const isUserUpdate = /\/api\/users\/\d+$/.test(url) && (init?.method === 'PUT' || init?.method === 'put');
    
    
    if (response && (response.status === 401 || response.status === 403) && !isUserUpdate) {
      clearAuthData();
    }
    return response;
  } catch (err) {
    return originalFetch(input, init);
  }
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

