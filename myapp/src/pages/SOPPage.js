import React, { useMemo, useState, useEffect } from "react";
import { Button } from "antd";
import { FileTextOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import SOPTable from "../components/SOPTable";
import SOPModal from "../components/modals/SOPModal";
import SOPDocumentModal from "../components/modals/SOPDocumentModal";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import axios from "../plugins/axios";

function SOPPage() {
  const { lang } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openDocument, setOpenDocument] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sopName, setSopName] = useState('');

  const { title, category } = useMemo(() => {
    if (id) {
      return { 
        title: `SOP ${id}`,
        category: id 
      };
    }
    
    const defaultTitle = lang === 'vi' ? 'Tài liệu SOPs' : 'SOP 文档';
    return { 
      title: defaultTitle, 
      category: undefined 
    };
  }, [id, lang]);

  useEffect(() => {
    if (id) {
      const fetchSOPName = async () => {
        try {

          const response = await axios.get(`/api/sops/${id}`);
          if (response.data && response.data.name) {
            setSopName(response.data.name);
          } else {
            setSopName(`SOP ${id}`);
          }
        } catch (error) {

          if (error.response && error.response.status === 403) {
            navigate('/sops');
            return;
          }

          if (error.response && error.response.status === 404) {
            navigate('/sops');
            return;
          }

          setSopName(`SOP ${id}`);
        }
      };
      fetchSOPName();
    } else {
      setSopName('');
    }
  }, [id, navigate]);


  const handleAdded = () => setRefreshKey((k) => k + 1);
  const handleDocumentAdded = () => setRefreshKey((k) => k + 1);

  const handleAddNew = () => {
    if (id) {
      setOpenDocument(true);
    } else {
      setOpen(true);
    }
  };

  return (
    <div>
      {id && (
        <div style={{ marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/sops')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              color: '#1677ff',
              borderColor: '#1677ff'
            }}
          >
            {lang === 'vi' ? 'Trở lại' : '返回'}
          </Button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex',
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e6f4ff',
            color: '#1677ff',
            borderRadius: 8
          }}>
            <FileTextOutlined />
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{sopName || title}</h2>
        </div>
      </div>
      <SOPTable 
        refreshSignal={refreshKey} 
        category={category} 
        onAddNew={handleAddNew}
        addNewText={lang === 'vi' ? 'Thêm mới' : '新增'}
      />
      <SOPModal open={open} onCancel={() => setOpen(false)} onAdded={handleAdded} category={category} />
      <SOPDocumentModal 
        open={openDocument} 
        onCancel={() => setOpenDocument(false)} 
        onAdded={handleDocumentAdded} 
        sopId={id} 
      />
    </div>
  );
}

export default SOPPage;

