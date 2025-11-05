import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  notification,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TeamOutlined,
  LockOutlined,
} from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";

const { Option } = Select;
 

function AccountPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [allGroups, setAllGroups] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [serverGroupId, setServerGroupId] = useState(null);
 
  const { lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();


  const labels = {
    vi: {
      pageTitle: "Account",
      totalAccounts: "Tổng số tài khoản",
      activeAccounts: "Tài khoản hoạt động",
      inactiveAccounts: "Tài khoản chưa kích hoạt",
      searchPlaceholder: "Tìm kiếm theo tên, email, mã nhân viên...",
      all: "Tất cả",
      allStatus: "Tất cả trạng thái",
      active: "Hoạt động",
      inactive: "Chưa kích hoạt",
      addUser: "Thêm mới",
      empId: "Mã nhân viên",
      fullName: "Họ và tên",
      email: "Email",
      phone: "Số điện thoại",
      createdAt: "Ngày tạo",
      role: "Vai trò",
      group: "Nhóm",
      status: "Trạng thái",
      actions: "Thao tác",
      view: "Xem",
      detailsTitle: "Chi tiết tài khoản",
      edit: "Chỉnh sửa",
      changePassword: "Đổi mật khẩu",
      disable: "Vô hiệu hóa",
      enable: "Kích hoạt",
      editUser: "Chỉnh sửa người dùng",
      addNewUser: "Thêm người dùng mới",
      save: "Lưu",
      cancel: "Hủy",
      newPassword: "Mật khẩu mới",
      confirmPassword: "Xác nhận mật khẩu",
      changePasswordTitle: "Đổi mật khẩu",
      newPasswordPlaceholder: "Nhập mật khẩu mới",
      confirmPasswordPlaceholder: "Nhập lại mật khẩu mới",
      newPasswordRequired: "Vui lòng nhập mật khẩu mới",
      passwordMinLength: "Mật khẩu phải có ít nhất 6 ký tự",
      confirmPasswordRequired: "Vui lòng xác nhận mật khẩu",
      passwordMismatch: "Mật khẩu xác nhận không khớp",
      cannotLoadUsers: "Không thể tải danh sách người dùng",
      paginationText: (range, total) => `${range[0]}-${range[1]} của ${total} tài khoản`,

      fullNameRequired: "Vui lòng nhập họ và tên",
      fullNameMin: "Họ và tên phải có ít nhất 2 ký tự",
      fullNamePlaceholder: "Nhập họ và tên",
      empIdRequired: "Vui lòng nhập mã nhân viên",
      empIdMin: "Mã nhân viên phải có ít nhất 3 ký tự",
      empIdPlaceholder: "Nhập mã nhân viên",
      emailRequired: "Vui lòng nhập email",
      emailInvalid: "Email không hợp lệ",
      emailPlaceholder: "Nhập email",
      phoneRequired: "Vui lòng nhập số điện thoại",
      phoneInvalid: "Số điện thoại không hợp lệ",
      phonePlaceholder: "Nhập số điện thoại",
      statusRequired: "Vui lòng chọn trạng thái",
      statusPlaceholder: "Chọn trạng thái",

      confirmActivate: "Xác nhận kích hoạt",
      confirmDeactivate: "Xác nhận vô hiệu hóa",
      confirmActivateMessage: "Bạn có chắc chắn muốn kích hoạt tài khoản này?",
      confirmDeactivateMessage: "Bạn có chắc chắn muốn vô hiệu hóa tài khoản này?",
      confirm: "Xác nhận",
      cancel: "Hủy",
      activateSuccess: "Đã kích hoạt tài khoản",
      deactivateSuccess: "Đã vô hiệu hóa tài khoản",
      updateStatusError: "Không thể cập nhật trạng thái tài khoản",

      filterByRole: "Lọc theo vai trò",
      allRoles: "Tất cả vai trò",
      admin: "ADMIN",
      user: "USER",

      filterByDate: "Lọc theo ngày tạo",
      startDate: "Từ ngày",
      endDate: "Đến ngày",
      clearFilters: "Xóa bộ lọc",
      allGroups: "Tất cả nhóm"
    },
    zh: {
      pageTitle: "账户",
      totalAccounts: "总账户数",
      activeAccounts: "活跃账户",
      inactiveAccounts: "未激活账户",
      searchPlaceholder: "按姓名、邮箱、员工编号搜索...",
      all: "全部",
      allStatus: "所有状态",
      active: "活跃",
      inactive: "未激活",
      addUser: "新增",
      empId: "员工编号",
      fullName: "姓名",
      email: "邮箱",
      phone: "电话号码",
      createdAt: "创建日期",
      role: "角色",
      group: "组",
      status: "状态",
      actions: "操作",
      view: "查看",
      detailsTitle: "账户详情",
      edit: "编辑",
      changePassword: "修改密码",
      disable: "禁用",
      enable: "启用",
      editUser: "编辑用户",
      addNewUser: "添加新用户",
      save: "保存",
      cancel: "取消",
      newPassword: "新密码",
      confirmPassword: "确认密码",
      changePasswordTitle: "修改密码",
      newPasswordPlaceholder: "请输入新密码",
      confirmPasswordPlaceholder: "请再次输入新密码",
      newPasswordRequired: "请输入新密码",
      passwordMinLength: "密码至少需要6个字符",
      confirmPasswordRequired: "请确认密码",
      passwordMismatch: "确认密码不匹配",
      cannotLoadUsers: "无法加载用户列表",
      paginationText: (range, total) => `${range[0]}-${range[1]} 共 ${total} 个账户`,

      fullNameRequired: "请输入姓名",
      fullNameMin: "姓名至少需要2个字符",
      fullNamePlaceholder: "请输入姓名",
      empIdRequired: "请输入员工编号",
      empIdMin: "员工编号至少需要3个字符",
      empIdPlaceholder: "请输入员工编号",
      emailRequired: "请输入邮箱",
      emailInvalid: "邮箱格式无效",
      emailPlaceholder: "请输入邮箱",
      phoneRequired: "请输入电话号码",
      phoneInvalid: "电话号码格式无效",
      phonePlaceholder: "请输入电话号码",
      statusRequired: "请选择状态",
      statusPlaceholder: "选择状态",

      confirmActivate: "确认激活",
      confirmDeactivate: "确认禁用",
      confirmActivateMessage: "您确定要激活此账户吗？",
      confirmDeactivateMessage: "您确定要禁用此账户吗？",
      confirm: "确认",
      cancel: "取消",
      activateSuccess: "已激活账户",
      deactivateSuccess: "已禁用账户",
      updateStatusError: "无法更新账户状态",

      filterByRole: "按角色筛选",
      allRoles: "所有角色",
      admin: "ADMIN",
      user: "USER",

      filterByDate: "按创建日期筛选",
      startDate: "开始日期",
      endDate: "结束日期",
      clearFilters: "清除筛选",
      allGroups: "所有组"
    }
  };
  const t = labels[lang];
  

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();
  const [selectedUser, setSelectedUser] = useState(null);
  

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);


  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [viewUser, setViewUser] = useState(null);


  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchRoles();
  }, []);

  // Refetch users when server-side group filter changes
  useEffect(() => {
    if (serverGroupId !== undefined) {
      fetchUsers();
    }
  }, [serverGroupId]);


  // Remove query param when navigating away
  const handleViewModalClose = () => {
    setIsViewModalVisible(false);
    setViewUser(null);
    // Remove userId from URL when closing modal
    if (searchParams.get('userId')) {
      setSearchParams({});
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (serverGroupId != null) params.groupId = Number(serverGroupId);
      const response = await axios.get("/api/users", { params });
      const usersData = response.data || [];
      setUsers(usersData);
      

      const total = usersData.length;
      const active = usersData.filter(user => user.status === "ACTIVE").length;
      const inactive = usersData.filter(user => user.status === "INACTIVE").length;
      
      setStats({ total, active, inactive });
    } catch (error) {
      notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: t.cannotLoadUsers, placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get("/api/groups");
      setAllGroups(res.data || []);
    } catch (e) {

    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/api/roles");
      setAllRoles(res.data || []);
    } catch (e) {
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();

    fetchGroups();
    fetchRoles();
    setIsModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      manv: user.manv,
      phone: user.phone,
      status: user.status,
      groups: user.groups?.map(g => g.id) || [],
      roleId: user.roles && user.roles.length > 0 ? user.roles[0].id : undefined,
    });
    setIsModalVisible(true);
  };


  const handleToggleStatus = (user) => {
    setUserToToggle(user);
    setIsConfirmModalVisible(true);
  };

  const handleConfirmToggle = async () => {
    if (!userToToggle) return;
    
    try {
      const newStatus = userToToggle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await axios.put(`/api/users/${userToToggle.userID}`, {
        ...userToToggle,
        status: newStatus,
      });
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: newStatus === "ACTIVE" ? t.activateSuccess : t.deactivateSuccess,
        placement: 'bottomRight'
      });
      fetchUsers();
      setIsConfirmModalVisible(false);
      setUserToToggle(null);
    } catch (error) {

      if (error.response && error.response.data && error.response.data.error) {
        const errorData = error.response.data;

        if (errorData.error === "DUPLICATE_MANV") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Mã nhân viên "${errorData.duplicateValue}" đã tồn tại. Vui lòng chọn mã khác.`, placement: 'bottomRight' });
        } else if (errorData.error === "DUPLICATE_EMAIL") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Email "${errorData.duplicateValue}" đã tồn tại. Vui lòng chọn email khác.`, placement: 'bottomRight' });
        } else {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: errorData.error || t.updateStatusError, placement: 'bottomRight' });
        }
      } else {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: t.updateStatusError, placement: 'bottomRight' });
      }
    }
  };

  const handleCancelToggle = () => {
    setIsConfirmModalVisible(false);
    setUserToToggle(null);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {

        const { groups: selectedGroupIds = [], roleId, ...rest } = values;
        const payloadUpdate = { 
          ...editingUser, 
          ...rest,
          groups: (selectedGroupIds || []).map(id => ({ id }))
        };


        await axios.put(`/api/users/${editingUser.userID}`, payloadUpdate);


        if (roleId) {
          await axios.post(`/api/users/${editingUser.userID}/roles`, [{ id: roleId }]);
        } else {

          await axios.post(`/api/users/${editingUser.userID}/roles`, []);
        }

        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: "Cập nhật người dùng thành công",
          placement: 'bottomRight'
        });
      } else {

        const { groups = [], roleId, ...basic } = values;
        const payloadCreate = {
          ...basic,
          ...(Array.isArray(groups) && groups.length > 0
            ? { groups: groups.map(id => ({ id })) }
            : {}),
        };

        const response = await axios.post("/api/users", payloadCreate);
        const newUser = response.data;
        if (roleId) {
          await axios.post(`/api/users/${newUser.userID}/roles`, [{ id: roleId }]);
        }
        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: "Tạo người dùng thành công",
          placement: 'bottomRight'
        });
      }
      
      setIsModalVisible(false);
      fetchUsers();
    } catch (error) {

      if (error.response && error.response.data && error.response.data.error) {
        const errorData = error.response.data;

        if (errorData.error === "DUPLICATE_MANV") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Mã nhân viên "${errorData.duplicateValue}" đã tồn tại. Vui lòng chọn mã khác.`, placement: 'bottomRight' });
        } else if (errorData.error === "DUPLICATE_EMAIL") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Email "${errorData.duplicateValue}" đã tồn tại. Vui lòng chọn email khác.`, placement: 'bottomRight' });
        } else {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: errorData.error || "Không thể lưu thông tin người dùng", placement: 'bottomRight' });
        }
      } else {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: "Không thể lưu thông tin người dùng", placement: 'bottomRight' });
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };


  const handleChangePassword = (user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setIsPasswordModalVisible(true);
  };

  const handlePasswordModalOk = async () => {
    try {
      const values = await passwordForm.validateFields();
      
      const response = await axios.put(`/api/users/${selectedUser.userID}/password/reset`, {
        newPassword: values.newPassword
      });
      
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: "Đổi mật khẩu thành công",
        placement: 'bottomRight'
      });
      setIsPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      if (error.response && error.response.data) {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: error.response.data || "Không thể đổi mật khẩu", placement: 'bottomRight' });
      } else {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: "Không thể đổi mật khẩu", placement: 'bottomRight' });
      }
    }
  };

  const handlePasswordModalCancel = () => {
    setIsPasswordModalVisible(false);
    passwordForm.resetFields();
  };


  const handleViewUser = (user) => {
    setViewUser(user);
    setIsViewModalVisible(true);
  };


  // Check if showing specific user from URL
  const userId = searchParams.get('userId');
  const filteredUsers = userId ? 
    users.filter(user => user.userID === parseInt(userId)) :
    users.filter(user => {
      const matchesSearch = 
        user.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.manv?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;
      
      const matchesRole = filterRole === "all" || 
        (user.roles && user.roles.some(role => role.name === filterRole));
      
      return matchesSearch && matchesStatus && matchesRole;
    });

  const columns = [
    {
      title: <div style={{ textAlign: 'center' }}>STT</div>,
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => ((pagination.current - 1) * pagination.pageSize) + index + 1,
    },
    {
      title: t.empId,
      dataIndex: "manv",
      key: "manv",
      width: 140,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: t.fullName,
      dataIndex: "fullName",
      key: "fullName",
      width: 300,
      render: (text) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: t.createdAt,
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date) => new Date(date).toLocaleDateString(lang === 'vi' ? "vi-VN" : "zh-CN"),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t.role}</div>,
      dataIndex: "roles",
      key: "roles",
      width: 160,
      align: 'center',
      render: (roles) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {(roles || []).map(r => r.name).join(', ')}
        </span>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t.group}</div>,
      dataIndex: "groups",
      key: "groups",
      width: 200,
      align: 'center',
      render: (groups) => (
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}>
          {(groups || []).map(g => g.name).join(', ')}
        </div>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t.status}</div>,
      dataIndex: "status",
      key: "status",
      width: 160,
      align: 'center',
      render: (status) => (
        <Badge
          status={status === "ACTIVE" ? "success" : "error"}
          text={
            <Tag color={status === "ACTIVE" ? "green" : "red"}>
              {status === "ACTIVE" ? t.active : t.inactive}
            </Tag>
          }
        />
      ),
    },
    {
      title: t.actions,
      key: "actions",
      fixed: "right",
      width: 140,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button 
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewUser(record)}
            title={t.view}
          />
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditUser(record)}
            title={t.edit}
          />
          <Button 
            icon={<LockOutlined />} 
            size="small" 
            onClick={() => handleChangePassword(record)}
            title={t.changePassword}
          />
          <Button 
            icon={record.status === "ACTIVE" ? <StopOutlined /> : <CheckCircleOutlined />}
            size="small" 
            onClick={() => handleToggleStatus(record)}
            title={record.status === "ACTIVE" ? t.disable : t.enable}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      {}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e6f7ff',
            color: '#1890ff',
            borderRadius: 8
          }}>
            <TeamOutlined />
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t.pageTitle}</h2>
        </div>
      </div>

      {}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        <Col span={8}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px',
            color: '#333333',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(24, 144, 255, 0.05)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(24, 144, 255, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666666', marginBottom: '4px' }}>{t.totalAccounts}</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1, color: '#1890ff' }}>{stats.total}</div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px',
            color: '#333333',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(82, 196, 26, 0.05)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(82, 196, 26, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666666', marginBottom: '4px' }}>{t.activeAccounts}</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1, color: '#52c41a' }}>{stats.active}</div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px',
            color: '#333333',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 77, 79, 0.05)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 77, 79, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <StopOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666666', marginBottom: '4px' }}>{t.inactiveAccounts}</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1, color: '#ff4d4f' }}>{stats.inactive}</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {}
      <div style={{ 
        marginBottom: 16, 
        padding: '16px 20px', 
        background: '#ffffff', 
        border: '1px solid #e8e8e8', 
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          {}
          <Input
            placeholder={t.searchPlaceholder}
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ 
              width: 250,
              height: 40,
              borderRadius: 6,
              border: '1px solid #d9d9d9'
            }}
            allowClear
          />
          
          {}
          <Select
            placeholder={t.filterByRole}
            value={filterRole}
            onChange={setFilterRole}
            style={{ width: 140, height: 40 }}
            allowClear
          >
            <Option value="all">{t.allRoles}</Option>
            {allRoles.map(role => (
              <Option key={role.id} value={role.name}>{role.name}</Option>
            ))}
          </Select>
          
          {}
          <Select
            value={filterStatus === "all" ? t.allStatus : filterStatus === "ACTIVE" ? t.active : t.inactive}
            onChange={(value) => setFilterStatus(value === t.allStatus ? "all" : value)}
            style={{ 
              width: 150,
              height: 40
            }}
          >
            <Option value={t.allStatus}>{t.allStatus}</Option>
            <Option value="ACTIVE">{t.active}</Option>
            <Option value="INACTIVE">{t.inactive}</Option>
          </Select>

          {}
          <Select
            placeholder={lang === 'vi' ? 'Lọc theo nhóm' : '按组筛选'}
            value={serverGroupId ?? 'all'}
            onChange={(value) => setServerGroupId(value === 'all' ? null : value)}
            style={{ width: 180, height: 40 }}
          >
            <Option value="all">{t.allGroups}</Option>
            {allGroups.map(g => (
              <Option key={g.id} value={g.id}>{g.name}</Option>
            ))}
          </Select>
          
          {}
          <Button 
            onClick={() => {
              setSearchText("");
              setFilterStatus("all");
              setFilterRole("all");
              setServerGroupId(null);
            }}
            style={{ height: 40 }}
          >
            {t.clearFilters}
          </Button>
        </div>
        
        {}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddUser}
          style={{
            height: 40,
            borderRadius: 6,
            fontWeight: 500,
            paddingLeft: 16,
            paddingRight: 16
          }}
        >
          {t.addUser}
        </Button>
      </div>

      {}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="userID"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            t.paginationText(range, total),
        }}
        onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
      />

      {}
      <Modal
        title={editingUser ? t.editUser : t.addNewUser}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t.save}
        cancelText={t.cancel}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "INACTIVE" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label={t.fullName}
                rules={[
                  { required: true, message: t.fullNameRequired },
                  { min: 2, message: t.fullNameMin },
                ]}
              >
                <Input placeholder={t.fullNamePlaceholder} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="manv"
                label={t.empId}
                rules={[
                  { required: true, message: t.empIdRequired },
                  { min: 3, message: t.empIdMin },
                ]}
              >
                <Input placeholder={t.empIdPlaceholder} />
              </Form.Item>
            </Col>
          </Row>

          { !editingUser && (
            <Form.Item
              name="passwordHash"
              label={t.newPassword}
              rules={[
                { required: true, message: t.newPasswordRequired },
                { min: 6, message: t.passwordMinLength },
              ]}
            >
              <Input.Password placeholder={t.newPasswordPlaceholder} />
            </Form.Item>
          )}

          <Form.Item
            name="email"
            label={t.email}
            rules={[
              { required: true, message: t.emailRequired },
              { type: "email", message: t.emailInvalid },
            ]}
          >
            <Input placeholder={t.emailPlaceholder} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={t.phone}
            rules={[
              { required: true, message: t.phoneRequired },
              { min: 5, max: 20, message: t.phoneInvalid },
            ]}
          >
            <Input placeholder={t.phonePlaceholder} />
          </Form.Item>

          <Form.Item
            name="status"
            label={t.status}
            rules={[{ required: true, message: t.statusRequired }]}
          >
            <Select placeholder={t.statusPlaceholder}>
              <Option value="ACTIVE">{t.active}</Option>
              <Option value="INACTIVE">{t.inactive}</Option>
            </Select>
          </Form.Item>

          <Form.Item name="groups" label={t.group}>
            <Select mode="multiple" placeholder={lang === 'vi' ? 'Chọn nhóm' : '选择组'} allowClear>
              {allGroups.map(g => (
                <Option key={g.id} value={g.id}>{g.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="roleId" 
            label={t.role}
            rules={[
              { required: true, message: lang === 'vi' ? 'Vui lòng chọn vai trò' : '请选择角色' }
            ]}
          >
            <Select placeholder={t.filterByRole} allowClear>
              {allRoles.map(r => (
                <Option key={r.id} value={r.id}>{r.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {}
      <Modal
        title={t.detailsTitle}
        open={isViewModalVisible}
        onCancel={handleViewModalClose}
        footer={[
          <Button key="close" onClick={handleViewModalClose}>{t.cancel}</Button>
        ]}
        width={500}
      >
        {viewUser && (
          <div style={{ lineHeight: 1.8 }}>
            <p><strong>{t.fullName}:</strong> {viewUser.fullName}</p>
            <p><strong>{t.empId}:</strong> {viewUser.manv}</p>
            <p><strong>{t.email}:</strong> {viewUser.email}</p>
            <p><strong>{t.phone}:</strong> {viewUser.phone}</p>
            <p><strong>{t.createdAt}:</strong> {new Date(viewUser.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'zh-CN')}</p>
            <p><strong>{t.role}:</strong> {viewUser.roles?.map(r => r.name).join(', ')}</p>
            <p><strong>{t.group}:</strong> {viewUser.groups?.map(g => g.name).join(', ') || 'N/A'}</p>
            <p><strong>{t.status}:</strong> {viewUser.status === 'ACTIVE' ? t.active : t.inactive}</p>
          </div>
        )}
      </Modal>

      {}
      <Modal
        title={`${t.changePasswordTitle} - ${selectedUser?.fullName || ''}`}
        open={isPasswordModalVisible}
        onOk={handlePasswordModalOk}
        onCancel={handlePasswordModalCancel}
        width={400}
        okText={t.changePasswordTitle}
        cancelText={t.cancel}
      >
        <Form
          form={passwordForm}
          layout="vertical"
        >
          <Form.Item
            name="newPassword"
            label={t.newPassword}
            rules={[
              { required: true, message: t.newPasswordRequired },
              { min: 6, message: t.passwordMinLength },
            ]}
          >
            <Input.Password placeholder={t.newPasswordPlaceholder} />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label={t.confirmPassword}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t.confirmPasswordRequired },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t.passwordMismatch));
                },
              }),
            ]}
          >
            <Input.Password placeholder={t.confirmPasswordPlaceholder} />
</Form.Item>
        </Form>
      </Modal>

      {}
      <Modal
        title={userToToggle?.status === "ACTIVE" ? t.confirmDeactivate : t.confirmActivate}
        open={isConfirmModalVisible}
        onOk={handleConfirmToggle}
        onCancel={handleCancelToggle}
        okText={t.confirm}
        cancelText={t.cancel}
        width={400}
      >
        <p>{userToToggle?.status === "ACTIVE" ? t.confirmDeactivateMessage : t.confirmActivateMessage}</p>
        {userToToggle && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
            <p style={{ margin: 0, fontWeight: 500 }}>{t.fullName}: {userToToggle.fullName}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.empId}: {userToToggle.manv}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.email}: {userToToggle.email}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.phone}: {userToToggle.phone || 'N/A'}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.createdAt}: {userToToggle.createdAt ? new Date(userToToggle.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'zh-CN') : 'N/A'}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.role}: {userToToggle.roles?.map(role => role.name).join(', ') || 'N/A'}</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.group}: {userToToggle.groups?.map(group => group.name).join(', ') || 'N/A'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AccountPage;

