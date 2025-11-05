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

  const labels = {
    vi: {
      title: "Sửa tài liệu",
      nameLabel: "Tên tài liệu",
      namePlaceholder: "Nhập tên tài liệu...",
      nameRequired: "Vui lòng nhập tên tài liệu",
      okText: "Lưu",
      cancelText: "Hủy",
      system: "Hệ thống",
      updateSuccess: "Cập nhật tài liệu thành công",
      error: "Lỗi",
      duplicateName: (name) => `Đã tồn tại "${name}". Vui lòng chọn tên khác.`,
      updateFailed: "Cập nhật tài liệu thất bại",
    },
    zh: {
      title: "编辑文档",
      nameLabel: "文档名称",
      namePlaceholder: "输入文档名称...",
      nameRequired: "请输入文档名称",
      okText: "保存",
      cancelText: "取消",
      system: "系统",
      updateSuccess: "更新文档成功",
      error: "错误",
      duplicateName: (name) => `已存在 "${name}"，请使用其他名称。`,
      updateFailed: "更新文档失败",
    }
  };
  const t = labels[lang];

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await axios.patch(`/api/sops/${encodeURIComponent(String(record.id))}`, {
        name: values.name,
        lastEditedBy: nguoiDung?.userID
      });

      notification.success({
        message: t.system,
        description: t.updateSuccess,
        placement: 'bottomRight'
      });
      onSaved?.();
      triggerMenuRefresh();
      onCancel?.();
    } catch (e) {
      const errorData = e?.response?.data;
      if (errorData?.error === "DUPLICATE_NAME") {
        notification.error({
          message: t.error,
          description: t.duplicateName(errorData.duplicateName || ''),
          placement: 'bottomRight'
        });
      } else {
        message.error({
          content: errorData?.error || t.updateFailed,
          placement: 'bottomRight'
        });
      }
    }
  };

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



