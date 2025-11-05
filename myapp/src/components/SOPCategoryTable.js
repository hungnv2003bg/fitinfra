import React, { useEffect, useMemo, useState } from "react";
import { Table, Tag, Spin, Button, Popconfirm, message, Modal, Input, notification } from "antd";
import axios from "../plugins/axios";
import { useNavigate } from "react-router-dom";
import { EditOutlined, DeleteOutlined, ProfileOutlined } from "@ant-design/icons";

export default function SOPCategoryTable() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sopsRes, catRes] = await Promise.all([
          axios.get("/api/sops", { params: { page: 0, size: 1000 } }),
          axios.get("/api/sop-categories")
        ]);

        const sopsData = Array.isArray(sopsRes.data)
          ? sopsRes.data
          : (sopsRes.data && Array.isArray(sopsRes.data.content) ? sopsRes.data.content : []);

        const categories = Array.isArray(catRes.data) ? catRes.data : [];


        const groups = {};
        const seenCreatorsByCode = {};
        categories.forEach(cat => {
          const code = cat.categoryCode;
          const name = cat.categoryName;
          if (!code) return;
          groups[code] = {
            key: code,
            name: name || code,
            color: "green",
            path: `/sops/${code}`,
            count: 0,
            creators: []
          };
          seenCreatorsByCode[code] = new Set();
        });


        sopsData.forEach(item => {
          const code = item.category;
          if (code && groups[code]) {
            groups[code].count += 1;
            if (item.creator && !seenCreatorsByCode[code].has(item.creator)) {
              seenCreatorsByCode[code].add(item.creator);
              groups[code].creators.push(item.creator);
            }
          }
        });

        setRows(Object.values(groups));
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = useMemo(() => ([
    {
      title: "STT",
      key: "stt",
      render: (_, __, index) => <Tag color="blue">{index + 1}</Tag>,
      width: 80,
      align: "center",
    },
    {
      title: "Tên tài liệu",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Tag color="green" style={{ padding: "0 8px" }}>{text}</Tag>
      )
    },
    {
      title: "Người tạo",
      dataIndex: "creators",
      key: "creators",
      render: (arr = []) => (arr.length ? arr.join(', ') : '-'),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} size="small" onClick={() => { setEditing(record); setNewName(record.name); }} />
          <Popconfirm
            title="Xóa mục này khỏi bảng quản lý?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={async () => {
              setRows(prev => prev.filter(r => r.key !== record.key));
              notification.success({
                message: 'Hệ thống',
                description: "Đã xóa mục",
                placement: 'bottomRight'
              });
            }}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
          <Button icon={<ProfileOutlined />} size="small" onClick={() => navigate(record.path)} />
        </div>
      )
    }
  ]), [navigate]);

  return (
    <Spin spinning={loading}>
      <Table
        rowKey="key"
        dataSource={rows}
        columns={columns}
        pagination={false}
        size="middle"
      />
      <Modal title="Đổi tên tài liệu" open={!!editing} onOk={() => { setRows(prev => prev.map(r => r.key === editing.key ? { ...r, name: newName } : r)); setEditing(null); }} onCancel={() => setEditing(null)} okText="Lưu" cancelText="Hủy">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nhập tên mới" />
      </Modal>
    </Spin>
  );
}



