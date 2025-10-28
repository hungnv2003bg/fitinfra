import React, { useEffect, useState } from "react";
import { Modal, Table, Checkbox, Space, message, notification, Spin, Input, Switch } from "antd";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";

export default function SOPPermissionModal({ open, record, onCancel, onSaved, globalMode = false }) {
  const { lang } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permMap, setPermMap] = useState({});
  const [userPermMap, setUserPermMap] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  const getTitle = () => {
    if (globalMode) {
      return lang === 'zh' ? "SOP权限设置" : "Phân quyền SOPs";
    } else if (record) {
      const sopName = record.isDocument ? record.title : record.name;
      return lang === 'zh' ? `权限设置: ${sopName}` : `Phân quyền: ${sopName}`;
    } else {
      return lang === 'zh' ? "权限设置" : "Phân quyền";
    }
  };

  const labels = {
    vi: {
      title: getTitle(),
      group: "Nhóm",
      user: "Tài khoản",
      view: "Xem",
      edit: "Sửa",
      del: "Xóa",
      create: "Tạo",
      save: "Lưu",
      cancel: "Hủy",
      loadError: "Không thể tải dữ liệu",
      saveSuccess: "Đã lưu phân quyền",
      saveError: "Không thể lưu phân quyền",
      userPerm: globalMode ? "Phân quyền theo tài khoản" : "Phân quyền theo tài khoản",
      searchUserPh: "Tìm theo mã NV hoặc tên...",
      onlyAssigned: "Chỉ hiển thị tài khoản đã gán quyền",
    },
    zh: {
      title: getTitle(),
      group: "组",
      user: "账号",
      view: "查看",
      edit: "编辑",
      del: "删除",
      create: "创建",
      save: "保存",
      cancel: "取消",
      loadError: "无法加载数据",
      saveSuccess: "已保存权限",
      saveError: "无法保存权限",
      userPerm: globalMode ? "按账号授权" : "按账号授权（优先于组）",
      searchUserPh: "按工号或姓名搜索...",
      onlyAssigned: "仅显示已授权账号",
    },
  };

  const t = labels[lang] || labels.vi;

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const base = globalMode ? `/api/sops/global` : `/api/sops/${record?.isDocument ? "documents/" + record.documentID : record?.id}`;
        const [groupRes, userRes, permRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/users"),
          axios.get(`${base}/permissions`).catch(() => ({ data: {} })),
        ]);
        const groupList = groupRes.data || [];
        const userList = userRes.data || [];
        setGroups(groupList);
        setUsers(userList);
        const existing = permRes.data || {};
        const groupPerms = Array.isArray(existing.groups) ? existing.groups : [];
        const userPerms = Array.isArray(existing.users) ? existing.users : [];

        const nextGroupMap = {};
        for (const g of groupList) {
          const found = groupPerms.find((e) => e.groupId === g.id) || {};
          nextGroupMap[g.id] = {
            view: !!found.view,
            edit: !!found.edit,
            del: !!found.del,
            create: !!found.create,
          };
        }
        setPermMap(nextGroupMap);

        const nextUserMap = {};
        for (const u of userList) {
          const foundU = userPerms.find((e) => Number(e.userId) === Number(u.userID));
          nextUserMap[u.userID] = {
            view: foundU ? !!foundU.view : false,
            edit: foundU ? !!foundU.edit : false,
            del: foundU ? !!foundU.del : false,
            create: foundU ? !!foundU.create : false,
          };
        }
        setUserPermMap(nextUserMap);
      } catch (e) {
        notification.error({
          message: 'Lỗi',
          description: t.loadError,
          placement: 'bottomRight',
          duration: 5,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, record]);

  const toggle = (groupId, key) => {
    setPermMap((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], [key]: !prev[groupId]?.[key] },
    }));
  };

  const toggleUser = (userId, key) => {
    setUserPermMap((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [key]: !prev[userId]?.[key] },
    }));
  };

  const handleSave = async () => {
    if (!globalMode && !record) return;
    setSaving(true);
    try {
      const payload = {
        groups: globalMode ? [] : Object.entries(permMap)
          .filter(([groupId, p]) => p && (p.view || p.edit || p.del || p.create))
          .map(([groupId, p]) => ({ groupId: Number(groupId), view: !!p.view, edit: !!p.edit, del: !!p.del, create: !!p.create })),
        users: Object.entries(userPermMap)
          .filter(([userId, p]) => p && (p.view || p.edit || p.del || p.create))
          .map(([userId, p]) => ({ userId: Number(userId), view: !!p.view, edit: !!p.edit, del: !!p.del, create: !!p.create })),
      };
      const base = globalMode ? `/api/sops/global` : (record.isDocument ? `/api/sops/documents/${record.documentID}` : `/api/sops/${record.id}`);
      await axios.post(`${base}/permissions`, payload);
      notification.success({
        message: 'Thành công',
        description: t.saveSuccess,
        placement: 'bottomRight',
        duration: 3,
      });
      onSaved && onSaved();
      onCancel && onCancel();
    } catch (e) {
      notification.error({
        message: 'Lỗi',
        description: t.saveError,
        placement: 'bottomRight',
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: t.group, dataIndex: "name", key: "name" },
    { title: t.view, key: "view", render: (_, g) => (<Checkbox checked={!!permMap[g.id]?.view} onChange={() => toggle(g.id, "view")} />), align: "center", width: 100 },
    { title: t.edit, key: "edit", render: (_, g) => (<Checkbox checked={!!permMap[g.id]?.edit} onChange={() => toggle(g.id, "edit")} />), align: "center", width: 100 },
    { title: t.del, key: "del", render: (_, g) => (<Checkbox checked={!!permMap[g.id]?.del} onChange={() => toggle(g.id, "del")} />), align: "center", width: 100 },
    { title: t.create, key: "create", render: (_, g) => (<Checkbox checked={!!permMap[g.id]?.create} onChange={() => toggle(g.id, "create")} />), align: "center", width: 100 },
  ];

  const userColumns = [
    { title: t.user, dataIndex: "fullName", key: "fullName", render: (_, u) => u.fullName || u.manv || `User ${u.userID}` },
    { title: t.view, key: "view", render: (_, u) => (<Checkbox checked={!!userPermMap[u.userID]?.view} onChange={() => toggleUser(u.userID, "view")} />), align: "center", width: 100 },
    { title: t.edit, key: "edit", render: (_, u) => (<Checkbox checked={!!userPermMap[u.userID]?.edit} onChange={() => toggleUser(u.userID, "edit")} />), align: "center", width: 100 },
    { title: t.del, key: "del", render: (_, u) => (<Checkbox checked={!!userPermMap[u.userID]?.del} onChange={() => toggleUser(u.userID, "del")} />), align: "center", width: 100 },
    { title: t.create, key: "create", render: (_, u) => (<Checkbox checked={!!userPermMap[u.userID]?.create} onChange={() => toggleUser(u.userID, "create")} />), align: "center", width: 100 },
  ];

  return (
    <Modal
      title={t.title}
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      okButtonProps={{ loading: saving }}
      width={900}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {!globalMode && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{t.group}</div>
            <Table
              rowKey="id"
              dataSource={groups}
              columns={columns}
              pagination={false}
              size="small"
            />
          </>
        )}
        <div style={{ fontWeight: 600, marginTop: globalMode ? 0 : 16 }}>{t.userPerm}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 6px' }}>
          <Input
            allowClear
            placeholder={t.searchUserPh}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <span style={{ color: '#888' }}>|</span>
          <span>{t.onlyAssigned}</span>
          <Switch checked={onlyAssigned} onChange={setOnlyAssigned} />
        </div>
        {(() => {
          const kw = (userSearch || '').trim().toLowerCase();
          let data = users;
          if (kw) {
            data = users.filter(u =>
              String(u.manv || '').toLowerCase().includes(kw) ||
              String(u.fullName || '').toLowerCase().includes(kw)
            );
          }
          if (onlyAssigned) {
            data = data.filter(u => {
              const perms = userPermMap[u.userID];
              return perms && (perms.view || perms.edit || perms.del || perms.create);
            });
          }
          return (
            <Table
              rowKey="userID"
              dataSource={data}
              columns={userColumns}
              size="small"
              pagination={{ pageSize: 6 }}
              style={{ marginTop: 8 }}
            />
          );
        })()}
      </Spin>
    </Modal>
  );
}



