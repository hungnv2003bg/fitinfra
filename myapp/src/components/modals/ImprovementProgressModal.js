import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, InputNumber, Input, notification, Table, Divider, Popconfirm, Button, Space, Upload, List, Tag, Select, Descriptions } from "antd";
import { EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import { formatDateShortVN } from "../../utils/dateUtils";
import API_CONFIG from "../../config/api";
import { validateFileSizeAsync } from "../../utils/fileUtils";

export default function ImprovementProgressModal({ open, record, onCancel, onSaved }) {
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
  const statusOptions = [
    { value: 0, label: 'Chưa thực hiện' },
    { value: 1, label: 'Đang thực hiện' },
    { value: 2, label: 'Hoàn thành' },
  ];

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

  // Reset files when modal opens
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
      // sort by createdAt ascending (oldest first)
      const sorted = [...list].sort((a, b) => {
        const t1 = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const t2 = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return t1 - t2;
      });
      setProgressList(sorted);
    } catch (err) {
      setProgressList([]);
      notification.error({ message: 'Hệ thống', description: 'Tải lịch sử tiến độ thất bại', placement: 'bottomRight' });
    } finally {
      setLoadingList(false);
    }
  };

  // Overall progress for the current improvement (sum of history, capped at 100, chỉ tính các dòng Hoàn thành)
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

  // Tính tổng tiến độ thực tế (không lọc theo status, chỉ cộng toàn bộ các tiến độ con)
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
    return result; // { url, name }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // Validate total progress does not exceed 100 (chỉ cộng các bước Hoàn thành)
      const totalFromList = Array.isArray(progressList)
        ? progressList.filter(p => p.status === 2).reduce((sum, p) => sum + (typeof p.progressPercent === 'number' ? p.progressPercent : 0), 0)
        : 0;
      if (totalFromList + (values.progress || 0) > 100) {
        notification.error({ message: 'Hệ thống', description: 'Tổng tiến độ vượt 100%. Vui lòng nhập giá trị nhỏ hơn hoặc bằng phần trăm còn lại.', placement: 'bottomRight' });
        return;
      }

      // Upload files if any
      let uploadedFiles = [];
      if (files.length > 0 && record?.category) {
        try {
          uploadedFiles = await Promise.all(
            files.map(f => uploadFileToBackend(f.originFileObj, record.category))
          );
        } catch (uploadError) {
          notification.error({ message: 'Hệ thống', description: 'Upload file thất bại', placement: 'bottomRight' });
          return;
        }
      }

      // Use dedicated progress endpoint
      await axios.post(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}/progress`, {
        percent: values.progress,
        detail: values.progressDetail || null,
        status: typeof values.status === 'number' ? values.status : 0,
        createdBy: nguoiDung?.userID || null,
      });

      // Persist files if there are any changes (add new or delete existing)
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

      notification.success({ message: 'Hệ thống', description: 'Đã cập nhật tiến độ', placement: 'bottomRight' });
      await loadProgress();
      form.setFieldsValue({ progress: undefined, progressDetail: "", status: 0 });
      setFiles([]);
      onSaved?.();
    } catch (err) {
      notification.error({ message: 'Hệ thống', description: 'Cập nhật tiến độ thất bại', placement: 'bottomRight' });
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

      // Validate total when editing (replace old value with new value; chỉ cộng các bước Hoàn thành)
      const totalFromList = Array.isArray(progressList)
        ? progressList.filter(p => p.status === 2).reduce((sum, p) => sum + (typeof p.progressPercent === 'number' ? p.progressPercent : 0), 0)
        : 0;
      const original = typeof editingRecord?.progressPercent === 'number' ? editingRecord.progressPercent : 0;
      const newTotal = totalFromList - original + (values.progress || 0);
      if (newTotal > 100) {
        notification.error({ message: 'Hệ thống', description: 'Tổng tiến độ vượt 100%. Vui lòng giảm giá trị để tổng không vượt 100%.', placement: 'bottomRight' });
        return;
      }
      await axios.patch(`/api/improvement-progress/${editingRecord.id}`, {
        percent: values.progress,
        detail: values.progressDetail || null,
        status: typeof values.status === 'number' ? values.status : undefined,
        updatedBy: nguoiDung?.userID || null,
      });

      // Upload any new files selected in edit modal
      let uploadedEditFiles = [];
      if (editFiles.length > 0 && record?.category) {
        try {
          uploadedEditFiles = await Promise.all(
            editFiles.map(f => uploadFileToBackend(f.originFileObj, record.category))
          );
        } catch (uploadError) {
          notification.error({ message: 'Hệ thống', description: 'Upload file thất bại', placement: 'bottomRight' });
        }
      }

      // Persist improvement files if there are changes (additions or deletions)
      const hasFileChange = uploadedEditFiles.length > 0 || (Array.isArray(currentFiles) && (record?.files?.length !== currentFiles.length));
      if (hasFileChange) {
        const updatedFiles = [...(Array.isArray(currentFiles) ? currentFiles : []), ...uploadedEditFiles];
        await axios.patch(`/api/improvements/${encodeURIComponent(String(record?.improvementID || record?.id))}`, {
          files: updatedFiles
        });
        setImprovementFileCount(updatedFiles.length);
      }

      notification.success({ message: 'Hệ thống', description: 'Đã cập nhật tiến độ', placement: 'bottomRight' });
      await loadProgress();
      setEditModalOpen(false);
      setEditingRecord(null);
      setEditFiles([]);
      onSaved?.();
    } catch (err) {
      notification.error({ message: 'Hệ thống', description: 'Cập nhật tiến độ thất bại', placement: 'bottomRight' });
    }
  };

  const handleDelete = async (progressId) => {
    try {
      await axios.delete(`/api/improvement-progress/${progressId}`);
      notification.success({ message: 'Hệ thống', description: 'Đã xóa tiến độ', placement: 'bottomRight' });
      await loadProgress();
      // Refresh outer list to reflect status/completedAt changes after deletion
      onSaved?.();
    } catch (err) {
      notification.error({ message: 'Hệ thống', description: 'Xóa tiến độ thất bại', placement: 'bottomRight' });
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="Cập nhật tiến độ"
        open={open}
        onCancel={onCancel}
        onOk={handleOk}
        okText="Lưu"
        width={750}
        style={{ top: "70px" }}
        okButtonProps={{ disabled: (totalProgressAll + Number(inputProgress || 0)) > 100 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="progress"
            label="Tiến độ (%)"
            rules={[{ required: true, message: "Nhập tiến độ" }]}
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: "100%" }}
              placeholder="Vui lòng nhập tiến độ: 5% 10% ..."
              value={inputProgress}
              onChange={(v) => { setInputProgress(v); form.setFieldsValue({ progress: v }); }}
              onFocus={() => setInputProgressFocused(true)}
              onBlur={() => setInputProgressFocused(false)}
            />
          </Form.Item>
          {(inputProgressFocused && (totalProgressAll + Number(inputProgress || 0)) > 100) && (
            <div style={{ color: 'red', marginBottom: 8 }}>
              Tổng tiến độ tối đa là 100% 
            </div>
          )}
          
          <Form.Item name="progressDetail" label="Nội dung tiến độ">
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết tiến độ" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={statusOptions} />
          </Form.Item>
          
          <Form.Item label="Tài liệu đính kèm">
            <Upload
              key={open ? 'upload-' + Date.now() : 'upload'}
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const validation = await validateFileSizeAsync(file, 'vi');
                return false; // prevent auto upload
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
          {`Tiến độ hoàn thành công việc ${overallProgress}/100%`}
        </Divider>
        <Table
          size="small"
          rowKey={(r) => r.id}
          loading={loadingList}
          dataSource={progressList}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: "Thời gian", dataIndex: "createdAt", key: "createdAt", width: 150, onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v, r) => formatDateShortVN(r.updatedAt || v) },
            { title: "Tiến độ", dataIndex: "progressPercent", key: "progressPercent", width: 90, align: "center", onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v) => (v != null ? `${v}%` : "-") },
           
            { title: "Nội dung", dataIndex: "progressDetail", key: "progressDetail", ellipsis: true, onHeaderCell: () => ({ style: { textAlign: 'center' } }) },
            { title: "Trạng thái", dataIndex: "status", key: "status", width: 140, align: 'center', onHeaderCell: () => ({ style: { textAlign: 'center' } }), render: (v) => {
              const map = { 0: 'Chưa thực hiện', 1: 'Đang thực hiện', 2: 'Hoàn thành' };
              return map[v ?? 0];
            }
          },
            {
              title: "Số lượng",
              key: "filesCount",
              width: 100,
              align: "center",
              onHeaderCell: () => ({ style: { textAlign: 'center' } }),
              render: () => (improvementFileCount > 0 ? `${improvementFileCount} file${improvementFileCount > 1 ? 's' : ''}` : '-')
            },
            {
              title: "Thao tác",
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
                    title="Xóa tiến độ này?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
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

      {/* Edit Progress Modal */}
      <Modal
        title="Sửa tiến độ"
        open={editModalOpen}
        onOk={handleEditOk}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingRecord(null);
          editForm.resetFields();
          setEditFiles([]);
        }}
        okText="Lưu"
        cancelText="Hủy"
        width={500}
        style={{ top: "90px" }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="progress"
            label="Tiến độ (%)"
            rules={[{ required: true, message: "Nhập tiến độ" }]}
          >
            <InputNumber min={1} max={100} style={{ width: "100%" }} placeholder="Nhập 1 - 100" />
          </Form.Item>
          <Form.Item name="progressDetail" label="Nội dung tiến độ">
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết tiến độ" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={statusOptions} />
          </Form.Item>
          
          <Form.Item label="Tài liệu đính kèm">
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
                    message: "Lỗi upload",
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
              <Button icon={<UploadOutlined />}>Chọn tài liệu</Button>
            </Upload>

            {/* Existing files of improvement */}
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

            {/* New selected files to add */}
            {editFiles?.length > 0 && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                header={<div>File sẽ thêm</div>}
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

      {/* View Progress Modal */}
      <Modal
        title="Chi tiết tiến độ"
        open={!!viewingRecord}
        onCancel={() => setViewingRecord(null)}
        footer={null}
        width={500}
        style={{ top: "90px" }}
      >
        {viewingRecord && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Thời gian">{formatDateShortVN(viewingRecord.updatedAt || viewingRecord.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Tiến độ">{typeof viewingRecord.progressPercent === 'number' ? `${viewingRecord.progressPercent}%` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Nội dung">{viewingRecord.progressDetail || '-'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{({0:'Chưa thực hiện',1:'Đang thực hiện',2:'Hoàn thành'})[viewingRecord?.status ?? 0]}</Descriptions.Item>
            </Descriptions>

            {/* Files attached to this improvement */}
            <Divider style={{ margin: "12px 0" }}>Tài liệu đính kèm</Divider>
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
              <div>- Không có tài liệu -</div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}


