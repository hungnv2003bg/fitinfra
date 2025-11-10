import React, { useState } from "react";
import { Modal, Form, Input, notification } from "antd";
import { useSelector } from "react-redux";
import { useMenuRefresh } from "../../contexts/MenuRefreshContext";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";

export default function SOPModal({ open, onCancel, onAdded }) {
  const { nguoiDung } = useSelector(state => state.user);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const { triggerMenuRefresh } = useMenuRefresh();
  const { lang } = useLanguage();

  const openNotification = (type, title, desc) =>
    api[type]({ message: title, description: desc, placement: "bottomRight" });

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);

      const currentUserId = nguoiDung?.userID || 1;

      const sopPayload = {
        name: values.name,
        createdBy: currentUserId
      };

      try {
        const sopResponse = await axios.post("/api/sops", sopPayload);
        const createdSOP = sopResponse.data;
        openNotification("success", lang === 'zh' ? "系统" : "Hệ thống", lang === 'zh' ? "新增文档成功" : "Thêm tài liệu thành công");
        form.resetFields();
        onAdded();
        triggerMenuRefresh();
        onCancel();
      } catch (e) {
        const errorData = e?.response?.data || {};
        if (errorData.error === "DUPLICATE_NAME") {
          openNotification("error", lang === 'zh' ? "错误" : "Lỗi", lang === 'zh' ? `已存在 "${errorData.duplicateName}"，请使用其他名称。` : `Đã tồn tại "${errorData.duplicateName}". Vui lòng chọn tên khác.`);
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || "Failed to create SOP");
      }
      
    } catch (err) {
      openNotification("error", lang === 'zh' ? "系统" : "Hệ thống", lang === 'zh' ? "新增文档失败" : "Thêm tài liệu thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={lang === 'zh' ? '新增文档' : 'Thêm tài liệu'}
        open={open}
        onCancel={onCancel}
        okButtonProps={{ loading: isLoading, htmlType: 'submit', form: 'sopCreateForm' }}
        width={500}
        okText={lang === 'zh' ? '新增文档' : 'Thêm tài liệu'}
        cancelText={lang === 'zh' ? '取消' : 'Hủy'}
      >
        <Form id="sopCreateForm" form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item
            name="name"
            label={lang === 'zh' ? '文档名称' : 'Tên tài liệu'}
            rules={[{ required: true, message: lang === 'zh' ? '请输入文档名称' : 'Vui lòng nhập tên tài liệu' }]}
          >
            <Input
              placeholder={lang === 'zh' ? '输入文档名称...' : 'Nhập tên tài liệu...'}
              onPressEnter={(e) => {
                e.preventDefault();
                form.submit();
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

