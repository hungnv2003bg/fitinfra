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
    const [formMailChecklistDone] = Form.useForm();
    const [formMailSignup] = Form.useForm();
    const [formMailImprovementDone] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [currentLimit, setCurrentLimit] = useState(null);
    const [limitId, setLimitId] = useState(null);
    const mailLoadedRef = useRef(false);
    const mailChecklistLoadedRef = useRef(false);
    const mailSignupLoadedRef = useRef(false);
    const mailImprovementLoadedRef = useRef(false);

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
        mailChecklistLoadedRef.current = false;
        mailSignupLoadedRef.current = false;
        setSelectedSettingKey('file');
        setIsSettingsModalVisible(true);
        await loadCurrentLimit();
    };

    const loadMailRecipients = async () => {
        if (mailLoadedRef.current) return;
        console.log('DEBUG: loadMailRecipients called');
        try {
            const res = await axios.get('/api/mail-recipients/by-event', { params: { eventType: 'SOP' } });
            console.log('DEBUG: SOPs API response:', res.data);
            const list = Array.isArray(res.data) ? res.data : [];
            const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
            const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
            const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
            console.log('DEBUG: SOPs final values - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMail.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailLoadedRef.current = true;
        } catch (e) {
            console.error('Error loading SOPs mail recipients:', e);
            const mailTo = localStorage.getItem('mailTo') || '';
            const mailCc = localStorage.getItem('mailCc') || '';
            const mailBcc = localStorage.getItem('mailBcc') || '';
            console.log('DEBUG: SOPs fallback values from localStorage - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMail.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailLoadedRef.current = true;
        }
    };

    const loadMailChecklistDetailRecipients = async () => {
        if (mailChecklistLoadedRef.current) return;
        console.log('DEBUG: loadMailChecklistDetailRecipients called');
        try {
            const res = await axios.get('/api/mail-recipients-checklist-detail');
            console.log('DEBUG: Checklist API response:', res.data);
            const list = Array.isArray(res.data) ? res.data : [];
            const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
            const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
            const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
            console.log('DEBUG: Checklist final values - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMailChecklistDone.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailChecklistLoadedRef.current = true;
        } catch (e) {
            console.error('Error loading checklist detail mail recipients:', e);
            const mailTo = localStorage.getItem('mailChecklistTo') || '';
            const mailCc = localStorage.getItem('mailChecklistCc') || '';
            const mailBcc = localStorage.getItem('mailChecklistBcc') || '';
            console.log('DEBUG: Checklist fallback values from localStorage - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMailChecklistDone.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailChecklistLoadedRef.current = true;
        }
    };

    const loadMailSignupRecipients = async () => {
        if (mailSignupLoadedRef.current) return;
        console.log('DEBUG: loadMailSignupRecipients called');
        try {
            const res = await axios.get('/api/mail-recipients-signup');
            console.log('DEBUG: Signup API response:', res.data);
            const list = Array.isArray(res.data) ? res.data : [];
            const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
            const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
            const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
            console.log('DEBUG: Signup final values - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMailSignup.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailSignupLoadedRef.current = true;
        } catch (e) {
            console.error('Error loading signup mail recipients:', e);
            const mailTo = localStorage.getItem('mailSignupTo') || '';
            const mailCc = localStorage.getItem('mailSignupCc') || '';
            const mailBcc = localStorage.getItem('mailSignupBcc') || '';
            console.log('DEBUG: Signup fallback values from localStorage - TO:', mailTo, 'CC:', mailCc, 'BCC:', mailBcc);
            formMailSignup.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailSignupLoadedRef.current = true;
        }
    };

    const loadMailImprovementDoneRecipients = async () => {
        if (mailImprovementLoadedRef.current) return;
        try {
            const res = await axios.get('/api/mail-recipients-improvement-done');
            const list = Array.isArray(res.data) ? res.data : [];
            const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
            const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
            const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
            formMailImprovementDone.setFieldsValue({ mailTo, mailCc, mailBcc });
            mailImprovementLoadedRef.current = true;
        } catch (e) {
            mailImprovementLoadedRef.current = true;
        }
    };

    const handleFileSizeOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            if (limitId) {
             
                await limitSizeService.updateLimitSize(limitId, {
                    settingName: 'FILE_UPLOAD_LIMIT',
                    maxSizeMb: values.maxFileSize,
                    description: 'Giới hạn kích thước file upload',
                    isActive: true,
                    updatedBy: nguoiDung.userID
                });
            } else {
              
                await limitSizeService.createLimitSize({
                    settingName: 'FILE_UPLOAD_LIMIT',
                    maxSizeMb: values.maxFileSize,
                    description: 'Giới hạn kích thước file upload',
                    isActive: true,
                    createdBy: nguoiDung.userID
                });
            }
     
          
            localStorage.setItem('maxFileSizeMB', values.maxFileSize.toString());
            setCurrentLimit(values.maxFileSize);
            
            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
            notification.success({ 
                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                description: successMessage, 
                placement: 'bottomRight' 
            });
        } catch (error) {
            console.error('Error saving file upload limit:', error);
            const errorMessage = error.response?.data?.error || 'Có lỗi xảy ra khi lưu cài đặt!';
            notification.error({ 
                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                description: errorMessage, 
                placement: 'bottomRight' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsCancel = () => {
        setIsSettingsModalVisible(false);
    };

    const hasAdminAccess = () => {
        if (!quyenList || quyenList.length === 0) return false;
        
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
            mailChecklistDone: "Thông báo hoàn thành checklist",
            mailSignup: "Thông báo nhận mail đăng ký",
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
            mailChecklistDone: "事件管理完成邮件通知设置",
            mailSignup: "注册邮件通知设置",
            mailImprovementDone: "改善完成邮件通知设置",
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
                    onOk={selectedSettingKey === 'file' ? handleFileSizeOk : 
                          selectedSettingKey === 'mail' ? async () => {
                        const values = formMail.getFieldsValue();
                        localStorage.setItem('mailTo', values.mailTo || '');
                        localStorage.setItem('mailCc', values.mailCc || '');
                        localStorage.setItem('mailBcc', values.mailBcc || '');
                        try {
                            await axios.post('/api/mail-recipients/replace-by-event', null, {
                                params: {
                                    eventType: 'sop',
                                    to: values.mailTo || '',
                                    cc: values.mailCc || '',
                                    bcc: values.mailBcc || ''
                                }
                            });
                            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
                            notification.success({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: successMessage, 
                                placement: 'bottomRight' 
                            });
                        } catch (e) {
                            const errMsg = lang === 'vi' ? 'Lưu danh sách mail thất bại' : '保存邮件列表失败';
                            notification.error({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: errMsg, 
                                placement: 'bottomRight' 
                            });
                        }
                    } : selectedSettingKey === 'mailChecklistDone' ? async () => {
                        const values = formMailChecklistDone.getFieldsValue();
                        try {
                            await axios.post('/api/mail-recipients-checklist-detail/replace', null, {
                                params: {
                                    to: values.mailTo || '',
                                    cc: values.mailCc || '',
                                    bcc: values.mailBcc || ''
                                }
                            });
                            // Save to localStorage like SOPs
                            localStorage.setItem('mailChecklistTo', values.mailTo || '');
                            localStorage.setItem('mailChecklistCc', values.mailCc || '');
                            localStorage.setItem('mailChecklistBcc', values.mailBcc || '');
                            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
                            notification.success({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: successMessage, 
                                placement: 'bottomRight' 
                            });
                        } catch (e) {
                            const errMsg = e?.response?.data?.error || (lang === 'vi' ? 'Có lỗi xảy ra khi lưu cài đặt!' : '保存设置时出错！');
                            notification.error({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: errMsg, 
                                placement: 'bottomRight' 
                            });
                        }
                    } : selectedSettingKey === 'mailSignup' ? async () => {
                        const values = formMailSignup.getFieldsValue();
                        try {
                            await axios.post('/api/mail-recipients-signup/replace', null, {
                                params: {
                                    to: values.mailTo || '',
                                    cc: values.mailCc || '',
                                    bcc: values.mailBcc || ''
                                }
                            });
                            localStorage.setItem('mailSignupTo', values.mailTo || '');
                            localStorage.setItem('mailSignupCc', values.mailCc || '');
                            localStorage.setItem('mailSignupBcc', values.mailBcc || '');
                            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
                            notification.success({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: successMessage, 
                                placement: 'bottomRight' 
                            });
                        } catch (e) {
                            const errMsg = e?.response?.data?.error || (lang === 'vi' ? 'Có lỗi xảy ra khi lưu cài đặt!' : '保存设置时出错！');
                            notification.error({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: errMsg, 
                                placement: 'bottomRight' 
                            });
                        }
                    } : selectedSettingKey === 'mailImprovementDone' ? async () => {
                        const values = formMailImprovementDone.getFieldsValue();
                        try {
                            await axios.post('/api/mail-recipients-improvement-done/replace', null, {
                                params: {
                                    to: values.mailTo || '',
                                    cc: values.mailCc || '',
                                    bcc: values.mailBcc || ''
                                }
                            });
                            const successMessage = lang === 'vi' ? 'Cài đặt đã được lưu thành công!' : '设置已保存成功！';
                            notification.success({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: successMessage, 
                                placement: 'bottomRight' 
                            });
                        } catch (e) {
                            const errMsg = e?.response?.data?.error || (lang === 'vi' ? 'Có lỗi xảy ra khi lưu cài đặt!' : '保存设置时出错！');
                            notification.error({ 
                                message: lang === 'vi' ? 'Hệ thống' : '系统', 
                                description: errMsg, 
                                placement: 'bottomRight' 
                            });
                        }
                    } : async () => {
                        // Handle other cases - placeholder for now
                        const successMessage = lang === 'vi' ? 'Tính năng đang được phát triển!' : '功能正在开发中！';
                        notification.info({ message: successMessage, placement: 'bottomRight' });
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
                                    marginBottom: 12,
                                    background: selectedSettingKey === 'mail' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {settingsT.mailSetting}
                            </div>
                            <div
                                onClick={async () => { setSelectedSettingKey('mailChecklistDone'); await loadMailChecklistDetailRecipients(); }}
                                style={{
                                    padding: 12,
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    marginBottom: 12,
                                    background: selectedSettingKey === 'mailChecklistDone' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {settingsT.mailChecklistDone}
                            </div>
                            <div
                                onClick={async () => { setSelectedSettingKey('mailImprovementDone'); await loadMailImprovementDoneRecipients(); }}
                                style={{
                                    padding: 12,
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    marginBottom: 12,
                                    background: selectedSettingKey === 'mailImprovementDone' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {lang === 'vi' ? 'Thông báo hoàn thành cải thiện' : settingsT.mailImprovementDone}
                            </div>
                            <div
                                onClick={async () => { setSelectedSettingKey('mailSignup'); await loadMailSignupRecipients(); }}
                                style={{
                                    padding: 12,
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: selectedSettingKey === 'mailSignup' ? '#e6f7ff' : '#fff'
                                }}
                            >
                                {settingsT.mailSignup}
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
                            {selectedSettingKey === 'mailChecklistDone' && (
                                <Form form={formMailChecklistDone} layout="vertical">
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
                            {selectedSettingKey === 'mailSignup' && (
                                <Form form={formMailSignup} layout="vertical">
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
                            {selectedSettingKey === 'mailImprovementDone' && (
                                <Form form={formMailImprovementDone} layout="vertical">
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

