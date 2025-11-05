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
  Popconfirm,
  Switch,
} from "antd";
import {
  MailOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

const { Option } = Select;

export default function MailSignupManagement() {
  const { lang } = useLanguage();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [form] = Form.useForm();

  const labels = {
    vi: {
      title: "Quản lý danh sách mail nhận thông báo đăng ký",
      add: "Thêm mới",
      edit: "Chỉnh sửa",
      delete: "Xóa",
      email: "Email",
      type: "Loại",
      enabled: "Kích hoạt",
      note: "Ghi chú",
      actions: "Thao tác",
      save: "Lưu",
      cancel: "Hủy",
      confirmDelete: "Bạn có chắc chắn muốn xóa email này?",
      saved: "Lưu thành công!",
      deleted: "Xóa thành công!",
      error: "Có lỗi xảy ra!",
      emailRequired: "Vui lòng nhập email!",
      typeRequired: "Vui lòng chọn loại!",
      emailInvalid: "Email không hợp lệ!",
      emailExists: "Email này đã tồn tại cho loại này!",
      to: "Người nhận (TO)",
      cc: "Người nhận CC",
      bcc: "Người nhận BCC",
    },
    zh: {
      title: "管理注册邮件通知收件人",
      add: "添加",
      edit: "编辑",
      delete: "删除",
      email: "邮箱",
      type: "类型",
      enabled: "启用",
      note: "备注",
      actions: "操作",
      save: "保存",
      cancel: "取消",
      confirmDelete: "确定要删除这个邮箱吗？",
      saved: "保存成功！",
      deleted: "删除成功！",
      error: "发生错误！",
      emailRequired: "请输入邮箱！",
      typeRequired: "请选择类型！",
      emailInvalid: "邮箱格式不正确！",
      emailExists: "此邮箱已存在于该类型中！",
      to: "收件人 (TO)",
      cc: "抄送 (CC)",
      bcc: "密送 (BCC)",
    },
  };
  const t = labels[lang];

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/mail-recipients-signup');
      const list = Array.isArray(res.data) ? res.data : [];
      // The API already returns SIGNUP recipients
      setRecipients(list);
    } catch (e) {
      console.error('Error fetching recipients:', e);
      message.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleAdd = () => {
    setEditingRecipient(null);
    form.resetFields();
    // Set default values
    form.setFieldsValue({
      enabled: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecipient(record);
    form.setFieldsValue({
      email: record.email,
      type: record.type,
      enabled: record.enabled,
      note: record.note,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/mail-recipients-signup/${id}`);
      notification.success({
        message: 'Hệ thống',
        description: t.deleted,
        placement: 'bottomRight'
      });
      fetchRecipients();
    } catch (e) {
      console.error('Error deleting recipient:', e);
      notification.error({
        message: 'Lỗi',
        description: t.error,
        placement: 'bottomRight'
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRecipient) {
        // For update, keep the existing typeMailRecipient
        const payload = {
          email: values.email,
          type: values.type,
          enabled: values.enabled,
          note: values.note
        };
        await axios.put(`/api/mail-recipients-signup/${editingRecipient.id}`, payload);
      } else {
        // For add, get or create the SIGNUP type
        let typeRes;
        try {
          typeRes = await axios.get('/api/type-mail-recipients/by-type/SIGNUP');
        } catch (error) {
          // If SIGNUP type doesn't exist, create it
          typeRes = await axios.post('/api/type-mail-recipients', {
            typeName: 'SIGNUP',
            description: 'Mail thông báo đăng ký tài khoản',
            enabled: true
          });
        }
        const signupType = typeRes.data;

        const payload = {
          email: values.email,
          type: values.type,
          enabled: values.enabled,
          note: values.note,
          typeMailRecipient: signupType
        };
        await axios.post('/api/mail-recipients-signup', payload);
      }
      notification.success({
        message: 'Hệ thống',
        description: t.saved,
        placement: 'bottomRight'
      });
      setIsModalVisible(false);
      fetchRecipients();
    } catch (e) {
      console.error('Error saving recipient:', e);
      notification.error({
        message: 'Lỗi',
        description: t.error,
        placement: 'bottomRight'
      });
    }
  };

  const columns = [
    {
      title: t.email,
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: t.type,
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const typeLabels = {
          TO: { text: t.to, color: 'blue' },
          CC: { text: t.cc, color: 'green' },
          BCC: { text: t.bcc, color: 'orange' },
        };
        const typeInfo = typeLabels[type] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: t.enabled,
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled) => (
        enabled ? 
          <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
          <StopOutlined style={{ color: '#ff4d4f' }} />
      ),
    },
    {
      title: t.note,
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: t.actions,
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title={t.confirmDelete}
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined />
          <span>{t.title}</span>
        </div>
      }
      bordered
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t.add}
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={recipients}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Tổng ${total} mục`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingRecipient ? t.edit : t.add}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label={t.email}
            rules={[
              { required: true, message: t.emailRequired },
              { type: 'email', message: t.emailInvalid },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="type"
            label={t.type}
            rules={[{ required: true, message: t.typeRequired }]}
          >
            <Select placeholder="Chọn loại">
              <Option value="TO">{t.to}</Option>
              <Option value="CC">{t.cc}</Option>
              <Option value="BCC">{t.bcc}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="enabled"
            label={t.enabled}
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="note"
            label={t.note}
          >
            <Input.TextArea rows={3} placeholder="Ghi chú (tùy chọn)" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                {t.cancel}
              </Button>
              <Button type="primary" htmlType="submit">
                {t.save}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

