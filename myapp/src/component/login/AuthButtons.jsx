import React, { useState, useRef } from "react";
import { Button, Dropdown, Avatar, Space, Modal, InputNumber, Form, message, Input, notification, Spin } from "antd";
import axios from "../../plugins/axios";
import { UserOutlined, LogoutOutlined, GlobalOutlined, SettingOutlined, ReloadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import userSlice from "../../redux/userSlice";
import { useLanguage } from "../../contexts/LanguageContext";
import { limitSizeService } from "../../services/limitSizeService";

export default function AuthButtons() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { nguoiDung, token, quyenList } = useSelector(state => state.user);
    const { lang, toggleLanguage } = useLanguage();
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [selectedSettingKey, setSelectedSettingKey] = useState('file');
    const [form] = Form.useForm();
    const [formMail] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [currentLimit, setCurrentLimit] = useState(null);
    const [limitId, setLimitId] = useState(null);
    const mailLoadedRef = useRef(false);

    const handleLogoutClick = () => {
        dispatch(userSlice.actions.dangXuat());
        window.location.href = "/";
    };

    const handleProfile = () => {
        navigate("/profile");
    };

    const loadCurrentLimit = async () => {
        setLoading(true);
        try {
            const response = await limitSizeService.getFileUploadLimit();
            setCurrentLimit(response.maxSizeMb);
            form.setFieldsValue({ maxFileSize: response.maxSizeMb });
            
            // Also try to get the limit ID for updating
            const allLimits = await limitSizeService.getActiveLimitSizes();
            const fileUploadLimit = allLimits.find(limit => limit.settingName === 'FILE_UPLOAD_LIMIT');
            if (fileUploadLimit) {
                setLimitId(fileUploadLimit.id);
            }
        } catch (error) {
            console.error('Error loading file upload limit:', error);
            // Fallback to localStorage
            const fallbackLimit = parseInt(localStorage.getItem("maxFileSizeMB") || "10");
            setCurrentLimit(fallbackLimit);
            form.setFieldsValue({ maxFileSize: fallbackLimit });
            message.warning('Không thể tải cài đặt từ server, sử dụng giá trị local');
        } finally {
            setLoading(false);
        }
    };

    const handleSettings = async () => {
        mailLoadedRef.current = false;
        setSelectedSettingKey('file');
        setIsSettingsModalVisible(true);
        await loadCurrentLimit();
    };

    const loadMailRecipients = async () => {
        if (mailLoadedRef.current) return;
        try {
            const res = await axios.get('/api/mail-recipients');
            const list = Array.isArray(res.data) ? res.data : [];
            const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
            const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
            const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
            formMail.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailLoadedRef.current = true;
        } catch (e) {
            const mailTo = localStorage.getItem('mailTo') || '';
            const mailCc = localStorage.getItem('mailCc') || '';
            const mailBcc = localStorage.getItem('mailBcc') || '';
            formMail.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailLoadedRef.current = true;
        }
    };

    const handleFileSizeOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            if (limitId) {
                // Update existing limit
                await limitSizeService.updateLimitSize(limitId, {
                    settingName: 'FILE_UPLOAD_LIMIT',
                    maxSizeMb: values.maxFileSize,
                    description: 'Giới hạn kích thước file upload',
                    isActive: true,
                    updatedBy: nguoiDung.userID
                });
            } else {
                // Create new limit
                await limitSizeService.createLimitSize({
                    settingName: 'FILE_UPLOAD_LIMIT',
                    maxSizeMb: values.maxFileSize,
                    description: 'Giới hạn kích thước file upload',
                    isActive: true,
                    createdBy: nguoiDung.userID
                });
            }
            
            // Update localStorage as fallback
            localStorage.setItem('maxFileSizeMB', values.maxFileSize.toString());
            setCurrentLimit(values.maxFileSize);
            
            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
            notification.success({ message: successMessage, placement: 'bottomRight' });
        } catch (error) {
            console.error('Error saving file upload limit:', error);
            const errorMessage = error.response?.data?.error || 'Có lỗi xảy ra khi lưu cài đặt!';
            notification.error({ message: errorMessage, placement: 'bottomRight' });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsCancel = () => {
        setIsSettingsModalVisible(false);
    };

    const hasAdminAccess = () => {
        if (!quyenList || quyenList.length === 0) return false;
        // Only Admin can see settings
        return quyenList.some(role => role === "ADMIN" || role === "ROLE_ADMIN");
    };

    const settingsLabels = {
        vi: {
            title: "Cài đặt hệ thống",
            fileSizeLabel: "Giới hạn kích thước file",
            fileSizePlaceholder: "Nhập giới hạn kích thước file (MB)",
            save: "Lưu",
            cancel: "Hủy",
            requiredMessage: "Vui lòng nhập giới hạn kích thước file!",
            sizeRangeMessage: "Giới hạn phải từ 1 đến 1000 MB!",
            mailSetting: "Thông báo nhận mail SOPs",
            mailTo: "Danh sách mail nhận ",
            mailCc: "Danh sách mail cc",
            mailBcc: "Danh sách mail bcc"
        },
        zh: {
            title: "系统设置",
            fileSizeLabel: "文件上传大小限制 (MB)",
            fileSizePlaceholder: "输入文件大小限制 (MB)",
            save: "保存",
            cancel: "取消",
            requiredMessage: "请输入文件大小限制！",
            sizeRangeMessage: "限制必须在1到1000 MB之间！",
            mailSetting: "SOPS 邮件通知设置",
            mailTo: "收件人邮箱（To）",
            mailCc: "抄送邮箱（CC）",
            mailBcc: "密送邮箱（BCC）"
        }
    };

    const settingsT = settingsLabels[lang];

    const menuLabels = {
        vi: {
            profile: "Thông tin cá nhân",
            settings: "Cài đặt",
            logout: "Đăng xuất"
        },
        zh: {
            profile: "个人信息",
            settings: "设置",
            logout: "退出登录"
        }
    };

    const menuT = menuLabels[lang];

    if (token && nguoiDung.userID !== -1) {
        const userMenuItems = [
            {
                key: "profile",
                icon: <UserOutlined />,
                label: menuT.profile,
                onClick: handleProfile,
            },
            ...(hasAdminAccess() ? [{
                key: "settings",
                icon: <SettingOutlined />,
                label: menuT.settings,
                onClick: handleSettings,
            }] : []),
            {
                type: "divider",
            },
            {
                key: "logout",
                icon: <LogoutOutlined />,
                label: menuT.logout,
                onClick: handleLogoutClick,
            },
        ];

        return (
            <Space>
                <Button 
                    type="text" 
                    icon={<GlobalOutlined />}
                    onClick={toggleLanguage}
                    style={{ 
                        color: "#666",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                    }}
                >
                    {lang === 'vi' ? '中文' : 'Tiếng Việt'}
                </Button>
                <Dropdown
                    menu={{ items: userMenuItems }}
                    placement="bottomRight"
                    arrow
                >
                    <Button type="text" style={{ height: "auto", padding: "4px 8px" }}>
                        <Space>
                            <Avatar 
                                size="small" 
                                icon={<UserOutlined />}
                                style={{ backgroundColor: "#1890ff" }}
                            />
                            <span style={{ color: "#000" }}>{nguoiDung.fullName || nguoiDung.manv}</span>
                        </Space>
                    </Button>
                </Dropdown>

                {/* Settings modal with left menu and right content */}
                <Modal
                    title={settingsT.title}
                    open={isSettingsModalVisible}
                    confirmLoading={loading}
                    onOk={selectedSettingKey === 'file' ? handleFileSizeOk : async () => {
                        const values = formMail.getFieldsValue();
                        localStorage.setItem('mailTo', values.mailTo || '');
                        localStorage.setItem('mailCc', values.mailCc || '');
                        localStorage.setItem('mailBcc', values.mailBcc || '');
                        try {
                            await axios.post('/api/mail-recipients/replace', null, {
                                params: {
                                    to: values.mailTo || '',
                                    cc: values.mailCc || '',
                                    bcc: values.mailBcc || ''
                                }
                            });
                            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
                            notification.success({ message: successMessage, placement: 'bottomRight' });
                        } catch (e) {
                            const errMsg = lang === 'vi' ? 'Lưu danh sách mail thất bại' : '保存邮件列表失败';
                            notification.error({ message: errMsg, placement: 'bottomRight' });
                        }
                    }}
                    onCancel={handleSettingsCancel}
                    okText={settingsT.save}
                    cancelText={settingsT.cancel}
                    width={900}
                >
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 280 }}>
                            <div
                                onClick={() => setSelectedSettingKey('file')}
                                style={{
                                    padding: 12,
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    marginBottom: 12,
                                    background: selectedSettingKey === 'file' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {settingsT.fileSizeLabel}
                            </div>
                            <div
                                onClick={async () => { setSelectedSettingKey('mail'); await loadMailRecipients(); }}
                                style={{
                                    padding: 12,
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: selectedSettingKey === 'mail' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {settingsT.mailSetting}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {selectedSettingKey === 'file' && (
                                <Spin spinning={loading}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <span style={{ fontWeight: 'bold' }}>{settingsT.fileSizeLabel}</span>
                                    </div>
                                    <Form form={form} layout="vertical">
                                        <Form.Item
                                            name="maxFileSize"
                                            rules={[
                                                { required: true, message: settingsT.requiredMessage },
                                                { type: 'number', min: 1, max: 1000, message: settingsT.sizeRangeMessage }
                                            ]}
                                        >
                                            <InputNumber
                                                style={{ width: 240 }}
                                                placeholder={settingsT.fileSizePlaceholder}
                                                min={1}
                                                max={1000}
                                                addonAfter="MB"
                                                disabled={loading}
                                            />
                                        </Form.Item>
                                    </Form>
                                </Spin>
                            )}
                            {selectedSettingKey === 'mail' && (
                                <Form form={formMail} layout="vertical">
                                    <Form.Item name="mailTo" label={settingsT.mailTo}>
                                        <Input.TextArea rows={3} placeholder="user1@example.com, user2@example.com" />
                                    </Form.Item>
                                    <Form.Item name="mailCc" label={settingsT.mailCc}>
                                        <Input.TextArea rows={3} placeholder="cc1@example.com, cc2@example.com" />
                                    </Form.Item>
                                    <Form.Item name="mailBcc" label={settingsT.mailBcc}>
                                        <Input.TextArea rows={3} placeholder="bcc1@example.com, bcc2@example.com" />
                                    </Form.Item>
                                </Form>
                            )}
                        </div>
                    </div>
                </Modal>

            </Space>
        );
    }

    return (
        <Space>
            <Button 
                type="text" 
                icon={<GlobalOutlined />}
                onClick={toggleLanguage}
                style={{ 
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                }}
            >
                {lang === 'vi' ? '中文' : 'Tiếng Việt'}
            </Button>
            <Button 
                type="text" 
                icon={<UserOutlined />}
                onClick={() => window.location.href = "/login"}
                style={{ color: "#fff" }}
            >
                Đăng nhập
            </Button>
        </Space>
    );
}

