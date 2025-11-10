import React, { useState, useEffect } from "react";
import { Modal, Form, Input, notification, Typography, Upload, Button, List, Tag } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useMenuRefresh } from "../../contexts/MenuRefreshContext";
import axios from "../../plugins/axios";
import { validateFileSize, formatFileSize } from "../../utils/fileUtils";
import API_CONFIG from "../../config/api";
import { useLanguage } from "../../contexts/LanguageContext";

export default function SOPDocumentModal({ open, onCancel, onAdded, sopId }) {
  const { lang } = useLanguage();
  const { nguoiDung } = useSelector(state => state.user);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const { triggerMenuRefresh } = useMenuRefresh();
  const [sopName, setSopName] = useState('');
  const [files, setFiles] = useState([]);
  const { Text } = Typography;

  const openNotification = (type, title, desc) =>
    api[type]({ message: title, description: desc, placement: "bottomRight" });


  useEffect(() => {
    if (sopId) {
      const fetchSOPName = async () => {
        try {
      const response = await axios.get("/api/sops", { params: { page: 0, size: 1000 } });
          const data = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.content) ? response.data.content : []);
          const sop = data.find(item => item.id.toString() === sopId);
          if (sop) {
            setSopName(sop.name);
          } else {
            setSopName(`SOP ${sopId}`);
          }
        } catch (error) {
          setSopName(`SOP ${sopId}`);
        }
      };
      fetchSOPName();
    } else {
      setSopName('');
    }
  }, [sopId]);


  useEffect(() => {
    if (open) {
      setFiles([]);
      form.resetFields();
    }
  }, [open, form]);


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


  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);


      const currentUserId = nguoiDung?.userID || 1;


      let uploadedFiles = [];
      if (files.length > 0) {
        for (const file of files) {
          if (file.originFileObj) {
            const uploadResult = await uploadFile(file.originFileObj, sopName, values.title);
            

            const fileExtension = file.name.split('.').pop().toLowerCase();
            let fileType = 'other';
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
              fileType = 'image';
            } else if (['pdf'].includes(fileExtension)) {
              fileType = 'pdf';
            } else if (['txt', 'doc', 'docx'].includes(fileExtension)) {
              fileType = 'document';
            }
            
            uploadedFiles.push({
              filePath: uploadResult.url,
              fileName: uploadResult.name,
              fileType: fileType,
              fileSize: file.originFileObj.size
            });
          }
        }
      }

      const documentPayload = {
        title: values.title,
        description: values.description || "",
        sop: { id: parseInt(sopId) },
        createdBy: { userID: currentUserId },
        files: uploadedFiles.map(file => ({
          filePath: file.filePath,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize
        }))
      };

      const response = await axios.post("/api/sop-documents", documentPayload);
      const responseData = response.data;

      openNotification("success", lang === 'zh' ? "系统" : "Hệ thống", lang === 'zh' ? t.addSuccess : t.addSuccess);
      
      form.resetFields();
      setFiles([]);
      
      setIsLoading(false);
      
      onCancel();
      
      setTimeout(() => {
        onAdded();
        triggerMenuRefresh();
      }, 500);
      
    } catch (err) {
      let errorMessage = lang === 'zh' ? t.addFailed : t.addFailed;
      const data = err?.response?.data;
      if (data) {
        const raw = data.error || data.message || '';
        if (data.error === 'DUPLICATE_NAME' || /đã tồn tại|exists|duplicate/i.test(raw)) {
          errorMessage = lang === 'zh'
            ? `已存在 "${data.duplicateName || data.duplicateValue || ''}"，请使用其他名称。`
            : `Đã tồn tại "${data.duplicateName || data.duplicateValue || ''}". Vui lòng chọn tên khác.`;
        } else {
          errorMessage = raw || (lang === 'zh' ? t.addFailed : t.addFailed);
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

  const labels = {
    vi: {
      modalTitle: (name) => name || "Thêm tài liệu",
      okText: "Thêm tài liệu",
      cancelText: "Hủy",
      titleLabel: "Tên tài liệu",
      titlePlaceholder: "Nhập tên tài liệu...",
      titleRequired: "Vui lòng nhập tên tài liệu",
      descLabel: "Mô tả",
      descPlaceholder: "Nhập mô tả tài liệu...",
      attachLabel: "Tài liệu đính kèm",
      chooseFile: "Chọn tài liệu",
      uploadErrorTitle: "Lỗi upload",
      addSuccess: "Thêm tài liệu thành công",
      addFailed: "Thêm tài liệu thất bại",
    },
    zh: {
      modalTitle: (name) => name || "新增文档",
      okText: "新增文档",
      cancelText: "取消",
      titleLabel: "文档名称",
      titlePlaceholder: "输入文档名称...",
      titleRequired: "请输入文档名称",
      descLabel: "描述",
      descPlaceholder: "输入文档描述...",
      attachLabel: "附件",
      chooseFile: "选择文件",
      uploadErrorTitle: "上传错误",
      addSuccess: "新增文档成功",
      addFailed: "新增文档失败",
    },
  };
  const t = labels[lang];

  return (
    <>
      {contextHolder}
      <Modal
        title={t.modalTitle(sopName)}
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        okButtonProps={{ loading: isLoading }}
        width={500}
        okText={t.okText}
        cancelText={t.cancelText}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t.titleLabel}
            rules={[{ required: true, message: t.titleRequired }]}
          >
            <Input 
              placeholder={t.titlePlaceholder} 
              onPressEnter={(e) => {
                e.preventDefault();
                handleOk();
              }} 
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label={t.descLabel}
          >
            <Input.TextArea 
              placeholder={t.descPlaceholder} 
              rows={3}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleOk();
                }
              }}
            />
          </Form.Item>

          <Form.Item label={t.attachLabel}>
            <Upload
              key={open ? 'upload-' + Date.now() : 'upload'}
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
                  openNotification("error", t.uploadErrorTitle, c.validation.errorMessage);
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
              <Button icon={<UploadOutlined />}>{t.chooseFile}</Button>
            </Upload>

            {files?.length > 0 && (
              <List 
                style={{ marginTop: 12 }}
                size="small"
                dataSource={files}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))} 
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
        </Form>
      </Modal>
    </>
  );
}

