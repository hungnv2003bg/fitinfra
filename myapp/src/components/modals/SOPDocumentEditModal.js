import React, { useState, useEffect } from "react";
import { Modal, Form, Input, notification, Typography, Upload, Button, List, Tag, message, Cascader, Tooltip } from "antd";
import { UploadOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useMenuRefresh } from "../../contexts/MenuRefreshContext";
import { useLanguage } from "../../contexts/LanguageContext";
import axios from "../../plugins/axios";
import { validateFileSize, formatFileSize } from "../../utils/fileUtils";
import API_CONFIG from "../../config/api";
import { timeService } from "../../services/timeService";

export default function SOPDocumentEditModal({ open, record, onCancel, onSaved }) {
  const { lang } = useLanguage();
  const { nguoiDung, quyenList } = useSelector(state => state.user);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const { triggerMenuRefresh } = useMenuRefresh();
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [fileDeletePermissions, setFileDeletePermissions] = useState({});
  const { Text } = Typography;
  const [moveFileModalVisible, setMoveFileModalVisible] = useState(false);
  const [selectedFileToMove, setSelectedFileToMove] = useState(null);
  const [targetDocumentId, setTargetDocumentId] = useState(null);
  const [sopCascaderOptions, setSopCascaderOptions] = useState([]);
  const [selectedSopPath, setSelectedSopPath] = useState([]);

  const openNotification = (type, title, desc) =>
    api[type]({ message: title, description: desc, placement: "bottomRight" });

  const hasAdminAccess = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => 
      role === "ADMIN" || role === "ROLE_ADMIN"
    );
  };

  const canDeleteFile = async (file) => {
    if (hasAdminAccess()) return true;
    
    const createdAtField = file.createdAt || file.created_at;
    if (!createdAtField) return true;
    
    try {
      const fileCreatedAt = new Date(createdAtField);
      const serverTime = await timeService.getServerTime();
      const threeDaysAgo = new Date(serverTime.getTime() - (3 * 24 * 60 * 60 * 1000));
      
      return fileCreatedAt >= threeDaysAgo;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (record && record.files) {
      setExistingFiles(record.files);
      const checkPermissions = async () => {
        const permissions = {};
        for (const file of record.files) {
          permissions[file.id] = await canDeleteFile(file);
        }
        setFileDeletePermissions(permissions);
      };
      checkPermissions();
    } else {
      setExistingFiles([]);
      setFileDeletePermissions({});
    }
  }, [record]);

  useEffect(() => {
    if (open && record) {
      form.setFieldsValue({
        title: record.title,
        description: record.description
      });
      setFiles([]);
    } else if (open) {
      form.resetFields();
      setFiles([]);
    }
  }, [open, record, form]);

  useEffect(() => {
    if (open) {
      timeService.getServerTime().catch(error => {
      });
      fetchSOPsForCascader();
    }
  }, [open]);

  const fetchSOPsForCascader = async () => {
    try {
      const response = await axios.get('/api/sops', { params: { page: 0, size: 1000 } });
      const sops = Array.isArray(response.data) 
        ? response.data 
        : (response.data && Array.isArray(response.data.content) ? response.data.content : []);
      
      setSopCascaderOptions((sops || []).map(s => ({
        value: s.id,
        label: s.name || `SOP ${s.id}`,
        isLeaf: false
      })));
    } catch (error) {
      console.error('Error fetching SOPs:', error);
      setSopCascaderOptions([]);
    }
  };

  const loadSopDocuments = async (selectedOptions) => {
    const target = selectedOptions[selectedOptions.length - 1];
    target.loading = true;
    
    try {
      const res = await axios.get(`/api/sops/${encodeURIComponent(String(target.value))}/documents`);
      const docs = Array.isArray(res.data) ? res.data : [];
      
      let filteredDocs = docs;
      if (record && record.sop && record.sop.id === target.value) {
        filteredDocs = docs.filter(doc => (doc.documentID ?? doc.id) !== record.documentID);
      }
      
      target.children = filteredDocs.map(d => ({
        value: d.documentID ?? d.id,
        label: d.title || `Tài liệu ${d.documentID ?? d.id}`,
        isLeaf: true
      }));
      
      setSopCascaderOptions(prevOptions => {
        const newOptions = JSON.parse(JSON.stringify(prevOptions));
        return newOptions;
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      target.children = [];
      setSopCascaderOptions(prevOptions => {
        const newOptions = JSON.parse(JSON.stringify(prevOptions));
        return newOptions;
      });
    } finally {
      target.loading = false;
    }
  };

  const uploadFile = async (file, sopName, sopDocumentName) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sopName) formData.append('sopName', sopName);
    if (sopDocumentName) formData.append('sopDocumentName', sopDocumentName);
    
    const response = await fetch(API_CONFIG.getUploadUrl(), {
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

  const removeFile = async (fileId) => {
    const fileToDelete = existingFiles.find(f => f.id === fileId);
    
    if (!fileToDelete) {
      message.error({
        content: lang === 'zh' ? '找不到文件' : 'Không tìm thấy file',
        placement: 'bottomRight'
      });
      return;
    }
    
    Modal.confirm({
      title: lang === 'zh' ? '确认删除附件？' : 'Xóa tệp đính kèm?',
      content: lang === 'zh' ? '您确定要删除此文件吗？' : 'Bạn có chắc muốn xóa tệp này?',
      okText: lang === 'zh' ? '删除' : 'Xóa',
      cancelText: lang === 'zh' ? '取消' : 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        setExistingFiles(prev => prev.filter(f => f.id !== fileId));
      }
    });
  };

  const removeNewFile = (uid) => {
    Modal.confirm({
      title: lang === 'zh' ? '确认移除新文件？' : 'Xóa tệp mới thêm?',
      content: lang === 'zh' ? '该文件尚未上传，移除后需要重新选择。' : 'Tệp này chưa được upload. Xóa rồi thì cần chọn lại nếu muốn.',
      okText: lang === 'zh' ? '移除' : 'Xóa',
      cancelText: lang === 'zh' ? '取消' : 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        setFiles(prev => prev.filter(f => f.uid !== uid));
      }
    });
  };

  const handleMoveFile = (file) => {
    setSelectedFileToMove(file);
    setTargetDocumentId(null);
    setSelectedSopPath([]);
    setMoveFileModalVisible(true);
  };

  const handleCascaderChange = (value) => {
    setSelectedSopPath(value || []);
    if (value && value.length === 2) {
      setTargetDocumentId(value[1]);
    } else {
      setTargetDocumentId(null);
    }
  };

  const handleConfirmMoveFile = async () => {
    if (!selectedFileToMove || !targetDocumentId) {
      message.error({
        content: lang === 'zh' ? '请选择目标文档' : 'Vui lòng chọn tài liệu đích',
        placement: 'bottomRight'
      });
      return;
    }

    try {
      const response = await axios.post(
        `/api/sop-documents/${record.documentID}/move-file/${selectedFileToMove.id}`,
        { targetDocumentId }
      );

      if (response.data.success) {
        openNotification(
          "success",
          lang === 'zh' ? "系统" : "Hệ thống",
          lang === 'zh' 
            ? `成功移动文件 "${selectedFileToMove.fileName}"` 
            : `Chuyển file "${selectedFileToMove.fileName}" thành công`
        );
        
        setExistingFiles(prev => prev.filter(f => f.id !== selectedFileToMove.id));
        setMoveFileModalVisible(false);
        setSelectedFileToMove(null);
        setTargetDocumentId(null);
        setSelectedSopPath([]);
        
        setTimeout(() => {
          onSaved?.();
          triggerMenuRefresh();
        }, 500);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || 
        (lang === 'zh' ? '移动文件失败' : 'Chuyển file thất bại');
      openNotification("error", lang === 'zh' ? "系统" : "Hệ thống", errorMsg);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);

      const currentUserId = nguoiDung?.userID || 1;

      let uploadedFiles = [];
      if (files.length > 0) {
        for (const file of files) {
          if (file.originFileObj) {
            const uploadResult = await uploadFile(file.originFileObj, record?.sop?.name, values.title);
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let fileType = 'other';
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
              fileType = 'image';
            } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension)) {
              fileType = 'video';
            } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
              fileType = 'document';
            }
            
            uploadedFiles.push({
              filePath: uploadResult.url,
              fileName: file.name,
              fileType: fileType,
              fileSize: file.originFileObj.size
            });
          }
        }
      }

      const filesToKeep = existingFiles.map(f => ({
        id: f.id,
        filePath: f.filePath,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize
      }));

      const allFiles = [...filesToKeep, ...uploadedFiles];

      const sopDocumentPayload = {
        title: values.title,
        description: values.description,
        lastEditedBy: currentUserId,
        files: allFiles
      };

      const response = await axios.put(`/api/sop-documents/${encodeURIComponent(String(record.documentID))}`, sopDocumentPayload);
      const responseData = response.data;

      openNotification("success", lang === 'zh' ? "系统" : "Hệ thống", lang === 'zh' ? "更新文档成功" : "Cập nhật tài liệu thành công");
      
      form.resetFields();
      setFiles([]);
      setExistingFiles([]);
      
      setIsLoading(false);
      
      onCancel();
      
      setTimeout(() => {
        onSaved?.();
        triggerMenuRefresh();
      }, 500);
      
    } catch (err) {
      let errorMessage = lang === 'zh' ? "更新文档失败" : "Cập nhật tài liệu thất bại";
      const data = err?.response?.data;
      if (data) {
        const raw = data.error || data.message || '';
        if (data.error === 'DUPLICATE_NAME' || /đã tồn tại|exists|duplicate/i.test(raw)) {
          errorMessage = lang === 'zh'
            ? `已存在 "${data.duplicateName || data.duplicateValue || ''}"，请使用其他名称。`
            : `Đã tồn tại "${data.duplicateName || data.duplicateValue || ''}". Vui lòng chọn tên khác.`;
        } else {
          errorMessage = raw || (lang === 'zh' ? "更新文档失败" : "Cập nhật tài liệu thất bại");
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      openNotification("error", lang === 'zh' ? "系统" : "Hệ thống", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsLoading(false);
    setFiles([]);
    onCancel();
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={lang === 'zh' ? '编辑文档' : 'Sửa tài liệu'}
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        okButtonProps={{ loading: isLoading }}
        width={500}
        okText={lang === 'zh' ? '保存' : 'Lưu'}
        cancelText={lang === 'zh' ? '取消' : 'Hủy'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={lang === 'zh' ? '文档名称' : 'Tên tài liệu'}
            rules={[{ required: true, message: lang === 'zh' ? '请输入文档名称' : 'Vui lòng nhập tên tài liệu' }]}
          >
            <Input
              placeholder={lang === 'zh' ? '输入文档名称...' : 'Nhập tên tài liệu...'}
              onPressEnter={(e) => {
                e.preventDefault();
                handleOk();
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label={lang === 'zh' ? '描述' : 'Mô tả'}
          >
            <Input.TextArea 
              placeholder={lang === 'zh' ? '输入文档描述...' : 'Nhập mô tả tài liệu...'} 
              rows={3}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleOk();
                }
              }}
            />
          </Form.Item>

          <Form.Item label={lang === 'zh' ? '附件' : 'Tài liệu đính kèm'}>
            <Upload
              key={`upload-${open ? Date.now() : 'closed'}`}
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const { validateFileSizeAsync } = await import('../../utils/fileUtils');
                const validation = await validateFileSizeAsync(file, lang);
                return false;
              }}
              onChange={async (info) => {
                const { validateFileSizeAsync } = await import('../../utils/fileUtils');
                const { fileList } = info;

                const newFiles = fileList.filter(f => f.originFileObj);
                const checks = await Promise.all(newFiles.map(async (f) => ({
                  f,
                  validation: await validateFileSizeAsync(f.originFileObj, lang)
                })));

                checks.filter(c => !c.validation.isValid).forEach(c => {
                  openNotification("error", lang === 'zh' ? '上传错误' : 'Lỗi upload', c.validation.errorMessage);
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
              <Button icon={<UploadOutlined />}>{lang === 'zh' ? '选择文件' : 'Chọn tài liệu'}</Button>
            </Upload>

            {}
            {existingFiles?.length > 0 && (
              <List 
                style={{ marginTop: 12 }}
                size="small"
                dataSource={existingFiles}
                renderItem={(file, index) => (
                  <List.Item
                    key={file.id}
                    actions={[
                      <Tooltip
                        key="move"
                        title={lang === 'zh' ? '移动文件到其他文档' : 'Chuyển file sang tài liệu khác'}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => handleMoveFile(file)}
                        />
                      </Tooltip>,
                      <Tooltip
                        key="delete"
                        title={
                          fileDeletePermissions[file.id] 
                            ? (lang === 'zh' ? '删除文件' : 'Xóa file')
                            : (lang === 'zh' ? '文件超过3天，只有管理员可以删除' : 'File quá 3 ngày,Vui lòng liên hệ admin')
                        }
                      >
                        <Button
                          type="text"
                          danger={fileDeletePermissions[file.id]}
                          disabled={!fileDeletePermissions[file.id]}
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeFile(file.id)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Text style={{ fontSize: 12 }}>
                          <Tag color="purple" style={{ marginRight: 8 }}>#{index + 1}</Tag>
                          {file.fileName}
                        </Text>
                      }
                      description={
                        <div style={{ fontSize: 10, color: '#666' }}>
                          {file.fileSize && (
                            <span style={{ marginRight: 12 }}>
                              {formatFileSize(file.fileSize)}
                            </span>
                          )}
                          {(file.createdAt || file.created_at) && (
                            <span>
                              {lang === 'zh' ? '上传时间: ' : 'Thời gian upload: '}
                              {new Date(file.createdAt || file.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            {}
            {files?.length > 0 && (
              <List 
                style={{ marginTop: 12 }}
                size="small"
                dataSource={files}
                renderItem={(file, index) => (
                  <List.Item
                    key={file.uid}
                    actions={[
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeNewFile(file.uid)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Text style={{ fontSize: 12 }}>
                          <Tag color="purple" style={{ marginRight: 8 }}>#{existingFiles.length + index + 1}</Tag>
                          {file.name}
                          <span style={{ marginLeft: 8, color: '#666', fontSize: '10px' }}>
                            ({formatFileSize(file.originFileObj.size)})
                          </span>
                        </Text>
                      }
                      description={
                        <Tag color="green" style={{ fontSize: 10 }}>
                          {lang === 'zh' ? '新' : 'Mới'}
                        </Tag>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>

      {}
      <Modal
        title={lang === 'zh' ? '移动文件到其他文档' : 'Chuyển file sang tài liệu khác'}
        open={moveFileModalVisible}
        onCancel={() => {
          setMoveFileModalVisible(false);
          setSelectedFileToMove(null);
          setTargetDocumentId(null);
          setSelectedSopPath([]);
        }}
        onOk={handleConfirmMoveFile}
        okText={lang === 'zh' ? '移动' : 'Chuyển'}
        cancelText={lang === 'zh' ? '取消' : 'Hủy'}
        width={500}
        okButtonProps={{ disabled: !targetDocumentId }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>{lang === 'zh' ? '文件:' : 'File:'}</Text>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            {selectedFileToMove?.fileName}
          </div>
        </div>
        
        <div>
          <Text strong>{lang === 'zh' ? '选择目标文档:' : 'Chọn tài liệu đích:'}</Text>
          <Cascader
            style={{ width: '100%', marginTop: 8 }}
            options={sopCascaderOptions}
            value={selectedSopPath}
            onChange={handleCascaderChange}
            loadData={loadSopDocuments}
            placeholder={lang === 'zh' ? '请选择 SOP 和文档' : 'Chọn SOP và tài liệu'}
            changeOnSelect={false}
            showSearch
          />
        </div>

        {selectedSopPath.length === 1 && (
          <div style={{ marginTop: 12, padding: 8, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
            <Text style={{ fontSize: 12, color: '#1890ff' }}>
              {lang === 'zh' 
                ? '请选择文档' 
                : 'Vui lòng chọn tài liệu'}
            </Text>
          </div>
        )}
      </Modal>
    </>
  );
}

