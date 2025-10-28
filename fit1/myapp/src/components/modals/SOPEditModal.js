import React, { useEffect } from "react";
import { Modal, Form, Input, Select, message, notification } from "antd";
import { useSelector } from "react-redux";
import { useMenuRefresh } from "../../contexts/MenuRefreshContext";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";

export default function SOPEditModal({ open, record, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const { nguoiDung } = useSelector(state => state.user);
  const { triggerMenuRefresh } = useMenuRefresh();
  const { lang } = useLanguage();

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        name: record.name,
      });
    } else {
      form.resetFields();
    }
  }, [record]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await axios.patch(`/api/sops/${encodeURIComponent(String(record.id))}`, {
        name: values.name,
        lastEditedBy: nguoiDung?.userID
      });

      notification.success({
        message: lang === 'zh' ? '系统' : 'Hệ thống',
        description: lang === 'zh' ? "更新文档成功" : "Cập nhật tài liệu thành công",
        placement: 'bottomRight'
      });
      onSaved?.();
      triggerMenuRefresh();
      onCancel?.();
    } catch (e) {
      const errorData = e?.response?.data;
      if (errorData?.error === "DUPLICATE_NAME") {
        message.error({
          content: lang === 'zh'
            ? `已存在 "${errorData.duplicateName}"，请使用其他名称。`
            : `Đã tồn tại "${errorData.duplicateName}". Vui lòng chọn tên khác.`,
          placement: 'bottomRight'
        });
      } else {
        message.error({
          content: errorData?.error || (lang === 'zh' ? "更新文档失败" : "Cập nhật tài liệu thất bại"),
          placement: 'bottomRight'
        });
      }
    }
  };

  const labels = {
    vi: {
      title: "Sửa tài liệu",
      nameLabel: "Tên tài liệu",
      namePlaceholder: "Nhập tên tài liệu...",
      nameRequired: "Vui lòng nhập tên tài liệu",
      okText: "Lưu",
      cancelText: "Hủy",
    },
    zh: {
      title: "编辑文档",
      nameLabel: "文档名称",
      namePlaceholder: "输入文档名称...",
      nameRequired: "请输入文档名称",
      okText: "保存",
      cancelText: "取消",
    }
  };
  const t = labels[lang];

  return (
    <Modal
      title={t.title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={t.okText}
      cancelText={t.cancelText}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label={t.nameLabel} rules={[{ required: true, message: t.nameRequired }]}>
          <Input 
            placeholder={t.namePlaceholder} 
            onPressEnter={(e) => {
              e.preventDefault();
              handleOk();
            }} 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}



