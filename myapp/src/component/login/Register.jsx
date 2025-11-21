import { Button, Input, Form, notification, Select } from "antd";
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useLoginStore } from "./useLoginStore";
import { useLanguage } from "../../contexts/LanguageContext";
import axios from "../../plugins/axios";

const { Option } = Select;


function Register({ onSuccess }) {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const { lang } = useLanguage();
    const [allGroups, setAllGroups] = useState([]);

    const labels = {
        vi: {
            fullName: "Họ và tên",
            fullNamePlaceholder: "Nhập họ và tên đầy đủ",
            fullNameRequired: "Vui lòng nhập họ và tên",
            fullNameMin: "Họ và tên phải có ít nhất 2 ký tự",
            empId: "Mã nhân viên",
            empIdPlaceholder: "Nhập mã nhân viên",
            empIdRequired: "Vui lòng nhập mã nhân viên",
            empIdMin: "Mã nhân viên phải có ít nhất 3 ký tự",
            email: "Email",
            emailPlaceholder: "Nhập email của bạn",
            emailRequired: "Vui lòng nhập email",
            emailInvalid: "Email không hợp lệ",
            phone: "Số điện thoại",
            phonePlaceholder: "Nhập số điện thoại",
            phoneRequired: "Vui lòng nhập số điện thoại",
            phoneInvalid: "Số điện thoại phải có từ 5 đến 20 ký tự",
            password: "Mật khẩu",
            passwordPlaceholder: "Nhập mật khẩu",
            passwordRequired: "Vui lòng nhập mật khẩu",
            passwordMin: "Mật khẩu phải có ít nhất 6 ký tự",
            confirmPassword: "Xác nhận mật khẩu",
            confirmPasswordPlaceholder: "Nhập lại mật khẩu",
            confirmPasswordRequired: "Vui lòng xác nhận mật khẩu",
            register: "Đăng ký",
            authError: "Lỗi xác thực",
            passwordMismatch: "Mật khẩu xác nhận không khớp",
            registerSuccess: "Đăng ký thành công",
            accountCreated: "Tài khoản đã được tạo thành công!",
            registerFailed: "Đăng ký thất bại",
            cannotCreateAccount: "Không thể tạo tài khoản",
            systemError: "Lỗi hệ thống",
            cannotRegister: "Không thể đăng ký. Vui lòng thử lại sau.",
            group: "Nhóm",
            groupPlaceholder: "Chọn nhóm (tuỳ chọn)"
        },
        zh: {
            fullName: "姓名",
            fullNamePlaceholder: "请输入完整姓名",
            fullNameRequired: "请输入姓名",
            fullNameMin: "姓名至少需要2个字符",
            empId: "员工编号",
            empIdPlaceholder: "请输入员工编号",
            empIdRequired: "请输入员工编号",
            empIdMin: "员工编号至少需要3个字符",
            email: "邮箱",
            emailPlaceholder: "请输入您的邮箱",
            emailRequired: "请输入邮箱",
            emailInvalid: "邮箱格式无效",
            phone: "电话号码",
            phonePlaceholder: "请输入电话号码",
            phoneRequired: "请输入电话号码",
            phoneInvalid: "电话号码必须为5到20个字符",
            password: "密码",
            passwordPlaceholder: "请输入密码",
            passwordRequired: "请输入密码",
            passwordMin: "密码至少需要6个字符",
            confirmPassword: "确认密码",
            confirmPasswordPlaceholder: "请再次输入密码",
            confirmPasswordRequired: "请确认密码",
            register: "注册",
            authError: "验证错误",
            passwordMismatch: "确认密码不匹配",
            registerSuccess: "注册成功",
            accountCreated: "账户创建成功！",
            registerFailed: "注册失败",
            cannotCreateAccount: "无法创建账户",
            systemError: "系统错误",
            cannotRegister: "无法注册，请稍后重试。",
            group: "组",
            groupPlaceholder: "选择组（可选）"
        }
    };
    const t = labels[lang];

    const openNotification = (type, title, desc) =>
        api[type]({ message: title, description: desc, placement: "bottomRight" });

    const handleRegister = async () => {
        try {
            const values = await form.validateFields();
            
            if (values.password !== values.confirmPassword) {
                openNotification("error", t.authError, t.passwordMismatch);
                return;
            }
            setIsLoading(true);
        
            const response = await useLoginStore.actions.dangKy({
                fullName: values.fullName,
                email: values.email,
                password: values.password,
                manv: values.manv,
                phone: values.phone,
                groupIds: values.group ? [values.group] : []
            });

            if (response && response.data) {
                const newUser = response.data;
                openNotification("success", lang === 'vi' ? 'Hệ thống' : '系统', t.accountCreated);
                form.resetFields();
                onSuccess();
            } else {
                openNotification("error", t.registerFailed, t.cannotCreateAccount);
            }
        } catch (err) {
            openNotification("error", t.systemError, t.cannotRegister);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await axios.get("/api/groups");
            
            setAllGroups(res.data || []);
        } catch (e) {
           
            setAllGroups([]);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <>
            {contextHolder}
            <Form form={form} layout="vertical" onFinish={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Form.Item
                        name="fullName"
                        label={t.fullName}
                        rules={[
                            { required: true, message: t.fullNameRequired },
                            { min: 2, message: t.fullNameMin }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder={t.fullNamePlaceholder}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="manv"
                        label={t.empId}
                        rules={[
                            { required: true, message: t.empIdRequired },
                            { min: 3, message: t.empIdMin }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder={t.empIdPlaceholder}
                            size="large"
                        />
                    </Form.Item>
                </div>

                <Form.Item
                    name="email"
                    label={t.email}
                    rules={[
                        { required: true, message: t.emailRequired },
                        { type: "email", message: t.emailInvalid }
                    ]}
                >
                    <Input
                        prefix={<MailOutlined />}
                        placeholder={t.emailPlaceholder}
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label={t.phone}
                    rules={[
                        { required: true, message: t.phoneRequired },
                        { min: 5, max: 20, message: t.phoneInvalid }
                    ]}
                >
                    <Input
                        prefix={<PhoneOutlined />}
                        placeholder={t.phonePlaceholder}
                        size="large"
                    />
                </Form.Item>

                <Form.Item name="group" label={t.group}>
                    <Select
                        placeholder={t.groupPlaceholder}
                        allowClear
                        size="large"
                    >
                        {allGroups.map(g => (
                            <Option key={g.id} value={g.id}>{g.name}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Form.Item
                        name="password"
                        label={t.password}
                        rules={[
                            { required: true, message: t.passwordRequired },
                            { min: 6, message: t.passwordMin }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={t.passwordPlaceholder}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label={t.confirmPassword}
                        rules={[
                            { required: true, message: t.confirmPasswordRequired }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={t.confirmPasswordPlaceholder}
                            size="large"
                        />
                    </Form.Item>
                </div>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={isLoading}
                        size="large"
                        block
                        style={{ marginTop: "16px" }}
                    >
                        {t.register}
                    </Button>
                </Form.Item>
            </Form>
        </>
    );
}

export default Register;

