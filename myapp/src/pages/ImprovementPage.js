import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Tag, Spin, Select, message, Button, Popconfirm, Input, Space, DatePicker, notification, Dropdown } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, SearchOutlined, LineChartOutlined, PercentageOutlined, DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import ImprovementDetailModal from "../components/modals/ImprovementDetailModal";
import ImprovementEditModal from "../components/modals/ImprovementEditModal";
import ImprovementCreateModal from "../components/modals/ImprovementCreateModal";
import ImprovementProgressModal from "../components/modals/ImprovementProgressModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useSelector } from "react-redux";
import axios from "../plugins/axios";
import { formatDateOnlyVN, formatDateShortVN } from "../utils/dateUtils";
import dayjs from "dayjs";

export default function ImprovementPage() {
  const { lang } = useLanguage();
  const { nguoiDung, quyenList } = useSelector(state => state.user);
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [progressRecord, setProgressRecord] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [sortOrder, setSortOrder] = useState(undefined); // undefined shows placeholder, "newest" or "oldest"
  const [dateRange, setDateRange] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/improvements");
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list);
      setFilteredRows(list);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch groups and users data
  const fetchGroupsAndUsers = useCallback(async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        axios.get("/api/groups"),
        axios.get("/api/users")
      ]);
      setGroups(groupsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error fetching groups and users:", error);
    }
  }, []);

  // Đọc query để hỗ trợ điều hướng từ chi tiết checklist hoặc email
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const detailIdParam = urlParams.get('detailId');
  const qParam = urlParams.get('q');
  const improvementIdParam = urlParams.get('improvementId');

  useEffect(() => {
    fetchData();
    fetchGroupsAndUsers();
  }, [fetchData, fetchGroupsAndUsers]);

  // Auto mở modal chi tiết khi có improvementId parameter từ email
  useEffect(() => {
    if (improvementIdParam && rows.length > 0) {
      const improvement = rows.find(r => String(r.improvementID || r.id) === String(improvementIdParam));
      if (improvement) {
        setViewRecord(improvement);
      }
    }
  }, [improvementIdParam, rows]);


  useEffect(() => {
    let filtered = rows;


    if (searchText) {
      filtered = filtered.filter(item =>
        item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.issueDescription?.toLowerCase().includes(searchText.toLowerCase())
      );
    }


    if (reviewerFilter) {
      filtered = filtered.filter(item => item.responsible === reviewerFilter);
    }


    if (statusFilter) {
      filtered = filtered.filter(item => getStatusCode(item.status) === statusFilter);
    }


    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').toDate().getTime();
      const end = dateRange[1].endOf('day').toDate().getTime();
      filtered = filtered.filter(item => {
        const ts = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
        return ts >= start && ts <= end;
      });
    }

    // If opened with a detailId or q query, apply default filter once
    if ((detailIdParam || qParam) && rows.length > 0 && filtered === rows) {
      let initial = rows;
      if (detailIdParam) {
        // Tìm improvement có checklistDetailId bằng detailIdParam
        initial = rows.filter(it => String(it.checklistDetailId) === String(detailIdParam));
      }
      if (qParam) {
        initial = initial.filter(it => (it.abnormalInfo || '').toLowerCase().includes(String(qParam).toLowerCase()));
      }
      filtered = initial;
    }

    // Apply sorting (default to newest if undefined)
    const appliedSortOrder = sortOrder || "newest";
    if (appliedSortOrder === "newest") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Newest first
      });
    } else if (appliedSortOrder === "oldest") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // Oldest first
      });
    }

    setFilteredRows(filtered);
  }, [rows, searchText, reviewerFilter, statusFilter, dateRange, sortOrder, detailIdParam, qParam]);


  const uniqueReviewers = useMemo(() => {
    const reviewerMap = new Map();
    rows.forEach(item => {
      const responsible = item.responsible;
      if (!responsible) return;
      
      const displayInfo = getResponsibleDisplayWithManv(responsible);
      if (displayInfo && displayInfo.label !== '-') {
        // Format: "Name (EmployeeID)" if manv exists, otherwise just "Name"
        const displayLabel = displayInfo.manv 
          ? `${displayInfo.label} (${displayInfo.manv})` 
          : displayInfo.label;
        reviewerMap.set(responsible, { label: displayLabel, manv: displayInfo.manv });
      }
    });
    return Array.from(reviewerMap.entries()).map(([value, info]) => ({ 
      value, 
      label: info.label,
      manv: info.manv 
    }));
  }, [rows, groups, users]);

  // Helper functions để hiển thị tên group và user
  function getUserDisplayName(userId) {
    if (!userId) return '-';
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  }

  function getGroupDisplayName(groupId) {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  }

  // Helper để parse và hiển thị responsible (có thể là group:ID hoặc user:ID hoặc groupID hoặc userID)
  function getResponsibleDisplay(responsible) {
    if (!responsible) return '-';
    
    if (typeof responsible === 'string') {
      // Handle 'group:ID' or 'group:ID' format
      if (responsible.startsWith('group:') || responsible.startsWith('group')) {
        const groupId = parseInt(responsible.replace(/^group:?/, ''));
        return getGroupDisplayName(groupId);
      }
      // Handle 'user:ID' or 'userID' format
      else if (responsible.startsWith('user:') || responsible.startsWith('user')) {
        const userId = parseInt(responsible.replace(/^user:?/, ''));
        return getUserDisplayName(userId);
      }
      return responsible;
    }
    return responsible;
  }

  // Helper để lấy thông tin đầy đủ (tên + mã nhân viên) cho filter dropdown
  function getResponsibleDisplayWithManv(responsible) {
    if (!responsible) return { label: '-', manv: '' };
    
    if (typeof responsible === 'string') {
      // Handle 'group:ID' or 'groupID' format
      if (responsible.startsWith('group:') || responsible.startsWith('group')) {
        const groupId = parseInt(responsible.replace(/^group:?/, ''));
        const groupName = getGroupDisplayName(groupId);
        return { label: groupName, manv: '' };
      }
      // Handle 'user:ID' or 'userID' format
      else if (responsible.startsWith('user:') || responsible.startsWith('user')) {
        const userId = parseInt(responsible.replace(/^user:?/, ''));
        let user = null;
        if (nguoiDung?.userID === userId) {
          user = nguoiDung;
        } else {
          user = users.find(u => u.userID === userId);
        }
        if (user) {
          const fullName = user.fullName || `User ${userId}`;
          const manv = user.manv || '';
          return { label: fullName, manv };
        }
        return { label: `User ${userId}`, manv: '' };
      }
      return { label: responsible, manv: '' };
    }
    return { label: responsible, manv: '' };
  }

  // Chuẩn hóa và hiển thị trạng thái
  const getStatusCode = (value) => {
    if (!value) return undefined;
    const v = String(value).toUpperCase();
    if (v.includes('DONE') || v.includes('HOÀN THÀNH')) return 'DONE';
    if (v.includes('IN_PROGRESS') || v.includes('ĐANG')) return 'IN_PROGRESS';
    if (v.includes('PENDING') || v.includes('CHƯA')) return 'PENDING';
    return v;
  };

  const getStatusLabel = (code) => {
    const map = {
      vi: {
        PENDING: 'Chưa thực hiện',
        IN_PROGRESS: 'Đang thực hiện',
        DONE: 'Hoàn thành',
      },
      zh: {
        PENDING: '未开始',
        IN_PROGRESS: '进行中',
        DONE: '已完成',
      }
    };
    return map[lang][code] || code || '-';
  };

  const renderStatusTag = (status) => {
    const code = getStatusCode(status);
    let color = 'default';
    if (code === 'DONE') color = 'green';
    else if (code === 'IN_PROGRESS') color = 'blue';
    else if (code === 'PENDING') color = 'orange';
    return <Tag color={color}>{getStatusLabel(code)}</Tag>;
  };

  const labels = {
    vi: {
      header: "Improvement",
      addNew: "Thêm mới",
      stTaskName: "Hạng mục",
      reviewer: "Người phụ trách",
      collaborators: "Người phối hợp",
      improvementEvent: "Loại sự kiện",
      reviewDate: "Thời gian dự kiến HT",
      improvement: "Nội dung cải thiện",
      status: "Trạng thái",
      completed: "Thời gian HT",
      progress: "Tiến độ",
      progressDetail: "Tệp đính kèm",
      actions: "Thao tác",
      searchPlaceholder: "Tìm kiếm theo hạng mục hoặc nội dung cải thiện...",
      filterReviewer: "Lọc theo người phụ trách",
      filterStatus: "Lọc theo trạng thái",
      filterDateLabel: "Lọc theo thời gian dự kiến:",
      dateRangePlaceholder: ["Từ ngày", "Đến ngày"],
      clearFilters: "Xóa bộ lọc",
      confirmDelete: "Xác nhận xóa",
      okDelete: "Xóa",
      cancel: "Hủy",
      sys: "Hệ thống",
      deleteSuccess: "Đã xóa",
      deleteFailed: "Xóa thất bại",
      statusOptions: [
        { value: "PENDING", label: "Chưa thực hiện" },
        { value: "IN_PROGRESS", label: "Đang thực hiện" },
        { value: "DONE", label: "Hoàn thành" },
      ],
      exportPrint: 'Xuất/In',
      exportPDF: 'In PDF',
      exportExcel: 'Xuất Excel'
    },
    zh: {
      header: "問題管理",
      addNew: "新增",
      stTaskName: "任务名称",
      reviewer: "负责人",
      collaborators: "协同人",
      improvementEvent: "事件类型",
      reviewDate: "预计完成时间",
      improvement: "問題管理内容",
      status: "状态",
      completed: "完成时间",
      progress: "进度",
      progressDetail: "附件",
      actions: "操作",
      searchPlaceholder: "按类别或問題管理内容搜索",
      filterReviewer: "按执行人筛选",
      filterStatus: "按状态筛选",
      filterDateLabel: "按预定时间筛选:",
      dateRangePlaceholder: ["开始日期", "结束日期"],
      clearFilters: "清除筛选",
      confirmDelete: "确认删除",
      okDelete: "删除",
      cancel: "取消",
      sys: "系统",
      deleteSuccess: "已删除",
      deleteFailed: "删除失败",
      statusOptions: [
        { value: "PENDING", label: "未开始" },
        { value: "IN_PROGRESS", label: "进行中" },
        { value: "DONE", label: "已完成" },
      ],
      exportPrint: '导出/打印',
      exportPDF: '打印PDF',
      exportExcel: '导出Excel'
    },
  };

  const t = labels[lang];

  const handleExportPDF = () => {
    try {
      // Tạo HTML table để in
      const printWindow = window.open('', '_blank');
      const tableData = filteredRows.map((row, index) => {
        const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
        const statusDisplay = getStatusLabel(getStatusCode(row.status));
        const responsibleDisplay = Array.isArray(row.responsible) 
          ? row.responsible.map(r => getResponsibleDisplay(r)).join(', ')
          : getResponsibleDisplay(row.responsible);
        const collaboratorsDisplay = Array.isArray(row.collaborators)
          ? row.collaborators.map(c => getResponsibleDisplay(c)).join(', ')
          : '-';
        return `
          <tr>
            <td style="text-align: center;">${stt}</td>
            <td style="text-align: left;">${row.category || '-'}</td>
            <td style="text-align: left;">${row.issueDescription || '-'}</td>
            <td style="text-align: left;">${responsibleDisplay}</td>
            <td style="text-align: left;">${collaboratorsDisplay}</td>
            <td style="text-align: center;">${row.improvementEvent?.eventName || row.improvementEventName || '-'}</td>
            <td style="text-align: left;">${formatDateShortVN(row.plannedDueAt)}</td>
            <td style="text-align: left;">${row.completedAt ? formatDateShortVN(row.completedAt) : '-'}</td>
            <td style="text-align: center;">${statusDisplay}</td>
            <td style="text-align: center;">${row.progress != null ? row.progress + '%' : '-'}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${lang === 'vi' ? 'Danh sách cải thiện' : '改善列表'}</title>
          <style>
            @page { 
              margin: 0;
              size: landscape;
            }
            @media print {
              /* Hide all browser-generated headers and footers */
              html, body {
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
            }
            h1 { 
              text-align: center; 
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 30px;
              margin-top: 20px;
              color: #000;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
              font-size: 12px;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
          </style>
        </head>
        <body>
          <h1>${lang === 'vi' ? 'Danh sách cải thiện' : '改善列表'}</h1>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>${t.stTaskName}</th>
                <th>${t.improvement}</th>
                <th>${t.reviewer}</th>
                <th>${t.collaborators}</th>
                <th>${t.improvementEvent}</th>
                <th>${t.reviewDate}</th>
                <th>${t.completed}</th>
                <th>${t.status}</th>
                <th>${t.progress}</th>
              </tr>
            </thead>
            <tbody>
              ${tableData}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      notification.error({
        message: t.sys,
        description: (lang === 'vi' ? 'Lỗi khi in PDF: ' : '打印PDF错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleExportExcel = () => {
    try {
      // Tạo CSV content (có thể mở bằng Excel)
      const headers = [
        'STT',
        t.stTaskName,
        t.improvement,
        t.reviewer,
        t.collaborators,
        t.improvementEvent,
        t.reviewDate,
        t.completed,
        t.status,
        t.progress
      ];

      const csvRows = [
        headers.join(','),
        ...filteredRows.map((row, index) => {
          const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
          const statusDisplay = getStatusLabel(getStatusCode(row.status));
          const responsibleDisplay = Array.isArray(row.responsible) 
            ? row.responsible.map(r => getResponsibleDisplay(r)).join('; ')
            : getResponsibleDisplay(row.responsible);
          const collaboratorsDisplay = Array.isArray(row.collaborators)
            ? row.collaborators.map(c => getResponsibleDisplay(c)).join('; ')
            : '-';
          
          // Escape commas and quotes in CSV
          const escapeCSV = (str) => {
            if (!str) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return `"${s.replace(/"/g, '""')}`;
            }
            return s;
          };

          return [
            stt,
            escapeCSV(row.category || '-'),
            escapeCSV(row.issueDescription || '-'),
            escapeCSV(responsibleDisplay),
            escapeCSV(collaboratorsDisplay),
            escapeCSV(row.improvementEvent?.eventName || row.improvementEventName || '-'),
            escapeCSV(formatDateShortVN(row.plannedDueAt)),
            escapeCSV(row.completedAt ? formatDateShortVN(row.completedAt) : '-'),
            escapeCSV(statusDisplay),
            escapeCSV(row.progress != null ? row.progress + '%' : '-')
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      
      // Add BOM for UTF-8 Excel support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `Improvement_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      notification.error({
        message: t.sys,
        description: (lang === 'vi' ? 'Lỗi khi xuất Excel: ' : '导出Excel错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  // Only ADMIN can delete; USER and MANAGER must not see delete button
  const isAdmin = Array.isArray(quyenList) && quyenList.some(role => 
    role === 'ADMIN' || role === 'ROLE_ADMIN'
  );

  // Check if user can edit or update progress based on completion date and role
  const canEditOrUpdateProgress = (record) => {
    // ADMIN can always edit/update
    if (isAdmin) return true;
    
    // If no completedAt date, allow editing
    if (!record.completedAt) return true;
    
    // Check if completed more than 7 days ago
    const completedDate = new Date(record.completedAt);
    const now = new Date();
    const daysDiff = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
    
    // USER and MANAGER cannot edit if completed more than 7 days ago
    return daysDiff <= 7;
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      render: (_, __, index) => <Tag color="blue">{((pagination.current - 1) * pagination.pageSize) + index + 1}</Tag>,
      width: 80,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
    },
    { title: t.stTaskName, dataIndex: "category", key: "category", align: 'left', onHeaderCell: () => ({ style: { textAlign: 'left' } }) },
    {
      title: t.improvement,
      dataIndex: "issueDescription",
      key: "issueDescription",
      ellipsis: true,
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
    },
    { 
      title: t.reviewer, 
      dataIndex: "responsible", 
      key: "responsible",
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (responsible) => {
        if (!responsible) return '-';
        if (Array.isArray(responsible)) {
          return responsible.length > 0 
            ? responsible.map(resp => getResponsibleDisplay(resp)).join(', ')
            : '-';
        }
        return getResponsibleDisplay(responsible);
      },
      ellipsis: true,
    },
    {
      title: t.collaborators,
      dataIndex: "collaborators",
      key: "collaborators",
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (collaborators) => {
        if (!Array.isArray(collaborators) || collaborators.length === 0) return '-';
        return collaborators.map(collab => getResponsibleDisplay(collab)).join(', ');
      },
      ellipsis: true,
    },
    {
      title: t.improvementEvent,
      dataIndex: "improvementEventName",
      key: "improvementEventName",
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (value, record) => (record.improvementEvent?.eventName || value || '-'),
      ellipsis: true,
    },
    {
      title: t.reviewDate,
      dataIndex: "plannedDueAt",
      key: "plannedDueAt",
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (v) => formatDateShortVN(v),
    },
    {
      title: t.completed,
      dataIndex: 'completedAt',
      key: 'completedAt',
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (v) => formatDateShortVN(v),
    },
    {
      title: t.status,
      dataIndex: "status",
      key: "status",
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (value) => renderStatusTag(value),
    },
    {
      title: t.progress,
      dataIndex: 'progress',
      key: 'progress',
      width: 110,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (v) => (v != null ? `${v}%` : '-')
    },
    { 
      title: t.progressDetail, 
      dataIndex: 'files', 
      key: 'files', 
      width: 120,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (files) => {
        if (!Array.isArray(files) || files.length === 0) return '-';
        const count = files.length;
        return count === 1 ? '1 file' : `${count} files`;
      }
    },
    // Bỏ cột Người tạo theo yêu cầu
    {
      title: <div style={{ textAlign: 'center' }}>{t.actions}</div>,
      key: "action",
      fixed: "right",
      width: 208,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (_, record) => {
        const canEdit = canEditOrUpdateProgress(record);
        const tooltipText = !canEdit 
          ? (lang === 'vi' ? 'Đã quá 7 ngày kể từ Ngày hoàn thành - không thể chỉnh sửa' : '完成7天后不能编辑')
          : '';
        
        return (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button 
            icon={<EyeOutlined style={{ fontSize: '14px' }} />} 
            size="middle" 
            onClick={() => setViewRecord(record)} 
            style={{ minWidth: '36px', height: '36px' }}
          />
          <Button
            type="default"
            icon={<PercentageOutlined style={{ fontSize: '14px' }} />}
            size="middle"
            disabled={!canEdit}
            onClick={() => setProgressRecord(record)}
            title={!canEdit ? tooltipText : (lang === 'vi' ? 'Cập nhật tiến độ' : '更新进度')}
            style={{ minWidth: '36px', height: '36px' }}
          />
          <Button 
            icon={<EditOutlined style={{ fontSize: '14px' }} />} 
            size="middle"
            disabled={!canEdit}
            onClick={() => setEditRecord(record)}
            title={!canEdit ? tooltipText : (lang === 'vi' ? 'Chỉnh sửa' : '编辑')}
            style={{ minWidth: '36px', height: '36px' }}
          />
          {isAdmin && (
          <Popconfirm
            title={t.confirmDelete}
            okText={t.okDelete}
            cancelText={t.cancel}
            onConfirm={async () => {
              try {
                await axios.delete(`/api/improvements/${encodeURIComponent(String(record.improvementID || record.id))}`);
                notification.success({
                  message: t.sys,
                  description: t.deleteSuccess,
                  placement: 'bottomRight'
                });
                fetchData();
              } catch {
                notification.error({
                  message: t.sys,
                  description: t.deleteFailed,
                  placement: 'bottomRight'
                });
              }
            }}
          >
            <Button 
              danger 
              icon={<DeleteOutlined style={{ fontSize: '14px' }} />} 
              size="middle" 
              style={{ minWidth: '36px', height: '36px' }}
            />
          </Popconfirm>
          )}
        </div>
      );
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex',
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff7e6',
          color: '#faad14',
          borderRadius: 8
        }}>
          <LineChartOutlined />
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{lang === 'vi' ? 'Improvement' : t.header}</h2>
      </div>

      {}
      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
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
              style={{ width: 240 }}
              format="DD/MM/YYYY"
            />
            <Select
              placeholder={t.filterStatus}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              allowClear
            >
              {labels.vi.statusOptions.map((opt, idx) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label} / {labels.zh.statusOptions[idx].label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder={lang === 'vi' ? 'Sắp xếp' : '排序'}
              value={sortOrder}
              onChange={setSortOrder}
              style={{ width: 130 }}
              allowClear
            >
              <Select.Option value="newest">{lang === 'vi' ? 'Mới nhất' : '最新'}</Select.Option>
              <Select.Option value="oldest">{lang === 'vi' ? 'Cũ nhất' : '最旧'}</Select.Option>
            </Select>
            <Button onClick={() => { setSearchText(""); setReviewerFilter(undefined); setStatusFilter(undefined); setDateRange([]); setSortOrder(undefined); }}>
              {t.clearFilters}
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'pdf',
                    label: t.exportPDF,
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExportPDF()
                  },
                  {
                    key: 'excel',
                    label: t.exportExcel,
                    icon: <FileExcelOutlined />,
                    onClick: () => handleExportExcel()
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />}>
                {t.exportPrint}
              </Button>
            </Dropdown>
          </Space>
          <Button type="primary" onClick={() => setCreateOpen(true)}>{t.addNew}</Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table 
          className="improvement-table"
          rowKey={(r) => r.improvementID || r.id} 
          dataSource={filteredRows} 
          columns={columns}
          scroll={{ x: 'max-content' }}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: true, showQuickJumper: true }}
          onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
        />
      </Spin>

      <ImprovementDetailModal open={!!viewRecord} record={viewRecord} onCancel={() => setViewRecord(null)} groups={groups} users={users} />
      <ImprovementEditModal open={!!editRecord} record={editRecord} onCancel={() => setEditRecord(null)} onSaved={fetchData} groups={groups} users={users} />
      <ImprovementCreateModal open={createOpen} onCancel={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} groups={groups} users={users} />
      <ImprovementProgressModal 
        open={!!progressRecord} 
        record={progressRecord} 
        onCancel={() => { setProgressRecord(null); fetchData(); }} 
        onSaved={fetchData} 
      />
    </div>
  );
}



