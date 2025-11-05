import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Tag, Space, message, notification } from "antd";
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

function GroupPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form] = Form.useForm();
  const { lang } = useLanguage();


  const labels = {
    vi: {
      title: "Groups",
      addGroup: "Thêm nhóm",
      editGroup: "Chỉnh sửa nhóm",
      deleteGroup: "Xóa nhóm",
      groupName: "Tên nhóm",
      members: "Thành viên",
      description: "Mô tả",
      actions: "Thao tác",
      stt: "STT",
      memberCount: "thành viên",
      groupNamePlaceholder: "Nhập tên nhóm",
      descriptionPlaceholder: "Mô tả ngắn",
      groupNameRequired: "Vui lòng nhập tên nhóm",
      groupNameMinLength: "Tên tối thiểu 2 ký tự",
      deleteConfirm: "Xóa nhóm",
      cannotLoadGroups: "Không thể tải danh sách nhóm",
      groupDeleted: "Đã xóa nhóm",
      cannotDeleteGroup: "Không thể xóa nhóm",
      groupUpdated: "Đã cập nhật nhóm",
      groupCreated: "Đã tạo nhóm",
      cannotSaveGroup: "Không thể lưu nhóm",
      duplicateGroupName: "đã tồn tại"
    },
    zh: {
      title: "群组",
      addGroup: "添加群组",
      editGroup: "编辑群组",
      deleteGroup: "删除群组",
      groupName: "群组名称",
      members: "成员",
      description: "描述",
      actions: "操作",
      stt: "序号",
      memberCount: "成员",
      groupNamePlaceholder: "输入群组名称",
      descriptionPlaceholder: "简短描述",
      groupNameRequired: "请输入群组名称",
      groupNameMinLength: "名称至少2个字符",
      deleteConfirm: "删除群组",
      cannotLoadGroups: "无法加载群组列表",
      groupDeleted: "群组已删除",
      cannotDeleteGroup: "无法删除群组",
      groupUpdated: "群组已更新",
      groupCreated: "群组已创建",
      cannotSaveGroup: "无法保存群组",
      duplicateGroupName: "已存在"
    }
  };

  const t = labels[lang];

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/groups");
      setGroups(res.data || []);
    } catch (e) {
      message.error({
        content: t.cannotLoadGroups,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    form.setFieldsValue({ name: group.name, description: group.description });
    setIsModalVisible(true);
  };

  const handleDelete = async (group) => {
    Modal.confirm({
      title: `${t.deleteConfirm} "${group.name}"?`,
      onOk: async () => {
        try {
          await axios.delete(`/api/groups/${group.id}`);
          notification.success({
            message: lang === 'vi' ? 'Hệ thống' : '系统',
            description: t.groupDeleted,
            placement: 'bottomRight'
          });
          fetchGroups();
        } catch {
          message.error({
            content: t.cannotDeleteGroup,
            placement: 'bottomRight'
          });
        }
      }
    });
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      if (editingGroup) {
        await axios.put(`/api/groups/${editingGroup.id}`, { ...editingGroup, ...values });
        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: t.groupUpdated,
          placement: 'bottomRight'
        });
      } else {
        await axios.post("/api/groups", values);
        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: t.groupCreated,
          placement: 'bottomRight'
        });
      }
      setIsModalVisible(false);
      fetchGroups();
    } catch (e) {
      if (e.response?.data?.error === "DUPLICATE_NAME") {
        notification.error({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: `${t.groupName} "${e.response.data.duplicateValue}" ${t.duplicateGroupName}`,
          placement: 'bottomRight'
        });
      } else {
        message.error({
          content: t.cannotSaveGroup,
          placement: 'bottomRight'
        });
      }
    }
  };

  const columns = [
    { 
      title: <div style={{ textAlign: 'center' }}>{t.stt}</div>, 
      width: 60, 
      align: "center", 
      render: (_, __, i) => ((pagination.current - 1) * pagination.pageSize) + i + 1 
    },
    { 
      title: <div style={{ textAlign: 'center' }}>{t.groupName}</div>, 
      dataIndex: "name",
      width: "25%",
      align: "center"
    },
    { 
      title: <div style={{ textAlign: 'center' }}>{t.members}</div>, 
      dataIndex: "users", 
      align: "center",
      width: "25%",
      render: (users) => {
        const count = users?.length || 0;
        return (
          <Tag color={count > 0 ? "blue" : "default"}>
            {count} {t.memberCount}
          </Tag>
        );
      }
    },
    { 
      title: <div style={{ textAlign: 'center' }}>{t.description}</div>, 
      dataIndex: "description",
      width: "25%",
      align: "left"
    },
    { 
      title: <div style={{ textAlign: 'center' }}>{t.actions}</div>, 
      width: "25%", 
      align: "center",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', background: '#e6f7ff', color: '#1890ff', borderRadius: 8 }}>
            <TeamOutlined />
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t.title}</h2>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t.addGroup}</Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={groups} 
        rowKey="id" 
        loading={loading} 
        pagination={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: true, showQuickJumper: true }}
        onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
      />

      <Modal title={editingGroup ? t.editGroup : t.addGroup} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t.groupName} rules={[{ required: true, message: t.groupNameRequired }, { min: 2, message: t.groupNameMinLength }]}>
            <Input placeholder={t.groupNamePlaceholder} />
          </Form.Item>
          <Form.Item name="description" label={t.description}>
            <Input.TextArea rows={3} placeholder={t.descriptionPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default GroupPage;



