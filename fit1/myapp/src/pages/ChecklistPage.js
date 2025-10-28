import React, { useCallback, useEffect, useState } from "react";
import { Button, Spin, Table, Tag, Input, Space, Popconfirm, message, DatePicker, Tooltip, notification } from "antd";
import { CheckSquareOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, FileTextOutlined, PoweroffOutlined, CheckCircleOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ChecklistModal from "../components/modals/ChecklistModal";
import ChecklistEditModal from "../components/modals/ChecklistEditModal";
import ChecklistViewModal from "../components/modals/ChecklistViewModal";
import ChecklistMailRecipientModal from "../components/modals/ChecklistMailRecipientModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useSelector } from "react-redux";
import { formatDateVN } from "../utils/dateUtils";
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
  const [dateRange, setDateRange] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [mailRecipientsRecord, setMailRecipientsRecord] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRepeats, setTimeRepeats] = useState([]);

  // removed legacy weekly/detail bootstrap

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/checklists");
      const data = res.data;
      const items = Array.isArray(data) ? data : [];
      setRows(items);
      setFilteredRows(items);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch groups, users and time-repeats data
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
  }, [fetchData, fetchGroupsAndUsers, refreshKey]);

  useEffect(() => {
    let filtered = rows;

    if (searchText) {
      filtered = filtered.filter(item =>
        item.taskName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').toDate().getTime();
      const end = dateRange[1].endOf('day').toDate().getTime();
      filtered = filtered.filter(item => {
        const ts = item.createdAt ? new Date(item.createdAt).getTime() : 0;
        return ts >= start && ts <= end;
      });
    }

    setFilteredRows(filtered);
  }, [rows, searchText, dateRange]);

  // Helper functions để hiển thị tên group và user
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
      repeat: "Thời gian lặp lại",
      dueInDays: "Thời gian cần hoàn thành",
      remindInDays: "Ngày nhắc nhở",
      action: "Thao tác",
      active: "Hoạt động",
      inactive: "Không hoạt động",
      groups: "nhóm",
      viewChecklistDetail: "Xem chi tiết checklist",
      turnOffChecklist: "Tắt checklist",
      turnOnChecklist: "Kích hoạt checklist",
      createdAt: "Ngày tạo",
      reviewDate: "",
      lastEditedBy: "Người sửa",
      lastEditedAt: "Cập nhật lần cuối",
      status: "Trạng thái",
      searchPlaceholder: "Tìm kiếm theo tên công việc...",
      dateRangePlaceholder: ["Từ ngày", "Đến ngày"],
      clearFilters: "Xóa bộ lọc",
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
      repeat: "重复周期",
      dueInDays: "完成时限",
      remindInDays: "提醒日期",
      action: "操作",
      active: "启用中",
      inactive: "未启用",
      groups: "组",
      viewChecklistDetail: "查看事件管理明细",
      turnOffChecklist: "停用事件管理",
      turnOnChecklist: "启用事件管理",
      createdAt: "创建日期",
      reviewDate: "",
      document: "",
      improvement: "",
      lastEditedBy: "编辑人",
      lastEditedAt: "修改日期",
      status: "状态",
      searchPlaceholder: "按任务名称搜索",
      dateRangePlaceholder: ["开始日期", "结束日期"],
      clearFilters: "清除筛选",
      categoryMap: {},
    },
  };

  const t = labels[lang];

  // Check if user has admin or manager role
  const isAdminOrManager = Array.isArray(quyenList) && quyenList.some(role => 
    role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER'
  );

  const columns = [
    {
      title: t.stt,
      key: "stt",
      render: (_, __, index) => <Tag color="blue">{index + 1}</Tag>,
      width: 80,
      align: "center",
    },
    {
      title: t.taskName,
      dataIndex: "taskName",
      key: "taskName",
      width: 200,
      align: "center",
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
      align: "center",
      render: (v) => formatDateVN(v),
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
      align: "center",
      render: (repeatId) => {
        if (!repeatId) return '-';
        
        const timeRepeat = timeRepeats.find(tr => tr.id === repeatId);
        if (!timeRepeat) return `ID: ${repeatId}`;
        
        const unitLabels = {
          day: lang === 'vi' ? 'Ngày' : '天',
          week: lang === 'vi' ? 'Tuần' : '周', 
          month: lang === 'vi' ? 'Tháng' : '月',
          year: lang === 'vi' ? 'Năm' : '年'
        };
        
        const unitLabel = unitLabels[timeRepeat.unit] || timeRepeat.unit;
        return `${timeRepeat.number} ${unitLabel}`;
      }
    },
    {
      title: t.dueInDays,
      dataIndex: "dueInDays",
      key: "dueInDays",
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
        // zh
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
      title: t.remindInDays,
      dataIndex: "remindInDays",
      key: "remindInDays",
      align: "center",
      render: (remindInDays) => {
        if (!remindInDays) return '-';
        if (lang === 'vi') {
          if (remindInDays === 1) return '1 Ngày';
          if (remindInDays < 7) return `${remindInDays} Ngày`;
          if (remindInDays === 7) return '1 Tuần';
          if (remindInDays < 30) return `${Math.round(remindInDays / 7)} Tuần`;
          if (remindInDays === 30) return '1 Tháng';
          if (remindInDays < 365) return `${Math.round(remindInDays / 30)} Tháng`;
          return `${Math.round(remindInDays / 365)} Năm`;
        }
        if (remindInDays === 1) return '1 天';
        if (remindInDays < 7) return `${remindInDays} 天`;
        if (remindInDays === 7) return '1 周';
        if (remindInDays < 30) return `${Math.round(remindInDays / 7)} 周`;
        if (remindInDays === 30) return '1 月';
        if (remindInDays < 365) return `${Math.round(remindInDays / 30)} 月`;
        return `${Math.round(remindInDays / 365)} 年`;
      }
    },
    {
      title: t.reviewer,
      dataIndex: "implementers",
      key: "implementers",
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
          <Button icon={<EyeOutlined />} size="middle" onClick={() => setViewRecord(record)} />
          {isAdminOrManager && (
            <Button icon={<EditOutlined />} size="middle" onClick={() => setEditRecord(record)} />
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
            title="Quản lý danh sách mail"
          />
          {isAdminOrManager && (
            <Button 
              icon={record.status === 'ACTIVE' ? <PoweroffOutlined /> : <CheckCircleOutlined />}
              size="middle"
              type={record.status === 'ACTIVE' ? 'default' : 'primary'}
              onClick={async () => {
                try {
                  const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                  await axios.patch(`/api/checklists/${encodeURIComponent(String(record.id))}`, {
                    status: newStatus,
                    lastEditedBy: nguoiDung?.userID
                  });
                  notification.success({ 
                    message: lang === 'vi' ? 'Hệ thống' : '系统',
                    description: `Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tắt'} checklist`, 
                    placement: 'bottomRight' 
                  });
                  fetchData();
                } catch {
                  message.error({ content: 'Cập nhật trạng thái thất bại', placement: 'bottomRight' });
                }
              }}
              title={record.status === 'ACTIVE' ? t.turnOffChecklist : t.turnOnChecklist}
            />
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
            <DatePicker.RangePicker
              placeholder={t.dateRangePlaceholder}
              value={dateRange}
              onChange={(vals) => setDateRange(vals || [])}
              style={{ width: 280 }}
              format="DD/MM/YYYY"
            />
            <Button onClick={() => { setSearchText(""); setDateRange([]); }}>
              {t.clearFilters}
            </Button>
          </Space>
          {isAdminOrManager && (
            <Button type="primary" onClick={() => setOpen(true)}>
              {t.addTask}
            </Button>
          )}
        </div>
      </div>

      <Spin spinning={loading}>
        <Table 
          rowKey="id" 
          dataSource={filteredRows} 
          columns={columns}
          scroll={{ x: 1300 }}
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
    </div>
  );
}



