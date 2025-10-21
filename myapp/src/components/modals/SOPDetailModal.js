import React, { useState, useEffect } from "react";
import { Modal, List, Button, Image, Typography, Divider, Space, Tag, Spin } from "antd";
import { UserOutlined, CalendarOutlined, EditOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { DownloadOutlined, FileTextOutlined, PictureOutlined, VideoCameraOutlined, ReloadOutlined } from "@ant-design/icons";
import API_CONFIG from "../../config/api";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatDateShortVN } from "../../utils/dateUtils";

const { Title, Text } = Typography;

export default function SOPDetailModal({ open, sop, onCancel }) {
  const { lang } = useLanguage();
  const [fileTypes, setFileTypes] = useState({});
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  const getFiles = () => {
    if (sop?.files && Array.isArray(sop.files) && sop.files.length > 0) {
      return sop.files;
    }
    if (sop?.fileUrl) {
      return [{ url: sop.fileUrl, name: sop?.name || "File" }];
    }
    return [];
  };

  const files = getFiles();

  useEffect(() => {
    const fetchDocs = async () => {
      if (!sop?.id) return;
      try {
        setLoading(true);
        const res = await axios.get(`/api/sops/${sop.id}/documents`);
        const data = res.data;
        if (Array.isArray(data)) setDocuments(data);
      } catch {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [sop?.id]);

  useEffect(() => {
    setFileTypes({});
  }, [sop?.id]);

  const handleDownload = async (filePath, fileName) => {
    
    try {
      const cleanPath = filePath.startsWith('/files/') ? filePath.substring(7) : filePath;
      
      const downloadUrl = API_CONFIG.getDownloadUrl(cleanPath);
      
      
      try {
        const response = await fetch(downloadUrl, { method: 'HEAD' });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        throw fetchError;
      }
      
      try {
        const res = await fetch(downloadUrl, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        const pathName = (filePath || '').split('/').pop() || '';
        const extFromPath = pathName.includes('.') ? pathName.substring(pathName.lastIndexOf('.')) : '';
        const safeName = (fileName && fileName.trim() ? fileName : pathName || 'download') + (fileName && fileName.includes('.') ? '' : extFromPath);

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = safeName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch (blobErr) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      
      const directUrl = API_CONFIG.getApiUrl(filePath);
      window.open(directUrl, '_blank');
    }
    
  };

  if (!sop) return null;

  const detectUploadcareFileType = async (url) => {
    try {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve('image');
        img.onerror = () => {
          if (url.includes('pdf') || url.includes('document')) {
            resolve('pdf');
          } else {
            resolve('other');
          }
        };
        img.src = url;
      });
    } catch {
      return 'other';
    }
  };

  const getFileType = async (url, name = '', index) => {
    const cacheKey = `${url}-${index}`;
    
    if (fileTypes[cacheKey]) {
      return fileTypes[cacheKey];
    }

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|ogg|avi|mov)$/i.test(url)) return 'video';
    if (/\.pdf$/i.test(url)) return 'pdf';
    if (/\.txt$/i.test(url)) return 'text';
    
    if (name) {
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return 'image';
      if (/\.(mp4|webm|ogg|avi|mov)$/i.test(name)) return 'video';
      if (/\.pdf$/i.test(name)) return 'pdf';
      if (/\.txt$/i.test(name)) return 'text';
    }
    
    if (url.includes('ucarecdn.net')) {
      try {
        const detectedType = await detectUploadcareFileType(url);
        
        setFileTypes(prev => ({
          ...prev,
          [cacheKey]: detectedType
        }));
        
        return detectedType;
      } catch {
        return 'other';
      }
    }
    
    return 'other';
  };

  const FilePreview = ({ file, index }) => {
    const [fileType, setFileType] = useState('loading');
    const [error, setError] = useState(false);
    const [textContent, setTextContent] = useState('');

    useEffect(() => {
      const detectType = async () => {
        try {
          const effectiveUrl = file.preview || file.url || '';
          const type = await getFileType(effectiveUrl, file.name, index);
          setFileType(type);
          if (type === 'text' && effectiveUrl) {
            try {
              const res = await fetch(effectiveUrl);
              const txt = await res.text();
              setTextContent(txt);
            } catch {
              setTextContent('');
            }
          }
        } catch {
          setFileType('other');
          setError(true);
        }
      };
      
      detectType();
    }, [file.url, file.name, index]);

    const getFileIcon = (type) => {
      switch (type) {
        case 'image': 
          return <PictureOutlined style={{ color: '#52c41a' }} />;
        case 'video': 
          return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
        case 'pdf': 
          return <FileTextOutlined style={{ color: '#f5222d' }} />;
        case 'loading':
          return <ReloadOutlined spin style={{ color: '#1890ff' }} />;
        default: 
          return <FileTextOutlined style={{ color: '#666' }} />;
      }
    };

    const renderPreview = () => {
      if (fileType === 'loading') {
        return (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            border: '2px dashed #d9d9d9',
            borderRadius: 8
          }}>
            <Spin size="large" />
            <br />
            <Text type="secondary">{lang === 'zh' ? '正在分析文件...' : 'Đang phân tích file...'}</Text>
          </div>
        );
      }

      if (error) {
        return (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            border: '2px dashed #ff7875',
            borderRadius: 8,
            background: '#fff2f0'
          }}>
            <Text type="danger">❌ {lang === 'zh' ? '无法加载文件' : 'Không thể tải file'}</Text>
          </div>
        );
      }

      switch (fileType) {
        case 'image':
          return (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Image
                src={file.preview || file.url}
                alt={file.name || "Image"}
                style={{ 
                  maxWidth: 420, 
                  maxHeight: 280, 
                  borderRadius: 8,
                  border: '1px solid #f0f0f0'
                }}
                placeholder={
                  <div style={{ 
                    height: 200, 
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Spin />
                  </div>
                }
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              />
            </div>
          );

        case 'video':
          return (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <video
                src={file.preview || file.url}
                controls
                style={{ 
                  maxWidth: 480, 
                  maxHeight: 300, 
                  borderRadius: 8,
                  border: '1px solid #f0f0f0'
                }}
              >
                {lang === 'zh' ? '浏览器不支持该视频。' : 'Trình duyệt không hỗ trợ video này.'}
              </video>
            </div>
          );

        case 'pdf':
          return (
            <div style={{ marginBottom: '16px' }}>
              <iframe
                src={file.preview || file.url}
                title={file.name || "PDF"}
                style={{
                  width: 520,
                  height: 400,
                  border: "1px solid #d9d9d9",
                  borderRadius: 8,
                }}
              />
            </div>
          );
        case 'text':
          return (
            <div style={{
              padding: '12px 16px',
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              maxHeight: 220,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 12
            }}>
              {textContent || (lang === 'zh' ? '无法预览 TXT 内容。' : 'Không thể xem trước nội dung TXT.')}
            </div>
          );

        default:
          return (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px',
              border: '2px dashed #d9d9d9',
              borderRadius: 8,
              background: '#fafafa'
            }}>
              <Text type="secondary">{lang === 'zh' ? '无预览' : 'Không có preview'}. File: {file.name || (lang === 'zh' ? '无名称' : 'Không tên')}</Text>
            </div>
          );
      }
    };

    return (
      <List.Item
        key={`${file.url}-${index}`}
        style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          marginBottom: 16,
          padding: '16px',
          background: '#fafafa'
        }}
      >
        {}
        <div style={{ marginBottom: '12px' }}>
          <Space>
            <Tag color="blue">#{index + 1}</Tag>
            {getFileIcon(fileType)}
            <Text strong>{file.name || `File ${index + 1}`}</Text>
            <Tag color={
              fileType === 'image' ? 'green' : 
              fileType === 'video' ? 'blue' : 
              fileType === 'pdf' ? 'red' : 
              fileType === 'loading' ? 'orange' : 'default'
            }>
              {fileType === 'loading' ? 'LOADING...' : fileType.toUpperCase()}
            </Tag>
            {file.url.includes('ucarecdn.net') && (
              <Tag color="purple">UPLOADCARE</Tag>
            )}
          </Space>
        </div>

        {}
        {renderPreview()}
      </List.Item>
    );
  };

  return (
    <Modal
      title={sop.title || sop.name || (lang === 'zh' ? 'SOP 详情' : 'Chi tiết SOP')}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          {lang === 'zh' ? '关闭' : 'Đóng'}
        </Button>,
      ]}
      width={600}
    >
      <div style={{ padding: '16px 0' }}>
        {}
        {sop.description && (
          <div style={{ marginBottom: '16px' }}>
            <Text strong>{lang === 'zh' ? '描述：' : 'Mô tả:'}</Text>
            <br />
            <Text>{sop.description}</Text>
          </div>
        )}
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <Text strong>{lang === 'zh' ? '创建人：' : 'Người tạo:'}</Text>
            <br />
            <Text>{sop.createdBy || '-'}</Text>
          </div>
          <div>
            <Text strong>{lang === 'zh' ? '创建日期：' : 'Ngày tạo:'}</Text>
            <br />
            <Text>{formatDateShortVN(sop.createdAt)}</Text>
          </div>
          <div>
            <Text strong>{lang === 'zh' ? '最后编辑人：' : 'Người sửa gần nhất:'}</Text>
            <br />
            <Text>{sop.lastEditedBy || '-'}</Text>
          </div>
          <div>
            <Text strong>{lang === 'zh' ? '最后更新时间：' : 'Ngày sửa gần nhất:'}</Text>
            <br />
            <Text>{sop.lastEditedAt ? formatDateShortVN(sop.lastEditedAt) : '-'}</Text>
          </div>
        </div>
      </div>

      {}
      {sop.files && sop.files.length > 0 && (
        <div>
          <Title level={4}>{lang === 'zh' ? '附件' : 'Files đính kèm'}</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sop.files.map((file, idx) => (
              <div key={file.id || idx} style={{ 
                border: '1px solid #f0f0f0', 
                borderRadius: '8px', 
                padding: '12px',
                backgroundColor: '#fafafa'
              }}>
                {}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  {file.fileType === 'image' ? <PictureOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: '8px' }} /> :
                   file.fileType === 'video' ? <VideoCameraOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: '8px' }} /> :
                   <FileTextOutlined style={{ fontSize: 20, color: '#fa8c16', marginRight: '8px' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{file.fileName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {file.fileType} • {(file.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Button 
                    type="link" 
                    onClick={() => handleDownload(file.filePath, file.fileName)}
                    icon={<DownloadOutlined />}
                    size="small"
                  >
                    {lang === 'zh' ? '下载' : 'Tải xuống'}
                  </Button>
                </div>
                
                {}
                {file.fileType === 'image' && (
                  <div style={{ textAlign: 'center' }}>
                    <Image
                      src={file.filePath}
                      alt={file.fileName}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px',
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr"
                    />
                  </div>
                )}
                
                {file.fileType === 'video' && (
                  <div style={{ textAlign: 'center' }}>
                    <video
                      src={file.filePath}
                      controls
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px',
                        borderRadius: '4px'
                      }}
                    >
                      {lang === 'zh' ? '浏览器不支持该视频。' : 'Trình duyệt không hỗ trợ video.'}
                    </video>
                  </div>
                )}
                
                {(file.fileType !== 'image' && file.fileType !== 'video') && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '2px dashed #d9d9d9'
                  }}>
                    <FileTextOutlined style={{ fontSize: 48, color: '#999', marginBottom: '8px' }} />
                    <div style={{ color: '#666' }}>
                      {lang === 'zh' ? '无法预览文件' : 'Không thể xem trước file'} {file.fileType}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {lang === 'zh' ? '点击下载打开文件' : 'Click Tai xuong de mo file'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {}
      {(!sop.files || sop.files.length === 0) && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>{lang === 'zh' ? '没有附件' : 'Không có files đính kèm'}</div>
        </div>
      )}

      {}
    </Modal>
  );
}

