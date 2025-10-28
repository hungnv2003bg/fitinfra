import React, { useState, useEffect } from "react";
import { Modal, Descriptions, Tag, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "../../plugins/axios";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ChecklistViewModal({ open, record, onCancel }) {
  const { nguoiDung } = useSelector(state => state.user);
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRepeats, setTimeRepeats] = useState([]);
  const [sops, setSops] = useState([]);

  // Fetch groups, users, time-repeats and SOP documents data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes, usersRes, timeRepeatsRes, sopDocumentsRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/users"),
          axios.get("/api/time-repeats"),
          axios.get("/api/sop-documents")
        ]);
        setGroups(groupsRes.data || []);
        setUsers(usersRes.data || []);
        setTimeRepeats(timeRepeatsRes.data || []);
        setSops(sopDocumentsRes.data || []);
      } catch (error) {
        // silent
      }
    };
    
    if (open && record) {
      fetchData();
    }
  }, [open, record]);
  
  if (!record) return null;

  // Helper để hiển thị tên người từ userID
  const getUserDisplayName = (userId) => {
    if (!userId) return '-';
    // Nếu là user hiện tại
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    // Tìm user trong danh sách đã fetch
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  };

  // Helper để hiển thị tên group từ groupID
  const getGroupDisplayName = (groupId) => {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  };

  // Helper để parse và hiển thị implementers
  const getImplementersDisplay = (implementers) => {
    if (!Array.isArray(implementers) || implementers.length === 0) return '-';
    
    return implementers.map(impl => {
      if (typeof impl === 'string') {
        if (impl.startsWith('group:')) {
          const groupId = parseInt(impl.replace('group:', ''));
          return getGroupDisplayName(groupId);
        } else if (impl.startsWith('user:')) {
          const userId = parseInt(impl.replace('user:', ''));
          return getUserDisplayName(userId);
        }
        return impl;
      }
      return impl;
    }).join(', ');
  };

  // Helper để hiển thị thời gian lặp lại
  const getRepeatDisplay = (repeatId) => {
    if (!repeatId) return '-';
    
    const timeRepeat = timeRepeats.find(tr => tr.id === repeatId);
    if (!timeRepeat) return `ID: ${repeatId}`;
    
    const unitLabels = {
      day: lang === 'vi' ? 'ngày' : '天',
      week: lang === 'vi' ? 'tuần' : '周', 
      month: lang === 'vi' ? 'tháng' : '月',
      year: lang === 'vi' ? 'năm' : '年'
    };
    
    const unitLabel = unitLabels[timeRepeat.unit] || timeRepeat.unit;
    return `${timeRepeat.number} ${unitLabel}`;
  };

  // Helper để hiển thị tên SOP document từ sopId (documentID)
  const getSOPDisplayName = (sopId) => {
    if (!sopId) return '-';
    
    const sopDocument = sops.find(s => s.documentID === sopId);
    if (sopDocument) {
      return sopDocument.title || `Document ${sopId}`;
    }
    return `Document ${sopId}`;
  };

  // Kết xuất link điều hướng tới trang SOP Document
  const renderSOPLink = (sopId) => {
    if (!sopId) return '-';
    const sopDocument = sops.find(s => s.documentID === sopId);
    const label = sopDocument?.title || `Document ${sopId}`;

    const handleClick = async () => {
      let sopCategory = sopDocument?.sop?.id ?? sopDocument?.sopId ?? sopDocument?.sop?.code ?? sopDocument?.sop_id;
      if (!sopCategory) {
        try {
          const res1 = await axios.get(`/api/sop-documents/${encodeURIComponent(String(sopId))}`);
          const data1 = res1?.data || {};
          sopCategory = data1?.sop?.id ?? data1?.sopId ?? data1?.sop?.code ?? data1?.sop_id ?? data1?.sopID ?? data1?.sopCode;
          // If backend does not return the SOP reference, try to discover it by scanning categories
          if (!sopCategory) {
            // 1) fetch categories
            const listRes = await axios.get('/api/sops', { params: { page: 0, size: 1000 } }).catch(() => ({ data: [] }));
            const list = Array.isArray(listRes.data)
              ? listRes.data
              : (listRes.data && Array.isArray(listRes.data.content) ? listRes.data.content : []);
            const categoryIds = (list || []).map(item => item.id).filter(Boolean);
            // 2) fetch documents in batches until we find the documentID
            for (const catId of categoryIds) {
              try {
                const docsRes = await axios.get(`/api/sops/${encodeURIComponent(String(catId))}/documents`, { params: { _t: Date.now() } });
                const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
                const found = docs.find(d => Number(d.documentID) === Number(sopId));
                if (found) {
                  sopCategory = catId;
                  break;
                }
              } catch (e) {
                // ignore and continue scanning
              }
            }
          }
        } catch (e) {
          // silent
        }
      }
      if (sopCategory) {
        const path = `/sops/${encodeURIComponent(String(sopCategory))}?doc=${encodeURIComponent(String(sopId))}`;
        if (onCancel) onCancel();
        setTimeout(() => navigate(path), 0);
        return;
      }
      message.warning(lang === 'vi' ? 'Không tìm thấy SOP của tài liệu này.' : '未找到该文档所属的SOP。');
    };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cat = sopDocument?.sop?.id ?? sopDocument?.sopId ?? sopDocument?.sop?.code ?? sopDocument?.sop_id;
    const href = cat ? `${origin}/sops/${encodeURIComponent(String(cat))}?doc=${encodeURIComponent(String(sopId))}` : '#';

    return (
      <a
        href={href}
        onClick={(e) => { e.preventDefault(); handleClick(); }}
        style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}
        title={label}
      >
        {label}
      </a>
    );
  };

  // Helper để hiển thị thời gian cần hoàn thành
  const getDueDisplay = (dueInDays) => {
    if (!dueInDays) return '-';
    if (lang === 'vi') {
      if (dueInDays === 1) return '1 ngày';
      if (dueInDays < 7) return `${dueInDays} ngày`;
      if (dueInDays === 7) return '1 tuần';
      if (dueInDays < 30) return `${Math.round(dueInDays / 7)} tuần`;
      if (dueInDays === 30) return '1 tháng';
      if (dueInDays < 365) return `${Math.round(dueInDays / 30)} tháng`;
      return `${Math.round(dueInDays / 365)} năm`;
    }
    if (dueInDays === 1) return '1 天';
    if (dueInDays < 7) return `${dueInDays} 天`;
    if (dueInDays === 7) return '1 周';
    if (dueInDays < 30) return `${Math.round(dueInDays / 7)} 周`;
    if (dueInDays === 30) return '1 月';
    if (dueInDays < 365) return `${Math.round(dueInDays / 30)} 月`;
    return `${Math.round(dueInDays / 365)} 年`;
  };

  const labels = {
    vi: {
      title: 'Chi tiết công việc',
      taskName: 'Tên công việc',
      workContent: 'Nội dung công việc',
      creator: 'Người tạo',
      createdAt: 'Ngày tạo',
      implementers: 'Người thực hiện',
      startAt: 'Thời gian bắt đầu',
      repeat: 'Thời gian lặp lại',
      due: 'Thời gian cần hoàn thành',
      sop: 'Tài liệu SOP',
      lastEditedBy: 'Người sửa gần nhất',
      lastEditedAt: 'Cập nhật lần cuối'
    },
    zh: {
      title: '任务详情',
      taskName: '任务名称',
      workContent: '工作内容',
      creator: '创建人',
      createdAt: '创建时间',
      implementers: '执行组',
      startAt: '开始时间',
      repeat: '重复周期',
      due: '完成时限',
      sop: 'SOP 文档',
      lastEditedBy: '最近编辑人',
      lastEditedAt: '最后更新时间'
    }
  };
  const t = labels[lang];

  return (
    <Modal title={t.title} open={open} onCancel={onCancel} footer={null}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label={t.taskName}>{record.taskName}</Descriptions.Item>
        <Descriptions.Item label={t.workContent}>
          {record.workContent || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t.creator}>{getUserDisplayName(record.creator)}</Descriptions.Item>
        <Descriptions.Item label={t.createdAt}>{record.createdAt ? new Date(record.createdAt).toLocaleString() : '-'}</Descriptions.Item>
        <Descriptions.Item label={t.implementers}>
          {getImplementersDisplay(record.implementers)}
        </Descriptions.Item>
        <Descriptions.Item label={t.startAt}>
          {record.startAt ? new Date(record.startAt).toLocaleString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t.repeat}>
          {getRepeatDisplay(record.repeatId)}
        </Descriptions.Item>
        <Descriptions.Item label={t.due}>
          {getDueDisplay(record.dueInDays)}
        </Descriptions.Item>
        <Descriptions.Item label={t.sop}>
          {renderSOPLink(record.sopDocumentId)}
        </Descriptions.Item>
        <Descriptions.Item label={t.lastEditedBy}>
          {getUserDisplayName(record.lastEditedBy)}
        </Descriptions.Item>
        <Descriptions.Item label={t.lastEditedAt}>{record.lastEditedAt ? new Date(record.lastEditedAt).toLocaleString() : '-'}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}



