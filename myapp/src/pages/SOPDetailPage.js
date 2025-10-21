import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { FileTextOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import SOPTable from "../components/SOPTable";
import SOPDocumentModal from "../components/modals/SOPDocumentModal";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import axios from "../plugins/axios";

function SOPDetailPage() {
  const { lang } = useLanguage();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [openDocument, setOpenDocument] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sopName, setSopName] = useState('');
  const [initialDocId, setInitialDocId] = useState(undefined);


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
    }
  }, [id, navigate]);

  // Read query string for doc id: /sops/:id?doc=123
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docId = params.get('doc');
    setInitialDocId(docId || undefined);
  }, [location.search]);

  const handleDocumentAdded = () => setRefreshKey((k) => k + 1);

  const handleAddNew = () => {
    setOpenDocument(true);
  };

  return (
    <div>
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
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {sopName || `SOP ${id}`}
          </h2>
        </div>
      </div>
      <SOPTable 
        refreshSignal={refreshKey} 
        category={id} 
        onAddNew={handleAddNew}
        addNewText={lang === 'vi' ? 'Thêm mới' : '新增'}
        initialOpenDocumentId={initialDocId}
      />
      <SOPDocumentModal 
        open={openDocument} 
        onCancel={() => setOpenDocument(false)} 
        onAdded={handleDocumentAdded} 
        sopId={id} 
      />
    </div>
  );
}

export default SOPDetailPage;

