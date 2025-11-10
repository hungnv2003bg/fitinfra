import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Tag, Spin, message, Upload, Input, DatePicker, Select, Space, Modal, Descriptions, Form, List, notification, Dropdown } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { UploadOutlined, ArrowLeftOutlined, EyeOutlined, SwapOutlined, DeleteOutlined, MailOutlined, DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { validateFileSize, formatFileSize } from "../utils/fileUtils";
import { formatDateShortVN } from "../utils/dateUtils";
import axios from "../plugins/axios";
import API_CONFIG from "../config/api";
import { useSelector } from "react-redux";
import { useLanguage } from "../contexts/LanguageContext";

const LOCATIONS = ["F01", "F02", "F03", "F04", "F05"];

export default function ChecklistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nguoiDung, quyenList } = useSelector(state => state.user);
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [task, setTask] = useState(null);
  const [employees, setEmployees] = useState(["Anh Mạnh", "Tùng Lâm", "Vũ Hùng", "Hưng Nguyễn"]);
  const [viewRecord, setViewRecord] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [editStatusRecord, setEditStatusRecord] = useState(null);
  const [statusForm] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [sendingMail, setSendingMail] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [groupFilter, setGroupFilter] = useState(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const isDetailId = window.location.pathname.includes('/checklist-detail/');
      
      if (isDetailId) {
        const res = await axios.get(`/api/checklist-details/${id}`);
        const detail = res.data;
        
        if (detail) {
          const normalized = {
            ...detail,
            createdAt: detail.createdAt || detail.created_at || null,
            scheduledAt: detail.scheduledAt || detail.scheduled_at || null,
            deadlineAt: detail.deadlineAt || detail.deadline_at || null,
            abnormalInfo: detail.abnormalInfo || detail.abnormal_info || "",
            workContent: detail.workContent || detail.work_content || "",
            note: detail.note || "",
            taskName: detail.taskName || detail.task_name || "",
            files: Array.isArray(detail.files) ? detail.files : [],
            completedAt: (detail.status === 'COMPLETED' || detail.status === 'DONE') ? (detail.last_edited_at || detail.lastEditedAt || detail.completedAt) : null,
            status: detail.status || detail.state || "",
          };
          setRows([normalized]);
        } else {
          setRows([]);
        }
      } else {
        const params = { parentId: String(id) };
        if (statusFilter) params.status = statusFilter;
        if (groupFilter) params.groupId = groupFilter;
        if (searchText) params.q = searchText;
        const res = await axios.get(`/api/checklist-details`, { params });
        const data = res.data;
        const items = Array.isArray(data) ? data : [];
        
        const normalizedItems = items.map(item => ({
          ...item,
          createdAt: item.createdAt || item.created_at || null,
          scheduledAt: item.scheduledAt || item.scheduled_at || null,
          deadlineAt: item.deadlineAt || item.deadline_at || null,
          abnormalInfo: item.abnormalInfo || item.abnormal_info || "",
          workContent: item.workContent || item.work_content || "",
          note: item.note || "",
          taskName: item.taskName || item.task_name || "",
          files: Array.isArray(item.files) ? item.files : [],
          completedAt: (item.status === 'COMPLETED' || item.status === 'DONE') ? (item.last_edited_at || item.lastEditedAt || item.completedAt) : null,
          status: item.status || item.state || "",
        }));
        setRows(normalizedItems);
      }
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, groupFilter, searchText]);


  const ensureWeeklyRows = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), 7, 1);
      start.setHours(7, 0, 0, 0);


      const firstMonday = new Date(start);
      const d = firstMonday.getDay();
      const delta = (d === 0 ? 1 : (d > 1 ? 8 - d : 0));
      firstMonday.setDate(firstMonday.getDate() + delta);

      for (let week = new Date(firstMonday); week <= now; week.setDate(week.getDate() + 7)) {
        const weekKey = `${week.getFullYear()}-${Math.ceil(((week - new Date(week.getFullYear(),0,1)) / 86400000 + new Date(week.getFullYear(),0,1).getDay()+1)/7)}`;

        const existedRes = await axios.get(`/api/checklist-weekly`, { params: { parentId: String(id), weekKey } });
        const existed = existedRes.data;
        if (Array.isArray(existed) && existed.length > 0) continue;

        const batchId = `${id}-${weekKey}`;
        await axios.post("/api/checklist-weekly", { id: batchId, parentId: id, weekKey, createdAt: new Date().toISOString() });

        for (let index = 0; index < LOCATIONS.length; index++) {
          const payload = {
            id: `${batchId}-${LOCATIONS[index]}`,
            parentId: id,
            weekKey,
            stt: index + 1,
            location: LOCATIONS[index],
            reviewer: "",
            reviewDate: null,
            upload: [],
            improvement: "",
            createdAt: new Date().toISOString(),
            status: "Chưa thực hiện",
          };
          await axios.post("/api/checklist-details", payload);
        }
      }
    } catch (e) {

    }
  }, [id]);

  useEffect(() => {
    ensureWeeklyRows().then(fetchData);

    (async () => {
      try {
        const res = await axios.get(`/api/checklists/${encodeURIComponent(String(id))}`);
        const data = res.data;
        setTask(data || null);
      } catch {
        setTask(null);
      }
    })();

    (async () => {
      try {
        const [groupsRes, usersRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/users"),
        ]);
        setGroups(groupsRes.data || []);
        setUsers(usersRes.data || []);
      } catch (e) {
        setGroups([]);
        setUsers([]);
      }
    })();
  }, [ensureWeeklyRows, fetchData]);

  const handleUpdate = async (record, patch) => {
    try {
      setLoading(true);
      await axios.patch(`/api/checklist-details/${encodeURIComponent(String(record.id))}`, patch);
      fetchData();
    } catch (e) {
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: lang === 'vi' ? 'Cập nhật thất bại' : '更新失败',
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, taskName, checklistDetailName) => {
    const formData = new FormData();
    formData.append('file', file);
    if (taskName) formData.append('sopName', taskName);
    if (checklistDetailName) formData.append('sopDocumentName', checklistDetailName);
    
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/checklist-upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    return result;
  };

  

  const getImplementerDisplay = (implementer) => {
    if (!implementer) return '-';
    if (typeof implementer === 'string') {
      const [type, idStr] = implementer.split(':');
      const id = Number(idStr);
      if (type === 'group') {
        const g = groups.find(x => x.id === id);
        return g?.name || (lang === 'vi' ? `Nhóm ${id}` : `组 ${id}`);
      }
      if (type === 'user') {
        const u = users.find(x => x.userID === id);
        return (u?.fullName || u?.manv || (lang === 'vi' ? `User ${id}` : `用户 ${id}`));
      }
    }
    return String(implementer);
  };

  const getNextStatus = (status) => {
    if (status === 'IN_PROGRESS') return 'COMPLETED';
    if (status === 'COMPLETED') return 'CANCELLED';
    return 'IN_PROGRESS';
  };

  const getStatusDisplay = (status) => {
    if (lang === 'zh') {
      switch (status) {
        case 'IN_PROGRESS': return '进行中';
        case 'COMPLETED': return '已完成';
        case 'CANCELLED': return '已取消';
        case 'PENDING': return '进行中';
        case 'DONE': return '已完成';
        default: return status || '进行中';
      }
    }
    switch (status) {
      case 'IN_PROGRESS': return 'Đang xử lý';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      case 'PENDING': return 'Đang xử lý';
      case 'DONE': return 'Hoàn thành';
      default: return status || 'Đang xử lý';
    }
  };

  const handleSendMail = async (record) => {
    try {
      setSendingMail(true);
      await axios.post(`/api/checklist-details/${encodeURIComponent(String(record.id))}/send-mail`);
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: lang === 'vi' ? 'Đã gửi mail tới người thực hiện' : '已发送邮件给执行人',
        placement: 'bottomRight',
      });
    } catch (error) {
      console.error('Error sending mail:', error);
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: (lang === 'vi' ? 'Gửi mail thất bại: ' : '发送邮件失败: ') + (error.response?.data?.message || error.message),
        placement: 'bottomRight'
      });
    } finally {
      setSendingMail(false);
    }
  };

  const isEditLocked = (record) => {
    const isAdmin = Array.isArray(quyenList) && quyenList.some(role => 
      role === 'ADMIN' || role === 'ROLE_ADMIN'
    );
    
    if (isAdmin) {
      return false; 
    }
    
    if (!record?.completedAt) return false;
    try {
      const completed = dayjs(record.completedAt);
      if (!completed.isValid()) return false;
      return completed.isBefore(dayjs().subtract(7, 'day'));
    } catch {
      return false;
    }
  };

  const t = lang === 'zh' ? {
    back: '返回',
    header: '工作详情',
    stt: 'STT',
    taskName: '任务名称',
    workContent: '工作内容',
    implementer: '执行人',
    createdAt: '创建日期',
    deadlineAt: '完成期限',
    completedAt: '完成日期',
    status: '状态',
    actions: '操作',
    changeStatus: '更改状态 / 更新',
    view: '查看',
    modalUpdateTitle: '更新状态',
    save: '保存',
    attach: '附件',
    existingFiles: '已有文件',
    removeFile: '从记录中删除此文件',
    chooseFiles: '选择文件',
    fileTooLarge: '文件太大',
    updated: '已更新',
    updateFailed: '更新失败',
    note: '备注',
    notePh: '输入备注',
    abnormal: '异常（异常将被转到改进部分）',
    abnormalPh: '描述异常',
    viewTitle: '查看详情',
    mustDoAt: '必须执行时间',
    attachments: '附件',
    openImprovement: '打开改进列表',
    lockMsg: '距离完成日期已超过7天 - 无法编辑',
    sendMail: '发送邮件提醒需要完成的工作',
    selectStatus: '请选择状态',
    uploadFileError: '上传文件错误',
    exportPrint: '导出/打印',
    exportPDF: '打印PDF',
    exportExcel: '导出Excel'
  } : {
    back: 'Quay lại',
    header: 'Chi tiết công việc',
    stt: 'STT',
    taskName: 'Tên công việc',
    workContent: 'Nội dung công việc',
    implementer: 'Người thực hiện',
    createdAt: 'Ngày tạo',
    deadlineAt: 'Hạn hoàn thành',
    completedAt: 'Ngày hoàn thành',
    status: 'Trạng thái',
    actions: 'Thao tác',
    changeStatus: 'Đổi trạng thái / cập nhật',
    view: 'Xem',
    modalUpdateTitle: 'Cập nhật trạng thái',
    save: 'Lưu',
    attach: 'Tài liệu đính kèm',
    existingFiles: 'File đã có',
    removeFile: 'Xóa file này khỏi bản ghi',
    chooseFiles: 'Chọn tài liệu',
    fileTooLarge: 'File quá lớn',
    updated: 'Đã cập nhật',
    updateFailed: 'Cập nhật thất bại',
    note: 'Ghi chú',
    notePh: 'Nhập ghi chú',
    abnormal: 'Bất thường (Bất thường sẽ được chuyển đến phần Improvement)',
    abnormalPh: 'Mô tả bất thường',
    viewTitle: 'Xem chi tiết',
    mustDoAt: 'Thời gian phải làm',
    attachments: 'Tệp đính kèm',
    openImprovement: 'Mở danh sách Improvement',
    lockMsg: 'Đã quá 7 ngày kể từ Ngày hoàn thành - không thể chỉnh sửa',
    sendMail: 'Gửi mail nhắc việc cần hoàn thành',
    selectStatus: 'Chọn trạng thái',
    uploadFileError: 'Lỗi upload file',
    exportPrint: 'Xuất/In',
    exportPDF: 'In PDF',
    exportExcel: 'Xuất Excel'
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const tableData = rows.map((row, index) => {
        const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
        const statusDisplay = getStatusDisplay(row.status);
        const implementerDisplay = getImplementerDisplay(row.implementer);
        return `
          <tr>
            <td>${stt}</td>
            <td>${row.taskName || '-'}</td>
            <td>${row.workContent || '-'}</td>
            <td>${implementerDisplay}</td>
            <td>${formatDateShortVN(row.createdAt)}</td>
            <td>${row.deadlineAt ? formatDateShortVN(row.deadlineAt) : '-'}</td>
            <td>${row.completedAt ? formatDateShortVN(row.completedAt) : '-'}</td>
            <td>${statusDisplay}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${task?.taskName || t.header}</title>
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
          <h1>${task?.taskName || t.header}</h1>
          <table>
            <thead>
              <tr>
                <th>${t.stt}</th>
                <th>${t.taskName}</th>
                <th>${t.workContent}</th>
                <th>${t.implementer}</th>
                <th>${t.createdAt}</th>
                <th>${t.deadlineAt}</th>
                <th>${t.completedAt}</th>
                <th>${t.status}</th>
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
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: lang === 'vi' ? 'Lỗi khi in PDF: ' + error.message : '打印PDF错误: ' + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        t.stt,
        t.taskName,
        t.workContent,
        t.implementer,
        t.createdAt,
        t.deadlineAt,
        t.completedAt,
        t.status
      ];

      const csvRows = [
        headers.join(','),
        ...rows.map((row, index) => {
          const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
          const statusDisplay = getStatusDisplay(row.status);
          const implementerDisplay = getImplementerDisplay(row.implementer);
          
          // Escape commas and quotes in CSV
          const escapeCSV = (str) => {
            if (!str) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          };

          return [
            stt,
            escapeCSV(row.taskName || '-'),
            escapeCSV(row.workContent || '-'),
            escapeCSV(implementerDisplay),
            escapeCSV(formatDateShortVN(row.createdAt)),
            escapeCSV(row.deadlineAt ? formatDateShortVN(row.deadlineAt) : '-'),
            escapeCSV(row.completedAt ? formatDateShortVN(row.completedAt) : '-'),
            escapeCSV(statusDisplay)
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `${task?.taskName || 'Checklist'}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: lang === 'vi' ? 'Lỗi khi xuất Excel: ' + error.message : '导出Excel错误: ' + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const columns = [
    { title: t.stt, key: "stt", width: 70, render: (_, __, index) => <Tag color="blue">{((pagination.current - 1) * pagination.pageSize) + index + 1}</Tag> },
    { title: t.taskName, dataIndex: "taskName", key: "taskName", width: 220, render: (v) => v || '-' },
    { title: t.workContent, dataIndex: "workContent", key: "workContent", width: 240, render: (v) => v || '-' },
    {
      title: t.implementer,
      dataIndex: "implementer",
      key: "implementer",
      width: 160,
      render: (v) => <Tag color="geekblue">{getImplementerDisplay(v)}</Tag>,
    },
    { title: t.createdAt, dataIndex: "createdAt", key: "createdAt", width: 180, render: (v) => formatDateShortVN(v) },
    { title: t.deadlineAt, dataIndex: "deadlineAt", key: "deadlineAt", width: 180, render: (v) => v ? formatDateShortVN(v) : '-' },
    { title: t.completedAt, dataIndex: "completedAt", key: "completedAt", width: 180, render: (v) => v ? formatDateShortVN(v) : '-' },
    {
      title: t.status,
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v) => (
        <Tag color={v === 'COMPLETED' || v === 'DONE' ? 'green' : v === 'IN_PROGRESS' || v === 'PENDING' ? 'blue' : v === 'CANCELLED' ? 'red' : 'default'}>
          {getStatusDisplay(v)}
        </Tag>
      ),
    },
    {
      title: t.actions,
      key: "action",
      fixed: "right",
      width: 200,
      align: "center",
      render: (_, record) => {
        const locked = isEditLocked(record);
        const isCompleted = record.status === 'COMPLETED' || record.status === 'DONE';
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button 
              size="small" 
              icon={<SwapOutlined style={{ fontSize: '16px' }} />} 
              title={locked ? t.lockMsg : t.changeStatus}
              disabled={locked}
              onClick={() => {
                if (locked) {
                  notification.warning({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: t.lockMsg, placement: 'bottomRight' });
                  return;
                }
                setEditStatusRecord(record);
                setUploadedFiles([]);
                setExistingFiles(Array.isArray(record.files) ? record.files : []);
                statusForm.setFieldsValue({
                  status: record.status || 'IN_PROGRESS',
                  uploadFile: record.uploadFile || '',
                  note: record.note || '',
                  abnormalInfo: record.abnormalInfo || '',
                });
              }}
            />
            <Button 
              size="small" 
              icon={<EyeOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => setViewRecord(record)} 
              title={t.view} 
            />
            <Button 
              size="small" 
              icon={<MailOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => handleSendMail(record)} 
              title={t.sendMail}
              loading={sendingMail}
              disabled={isCompleted}
              type={!isCompleted ? 'primary' : 'default'}
            />
          </div>
        );
      }
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>{t.back}</Button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {task?.taskName || t.header}
        </h2>
        <div />
      </div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          placeholder={lang === 'vi' ? 'Tìm theo tên/nội dung công việc...' : '按任务名称/内容搜索'}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder={lang === 'vi' ? 'Lọc theo trạng thái' : '按状态筛选'}
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 200 }}
        >
          <Select.Option value="IN_PROGRESS">{lang === 'vi' ? 'Đang xử lý' : '进行中'}</Select.Option>
          <Select.Option value="COMPLETED">{lang === 'vi' ? 'Hoàn thành' : '已完成'}</Select.Option>
          <Select.Option value="CANCELLED">{lang === 'vi' ? 'Đã hủy' : '已取消'}</Select.Option>
        </Select>
        <Select
          placeholder={lang === 'vi' ? 'Lọc theo nhóm' : '按组筛选'}
          allowClear
          value={groupFilter}
          onChange={setGroupFilter}
          style={{ width: 220 }}
        >
          {groups.map(g => (
            <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
          ))}
        </Select>
        <Button onClick={() => { setStatusFilter(undefined); setGroupFilter(undefined); setSearchText(""); }}>
          {lang === 'vi' ? 'Xóa bộ lọc' : '清除筛选'}
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
      </div>
      <Spin spinning={loading}>
        <Table 
          rowKey="id" 
          dataSource={rows} 
          columns={columns}
          scroll={{ x: 1300 }}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: true, showQuickJumper: true }}
          onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
        />
      </Spin>
      {}

      {}
      <Modal
        title={t.modalUpdateTitle}
        open={!!editStatusRecord}
        onCancel={() => setEditStatusRecord(null)}
        okText={t.save}
        width={620}
        style={{ top: 50 }}
        centered={false}
        onOk={async () => {
          try {
            const values = await statusForm.validateFields();
            
            // Upload files if any
            let newUploadedFiles = [];
            if (uploadedFiles.length > 0) {
              console.log('Starting file upload for checklist detail...', uploadedFiles);
              for (const file of uploadedFiles) {
                if (file.originFileObj) {
                  try {
                    console.log('Uploading file:', file.name, 'to task:', task?.taskName);
                    const uploadResult = await uploadFile(file.originFileObj, task?.taskName, values.title);
                    console.log('Upload result:', uploadResult);
                    
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    let fileType = 'other';
                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
                      fileType = 'image';
                    } else if (['pdf'].includes(fileExtension)) {
                      fileType = 'pdf';
                    } else if (['txt', 'doc', 'docx'].includes(fileExtension)) {
                      fileType = 'document';
                    }
                    
                    newUploadedFiles.push({
                      filePath: uploadResult.url,
                      fileName: uploadResult.name,
                      fileType: fileType,
                      fileSize: file.originFileObj.size
                    });
                  } catch (error) {
                    console.error('Error uploading file:', file.name, error);
                    notification.error({ 
                      message: lang === 'vi' ? 'Hệ thống' : '系统', 
                      description: `${t.uploadFileError} ${file.name}: ${error.message}`, 
                      placement: 'bottomRight' 
                    });
                  }
                }
              }
            }
            
            const updateData = {
              status: values.status,
              uploadFile: values.uploadFile || undefined,
              note: values.note?.trim() || null,
              abnormalInfo: values.abnormalInfo?.trim() || null,
              lastEditedBy: nguoiDung?.userID,
            };

            const existing = Array.isArray(existingFiles) ? existingFiles.map(f => ({
              filePath: f.filePath,
              fileName: f.fileName,
              fileType: f.fileType,
              fileSize: f.fileSize,
            })) : [];
            const allFiles = [...existing, ...newUploadedFiles];
            updateData.files = allFiles;
            
            await axios.patch(`/api/checklist-details/${encodeURIComponent(String(editStatusRecord.id))}`, updateData);
            notification.success({
              message: lang === 'vi' ? 'Hệ thống' : '系统',
              description: t.updated,
              placement: 'bottomRight',
            });
            setEditStatusRecord(null);
            setUploadedFiles([]);
            setExistingFiles([]);
            fetchData();
          } catch (e) {
            if (e?.response) {
              notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: t.updateFailed, placement: 'bottomRight' });
            }
          }
        }}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label={t.status} rules={[{ required: true, message: t.selectStatus }]}>
            <Select
              options={[
                { value: 'IN_PROGRESS', label: lang === 'vi' ? 'Đang xử lý' : '进行中' },
                { value: 'COMPLETED', label: lang === 'vi' ? 'Hoàn thành' : '已完成' },
                { value: 'CANCELLED', label: lang === 'vi' ? 'Đã hủy' : '已取消' },
              ]}
            />
          </Form.Item>

          <Form.Item label={t.attach}>
            {existingFiles?.length > 0 && (
              <List
                header={<div>{t.existingFiles}</div>}
                size="small"
                dataSource={existingFiles}
                style={{ marginBottom: 8 }}
                renderItem={(f, i) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => setExistingFiles(prev => prev.filter((_, index) => index !== i))}
                        title={t.removeFile}
                      />
                    ]}
                  >
                    <Tag color="green">#{i + 1}</Tag>
                    <span style={{ marginLeft: 8 }}>{f.fileName || 'file'}</span>
                    {typeof f.fileSize === 'number' && (
                      <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>({formatFileSize(f.fileSize)})</span>
                    )}
                  </List.Item>
                )}
              />
            )}
            <Upload
              key={editStatusRecord ? 'upload-' + editStatusRecord.id : 'upload'}
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                if (!validateFileSize(file)) {
                  notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: t.fileTooLarge, placement: 'bottomRight' });
                  return false;
                }
                return false; 
              }}
              onChange={async (info) => {
                const { fileList } = info;
                const newFiles = fileList.filter(f => f.originFileObj);
                
                const mapped = newFiles.map(f => ({ 
                  uid: f.uid, 
                  name: f.name, 
                  originFileObj: f.originFileObj 
                }));

                setUploadedFiles(prevFiles => {
                  const existingNames = prevFiles.map(f => f.name);
                  const uniqueNewFiles = mapped.filter(f => !existingNames.includes(f.name));
                  return [...prevFiles, ...uniqueNewFiles];
                });
              }}
            >
              <Button icon={<UploadOutlined />} size="small">{t.chooseFiles}</Button>
            </Upload>

            {uploadedFiles?.length > 0 && (
              <List 
                style={{ marginTop: 12 }}
                size="small"
                dataSource={uploadedFiles}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))} 
                      />
                    ]}
                  >
                    <Tag color="blue">#{index + 1}</Tag>
                    <span style={{ marginLeft: 8 }}>{file.name}</span>
                    <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                      ({formatFileSize(file.originFileObj.size)})
                    </span>
                  </List.Item>
                )}
              />
            )}
          </Form.Item>

          <Form.Item name="note" label={t.note}>
            <Input.TextArea rows={3} placeholder={t.notePh} />
          </Form.Item>

          <Form.Item name="abnormalInfo" label={t.abnormal}>
            {editStatusRecord?.hasCompletedImprovement && (
              <div style={{ 
                marginBottom: 8, 
                padding: '8px 12px', 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: 4,
                color: '#52c41a',
                fontSize: '13px',
                fontWeight: 500
              }}>
                ✓ {lang === 'vi' ? 'Bất thường đã được xử lý' : '异常已处理'}
              </div>
            )}
            <Input.TextArea 
              rows={3} 
              placeholder={t.abnormalPh} 
              disabled={editStatusRecord?.hasCompletedImprovement}
              style={editStatusRecord?.hasCompletedImprovement ? { 
                backgroundColor: '#f5f5f5', 
                cursor: 'not-allowed',
                color: '#000000d9',
                WebkitTextFillColor: '#000000d9'
              } : {}}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={t.viewTitle} open={!!viewRecord} onCancel={() => setViewRecord(null)} footer={null}>
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t.taskName}>{viewRecord.taskName || '-'}</Descriptions.Item>
            <Descriptions.Item label={t.workContent}>{viewRecord.workContent || '-'}</Descriptions.Item>
            <Descriptions.Item label={t.implementer}>{getImplementerDisplay(viewRecord.implementer)}</Descriptions.Item>
            <Descriptions.Item label={t.createdAt}>{formatDateShortVN(viewRecord.createdAt)}</Descriptions.Item>
            <Descriptions.Item label={t.deadlineAt}>{viewRecord.deadlineAt ? formatDateShortVN(viewRecord.deadlineAt) : '-'}</Descriptions.Item>
            <Descriptions.Item label={t.status}>{getStatusDisplay(viewRecord.status)}</Descriptions.Item>
            <Descriptions.Item label={t.note}>{viewRecord.note || '-'}</Descriptions.Item>
            <Descriptions.Item label={t.abnormal}>
              {viewRecord.abnormalInfo ? (
                <a
                  href={`/improvement?detailId=${encodeURIComponent(String(viewRecord.id))}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/improvement?detailId=${encodeURIComponent(String(viewRecord.id))}`); }}
                  style={{ color: '#1677ff' }}
                  title={t.openImprovement}
                >
                  {viewRecord.abnormalInfo}
                </a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t.attachments}>
              {Array.isArray(viewRecord.files) && viewRecord.files.length > 0 ? (
                <List
                  size="small"
                  dataSource={viewRecord.files}
                  renderItem={(f, i) => (
                    <List.Item>
                      <Tag color="blue">#{i + 1}</Tag>
                      <a
                        style={{ marginLeft: 8 }}
                        href={`${API_CONFIG.BACKEND_URL}${f.filePath || ''}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.fileName || 'file'}
                      </a>
                    </List.Item>
                  )}
                />
              ) : '-' }
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}



