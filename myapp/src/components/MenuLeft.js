import React from "react";
import { Menu } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  CheckSquareOutlined,
  DashboardOutlined,
  RocketOutlined,
  ToolOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import "../styles/menu.css";
import { useLanguage } from "../contexts/LanguageContext";

function MenuLeft() {
  const location = useLocation();
  const { quyenList } = useSelector(state => state.user);
  const { lang } = useLanguage();

  const getSelectedKey = () => {
    const path = location.pathname;
    
    if (path === "/" || path === "/dashboard") {
      return "/dashboard";
    }
    if (path.startsWith("/sops")) {
      return "/sops";
    }
    if (path.startsWith("/checklist")) {
      return "/checklist";
    }
    if (path.startsWith("/improvement")) {
      return "/improvement";
    }
    if (path.startsWith("/account")) {
      return "/account";
    }
    if (path.startsWith("/groups")) {
      return "/groups";
    }
    if (path.startsWith("/attendance")) {
      return "/attendance";
    }
    return path || "/dashboard";
  };

  const selectedKey = getSelectedKey();

  const hasAccountAccess = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => role === "ADMIN" || role === "ROLE_ADMIN");
  };
  
  const isUserRole = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => role === "USER" || role === "ROLE_USER") && 
           !quyenList.some(role => role === "ADMIN" || role === "MANAGER" || role === "ROLE_ADMIN" || role === "ROLE_MANAGER");
  };

  const labels = {
    vi: { dashboard: "Dashboard", sops: "SOPS", checklist: "Checklist", improvement: "Improvement", account: "Account", groups: "Group", attendance: "Attendance" },
    zh: { dashboard: "仪表盘", sops: "SOPS", checklist: "事件管理", improvement: "問題管理", account: "账户", groups: "群组", attendance: "考勤" }
  };
  const t = labels[lang];

  const menuItems = [

    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">{t.dashboard}</Link>,
    },

    // Đưa Attendance lên ngay dưới Dashboard và hiển thị cho mọi người dùng đã đăng nhập
    {
      key: "/attendance",
      icon: <ClockCircleOutlined />,
      label: <Link to="/attendance">{t.attendance}</Link>,
    },

    {
      key: "/sops",
      icon: <RocketOutlined />,
      label: <Link to="/sops">{t.sops}</Link>,
    },

    {
      key: "/checklist",
      icon: <CheckSquareOutlined />,
      label: <Link to="/checklist">{t.checklist}</Link>,
    },
    {
      key: "/improvement",
      icon: <ToolOutlined />,
      label: <Link to="/improvement">{t.improvement}</Link>,
    },

    ...(hasAccountAccess() ? [
      {
        key: "/account",
        icon: <UserOutlined />,
        label: <Link to="/account">{t.account}</Link>,
      },
      {
        key: "/groups",
        icon: <TeamOutlined />,
        label: <Link to="/groups">{t.groups}</Link>,
      },
    ] : []),
  ];

  return (
    <Menu
      mode="vertical"
      triggerSubMenuAction="hover"
      subMenuOpenDelay={0}
      subMenuCloseDelay={0.1}
      selectedKeys={[selectedKey]}
      style={{
        height: "100%",
        borderRight: 0,
        paddingTop: 16,
        fontWeight: 500,
        fontSize: "15px",
      }}
      items={menuItems}
    />
  );
}

export default MenuLeft;

