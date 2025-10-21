import React, { useState, useEffect } from "react";
import { Modal, Form, Input, notification, Typography, Upload, Button, List, Tag, message } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
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
  const { Text } = Typography;

  const openNotification = (type, title, desc) =>
    api[type]({ message: title, description: desc, placement: "bottomRight" });

  const hasAdminAccess = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => 
      role === "ADMIN" || role === "MANAGER" || role === "ROLE_ADMIN" || role === "ROLE_MANAGER"
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
    } else {
      setExistingFiles([]);
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
    }
  }, [open]);

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
    
    const loadingMessage = message.loading(
      lang === 'zh' ? '正在检查删除权限...' : 'Đang kiểm tra quyền xóa...', 
      0
    );
    
    try {
      const canDelete = await canDeleteFile(fileToDelete);
      loadingMessage();
      
      if (!canDelete) {
        const errorMsg = lang === 'zh' 
          ? '您只能删除3天内创建的文件。请联系管理员删除较旧的文件。'
          : 'Bạn chỉ có thể xóa file được tạo trong vòng 3 ngày. Vui lòng liên hệ admin để xóa file cũ hơn.';
        message.error({
          content: errorMsg,
          placement: 'bottomRight',
          duration: 5
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
    } catch (error) {
      loadingMessage();
      message.error({
        content: lang === 'zh' 
          ? '检查删除权限时出错，请稍后重试'
          : 'Lỗi khi kiểm tra quyền xóa, vui lòng thử lại',
        placement: 'bottomRight'
      });
    }
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
      if (err?.response?.data) {
        const data = err.response.data;
        errorMessage = data.error || data.message || JSON.stringify(data);
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
                // Let onChange handle notifications to avoid duplicates
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
                      <Button
                        type="text"
                        danger={canDeleteFile(file)}
                        disabled={!canDeleteFile(file)}
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeFile(file.id)}
                        title={!canDeleteFile(file) ? (lang === 'zh' ? '文件超过3天，只有管理员可以删除' : 'File quá 3 ngày, chỉ admin mới có thể xóa') : (lang === 'zh' ? '删除文件' : 'Xóa file')}
                      />
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
                        <div style={{ fontSize: 10 }}>
                          {}
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
    </>
  );
}

