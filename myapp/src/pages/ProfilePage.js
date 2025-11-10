import React, { useState } from "react";
import { Card, Row, Col, Avatar, Button, Divider, Tag, Space, Input, Modal, message, notification, Form } from "antd";
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  CalendarOutlined,
  EditOutlined,
  LogoutOutlined,
  CheckOutlined,
  CloseOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import userSlice from "../redux/userSlice";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nguoiDung } = useSelector(state => state.user);
  const { lang } = useLanguage();
  
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm] = Form.useForm();

  const labels = {
    vi: {
      personalInfo: "Thông tin cá nhân",
      basicInfo: "Thông tin cơ bản",
      systemInfo: "Thông tin hệ thống",
      actions: "Hành động",
      fullName: "Họ và tên",
      email: "Email",
      phone: "Số điện thoại",
      empId: "Mã nhân viên",
      createdAt: "Ngày tạo tài khoản",
      role: "Vai trò",
      changePassword: "Đổi mật khẩu",
      logout: "Đăng xuất",
      notUpdated: "Chưa cập nhật",
      noInfo: "Chưa có thông tin",
      noRole: "Chưa có vai trò",
      enterInfo: "Vui lòng nhập thông tin",
      fullNameMin: "Họ và tên phải có ít nhất 2 ký tự",
      emailInvalid: "Email không hợp lệ",
      phoneInvalid: "Số điện thoại phải có từ 5 đến 20 ký tự",
      enterFullName: "Vui lòng nhập họ và tên",
      enterEmail: "Vui lòng nhập email",
      enterPhone: "Vui lòng nhập số điện thoại",
      enterFullNamePlaceholder: "Nhập họ và tên",
      enterEmailPlaceholder: "Nhập email",
      enterPhonePlaceholder: "Nhập số điện thoại",
      changePasswordTitle: "Đổi mật khẩu",
      currentPassword: "Mật khẩu hiện tại",
      newPassword: "Mật khẩu mới",
      confirmNewPassword: "Xác nhận mật khẩu mới",
      enterCurrentPassword: "Nhập mật khẩu hiện tại",
      enterNewPassword: "Nhập mật khẩu mới",
      enterConfirmPassword: "Nhập lại mật khẩu mới",
      currentPasswordRequired: "Vui lòng nhập mật khẩu hiện tại!",
      newPasswordRequired: "Vui lòng nhập mật khẩu mới!",
      passwordMinLength: "Mật khẩu phải có ít nhất 6 ký tự!",
      confirmPasswordRequired: "Vui lòng xác nhận mật khẩu mới!",
      passwordMismatch: "Mật khẩu xác nhận không khớp!",
      cancel: "Hủy",
      save: "Lưu",
      updateSuccess: "Cập nhật thông tin thành công",
      changePasswordSuccess: "Đổi mật khẩu thành công!"
    },
    zh: {
      personalInfo: "个人信息",
      basicInfo: "基本信息",
      systemInfo: "系统信息",
      actions: "操作",
      fullName: "姓名",
      email: "邮箱",
      phone: "电话号码",
      empId: "员工编号",
      createdAt: "账户创建日期",
      role: "角色",
      changePassword: "修改密码",
      logout: "登出",
      notUpdated: "未更新",
      noInfo: "暂无信息",
      noRole: "暂无角色",
      enterInfo: "请输入信息",
      fullNameMin: "姓名至少需要2个字符",
      emailInvalid: "邮箱格式无效",
      phoneInvalid: "电话号码必须为5到20个字符",
      enterFullName: "请输入姓名",
      enterEmail: "请输入邮箱",
      enterPhone: "请输入电话号码",
      enterFullNamePlaceholder: "输入姓名",
      enterEmailPlaceholder: "输入邮箱",
      enterPhonePlaceholder: "输入电话号码",
      changePasswordTitle: "修改密码",
      currentPassword: "当前密码",
      newPassword: "新密码",
      confirmNewPassword: "确认新密码",
      enterCurrentPassword: "输入当前密码",
      enterNewPassword: "输入新密码",
      enterConfirmPassword: "再次输入新密码",
      currentPasswordRequired: "请输入当前密码！",
      newPasswordRequired: "请输入新密码！",
      passwordMinLength: "密码至少需要6个字符！",
      confirmPasswordRequired: "请确认新密码！",
      passwordMismatch: "确认密码不匹配！",
      cancel: "取消",
      save: "保存",
      updateSuccess: "更新信息成功",
      changePasswordSuccess: "修改密码成功！"
    }
  };
  const t = labels[lang];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    dispatch(userSlice.actions.dangXuat());
    navigate("/");
  };

  const handleEditField = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || "");
    setValidationError("");
  };

  const validateInput = (field, value) => {
    if (field === 'fullName') {
      if (value.trim().length === 0) {
        return t.enterFullName;
      }
      if (value.trim().length < 2) {
        return t.fullNameMin;
      }
    }

    if (field === 'email') {
      if (value.trim().length === 0) {
        return t.enterEmail;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return t.emailInvalid;
      }
    }

    if (field === 'phone') {
      if (value.trim().length === 0) {
        return t.enterPhone;
      }
      if (value.trim().length < 5 || value.trim().length > 20) {
        return t.phoneInvalid;
      }
    }

    return "";
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    
    const error = validateInput(editingField, newValue);
    setValidationError(error);
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (!validationError && editValue.trim()) {
        handleSaveEdit();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleSaveEdit = async () => {

    const error = validateInput(editingField, editValue);
    if (error) {
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: error,
        placement: 'bottomRight'
      });
      return;
    }

    setLoading(true);
    try {

      const updateData = { [editingField]: editValue };
      

      const requestPayload = {
        userID: nguoiDung.userID,
        fullName: editingField === 'fullName' ? editValue : nguoiDung.fullName,
        email: editingField === 'email' ? editValue : nguoiDung.email,
        phone: editingField === 'phone' ? editValue : nguoiDung.phone,
        manv: nguoiDung.manv,
        status: nguoiDung.status || 'ACTIVE'
      };
      
      const response = await axios.put(`/api/users/${nguoiDung.userID}`, requestPayload);

      const updatedUser = response.data || { ...nguoiDung, ...updateData };

      dispatch(userSlice.actions.capNhatProfile(updatedUser));
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.updateSuccess,
        placement: 'bottomRight'
      });
      setEditingField(null);
      setEditValue("");
      
    } catch (error) {
      
      if (error.response && error.response.data && error.response.data.error) {
        const errorData = error.response.data;
        
        if (errorData.error === "DUPLICATE_EMAIL") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Email "${errorData.duplicateValue}" đã được sử dụng. Vui lòng chọn email khác.`, placement: 'bottomRight' });
        } else if (errorData.error === "DUPLICATE_PHONE") {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: `Số điện thoại "${errorData.duplicateValue}" đã được sử dụng. Vui lòng chọn số khác.`, placement: 'bottomRight' });
        } else {
          notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: errorData.error || "Cập nhật thông tin thất bại", placement: 'bottomRight' });
        }
      } else if (error.response && error.response.status === 401) {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", placement: 'bottomRight' });
        handleLogout();
      } else {
        notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: "Cập nhật thông tin thất bại. Vui lòng thử lại.", placement: 'bottomRight' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setValidationError("");
  };

  const handleChangePassword = () => {
    setChangePasswordVisible(true);
    passwordForm.resetFields();
  };

  const handleChangePasswordSubmit = async (values) => {
    setChangePasswordLoading(true);
    try {
      await axios.put(`/api/users/${nguoiDung.userID}/password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.changePasswordSuccess,
        placement: 'bottomRight'
      });
      setChangePasswordVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Đổi mật khẩu thất bại";
      notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: errorMessage, placement: 'bottomRight' });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleChangePasswordCancel = () => {
    setChangePasswordVisible(false);
    passwordForm.resetFields();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {}
      <div style={{ 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
        padding: "32px", 
        borderRadius: "16px", 
        marginBottom: "24px",
        color: "white",
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
        textAlign: "center"
      }}>
        <Avatar 
          size={80} 
          icon={<UserOutlined />} 
          style={{ 
            backgroundColor: "rgba(255,255,255,0.2)", 
            marginBottom: "16px",
            border: "3px solid rgba(255,255,255,0.3)"
          }} 
        />
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '28px', 
          fontWeight: 'bold',
          textShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          {nguoiDung?.fullName || 'Người dùng'}
        </h1>
        <p style={{ 
          margin: 0, 
          fontSize: '16px', 
          opacity: 0.9,
          textShadow: "0 1px 2px rgba(0,0,0,0.1)"
        }}>
          {t.personalInfo}
        </p>
      </div>

      {}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={t.basicInfo} 
            style={{ marginBottom: "24px" }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, color: "#666" }}>
                    <UserOutlined style={{ marginRight: "8px" }} />
                    {t.fullName}
                  </h4>
                  {editingField === 'fullName' ? (
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CheckOutlined />}
                        onClick={handleSaveEdit}
                        loading={loading}
                        disabled={!!validationError || !editValue.trim()}
                        style={{ 
                          color: (validationError || !editValue.trim()) ? "#d9d9d9" : "#52c41a"
                        }}
                      />
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                        style={{ color: "#ff4d4f" }}
                      />
                    </Space>
                  ) : (
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={() => handleEditField('fullName', nguoiDung?.fullName)}
                      style={{ color: "#1890ff" }}
                    />
                  )}
                </div>
                {editingField === 'fullName' ? (
                  <div>
                    <Input 
                      value={editValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder={t.enterFullNamePlaceholder}
                      style={{ 
                        fontSize: "16px",
                        borderColor: validationError ? '#ff4d4f' : undefined
                      }}
                      autoFocus
                    />
                    {validationError && (
                      <div style={{ 
                        color: '#ff4d4f', 
                        fontSize: '12px', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>⚠</span>
                        {validationError}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>
                    {nguoiDung?.fullName || t.notUpdated}
                  </p>
                )}
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, color: "#666" }}>
                    <MailOutlined style={{ marginRight: "8px" }} />
                    {t.email}
                  </h4>
                  {editingField === 'email' ? (
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CheckOutlined />}
                        onClick={handleSaveEdit}
                        loading={loading}
                        disabled={!!validationError || !editValue.trim()}
                        style={{ 
                          color: (validationError || !editValue.trim()) ? "#d9d9d9" : "#52c41a"
                        }}
                      />
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                        style={{ color: "#ff4d4f" }}
                      />
                    </Space>
                  ) : (
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={() => handleEditField('email', nguoiDung?.email)}
                      style={{ color: "#1890ff" }}
                    />
                  )}
                </div>
                {editingField === 'email' ? (
                  <div>
                    <Input 
                      value={editValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder={t.enterEmailPlaceholder}
                      type="email"
                      style={{ 
                        fontSize: "16px",
                        borderColor: validationError ? '#ff4d4f' : undefined
                      }}
                      autoFocus
                    />
                    {validationError && (
                      <div style={{ 
                        color: '#ff4d4f', 
                        fontSize: '12px', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>⚠</span>
                        {validationError}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "16px" }}>
                    {nguoiDung?.email || t.notUpdated}
                  </p>
                )}
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, color: "#666" }}>
                    <PhoneOutlined style={{ marginRight: "8px" }} />
                    {t.phone}
                  </h4>
                  {editingField === 'phone' ? (
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CheckOutlined />}
                        onClick={handleSaveEdit}
                        loading={loading}
                        disabled={!!validationError || !editValue.trim()}
                        style={{ 
                          color: (validationError || !editValue.trim()) ? "#d9d9d9" : "#52c41a"
                        }}
                      />
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                        style={{ color: "#ff4d4f" }}
                      />
                    </Space>
                  ) : (
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={() => handleEditField('phone', nguoiDung?.phone)}
                      style={{ color: "#1890ff" }}
                    />
                  )}
                </div>
                {editingField === 'phone' ? (
                  <div>
                    <Input 
                      value={editValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder={t.enterPhonePlaceholder}
                      style={{ 
                        fontSize: "16px",
                        borderColor: validationError ? '#ff4d4f' : undefined
                      }}
                      autoFocus
                    />
                    {validationError && (
                      <div style={{ 
                        color: '#ff4d4f', 
                        fontSize: '12px', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>⚠</span>
                        {validationError}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "16px" }}>
                    {nguoiDung?.phone || t.notUpdated}
                  </p>
                )}
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div>
                <h4 style={{ margin: "0 0 8px 0", color: "#666" }}>
                  <UserOutlined style={{ marginRight: "8px" }} />
                  {t.empId}
                </h4>
                <p style={{ margin: 0, fontSize: "16px" }}>
                  {nguoiDung?.manv || t.notUpdated}
                </p>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t.systemInfo} style={{ marginBottom: "24px" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", color: "#666" }}>
                  <CalendarOutlined style={{ marginRight: "8px" }} />
                  {t.createdAt}
                </h4>
                <p style={{ margin: 0, fontSize: "16px" }}>
                  {nguoiDung?.createdAt ? 
                    new Date(nguoiDung.createdAt).toLocaleDateString('vi-VN') : 
                    t.noInfo
                  }
                </p>
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div>
                <h4 style={{ margin: "0 0 8px 0", color: "#666" }}>
                  {t.role}
                </h4>
                <div>
                  {nguoiDung?.roles?.map((role, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: "4px" }}>
                      {role.name}
                    </Tag>
                  )) || <Tag color="default">{t.noRole}</Tag>}
                </div>
              </div>
            </Space>
          </Card>

          <Card title={t.actions}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button 
                icon={<LockOutlined />}
                onClick={handleChangePassword}
                block
                size="large"
                type="primary"
              >
                {t.changePasswordTitle}
              </Button>
              <Button 
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                block
                size="large"
              >
                {t.logout}
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined style={{ color: '#1677ff' }} />
            <span>{t.changePasswordTitle}</span>
          </div>
        }
        open={changePasswordVisible}
        onCancel={handleChangePasswordCancel}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePasswordSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="currentPassword"
            label={t.currentPassword}
            rules={[
              { required: true, message: t.currentPasswordRequired }
            ]}
          >
            <Input.Password
              placeholder={t.enterCurrentPassword}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={t.newPassword}
            rules={[
              { required: true, message: t.newPasswordRequired },
              { min: 6, message: t.passwordMinLength }
            ]}
          >
            <Input.Password
              placeholder={t.enterNewPassword}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t.confirmNewPassword}
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
            <Input.Password
              placeholder={t.enterConfirmPassword}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleChangePasswordCancel} size="large">
                {t.cancel}
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={changePasswordLoading}
                size="large"
              >
                Đổi mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

