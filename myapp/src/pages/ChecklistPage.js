import React, { useCallback, useEffect, useState } from "react";
import { Button, Spin, Table, Tag, Input, Space, Popconfirm, message, Tooltip, notification, Select } from "antd";
import { CheckSquareOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, FileTextOutlined, PoweroffOutlined, CheckCircleOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ChecklistModal from "../components/modals/ChecklistModal";
import ChecklistEditModal from "../components/modals/ChecklistEditModal";
import ChecklistViewModal from "../components/modals/ChecklistViewModal";
import ChecklistMailRecipientModal from "../components/modals/ChecklistMailRecipientModal";
import ChecklistPermissionModal from "../components/modals/ChecklistPermissionModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useSelector } from "react-redux";
import { formatDateVN, formatDateShortVN } from "../utils/dateUtils";
import axios from "../plugins/axios";

export default function ChecklistPage() {
  const { lang } = useLanguage();
  const { nguoiDung, quyenList } = useSelector(state => state.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [groupFilter, setGroupFilter] = useState(undefined);
  
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [mailRecipientsRecord, setMailRecipientsRecord] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRepeats, setTimeRepeats] = useState([]);
  const [openPermission, setOpenPermission] = useState(false);
  const [userChecklistPerms, setUserChecklistPerms] = useState({ view: true, edit: false, del: false, create: false });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (groupFilter && groupFilter !== 'all' && groupFilter !== undefined) {
        params.groupId = groupFilter;
      }
      const res = await axios.get("/api/checklists", { params });
      const data = res.data;
      const items = Array.isArray(data) ? data : [];
      setRows(items);
      setFilteredRows(items);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [groupFilter]);

  const fetchGroupsAndUsers = useCallback(async () => {
    try {
      const [groupsRes, usersRes, timeRepeatsRes] = await Promise.all([
        axios.get("/api/groups"),
        axios.get("/api/users"),
        axios.get("/api/time-repeats")
      ]);
      setGroups(groupsRes.data || []);
      setUsers(usersRes.data || []);
      setTimeRepeats(timeRepeatsRes.data || []);
    } catch (error) {
      console.error("Error fetching groups, users and time-repeats:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchGroupsAndUsers();
    (async () => {
      try {
        const res = await axios.get('/api/checklists/global/permissions/check');
        if (res && res.data) setUserChecklistPerms(res.data);
      } catch {}
    })();
  }, [fetchData, fetchGroupsAndUsers, refreshKey]);

  useEffect(() => {
    let filtered = rows;

    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const nameMatch = (item.taskName || '').toLowerCase().includes(q);
        const contentMatch = (item.workContent || '').toLowerCase().includes(q);
        return nameMatch || contentMatch;
      });
    }

    if (statusFilter !== undefined && statusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || 'INACTIVE') === statusFilter);
    }

    setFilteredRows(filtered);
  }, [rows, searchText, statusFilter]);

  const getUserDisplayName = (userId) => {
    if (!userId) return '-';
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  };

  const getGroupDisplayName = (groupId) => {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  };

  const getImplementersDisplay = (implementers) => {
    if (!Array.isArray(implementers) || implementers.length === 0) return '-';
    
    return implementers.map(impl => {
      if (typeof impl === 'string') {
        if (impl.startsWith('group:')) {
          const groupId = parseInt(impl.replace('group:', ''));
          return getGroupDisplayName(groupId);
        } else if (impl.startsWith('user:')) {
          const userId = parseInt(impl.replace('user:', ''));
          return getUserDisplayName(userId);
        }
        return impl;
      }
      return impl;
    }).join(', ');
  };

  const labels = {
    vi: {
      header: "Checklist",
      addTask: "Thêm mới",
      stt: "STT",
      taskName: "Tên công việc",
      reviewer: "Người thực hiện",
      workContent: "Nội dung công việc",
      startAt: "Thời gian bắt đầu",
      statusCol: "Trạng thái",
      repeat: "Thời gian tiếp theo",
      dueInDays: "Thời gian cần hoàn thành",
      action: "Thao tác",
      view: "Xem",
      editAction: "Sửa",
      manageMailList: "Quản lý danh sách mail",
      active: "Hoạt động",
      inactive: "Không hoạt động",
      groups: "nhóm",
      viewChecklistDetail: "Xem chi tiết checklist",
      turnOffChecklist: "Tắt checklist",
      turnOnChecklist: "Kích hoạt checklist",
      confirmTurnOff: "Bạn chắc chắn muốn tắt checklist?",
      confirmTurnOn: "Bạn chắc chắn muốn bật checklist?",
      createdAt: "Ngày tạo",
      reviewDate: "",
      lastEditedBy: "Người sửa",
      lastEditedAt: "Cập nhật lần cuối",
      status: "Trạng thái",
      searchPlaceholder: "Tìm kiếm theo tên/nội dung công việc...",
      dateRangePlaceholder: ["Từ ngày", "Đến ngày"],
      clearFilters: "Xóa bộ lọc",
      statusFilterPlaceholder: "Lọc theo trạng thái",
      allStatus: "Tất cả trạng thái",
      filterByGroup: "Lọc theo nhóm",
      allGroups: "Tất cả nhóm",
      categoryMap: {},
    },
    zh: {
      header: "事件管理",
      addTask: "新增任务",
      stt: "序号",
      taskName: "任务名称",
      reviewer: "执行组",
      workContent: "工作内容",
      startAt: "开始时间",
      statusCol: "状态",
      repeat: "下次时间",
      dueInDays: "完成时限",
      action: "操作",
      view: "查看",
      editAction: "编辑",
      manageMailList: "管理邮件列表",
      active: "启用中",
      inactive: "未启用",
      groups: "组",
      viewChecklistDetail: "查看事件管理明细",
      turnOffChecklist: "停用事件管理",
      turnOnChecklist: "启用事件管理",
      confirmTurnOff: "您确定要停用该事件管理吗？",
      confirmTurnOn: "您确定要启用该事件管理吗？",
      createdAt: "创建日期",
      reviewDate: "",
      document: "",
      improvement: "",
      lastEditedBy: "编辑人",
      lastEditedAt: "修改日期",
      status: "状态",
      searchPlaceholder: "按任务名称/内容搜索",
      dateRangePlaceholder: ["开始日期", "结束日期"],
      clearFilters: "清除筛选",
      statusFilterPlaceholder: "按状态筛选",
      allStatus: "所有状态",
      filterByGroup: "按组筛选",
      allGroups: "所有组",
      categoryMap: {},
    },
  };

  const t = labels[lang];
  const { Option } = Select;

  const isAdminOrManager = Array.isArray(quyenList) && quyenList.some(role => 
    role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER'
  );
  const isAdmin = Array.isArray(quyenList) && quyenList.some(role => 
    role === 'ADMIN' || role === 'ROLE_ADMIN'
  );

  const columns = [
    {
      title: t.stt,
      key: "stt",
      render: (_, __, index) => <Tag color="blue">{((pagination.current - 1) * pagination.pageSize) + index + 1}</Tag>,
      width: 80,
      align: "center",
    },
    {
      title: t.taskName,
      dataIndex: "taskName",
      key: "taskName",
      width: 200,
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      onCell: () => ({ style: { textAlign: 'left' } }),
    },
    {
      title: t.workContent,
      dataIndex: "workContent",
      key: "workContent",
      width: 200,
      align: "left",
      render: (text) => (
        <div style={{ 
          maxWidth: 200, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={text}>
          {text || '-'}
        </div>
      ),
    },
    {
      title: t.startAt,
      dataIndex: "startAt",
      key: "startAt",
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      onCell: () => ({ style: { textAlign: 'left' } }),
      render: (v) => formatDateShortVN(v),
    },
    {
      title: t.statusCol,
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center",
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? t.active : t.inactive}
        </Tag>
      ),
    },
    {
      title: t.repeat,
      dataIndex: "repeatId",
      key: "repeatId",
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      onCell: () => ({ style: { textAlign: 'left' } }),
      render: (_, record) => {
        const nextTime = record.nextScheduledAt;
        const list = Array.isArray(record.nextThreeScheduled) ? record.nextThreeScheduled : [];
        if (!nextTime) return '-';
        const tooltipContent = list.length > 0 ? (
          <div style={{ color: 'black' }}>
            {lang === 'vi' ? 'Thời gian tiếp theo:' : '下次时间:'}
            <br />
            {list.map((iso, idx) => (
              <div key={idx}>{idx + 1}. {formatDateShortVN(iso)}</div>
            ))}
          </div>
        ) : null;
        return (
          <Tooltip title={tooltipContent} placement="topLeft" overlayInnerStyle={{ backgroundColor: 'white', color: 'black', border: '1px solid black' }}>
            <span style={{ cursor: 'help' }}>{formatDateShortVN(nextTime)}</span>
          </Tooltip>
        );
      }
    },
    {
      title: t.dueInDays,
      dataIndex: "dueInDays",
      key: "dueInDays",
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      align: "center",
      render: (dueInDays) => {
        if (!dueInDays) return '-';
        if (lang === 'vi') {
          if (dueInDays === 1) return '1 Ngày';
          if (dueInDays < 7) return `${dueInDays} Ngày`;
          if (dueInDays === 7) return '1 Tuần';
          if (dueInDays < 30) return `${Math.round(dueInDays / 7)} Tuần`;
          if (dueInDays === 30) return '1 Tháng';
          if (dueInDays < 365) return `${Math.round(dueInDays / 30)} Tháng`;
          return `${Math.round(dueInDays / 365)} Năm`;
        }
        
        if (dueInDays === 1) return '1 天';
        if (dueInDays < 7) return `${dueInDays} 天`;
        if (dueInDays === 7) return '1 周';
        if (dueInDays < 30) return `${Math.round(dueInDays / 7)} 周`;
        if (dueInDays === 30) return '1 月';
        if (dueInDays < 365) return `${Math.round(dueInDays / 30)} 月`;
        return `${Math.round(dueInDays / 365)} 年`;
      }
    },
    {
      title: t.reviewer,
      dataIndex: "implementers",
      key: "implementers",
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      align: "center",
      render: (vals) => {
        const implementersList = getImplementersDisplay(vals);
        const implementersArray = Array.isArray(vals) ? vals : (vals ? [vals] : []);
        const count = implementersArray.length;
        
        if (count === 0) return '-';
        
        const countText = `${count} ${t.groups}`;
        
        return (
          <Tooltip title={implementersList}>
            <span style={{ 
              cursor: 'help',
              color: '#1890ff',
              fontWeight: '600'
            }}>
              {countText}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: t.action,
      key: "action",
      fixed: "right",
      width: 200,
      align: "center",
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <Button icon={<EyeOutlined />} size="middle" onClick={() => setViewRecord(record)} title={t.view} />
          {(isAdmin || userChecklistPerms.edit) && (
            <Button icon={<EditOutlined />} size="middle" onClick={() => setEditRecord(record)} title={t.editAction} />
          )}
          <Button 
            icon={<FileTextOutlined />} 
            size="middle" 
            onClick={() => navigate(`/checklist/${record.id}/details`)} 
            title={t.viewChecklistDetail}
          />
          <Button 
            icon={<MailOutlined />} 
            size="middle" 
            onClick={() => setMailRecipientsRecord(record)} 
            title={t.manageMailList}
            style={{ display: isAdmin ? undefined : 'none' }}
          />
          {isAdmin && (
            <Popconfirm
              title={record.status === 'ACTIVE' ? t.confirmTurnOff : t.confirmTurnOn}
              onConfirm={async () => {
                try {
                  const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                  await axios.patch(`/api/checklists/${encodeURIComponent(String(record.id))}`, {
                    status: newStatus,
                    lastEditedBy: nguoiDung?.userID
                  });
                  notification.success({ 
                    message: lang === 'vi' ? 'Hệ thống' : '系统',
                    description: lang === 'vi' 
                      ? `Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tắt'} checklist`
                      : `${newStatus === 'ACTIVE' ? '已启用' : '已停用'}事件管理`, 
                    placement: 'bottomRight' 
                  });
                  fetchData();
                } catch {
                  notification.error({ 
                    message: lang === 'vi' ? 'Hệ thống' : '系统', 
                    description: lang === 'vi' ? 'Cập nhật trạng thái thất bại' : '更新状态失败', 
                    placement: 'bottomRight' 
                  });
                }
              }}
              okText={lang === 'vi' ? 'Xác nhận' : '确认'}
              cancelText={lang === 'vi' ? 'Hủy' : '取消'}
            >
              <Button 
                icon={record.status === 'ACTIVE' ? <PoweroffOutlined /> : <CheckCircleOutlined />}
                size="middle"
                type={record.status === 'ACTIVE' ? 'default' : 'primary'}
                title={record.status === 'ACTIVE' ? t.turnOffChecklist : t.turnOnChecklist}
              />
            </Popconfirm>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex',
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6ffed',
          color: '#52c41a',
          borderRadius: 8
        }}>
          <CheckSquareOutlined />
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginLeft: 8 }}>{t.header}</h2>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Space wrap>
            <Input
              placeholder={t.searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            {}
            <Input.Group compact>
              <Select
                placeholder={t.filterByGroup}
                value={groupFilter}
                onChange={(v) => setGroupFilter(v)}
                style={{ width: 180, height: 32 }}
                dropdownMatchSelectWidth={false}
                allowClear
              >
                {groups.map(g => (
                  <Option key={g.id} value={String(g.id)}>{g.name}</Option>
                ))}
              </Select>
            </Input.Group>
            <Input.Group compact>
              <Select
                placeholder={t.statusFilterPlaceholder}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                style={{ width: 160, height: 32 }}
                dropdownMatchSelectWidth={false}
                allowClear
              >
                <Option value="ACTIVE">{t.active}</Option>
                <Option value="INACTIVE">{t.inactive}</Option>
              </Select>
            </Input.Group>
            <Button onClick={() => { setSearchText(""); setStatusFilter(undefined); setGroupFilter(undefined); }}>
              {t.clearFilters}
            </Button>
          </Space>
          <Space>
            {isAdmin && (
              <Button onClick={() => setOpenPermission(true)} icon={<LockOutlined />}>{lang === 'zh' ? '权限' : 'Phân quyền'}</Button>
            )}
            {(isAdminOrManager || userChecklistPerms.create) && (
              <Button type="primary" onClick={() => setOpen(true)}>
                {t.addTask}
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table 
          rowKey="id" 
          dataSource={filteredRows} 
          columns={columns}
          scroll={{ x: 1300 }}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: true, showQuickJumper: true }}
          onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
        />
      </Spin>

      <ChecklistModal
        open={open}
        onCancel={() => setOpen(false)}
        onAdded={() => setRefreshKey((k) => k + 1)}
      />
      <ChecklistEditModal
        open={!!editRecord}
        record={editRecord}
        onCancel={() => setEditRecord(null)}
        onSaved={fetchData}
      />
      <ChecklistViewModal
        open={!!viewRecord}
        record={viewRecord}
        onCancel={() => setViewRecord(null)}
      />
      <ChecklistMailRecipientModal
        visible={!!mailRecipientsRecord}
        checklist={mailRecipientsRecord}
        onCancel={() => setMailRecipientsRecord(null)}
      />
      <ChecklistPermissionModal
        open={openPermission}
        onCancel={() => setOpenPermission(false)}
        onSaved={() => fetchData()}
      />
    </div>
  );
}



