import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Tag, Spin, message, Upload, Input, DatePicker, Select, Space, Modal, Descriptions, Form, List } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { UploadOutlined, ArrowLeftOutlined, EyeOutlined, SwapOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { validateFileSize, formatFileSize } from "../utils/fileUtils";
import { formatDateShortVN } from "../utils/dateUtils";
import axios from "../plugins/axios";
import API_CONFIG from "../config/api";
import { useSelector } from "react-redux";

const LOCATIONS = ["F01", "F02", "F03", "F04", "F05"];

export default function ChecklistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nguoiDung } = useSelector(state => state.user);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [task, setTask] = useState(null);
  const [employees, setEmployees] = useState(["Anh Mạnh", "Tùng Lâm", "Vũ Hùng", "Hưng Nguyễn"]);
  const [viewRecord, setViewRecord] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [editStatusRecord, setEditStatusRecord] = useState(null);
  const [statusForm] = Form.useForm();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/checklist-details`, { params: { parentId: String(id) } });
      const data = res.data;
      const items = Array.isArray(data) ? data : [];
      // Normalize snake_case fields from backend to camelCase for UI rendering
      const normalized = items.map((item) => ({
        ...item,
        createdAt: item.createdAt || item.created_at || null,
        scheduledAt: item.scheduledAt || item.scheduled_at || null,
        deadlineAt: item.deadlineAt || item.deadline_at || null,
        abnormalInfo: item.abnormalInfo || item.abnormal_info || "",
        // map backend work_content/workContent into workContent which drives "Nội dung công việc"
        workContent: item.workContent || item.work_content || "",
        note: item.note || "",
        taskName: item.taskName || item.task_name || "",
        files: Array.isArray(item.files) ? item.files : [],
        completedAt: (item.status === 'COMPLETED' || item.status === 'DONE') ? (item.last_edited_at || item.lastEditedAt || item.completedAt) : null,
        status: item.status || item.state || "",
      }));
      setRows(normalized);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id]);


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

    // fetch groups and users for implementer display
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
      message.error({
        content: "Cập nhật thất bại",
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
        return g?.name || `Nhóm ${id}`;
      }
      if (type === 'user') {
        const u = users.find(x => x.userID === id);
        return (u?.fullName || u?.manv || `User ${id}`);
      }
    }
    // fallback: maybe already name
    return String(implementer);
  };

  const getNextStatus = (status) => {
    if (status === 'IN_PROGRESS') return 'COMPLETED';
    if (status === 'COMPLETED') return 'CANCELLED';
    return 'IN_PROGRESS';
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'IN_PROGRESS': return 'Đang xử lý';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      case 'PENDING': return 'Đang xử lý';
      case 'DONE': return 'Hoàn thành';
      default: return status || 'Đang xử lý';
    }
  };

  // Lock editing if an item has a completedAt older than 7 days
  const isEditLocked = (record) => {
    if (!record?.completedAt) return false;
    try {
      const completed = dayjs(record.completedAt);
      if (!completed.isValid()) return false;
      return completed.isBefore(dayjs().subtract(7, 'day'));
    } catch {
      return false;
    }
  };


  const t = {
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
    abnormal: 'Bất thường',
    abnormalPh: 'Mô tả bất thường',
    viewTitle: 'Xem chi tiết',
    mustDoAt: 'Thời gian phải làm',
    attachments: 'Tệp đính kèm',
    openImprovement: 'Mở danh sách Improvement'
  };

  const columns = [
    { title: t.stt, key: "stt", width: 70, render: (_, __, index) => <Tag color="blue">{index + 1}</Tag> },
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
      width: 160,
      align: "center",
      render: (_, record) => {
        const locked = isEditLocked(record);
        const lockMsg = 'Đã quá 7 ngày kể từ Ngày hoàn thành - không thể chỉnh sửa';
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button 
              size="small" 
              icon={<SwapOutlined style={{ fontSize: '16px' }} />} 
              title={locked ? lockMsg : t.changeStatus}
              disabled={locked}
              onClick={() => {
                if (locked) {
                  message.warning({ content: lockMsg, placement: 'bottomRight' });
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
      <Spin spinning={loading}>
        <Table 
          rowKey="id" 
          dataSource={rows} 
          columns={columns}
          scroll={{ x: 1300 }}
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
                    message.error({ content: `Lỗi upload file ${file.name}: ${error.message}`, placement: 'bottomRight' });
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

            // Gửi danh sách file đầy đủ (file cũ còn giữ + file mới thêm)
            const existing = Array.isArray(existingFiles) ? existingFiles.map(f => ({
              filePath: f.filePath,
              fileName: f.fileName,
              fileType: f.fileType,
              fileSize: f.fileSize,
            })) : [];
            const allFiles = [...existing, ...newUploadedFiles];
            // Luôn gửi trường files để backend biết cần xóa file nào
            updateData.files = allFiles;
            
            await axios.patch(`/api/checklist-details/${encodeURIComponent(String(editStatusRecord.id))}`, updateData);
            message.success({ content: t.updated, placement: 'bottomRight' });
            setEditStatusRecord(null);
            setUploadedFiles([]);
            setExistingFiles([]);
            fetchData();
          } catch (e) {
            // ignore if validation error
            if (e?.response) {
              message.error({ content: t.updateFailed, placement: 'bottomRight' });
            }
          }
        }}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label={t.status} rules={[{ required: true, message: 'Chọn trạng thái' }]}>
            <Select
              options={[
                { value: 'IN_PROGRESS', label: 'Đang xử lý' },
                { value: 'COMPLETED', label: 'Hoàn thành' },
                { value: 'CANCELLED', label: 'Đã hủy' },
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
                  message.error({ content: t.fileTooLarge, placement: 'bottomRight' });
                  return false;
                }
                return false; // prevent auto upload; we manage list in onChange
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
            <Input.TextArea rows={3} placeholder={t.abnormalPh} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={t.viewTitle} open={!!viewRecord} onCancel={() => setViewRecord(null)} footer={null}>
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t.taskName}>{viewRecord.taskName || '-'}</Descriptions.Item>
            <Descriptions.Item label={t.workContent}>{viewRecord.workContent || '-'}</Descriptions.Item>
            <Descriptions.Item label={t.implementer}>{getImplementerDisplay(viewRecord.implementer)}</Descriptions.Item>
            <Descriptions.Item label={t.mustDoAt}>{formatDateShortVN(viewRecord.scheduledAt)}</Descriptions.Item>
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



