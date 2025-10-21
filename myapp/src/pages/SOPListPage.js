import React, { useState } from "react";
import { FileTextOutlined } from "@ant-design/icons";
import SOPTable from "../components/SOPTable";
import SOPModal from "../components/modals/SOPModal";
import { useLanguage } from "../contexts/LanguageContext";

function SOPListPage() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdded = () => setRefreshKey((k) => k + 1);

  const handleAddNew = () => {
    setOpen(true);
  };

  return (
    <div>
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
            {lang === 'vi' ? 'Tài liệu SOPs' : 'SOP 文档'}
          </h2>
        </div>
      </div>
      <SOPTable 
        refreshSignal={refreshKey} 
        category={undefined} 
        onAddNew={handleAddNew}
        addNewText={lang === 'vi' ? 'Thêm mới' : '新增'}
      />
      <SOPModal 
        open={open} 
        onCancel={() => setOpen(false)} 
        onAdded={handleAdded} 
        category={undefined} 
      />
    </div>
  );
}

export default SOPListPage;

