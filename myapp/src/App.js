import React, { useEffect, useState } from "react";
import { Layout } from "antd";
import { Routes, Route, useLocation } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./redux/store";
import MenuLeft from "./components/MenuLeft";
import Footer from "./components/Footer";
import AuthButtons from "./component/login/AuthButtons";
import Login from "./component/login/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import SOPListPage from "./pages/SOPListPage";
import SOPDetailPage from "./pages/SOPDetailPage";
import ChecklistPage from "./pages/ChecklistPage";
import DashboardPage from "./pages/DashboardPage";
import ImprovementPage from "./pages/ImprovementPage";
import ChecklistDetailPage from "./pages/ChecklistDetailPage";
import ProfilePage from "./pages/ProfilePage";
import AccountPage from "./pages/AccountPage";
import GroupPage from "./pages/GroupPage";
import SettingsPage from "./pages/SettingsPage";
import userSlice from "./redux/userSlice";
import axios from "./plugins/axios";
import { clearAuthData, getAuthData } from "./utils/authUtils";
import { MenuRefreshProvider } from "./contexts/MenuRefreshContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import LimitSizeInitializer from "./components/LimitSizeInitializer";

const { Sider, Content, Header } = Layout;

function AppContent() {
  const dispatch = useDispatch();
  const { token, nguoiDung, quyenList } = useSelector(state => state.user);
  const [sopCategories, setSopCategories] = useState([]);
  const location = useLocation();

  const hasPermissionAccess = () => {
    return quyenList && quyenList.some(role => 
      role === "ROLE_ADMIN" || role === "ROLE_MANAGER"
    );
  };

  useEffect(() => {
    const authData = getAuthData();
    
    if (authData) {
      dispatch(userSlice.actions.dangNhap(authData));
      axios.get('/api/auth/me')
        .then(() => {
        })
        .catch((error) => {
          if (error && error.response && (error.response.status === 401 || error.response.status === 403)) {
            clearAuthData();
            dispatch(userSlice.actions.dangXuat());
          }
        });
    } else {
      dispatch(userSlice.actions.dangXuat());
    }

    const fetchSOPCategories = async () => {
      try {
        const isAdmin = hasPermissionAccess();
        const response = await axios.get("/api/sops", { 
          params: { 
            page: 0, 
            size: 1000, 
            visibleOnly: !isAdmin
          } 
        });
        const sopsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data && Array.isArray(response.data.content) ? response.data.content : []);
        
        const categories = sopsData
          .filter(sop => sop.id)
          .map(sop => sop.id.toString());
        setSopCategories(categories);
      } catch (error) {
        if (hasPermissionAccess()) {
          setSopCategories(['cài-win', 'cài-network', 'hướng-dẫn-tải-phần-mềm']);
        } else {
          setSopCategories([]);
        }
      }
    };

    if (authData) {
      fetchSOPCategories();
    }
  }, [dispatch]);

  // Dynamic document title per route
  useEffect(() => {
    const { pathname } = location;
    let pageTitle = "";
    if (pathname === "/" || pathname.startsWith("/dashboard")) {
      pageTitle = "Dashboard";
    } else if (pathname === "/sops") {
      pageTitle = "SOPs";
    } else if (pathname.startsWith("/sops/")) {
      pageTitle = "SOP Details";
    } else if (pathname.startsWith("/checklist")) {
      pageTitle = "Checklist";
    } else if (pathname.startsWith("/improvement")) {
      pageTitle = "Improvements";
    } else if (pathname.startsWith("/account")) {
      pageTitle = "Account";
    } else if (pathname.startsWith("/groups")) {
      pageTitle = "Groups";
    } else if (pathname.startsWith("/profile")) {
      pageTitle = "Profile";
    } else if (pathname.startsWith("/settings")) {
      pageTitle = "Settings";
    } else if (pathname.startsWith("/login")) {
      pageTitle = "Login";
    }
    document.title = pageTitle;
  }, [location]);

  if (!token || !nguoiDung || nguoiDung.userID === -1) {
    return <Login />;
  }

  return (
    <Layout style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header 
        style={{ 
          background: "#fff", 
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderBottom: "1px solid #e8e8e8",
          position: "sticky",
          top: 0,
          zIndex: 1000
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/images.png" 
            alt="Logo" 
            style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "8px"
            }}
          />
          <h2 style={{ 
            color: "#333", 
            margin: 0, 
            fontSize: "20px", 
            fontWeight: "600"
          }}>
            IT Management System
          </h2>
        </div>
        <AuthButtons />
      </Header>

      <Layout style={{ flex: 1 }}>
        <Sider width={200} style={{ background: "#fff" }}>
          <MenuLeft />
        </Sider>

        <Layout>
          <Content style={{ padding: "16px", flex: 1 }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sops" element={<SOPListPage />} />
              <Route 
                path="/sops/:id" 
                element={
                  <ProtectedRoute>
                    <SOPDetailPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/improvement" element={<ImprovementPage />} />
              <Route 
                path="/account" 
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AccountPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/groups" 
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <GroupPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/checklist/:id/details" element={<ChecklistDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
      
      <Footer />
    </Layout>
  );
}

function App() {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <MenuRefreshProvider>
          <LimitSizeInitializer>
            <AppContent />
          </LimitSizeInitializer>
        </MenuRefreshProvider>
      </LanguageProvider>
    </Provider>
  );
}

export default App;

