import { Button, Card, Divider, Input, Modal, Select, notification } from "antd";
import "./style.css";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useLoginStore } from "./useLoginStore";
import userSlice from "../../redux/userSlice";
import Register from "./Register";
import { useLanguage } from "../../contexts/LanguageContext";

function Login() {
    const dispatch = useDispatch();
    const { lang, setLang } = useLanguage();
    const [typeError, setTypeError] = useState(undefined);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [loginPayload, setLoginPayload] = useState({
        manv: "",
        password: "",
    });

    async function handleLogin() {
        try {
            const login = await useLoginStore.actions.dangNhap(loginPayload);
            setLoginPayload({
                manv: "",
                password: "",
            });
            
            if (!login || !login.data) {
                localStorage.removeItem("user");
                setTypeError(true);
                return;
            }
            
            localStorage.setItem("user", JSON.stringify(login.data.nguoiDung));
            localStorage.setItem("quyenList", JSON.stringify(login.data.quyenList));
            localStorage.setItem("refreshToken", login.data.refreshToken || "");
            dispatch(userSlice.actions.dangNhap({
                token: login.data.token,
                quyenList: login.data.quyenList,
                nguoiDung: login.data.nguoiDung
            }));
            window.location.href = process.env.REACT_APP_FRONTEND_URL || "/";
        } catch (error) {
            if (error && error.response) {
                const data = error.response.data;
                const messageText = typeof data === 'string'
                    ? data
                    : (data && (data.message || data.error || ''));

                const text = (messageText || '').toString().toLowerCase();

                // Detect inactive account in both VI and ZH messages
                const isInactive =
                    text.includes('chưa kích hoạt') ||
                    text.includes('chưa được kích hoạt') ||
                    text.includes('未激活') ||
                    text.includes('尚未激活') ||
                    text.includes('inactive');

                if (isInactive) {
                    setTypeError('inactive');
                } else if (
                    text.includes('không tồn tại') ||
                    text.includes('không đúng') ||
                    text.includes('不存在') ||
                    text.includes('不正确')
                ) {
                    setTypeError('invalid');
                } else {
                    // Fallback: treat unknown errors as invalid credentials on UI
                    setTypeError('invalid');
                }
            } else {
                setTypeError('invalid');
            }
        }
    }

    function handleUpdateManv(e) {
        setLoginPayload({
            password: loginPayload.password,
            manv: e.target.value,
        });
    }

    function handleUpdatePassword(e) {
        setLoginPayload({
            password: e.target.value,
            manv: loginPayload.manv,
        });
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (loginPayload.manv.trim() && loginPayload.password.trim()) {
                handleLogin();
            }
        }
    };

    const handleRegisterSuccess = () => {
        setShowRegisterModal(false);
    };

    const handleForgotPassword = () => {
        api.info({
            message: lang === 'vi' ? 'Thông báo' : '通知',
            description: lang === 'vi' ? 'Vui lòng liên hệ admin để lấy lại mật khẩu' : '请联系管理员获取密码重置帮助',
            duration: 4.5,
        });
    };

    const labels = {
        vi: {
            title: "🚀 Hệ thống quản lý IT",
            subtitle: "Đăng nhập để truy cập hệ thống",
            empId: "Mã nhân viên",
            empIdPlaceholder: "Nhập mã nhân viên",
            password: "Mật khẩu",
            passwordPlaceholder: "Nhập mật khẩu",
            forgot: "Quên mật khẩu?",
            inactive: "Tài khoản chưa được kích hoạt",
            contactAdmin: "Liên hệ admin để được hỗ trợ",
            invalid: "Mã nhân viên hoặc mật khẩu không đúng",
            retry: "Vui lòng thử lại",
            login: "Đăng nhập",
            noAccountPrefix: "Chưa có tài khoản? ",
            registerNow: "Đăng ký ngay",
            modalTitle: "Đăng ký tài khoản",
            vi: "tiếng việt",
            zh: "中文"
        },
        zh: {
            title: "🚀 IT 管理系统",
            subtitle: "登录以访问系统",
            empId: "员工编号",
            empIdPlaceholder: "输入员工编号",
            password: "密码",
            passwordPlaceholder: "输入密码",
            forgot: "忘记密码？",
            inactive: "账户尚未激活",
            contactAdmin: "请联系管理员获取支持",
            invalid: "账号或密码不正确",
            retry: "请重试",
            login: "登录",
            noAccountPrefix: "还没有账号？",
            registerNow: "立即注册",
            modalTitle: "注册账号",
            vi: "越南语",
            zh: "中文"
        }
    };
    const t = labels[lang];

    return (
        <>
            {contextHolder}
            <div className="login-container">
                <div className="login-banner">
                    <div className="login-pannel">
                        <img src="/login4.png" alt="Login Banner" />
                    </div>
                </div>
                <div className="login-option">
                    <div className="login-option-site">
                        <div className="login-option-header">
                            <img src="/logo-noname.png" alt="Logo" />
                            <h3>{t.title}</h3>
                            <p>{t.subtitle}</p>
                            <label htmlFor="">{t.empId}</label>
                            <Input
                                onChange={handleUpdateManv}
                                onKeyPress={handleKeyPress}
                                size="large"
                                placeholder={t.empIdPlaceholder}
                                className="input"
                                value={loginPayload.manv}
                            />
                            <label htmlFor="">{t.password}</label>
                            <Input.Password
                                onChange={handleUpdatePassword}
                                onKeyPress={handleKeyPress}
                                value={loginPayload.password}
                                size="large"
                                placeholder={t.passwordPlaceholder}
                                className="input"
                            />
                            <Link onClick={handleForgotPassword}>{t.forgot}</Link>
                            {typeError ? (
                                <Card
                                    style={{
                                        width: "100%",
                                        marginBottom: 12,
                                        marginTop: 12,
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    {typeError === "inactive" ? (
                                        <>
                                            <p className="wrong">{t.inactive}</p>
                                            <p className="wait">{t.contactAdmin}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="wrong">{t.invalid}</p>
                                            <p className="wait">{t.retry}</p>
                                        </>
                                    )}
                                </Card>
                            ) : (
                                ""
                            )}

                            <Button 
                                size="large" 
                                onClick={handleLogin}
                                disabled={!loginPayload.manv.trim() || !loginPayload.password.trim()}
                            >
                                {t.login}
                            </Button>
                           
                            
                            <div style={{ textAlign: "center", marginTop: "16px" }}>
                                <span style={{ color: "#666" }}>{t.noAccountPrefix}</span>
                                <Button type="link" onClick={() => setShowRegisterModal(true)} style={{ padding: 0 }}>
                                    {t.registerNow}
                                </Button>
                            </div>

                            {}
                            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                                <Select 
                                    size="small"
                                    value={lang}
                                    onChange={(v) => setLang(v)}
                                    style={{ width: 180 }}
                                    options={[
                                        { value: "vi", label: "Tiếng Việt" },
                                        { value: "zh", label: "中文" }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {}
            <Modal
                title={t.modalTitle}
                open={showRegisterModal}
                onCancel={() => setShowRegisterModal(false)}
                footer={null}
                width={600}
                centered
            >
                <Register onSuccess={handleRegisterSuccess} />
            </Modal>
        </>
    );
}

export default Login;

