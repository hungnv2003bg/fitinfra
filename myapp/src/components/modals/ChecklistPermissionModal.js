import React, { useEffect, useState } from "react";
import { Modal, Table, Checkbox, Space, message, notification, Spin, Input, Switch } from "antd";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ChecklistPermissionModal({ open, onCancel, onSaved }) {
  const { lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userPermMap, setUserPermMap] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const [userRes, permRes] = await Promise.all([
          axios.get("/api/users"),
          axios.get(`/api/checklists/global/permissions`).catch(() => ({ data: {} })),
        ]);
        const allUsers = userRes.data || [];
        const nonAdminUsers = allUsers.filter(u => {
          // Chỉ hiển thị user có trạng thái hoạt động
          if (u.status !== "ACTIVE") return false;
          // Loại bỏ ADMIN
          if (!u.roles || !Array.isArray(u.roles)) return true;
          return !u.roles.some(r => r.name && r.name.toUpperCase() === 'ADMIN');
        });
        setUsers(nonAdminUsers);
        const data = permRes.data || {};
        const umap = {};
        (data.users || []).forEach((p) => {
          umap[p.userId] = { view: !!p.view, edit: !!p.edit, del: !!p.del, create: !!p.create };
        });
        setUserPermMap(umap);
      } catch (e) {
        notification.error({ 
          message: lang === 'zh' ? '系统' : 'Hệ thống', 
          description: lang === 'zh' ? '无法加载权限数据' : 'Không tải được dữ liệu phân quyền' 
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggleUser = (userId, key) => {
    setUserPermMap((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [key]: !prev[userId]?.[key] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        groups: [],
        users: Object.entries(userPermMap)
          .filter(([_, p]) => p && (p.edit || p.create))
          .map(([userId, p]) => ({ userId: Number(userId), view: true, edit: !!p.edit, del: false, create: !!p.create })),
      };
      await axios.post(`/api/checklists/global/permissions`, payload);
      notification.success({ 
        message: lang === 'zh' ? '成功' : 'Thành công', 
        description: lang === 'zh' ? '已保存Checklist权限' : 'Đã lưu phân quyền Checklist', 
        placement: "bottomRight" 
      });
      onSaved && onSaved();
      onCancel && onCancel();
    } catch (e) {
      notification.error({ 
        message: lang === 'zh' ? '错误' : 'Lỗi', 
        description: lang === 'zh' ? '保存权限失败' : 'Lưu phân quyền thất bại', 
        placement: "bottomRight" 
      });
    } finally {
      setSaving(false);
    }
  };

  const userColumns = [
    {
      title: (
        <Space style={{ width: "100%" }}>
          <span>{lang === 'zh' ? '用户' : 'Người dùng'}</span>
          <Input 
            placeholder={lang === 'zh' ? '按姓名或工号查找' : 'Tìm theo tên hoặc mã NV'} 
            value={userSearch} 
            onChange={(e) => setUserSearch(e.target.value)} 
            allowClear 
            style={{ maxWidth: 220 }} 
          />
          <span style={{ marginLeft: 8 }}>{lang === 'zh' ? '仅显示已分配' : 'Chỉ hiển thị đã gán'}</span>
          <Switch checked={onlyAssigned} onChange={setOnlyAssigned} />
        </Space>
      ),
      dataIndex: "fullName",
      key: "fullName",
      render: (text, r) => (
        <span>{text || r.manv || `User ${r.userID}`}</span>
      )
    },
    {
      title: lang === 'zh' ? '编辑' : 'Sửa',
      key: "edit",
      align: "center",
      render: (_, r) => (
        <Checkbox checked={!!userPermMap[r.userID]?.edit} onChange={() => toggleUser(r.userID, "edit")} />
      ),
    },
    {
      title: lang === 'zh' ? '创建' : 'Tạo',
      key: "create",
      align: "center",
      render: (_, r) => (
        <Checkbox checked={!!userPermMap[r.userID]?.create} onChange={() => toggleUser(r.userID, "create")} />
      ),
    },
  ];

  const filteredUsers = users.filter(u => {
    const searchTerm = userSearch.toLowerCase().trim();
    if (!searchTerm) {
      const assigned = !!userPermMap[u.userID];
      const okAssigned = !onlyAssigned || assigned;
      return okAssigned;
    }
    
    const fullName = (u.fullName || "").toLowerCase();
    const manv = (u.manv || "").toLowerCase();
    const okSearch = fullName.includes(searchTerm) || manv.includes(searchTerm);
    
    const assigned = !!userPermMap[u.userID];
    const okAssigned = !onlyAssigned || assigned;
    return okSearch && okAssigned;
  });

  return (
    <Modal
      open={open}
      width={800}
      onCancel={onCancel}
      title={lang === 'zh' ? 'Checklist权限设置' : 'Phân quyền Checklist'}
      okText={saving ? (lang === 'zh' ? '保存中...' : 'Đang lưu...') : (lang === 'zh' ? '保存' : 'Lưu')}
      onOk={handleSave}
      confirmLoading={saving}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <div>
          <h4>{lang === 'zh' ? '按用户设置权限' : 'Quyền theo Người dùng'}</h4>
          <Table rowKey={(r) => r.userID} dataSource={filteredUsers} columns={userColumns} pagination={{ pageSize: 6 }} size="small" />
        </div>
      </Spin>
    </Modal>
  );
}


