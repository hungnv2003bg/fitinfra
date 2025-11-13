import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, InputNumber, Input, notification, Table, Divider, Popconfirm, Button, Space, Upload, List, Tag, Select, Descriptions } from "antd";
import { EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import { formatDateShortVN } from "../../utils/dateUtils";
import API_CONFIG from "../../config/api";
import { validateFileSizeAsync } from "../../utils/fileUtils";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ImprovementProgressModal({ open, record, onCancel, onSaved }) {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const { nguoiDung } = useSelector(state => state.user);
  const [progressList, setProgressList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [files, setFiles] = useState([]);
  const [improvementFileCount, setImprovementFileCount] = useState(0);
  const [editFiles, setEditFiles] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  
  const t = lang === 'zh' ? {
    title: '更新进度',
    editTitle: '编辑进度',
    viewTitle: '进度详情',
    progress: '进度 (%)',
    progressPh: '请输入进度: 5% 10% ...',
    progressRequired: '请输入进度',
    progressDetail: '进度内容',
    progressDetailPh: '描述详细进度',
    status: '状态',
    files: '附件',
    chooseFile: '选择文件',
    existingFiles: '现有文件',
    filesToAdd: '将添加的文件',
    completionProgress: '完成进度',
    time: '时间',
    content: '内容',
    quantity: '数量',
    actions: '操作',
    deleteConfirm: '删除此进度？',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    maxProgress: '总进度最多为 100%',
    sys: '系统',
    loadFailed: '加载进度历史失败',
    exceedProgress: '总进度超过 100%。请输入小于或等于剩余百分比的值。',
    uploadFailed: '文件上传失败',
    updateSuccess: '更新进度成功',
    updateFailed: '更新进度失败',
    exceedEdit: '总进度超过 100%。请减少值以使总数不超过 100%。',
    deleteSuccess: '删除进度成功',
    deleteFailed: '删除进度失败',
    uploadError: '上传错误',
    noFiles: '无文件',
    statusOptions: [
      { value: 0, label: '未开始' },
      { value: 1, label: '进行中' },
      { value: 2, label: '已完成' },
    ],
  } : {
    title: 'Cập nhật tiến độ',
    editTitle: 'Sửa tiến độ',
    viewTitle: 'Chi tiết tiến độ',
    progress: 'Tiến độ (%)',
    progressPh: 'Vui lòng nhập tiến độ: 5% 10% ...',
    progressRequired: 'Nhập tiến độ',
    progressDetail: 'Nội dung tiến độ',
    progressDetailPh: 'Mô tả chi tiết tiến độ',
    status: 'Trạng thái',
    files: 'Tài liệu đính kèm',
    chooseFile: 'Chọn tài liệu',
    existingFiles: 'Tài liệu hiện có',
    filesToAdd: 'File sẽ thêm',
    completionProgress: 'Tiến độ hoàn thành công việc',
    time: 'Thời gian',
    content: 'Nội dung',
    quantity: 'Số lượng',
    actions: 'Thao tác',
    deleteConfirm: 'Xóa tiến độ này?',
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    maxProgress: 'Tổng tiến độ tối đa là 100%',
    sys: 'Hệ thống',
    loadFailed: 'Tải lịch sử tiến độ thất bại',
    exceedProgress: 'Tổng tiến độ vượt 100%. Vui lòng nhập giá trị nhỏ hơn hoặc bằng phần trăm còn lại.',
    uploadFailed: 'Upload file thất bại',
    updateSuccess: 'Đã cập nhật tiến độ',
    updateFailed: 'Cập nhật tiến độ thất bại',
    exceedEdit: 'Tổng tiến độ vượt 100%. Vui lòng giảm giá trị để tổng không vượt 100%.',
    deleteSuccess: 'Đã xóa tiến độ',
    deleteFailed: 'Xóa tiến độ thất bại',
    uploadError: 'Lỗi upload',
    noFiles: 'Không có tài liệu',
    statusOptions: [
      { value: 0, label: 'Chưa thực hiện' },
      { value: 1, label: 'Đang thực hiện' },
      { value: 2, label: 'Hoàn thành' },
    ],
  };
  
  const statusOptions = t.statusOptions;

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        progress: undefined,
        progressDetail: record.progressDetail || "",
        status: typeof record.status === 'number' ? record.status : 0
      });
      const exist = Array.isArray(record?.files) ? record.files : [];
      setImprovementFileCount(exist.length);
      setCurrentFiles(exist);
      if (open) loadProgress();
    } else {
      form.resetFields();
      setProgressList([]);
      setFiles([]);
      setImprovementFileCount(0);
      setCurrentFiles([]);
    }
  }, [record, open]);

  useEffect(() => {
    if (open) {
      setFiles([]);
    }
  }, [open]);

  useEffect(() => {
    if (open) setInputProgress(undefined);
  }, [open]);

  const loadProgress = async () => {
    if (!record) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}/progress`);
      const list = Array.isArray(res.data) ? res.data : [];
      const sorted = [...list].sort((a, b) => {
        const t1 = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const t2 = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return t1 - t2;
      });
      setProgressList(sorted);
    } catch (err) {
      setProgressList([]);
      notification.error({ message: t.sys, description: t.loadFailed, placement: 'bottomRight' });
    } finally {
      setLoadingList(false);
    }
  };

  const overallProgress = useMemo(() => {
    if (Array.isArray(progressList) && progressList.length > 0) {
      const total = progressList
        .filter(p => p.status === 2)
        .reduce((sum, p) => {
          const val = p && typeof p.progressPercent === 'number' ? p.progressPercent : 0;
          return sum + val;
        }, 0);
      return Math.max(0, Math.min(100, total));
    }
    return typeof record?.progress === 'number' ? record.progress : 0;
  }, [progressList, record]);

  const [inputProgress, setInputProgress] = useState(undefined);
  const [inputProgressFocused, setInputProgressFocused] = useState(false);
  const totalProgressAll = useMemo(() => {
    return progressList.reduce(
      (sum, p) => sum + (typeof p.progressPercent === "number" ? p.progressPercent : 0),
      0
    );
  }, [progressList]);

  const uploadFileToBackend = async (file, category) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('improvementName', category);

    const response = await fetch(API_CONFIG.getImprovementUploadUrl(), {
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

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // Kiểm tra tổng TẤT CẢ progress (không phân biệt status) không được vượt quá 100%
      const newProgress = values.progress || 0;
      const totalFromList = Array.isArray(progressList)
        ? progressList.reduce((sum, p) => sum + (typeof p.progressPercent === 'number' ? p.progressPercent : 0), 0)
        : 0;
      
      if (totalFromList + newProgress > 100) {
        notification.error({ message: t.sys, description: t.exceedProgress, placement: 'bottomRight' });
        return;
      }

      let uploadedFiles = [];
      if (files.length > 0 && record?.category) {
        try {
          uploadedFiles = await Promise.all(
            files.map(f => uploadFileToBackend(f.originFileObj, record.category))
          );
        } catch (uploadError) {
          notification.error({ message: t.sys, description: t.uploadFailed, placement: 'bottomRight' });
          return;
        }
      }

      await axios.post(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}/progress`, {
        percent: values.progress,
        detail: values.progressDetail || null,
        status: typeof values.status === 'number' ? values.status : 0,
        createdBy: nguoiDung?.userID || null,
      });

      const originalFiles = Array.isArray(record.files) ? record.files : [];
      const hasDeletion = Array.isArray(currentFiles) && (currentFiles.length !== originalFiles.length);
      const hasAddition = uploadedFiles.length > 0;
      if (hasDeletion || hasAddition) {
        const updatedFiles = [...(Array.isArray(currentFiles) ? currentFiles : originalFiles), ...uploadedFiles];
        await axios.patch(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}`, {
          files: updatedFiles
        });
        setImprovementFileCount(updatedFiles.length);
      }

      notification.success({ message: t.sys, description: t.updateSuccess, placement: 'bottomRight' });
      await loadProgress();
      form.setFieldsValue({ progress: undefined, progressDetail: "", status: 0 });
      setFiles([]);
      onSaved?.();
    } catch (err) {
      notification.error({ message: t.sys, description: t.updateFailed, placement: 'bottomRight' });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      progress: (typeof record.progressPercent === 'number' && record.progressPercent > 0) ? record.progressPercent : 1,
      progressDetail: record.progressDetail || "",
      status: typeof record.status === 'number' ? record.status : 0
    });
    setEditModalOpen(true);
    setEditFiles([]);
    setCurrentFiles(Array.isArray((typeof window !== 'undefined' ? (window.__improvementRecordFiles || null) : null)) ? window.__improvementRecordFiles : (Array.isArray(record?.files) ? record.files : currentFiles));
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();

      // Kiểm tra tổng TẤT CẢ progress (không phân biệt status) không được vượt quá 100%
      const originalProgress = typeof editingRecord?.progressPercent === 'number' ? editingRecord.progressPercent : 0;
      const newProgress = values.progress || 0;

      // Tính tổng từ tất cả các progress khác (không bao gồm progress đang sửa)
      const totalFromOtherProgress = Array.isArray(progressList)
        ? progressList
            .filter(p => p.id !== editingRecord?.id)
            .reduce((sum, p) => sum + (typeof p.progressPercent === 'number' ? p.progressPercent : 0), 0)
        : 0;

      // Tổng mới = tổng các progress khác + progress mới
      const newTotal = totalFromOtherProgress + newProgress;

      if (newTotal > 100) {
        notification.error({ message: t.sys, description: t.exceedEdit, placement: 'bottomRight' });
        return;
      }
      await axios.patch(`/api/improvement-progress/${editingRecord.id}`, {
        percent: values.progress,
        detail: values.progressDetail || null,
        status: typeof values.status === 'number' ? values.status : undefined,
        updatedBy: nguoiDung?.userID || null,
      });

      let uploadedEditFiles = [];
      if (editFiles.length > 0 && record?.category) {
        try {
          uploadedEditFiles = await Promise.all(
            editFiles.map(f => uploadFileToBackend(f.originFileObj, record.category))
          );
        } catch (uploadError) {
          notification.error({ message: t.sys, description: t.uploadFailed, placement: 'bottomRight' });
        }
      }

      const hasFileChange = uploadedEditFiles.length > 0 || (Array.isArray(currentFiles) && (record?.files?.length !== currentFiles.length));
      if (hasFileChange) {
        const updatedFiles = [...(Array.isArray(currentFiles) ? currentFiles : []), ...uploadedEditFiles];
        await axios.patch(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}`, {
          files: updatedFiles
        });
        setImprovementFileCount(updatedFiles.length);
      }

      notification.success({ message: t.sys, description: t.updateSuccess, placement: 'bottomRight' });
      await loadProgress();
      setEditModalOpen(false);
      setEditingRecord(null);
      setEditFiles([]);
      onSaved?.();
    } catch (err) {
      notification.error({ message: t.sys, description: t.updateFailed, placement: 'bottomRight' });
    }
  };

  const handleDelete = async (progressId) => {
    try {
      await axios.delete(`/api/improvement-progress/${progressId}`);
      notification.success({ message: t.sys, description: t.deleteSuccess, placement: 'bottomRight' });
      await loadProgress();
      onSaved?.();
    } catch (err) {
      notification.error({ message: t.sys, description: t.deleteFailed, placement: 'bottomRight' });
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t.title}
        open={open}
        onCancel={onCancel}
        onOk={handleOk}
        okText={t.save}
        width={750}
        style={{ top: "70px" }}
        okButtonProps={{ disabled: (totalProgressAll + Number(inputProgress || 0)) > 100 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="progress"
            label={t.progress}
            rules={[{ required: true, message: t.progressRequired }]}
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: "100%" }}
              placeholder={t.progressPh}
              value={inputProgress}
              onChange={(v) => { setInputProgress(v); form.setFieldsValue({ progress: v }); }}
              onFocus={() => setInputProgressFocused(true)}
              onBlur={() => setInputProgressFocused(false)}
            />
          </Form.Item>
          {(inputProgressFocused && (totalProgressAll + Number(inputProgress || 0)) > 100) && (
            <div style={{ color: 'red', marginBottom: 8 }}>
              {t.maxProgress}
            </div>
          )}
          
          <Form.Item name="progressDetail" label={t.progressDetail}>
            <Input.TextArea rows={4} placeholder={t.progressDetailPh} />
          </Form.Item>
          <Form.Item name="status" label={t.status}>
            <Select options={statusOptions} />
          </Form.Item>
          
          <Form.Item label={t.files}>
            <Upload
              key={open ? 'upload-' + Date.now() : 'upload'}
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const validation = await validateFileSizeAsync(file, 'vi');
                return false; 
              }}
              onChange={async (info) => {
                const { fileList } = info;
                const newFiles = fileList.filter(f => f.originFileObj);
                const checks = await Promise.all(newFiles.map(async (f) => ({
                  f,
                  validation: await validateFileSizeAsync(f.originFileObj, 'vi')
                })));

                checks.filter(c => !c.validation.isValid).forEach(c => {
                  notification.error({
                    message: "Lỗi upload",
                    description: c.validation.errorMessage,
                    placement: "bottomRight"
                  });
                });

                const mapped = checks
                  .filter(c => c.validation.isValid)
                  .map(c => ({ uid: c.f.uid, name: c.f.name, originFileObj: c.f.originFileObj }));

                setFiles(prevFiles => {
                  const existingNames = prevFiles.map(f => f.name);
                  const uniqueNewFiles = mapped.filter(f => !existingNames.includes(f.name));
                  return [...prevFiles, ...uniqueNewFiles];
                });
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn tài liệu</Button>
            </Upload>

            {Array.isArray(currentFiles) && currentFiles.length > 0 && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                header={<div>Tài liệu hiện có</div>}
                dataSource={currentFiles}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setCurrentFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                      />
                    ]}
                  >
                    <Tag>{file.name}</Tag>
                  </List.Item>
                )}
              />
            )}

            {files?.length > 0 && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                header={<div>File sẽ thêm</div>}
                dataSource={files}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                        }}
                      />
                    ]}
                  >
                    <Tag>{file.name}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>

        <Divider style={{ margin: "8px 0 12px" }}>
          {`${t.completionProgress} ${overallProgress}/100%`}
        </Divider>
        <Table
          size="small"
          rowKey={(r) => r.id}
          loading={loadingList}
          dataSource={progressList}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: t.time, dataIndex: "createdAt", key: "createdAt", width: 150, onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v, r) => formatDateShortVN(r.updatedAt || v) },
            { title: t.progress, dataIndex: "progressPercent", key: "progressPercent", width: 90, align: "center", onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v) => (v != null ? `${v}%` : "-") },
           
            { title: t.content, dataIndex: "progressDetail", key: "progressDetail", ellipsis: true, onHeaderCell: () => ({ style: { textAlign: 'center' } }) },
            { title: t.status, dataIndex: "status", key: "status", width: 140, align: 'center', onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v) => {
              return statusOptions.find(opt => opt.value === (v ?? 0))?.label || '-';
            }
          },
            {
              title: t.quantity,
              key: "filesCount",
              width: 100,
              align: "center",
              onHeaderCell: () => ({ style: { textAlign: 'center' } }),
              render: () => (improvementFileCount > 0 ? `${improvementFileCount} file${improvementFileCount > 1 ? 's' : ''}` : '-')
            },
            {
              title: t.actions,
              key: "actions",
              width: 100,
              align: "center",
              onHeaderCell: () => ({ style: { textAlign: 'center' } }),
              render: (_, record) => (
                <Space size="small">
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => setViewingRecord(record)}
                  />
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleEdit(record)}
                  />
                  <Popconfirm
                    title={t.deleteConfirm}
                    onConfirm={() => handleDelete(record.id)}
                    okText={t.delete}
                    cancelText={t.cancel}
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
          ]}
        />
      </Modal>

      {}
      <Modal
        title={t.editTitle}
        open={editModalOpen}
        onOk={handleEditOk}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingRecord(null);
          editForm.resetFields();
          setEditFiles([]);
        }}
        okText={t.save}
        cancelText={t.cancel}
        width={500}
        style={{ top: "90px" }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="progress"
            label={t.progress}
            rules={[{ required: true, message: t.progressRequired }]}
          >
            <InputNumber min={1} max={100} style={{ width: "100%" }} placeholder="Nhập 1 - 100" />
          </Form.Item>
          <Form.Item name="progressDetail" label={t.progressDetail}>
            <Input.TextArea rows={4} placeholder={t.progressDetailPh} />
          </Form.Item>
          <Form.Item name="status" label={t.status}>
            <Select options={statusOptions} />
          </Form.Item>
          
          <Form.Item label={t.files}>
            <Upload
              key={editModalOpen ? 'edit-upload-' + Date.now() : 'edit-upload'}
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const validation = await validateFileSizeAsync(file, 'vi');
                return false;
              }}
              onChange={async (info) => {
                const { fileList } = info;
                const newFiles = fileList.filter(f => f.originFileObj);
                const checks = await Promise.all(newFiles.map(async (f) => ({
                  f,
                  validation: await validateFileSizeAsync(f.originFileObj, 'vi')
                })));

                checks.filter(c => !c.validation.isValid).forEach(c => {
                  notification.error({
                    message: t.uploadError,
                    description: c.validation.errorMessage,
                    placement: "bottomRight"
                  });
                });

                const mapped = checks
                  .filter(c => c.validation.isValid)
                  .map(c => ({ uid: c.f.uid, name: c.f.name, originFileObj: c.f.originFileObj }));

                setEditFiles(prevFiles => {
                  const existingNames = prevFiles.map(f => f.name);
                  const uniqueNewFiles = mapped.filter(f => !existingNames.includes(f.name));
                  return [...prevFiles, ...uniqueNewFiles];
                });
              }}
            >
              <Button icon={<UploadOutlined />}>{t.chooseFile}</Button>
            </Upload>

            {}
            {Array.isArray(currentFiles) && currentFiles.length > 0 && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                dataSource={currentFiles}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setCurrentFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                      />
                    ]}
                  >
                    <Tag>{file.name}</Tag>
                  </List.Item>
                )}
              />
            )}

            {}
            {editFiles?.length > 0 && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                header={<div>{t.filesToAdd}</div>}
                dataSource={editFiles}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setEditFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                        }}
                      />
                    ]}
                  >
                    <Tag>{file.name}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>

      {}
      <Modal
        title={t.viewTitle}
        open={!!viewingRecord}
        onCancel={() => setViewingRecord(null)}
        footer={null}
        width={500}
        style={{ top: "90px" }}
      >
        {viewingRecord && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t.time}>{formatDateShortVN(viewingRecord.updatedAt || viewingRecord.createdAt)}</Descriptions.Item>
              <Descriptions.Item label={t.progress}>{typeof viewingRecord.progressPercent === 'number' ? `${viewingRecord.progressPercent}%` : '-'}</Descriptions.Item>
              <Descriptions.Item label={t.content}>{viewingRecord.progressDetail || '-'}</Descriptions.Item>
              <Descriptions.Item label={t.status}>{statusOptions.find(opt => opt.value === (viewingRecord?.status ?? 0))?.label || '-'}</Descriptions.Item>
            </Descriptions>

            {}
            <Divider style={{ margin: "12px 0" }}>{t.files}</Divider>
            {Array.isArray(currentFiles) && currentFiles.length > 0 ? (
              <List
                size="small"
                bordered
                dataSource={currentFiles}
                renderItem={(file) => (
                  <List.Item>
                    <a href={file.url || file.path || '#'} target="_blank" rel="noreferrer">
                      {file.name || 'file'}
                    </a>
                  </List.Item>
                )}
              />
            ) : (
              <div>- {t.noFiles} -</div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}


