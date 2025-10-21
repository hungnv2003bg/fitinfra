import React, { useEffect, useState, useCallback } from "react";
import { Table, Spin, message, Button, Tag, Popconfirm, Input, Select, Space, Popover, Modal } from "antd";
import { DeleteOutlined, SearchOutlined, EditOutlined, FileTextOutlined, EyeOutlined, LockOutlined } from "@ant-design/icons";
import axios from "../plugins/axios";
import SOPDetailModal from "./modals/SOPDetailModal";
import SOPEditModal from "./modals/SOPEditModal";
import SOPDocumentEditModal from "./modals/SOPDocumentEditModal";
import SOPDocumentPermissionModal from "./modals/SOPDocumentPermissionModal";
import SOPGlobalPermissionModal from "./modals/SOPGlobalPermissionModal";
import { useMenuRefresh } from "../contexts/MenuRefreshContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatDateShortVN } from "../utils/dateUtils";

export default function SOPTable({ refreshSignal, category, onAddNew, addNewText, initialOpenDocumentId }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { quyenList } = useSelector(state => state.user);
  const [sops, setSops] = useState([]);
  const [filteredSops, setFilteredSops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSop, setSelectedSop] = useState(null);
  const [detailKey, setDetailKey] = useState(0);
  const [editRecord, setEditRecord] = useState(null);
  const [editDocumentRecord, setEditDocumentRecord] = useState(null);
  const [permissionRecord, setPermissionRecord] = useState(null);
  const [openGlobalPerm, setOpenGlobalPerm] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [creatorFilter, setCreatorFilter] = useState(undefined);
  const [userPermissions, setUserPermissions] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const { triggerMenuRefresh } = useMenuRefresh();
  const [didFilterByParam, setDidFilterByParam] = useState(false);
  const [highlightDocId, setHighlightDocId] = useState(undefined);

  const hasPermissionAccess = () => {
    if (!quyenList || quyenList.length === 0) return false;
    // Chỉ coi ADMIN là có toàn quyền bỏ qua phân quyền chi tiết
    return quyenList.some(role => 
      role === "ADMIN" || role === "ROLE_ADMIN"
    );
  };

  const isAdmin = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => 
      role === "ADMIN" || role === "ROLE_ADMIN"
    );
  };

  const isUserOrManager = () => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role => 
      role === "USER" || role === "MANAGER" || role === "ROLE_USER" || role === "ROLE_MANAGER"
    );
  };


  const fetchUserPermissions = useCallback(async () => {
    try {
      // Luôn lấy quyền toàn cục
      const globalRes = await axios.get('/api/sops/global/permissions/my');
      const globalPerm = globalRes?.data || { view: false, edit: false, delete: false, create: false };

      if (category) {
        // Khi ở trang tài liệu của một SOP: gộp quyền toàn cục với quyền theo SOP
        const docRes = await axios.get(`/api/sops/${category}/permissions/my`).catch(() => ({ data: {} }));
        const docPerm = docRes?.data || {};
        setUserPermissions({
          view: !!(globalPerm.view || docPerm.view),
          edit: !!(globalPerm.edit || docPerm.edit),
          delete: !!(globalPerm.delete || docPerm.delete),
          create: !!(globalPerm.create || docPerm.create),
        });
      } else {
        // Màn hình danh sách SOP: dùng quyền toàn cục
        setUserPermissions(globalPerm);
      }
    } catch (err) {
      setUserPermissions({ view: false, edit: false, delete: false, create: false });
    }
  }, [category]);

  useEffect(() => {
    fetchUserPermissions();
  }, [category]);

  const openGlobalPermissionModal = () => {
    setOpenGlobalPerm(true);
  };

  useEffect(() => {
    return () => {
      setSops([]);
      setFilteredSops([]);
      setSelectedSop(null);
      setEditRecord(null);
      setEditDocumentRecord(null);
      setPermissionRecord(null);
    };
  }, [category]);


  const openDetail = useCallback((record) => {
    setSelectedSop({ ...record });
    setDetailKey((k) => k + 1);
  }, []);

  const navigateToDetail = useCallback((record) => {
    const itemId = record.id;
    navigate(`/sops/${itemId}`);
  }, [navigate]);

  const openEditDocument = useCallback((record) => {
    setEditDocumentRecord({ ...record });
  }, []);

  const canCreate = () => {
    if (isAdmin()) return true;
    if (category) {
      return userPermissions.create === true;
    } else {
      // Màn hình danh sách SOP: quyền tạo dựa trên quyền toàn cục
      return userPermissions.create === true;
    }
  };

  const canEdit = (record) => {
    if (isAdmin()) return true;
    if (category) {
      return userPermissions.edit === true;
    } else {
      // Danh sách SOP: cho phép nếu có quyền toàn cục hoặc quyền theo SOP
      return userPermissions.edit === true || record.userCanEdit === true;
    }
  };

  const canDelete = (record) => {
    if (isAdmin()) return true;
    if (category) {
      return userPermissions.delete === true;
    } else {
      // Danh sách SOP: cho phép nếu có quyền toàn cục hoặc quyền theo SOP
      return userPermissions.delete === true || record.userCanDelete === true;
    }
  };

  const handleCreateClick = () => {
    if (!canCreate()) {
      message.error({
        content: lang === 'vi' ? 'Bạn không có quyền tạo mới!' : 'You do not have permission to create!',
        placement: 'bottomRight'
      });
      return;
    }
    if (onAddNew) onAddNew();
  };

  const handleEditClick = (record) => {
    if (!canEdit(record)) {
      message.error({
        content: lang === 'vi' ? 'Bạn không có quyền chỉnh sửa!' : 'You do not have permission to edit!',
        placement: 'bottomRight'
      });
      return;
    }
    if (category) {
      openEditDocument(record);
    } else {
      setEditRecord(record);
    }
  };

  const handleDeleteClick = (record) => {
    if (!canDelete(record)) {
      message.error({
        content: lang === 'vi' ? 'Bạn không có quyền xóa!' : 'You do not have permission to delete!',
        placement: 'bottomRight'
      });
      return;
    }
    const itemId = category ? record.documentID : record.id;
    const itemName = category ? record.title : record.name;
    
    Modal.confirm({
      title: t.deleteTitle,
      content: category ? t.deleteDescDocument(itemName) : t.deleteDesc(itemName),
      okText: t.okDelete,
      cancelText: t.cancel,
      onOk: () => handleDelete(itemId),
    });
  };


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (category) {
        const isAdminUser = isAdmin();
        
        const res = await axios.get(`/api/sops/${category}/documents`, { 
          params: { _t: Date.now(), visibleOnly: !isAdminUser }
        });
        
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (typeof res.data === 'string') {
          data = [];
        } else {
          data = [];
        }
        setSops(data);
        setFilteredSops(data);
        setPagination(prev => ({
          ...prev,
          total: data.length
        }));
      } else {
        const isAdminUser = isAdmin();
        const res = await axios.get("/api/sops", { 
          params: { 
            page: 0, 
            size: 1000, 
            _t: Date.now(), 
            visibleOnly: !isAdminUser
          }
        });
        const data = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.content) ? res.data.content : []);
        
        // Tin tưởng vào kết quả đã được backend lọc theo visibleOnly (đã bao gồm quyền toàn cục)
        const dataWithPerm = data;
        setSops(dataWithPerm);
        setFilteredSops(dataWithPerm);
        setPagination(prev => ({
          ...prev,
          total: dataWithPerm.length
        }));
      }
    } catch (err) {
      message.error({
        content: "Không thể tải danh sách SOP. Vui lòng thử lại!",
        placement: 'bottomRight'
      });
      setSops([]);
      setFilteredSops([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const applyViewPermissionFilterIfAvailable = async (items, isDocument) => {
    try {
      const checks = await Promise.all(
        (items || []).map(async (item) => {
          try {
            const base = isDocument ? `/api/sops/documents/${item.documentID}` : `/api/sops/${item.id}`;
            const res = await axios.get(`${base}/permissions/check`).catch(async () => {
              return await axios.get(`${base}/permissions`, { params: { mine: true } });
            });
            const data = res?.data;
            const canView = typeof data === 'boolean' ? data : !!(Array.isArray(data) ? data.some(p => p.view) : data?.view);
            return { item, canView: canView === true };
          } catch {
            return { item, canView: false };
          }
        })
      );
      return checks.filter(c => c.canView).map(c => c.item);
    } catch {
      return [];
    }
  };

  const handleDelete = useCallback(async (id) => {
    try {
      setLoading(true);

      if (category) {
        const response = await axios.delete(`/api/sop-documents/${encodeURIComponent(String(id))}`);
        const data = response.data;
        if (data.deletedFiles > 0) {
          message.success({
            content: lang === 'zh' 
              ? `删除文档成功（已删除 ${data.deletedFiles} 个文件）` 
              : `Xóa tài liệu thành công (${data.deletedFiles} file đã xóa)`,
            placement: 'bottomRight'
          });
        } else {
          message.success({
            content: lang === 'zh' ? '删除文档成功' : 'Xóa tài liệu thành công',
            placement: 'bottomRight'
          });
        }
      } else {
        // Pre-check: do not allow deleting SOP when it still has documents
        try {
          const docsRes = await axios.get(`/api/sops/${encodeURIComponent(String(id))}/documents`, { params: { _t: Date.now() } });
          const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
          if (docs.length > 0) {
            message.warning({
              content: lang === 'zh' ? '请先删除 SOPs 详情' : 'Vui lòng xóa SOPs chi tiết trước',
              placement: 'bottomRight'
            });
            return; // stop deletion
          }
        } catch (e) {
          // If check fails, proceed cautiously to backend delete
        }
        const response = await axios.delete(`/api/sops/${encodeURIComponent(String(id))}`);
        const data = response.data;
        if (data.deletedDocuments > 0 || data.deletedFiles > 0) {
          message.success({
            content: lang === 'zh' 
              ? `删除 SOP 成功（删除文档 ${data.deletedDocuments} 个，文件 ${data.deletedFiles} 个）` 
              : `Xóa SOP thành công (${data.deletedDocuments} tài liệu, ${data.deletedFiles} file đã xóa)`,
            placement: 'bottomRight'
          });
        } else {
          message.success({
            content: lang === 'zh' ? '删除 SOP 成功' : 'Xóa SOP thành công',
            placement: 'bottomRight'
          });
        }
      }
      
      fetchData();
      triggerMenuRefresh();
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = errorData?.error || "Không thể xóa. Vui lòng thử lại!";
      if (lang === 'zh') {
        const vi = (errorMsg || '').toString();
        if (vi.includes('Vui lòng xóa file trước khi xóa')) {
          errorMsg = '删除前请先删除文件。';
        } else if (vi.includes('Không thể xóa')) {
          errorMsg = '无法删除。请重试！';
        }
      }

      message.error({
        content: errorMsg,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData, triggerMenuRefresh, category]);


  useEffect(() => {
    fetchData();
  }, [fetchData, refreshSignal]);

  // When a document id is provided, filter table to just that document and highlight it
  useEffect(() => {
    if (!category || !initialOpenDocumentId || didFilterByParam) return;
    const idNum = Number(initialOpenDocumentId);
    if (!Number.isFinite(idNum)) return;
    const match = (sops || []).find(r => Number(r.documentID) === idNum);
    if (match) {
      setFilteredSops([match]);
      setPagination(prev => ({ ...prev, total: 1, current: 1 }));
      setHighlightDocId(idNum);
      setDidFilterByParam(true);
    }
  }, [category, initialOpenDocumentId, sops, didFilterByParam]);

  useEffect(() => {
    let filtered = sops;

    // If deep-linked to a specific document, force show only that row until user clears filters
    if (category && didFilterByParam && highlightDocId) {
      filtered = (sops || []).filter(item => Number(item.documentID) === Number(highlightDocId));
    } else {
      if (searchText) {
        filtered = filtered.filter(item => {
          const searchField = category ? item.title : item.name;
          return searchField?.toLowerCase().includes(searchText.toLowerCase());
        });
      }

      if (creatorFilter) {
        filtered = filtered.filter(item => {
          if (typeof item.createdBy === 'string') {
            return item.createdBy === creatorFilter;
          } else if (typeof item.createdBy === 'object' && item.createdBy) {
            return item.createdBy.fullName === creatorFilter || item.createdBy.manv === creatorFilter;
          }
          return false;
        });
      }
    }

    setFilteredSops(filtered);
    setPagination(prev => ({
      ...prev,
      total: filtered.length
    }));
  }, [sops, searchText, creatorFilter, category, didFilterByParam, highlightDocId]);

  const uniqueCreators = [...new Set(sops.map(item => {
    if (typeof item.createdBy === 'string') {
      return item.createdBy;
    } else if (typeof item.createdBy === 'object' && item.createdBy) {
      return item.createdBy.fullName || item.createdBy.manv;
    }
    return null;
  }).filter(Boolean))];
  const labels = {
    vi: {
      stt: "STT",
      name: "Tên tài liệu",
      documentName: "Tên tài liệu",
      creator: "Người tạo",
      createdAt: "Ngày tạo",
      lastEditedBy: "Người sửa gần nhất",
      lastEditedAt: "Cập nhật lần cuối",
      quantity: "Số lượng",
      filesSuffix: "files",
      actions: "Thao tác",
      searchPlaceholder: "Tìm kiếm theo tên tài liệu...",
      searchPlaceholderDocument: "Tìm kiếm theo tên tài liệu...",
      creatorFilter: "Chọn người tạo...",
      clearFilters: "Xóa bộ lọc",
      deleteTitle: "Xác nhận xóa",
      deleteDesc: (n) => `Xóa tài liệu "${n}"?`,
      deleteDescDocument: (n) => `Xóa tài liệu "${n}"?`,
      okDelete: "Xóa",
      cancel: "Hủy",
      paginationTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
    },
    zh: {
      stt: "序号",
      name: "文档名称",
      documentName: "文档名称",
      creator: "创建人",
      createdAt: "创建日期",
      lastEditedBy: "最后编辑人",
      lastEditedAt: "最后更新",
      quantity: "数量",
      filesSuffix: "个文件",
      actions: "操作",
      searchPlaceholder: "按文档名称搜索",
      searchPlaceholderDocument: "按文档名称搜索",
      creatorFilter: "选择创建人...",
      clearFilters: "清除筛选",
      deleteTitle: "确认删除",
      deleteDesc: (n) => `删除文档 "${n}"？`,
      deleteDescDocument: (n) => `删除文档 "${n}"？`,
      okDelete: "删除",
      cancel: "取消",
      paginationTotal: (total, range) => `共 ${total} 条`,
    },
  };

  const t = labels[lang];
  const searchPlaceholderText = category ? t.searchPlaceholderDocument : t.searchPlaceholder;

  const handleTableChange = (paginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize
    }));
  };

  const columns = [
    {
      title: t.stt,
      key: "stt",
      render: (_, record, index) => (
        <Tag color={highlightDocId && Number(record.documentID) === Number(highlightDocId) ? 'red' : 'blue'}>
          {index + 1}
        </Tag>
      ),
      width: 80,
      align: "center",
    },
    {
      title: category ? t.documentName : t.name,
      dataIndex: category ? "title" : "name",
      key: category ? "title" : "name",
      width: 220,
    },
    {
      title: t.creator,
      dataIndex: "createdBy",
      key: "createdBy",
      render: (value) => {
        if (!value) return "-";
        if (typeof value === "string") return value;
        return value.fullName || value.manv || "-";
      },
      width: 170,
    },
    {
      title: t.createdAt,
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatDateShortVN(value),
      width: 170,
    },
    {
      title: t.lastEditedBy,
      dataIndex: "lastEditedBy",
      key: "lastEditedBy",
      render: (value) => {
        if (!value) return "-";
        if (typeof value === "string") return value;
        return value.fullName || value.manv || "-";
      },
      width: 170,
    },
    {
      title: t.lastEditedAt,
      dataIndex: "lastEditedAt",
      key: "lastEditedAt",
      render: (value) => formatDateShortVN(value),
      width: 170,
    },
    {
      title: t.quantity,
      key: "documentCount",
      width: 100,
      align: "center",
      render: (_, record) => {
        if (category) {
          const fileCount = record.files ? record.files.length : 0;
          const content = (
            <div style={{ maxWidth: 360 }}>
              {(record.files || []).map((f, idx) => (
                <div key={f.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <Tag color="purple" style={{ marginRight: 0 }}>#{idx + 1}</Tag>
                  <span style={{ fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.fileName}>
                    {f.fileName}
                  </span>
                </div>
              ))}
              {fileCount === 0 && <span style={{ color: '#999' }}>{lang === 'zh' ? '无附件' : 'Không có tệp'}</span>}
            </div>
          );
          const displayNode = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Tag color={fileCount > 0 ? 'blue' : 'default'} style={{ marginRight: 0, borderRadius: 12, padding: '0 8px', fontWeight: 600 }}>
                {fileCount}
              </Tag>
              <span style={{ color: '#555', fontWeight: 500 }}>{t.filesSuffix}</span>
            </span>
          );
          return (
            <Popover content={content} placement="topLeft">
              <span style={{ cursor: fileCount > 0 ? 'pointer' : 'default' }}>{displayNode}</span>
            </Popover>
          );
        }
        const documentCount = record.documentCount || 0;
        return documentCount;
      },
    },
    {
      title: t.actions,
      key: "action",
      fixed: "right",
      width: category ? 240 : 280,
      align: "center",
      render: (_, record) => {
        const itemId = category ? record.documentID : record.id;
        const itemName = category ? record.title : record.name;
        
        // Hiển thị theo phân quyền thay vì cứng theo vai trò
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {category && (
              <Button icon={<EyeOutlined />} size="middle" onClick={() => openDetail(record)} title={lang === 'zh' ? '查看详情' : 'Xem chi tiết'} />
            )}
            {canEdit(record) && (
              <Button icon={<EditOutlined />} size="middle" onClick={() => handleEditClick(record)} />
            )}
            {!category && quyenList && quyenList.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN') && (
              <Button icon={<LockOutlined />} size="middle" onClick={() => setPermissionRecord({ ...record, isDocument: !!category })} title={lang === 'zh' ? '权限' : 'Phân quyền'} />
            )}
            {!category && (
              <Button icon={<FileTextOutlined />} size="middle" onClick={() => navigateToDetail(record)} title={lang === 'zh' ? '查看详情' : 'Xem chi tiết'} />
            )}
            {canDelete(record) && (
              <Button danger icon={<DeleteOutlined />} size="middle" onClick={() => handleDeleteClick(record)} />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {}
      <div style={{
        marginBottom: 16,
        padding: 12,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 8
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap>
            <Input
              placeholder={searchPlaceholderText}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder={t.creatorFilter}
              value={creatorFilter}
              onChange={setCreatorFilter}
              style={{ width: 200 }}
              allowClear
            >
              {uniqueCreators.map(creator => (
                <Select.Option key={creator} value={creator}>{creator}</Select.Option>
              ))}
            </Select>
            <Button onClick={() => { setSearchText(""); setCreatorFilter(undefined); setDidFilterByParam(false); setHighlightDocId(undefined); }}>{t.clearFilters}</Button>
          </Space>
          <Space>
          {hasPermissionAccess() && (
            <Button onClick={openGlobalPermissionModal} icon={<LockOutlined />}>{lang === 'vi' ? 'Phân quyền' : '权限'}</Button>
          )}
          {onAddNew && canCreate() && (
            <Button 
              type="primary" 
              onClick={handleCreateClick}
              style={{ 
                backgroundColor: '#1677ff',
                borderColor: '#1677ff',
                color: '#fff'
              }}
            >
              {addNewText || (lang === 'vi' ? 'Thêm mới' : '新增')}
            </Button>
          )}
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table
          rowKey={category ? "documentID" : "id"}
          dataSource={filteredSops}
          columns={columns}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              lang === 'vi' ? `${range[0]}-${range[1]} của ${total} items` : t.paginationTotal(total, range),
          }}
          onChange={handleTableChange}
        />
      </Spin>

      <SOPDetailModal
        key={detailKey}
        open={!!selectedSop}
        sop={selectedSop}
        onCancel={() => setSelectedSop(null)}
      />
      <SOPEditModal
        open={!!editRecord}
        record={editRecord}
        onCancel={() => setEditRecord(null)}
        onSaved={fetchData}
      />
      <SOPDocumentEditModal
        open={!!editDocumentRecord}
        record={editDocumentRecord}
        onCancel={() => setEditDocumentRecord(null)}
        onSaved={fetchData}
      />
      <SOPDocumentPermissionModal
        open={!!permissionRecord}
        record={permissionRecord}
        onCancel={() => setPermissionRecord(null)}
        onSaved={fetchData}
      />
      {openGlobalPerm && (
        <SOPGlobalPermissionModal
          open={openGlobalPerm}
          onCancel={() => setOpenGlobalPerm(false)}
          onSaved={() => setOpenGlobalPerm(false)}
        />
      )}
    </div>
  );
}

