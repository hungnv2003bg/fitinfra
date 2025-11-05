import React from "react";
import { Modal, Descriptions, Tag } from "antd";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSelector } from "react-redux";
import API_CONFIG from "../../config/api";
import { formatDateOnlyVN, formatDateShortVN } from "../../utils/dateUtils";

export default function ImprovementDetailModal({ open, record, onCancel, groups = [], users = [] }) {
  const { lang } = useLanguage();
  const { nguoiDung } = useSelector(state => state.user);
  
  if (!record) return null;

  // Helper function để hiển thị tên user
  function getUserDisplayName(userId) {
    if (!userId) return '-';
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  }

  const labels = {
    vi: {
      title: 'Chi tiết cải thiện',
      category: 'Hạng mục',
      improvementEvent: 'Loại sự kiện',
      responsible: 'Người phụ trách',
      collaborators: 'Người phối hợp',
      content: 'Nội dung công việc',
      actionPlan: 'Hành động cải thiện',
      planned: 'Dự kiến hoàn thành',
      completed: 'Thời gian hoàn thành',
      note: 'Ghi chú',
      status: 'Trạng thái',
      progress: 'Tiến độ',
      files: 'Tệp đính kèm',
      lastEditedBy: 'Người sửa cuối',
      statusMap: { PENDING: 'Chưa thực hiện', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn thành' }
    },
    zh: {
      title: '問題管理',
      category: '任务名称',
      improvementEvent: '問題管理事件',
      responsible: '负责人',
      collaborators: '协同人',
      content: '工作内容',
      actionPlan: '問題管理行动',
      planned: '预计完成',
      completed: '完成时间',
      note: '备注',
      status: '状态',
      progress: '进度',
      files: '附件',
      lastEditedBy: '最后编辑人',
      statusMap: { PENDING: '未开始', IN_PROGRESS: '进行中', DONE: '已完成' }
    }
  };
  const t = labels[lang];

  // Helper functions để hiển thị tên group và user (same as in ImprovementPage)
  function getUserDisplayName(userId) {
    if (!userId) return '-';
    if (nguoiDung?.userID === userId) {
      return nguoiDung?.fullName || nguoiDung?.manv || `User ${userId}`;
    }
    const user = users.find(u => u.userID === userId);
    if (user) {
      return user.fullName || user.manv || `User ${userId}`;
    }
    return `User ${userId}`;
  }

  function getGroupDisplayName(groupId) {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  }

  // Helper để parse và hiển thị responsible (có thể là group:ID hoặc user:ID)
  function getResponsibleDisplay(responsible) {
    if (!responsible) return '-';
    
    if (typeof responsible === 'string') {
      if (responsible.startsWith('group:')) {
        const groupId = parseInt(responsible.replace('group:', ''));
        return getGroupDisplayName(groupId);
      } else if (responsible.startsWith('user:')) {
        const userId = parseInt(responsible.replace('user:', ''));
        return getUserDisplayName(userId);
      }
      return responsible;
    }
    return responsible;
  }

  const statusCode = (() => {
    const v = String(record.status || '').toUpperCase();
    if (v.includes('DONE') || v.includes('HOÀN')) return 'DONE';
    if (v.includes('IN_PROGRESS') || v.includes('ĐANG')) return 'IN_PROGRESS';
    if (v.includes('PENDING') || v.includes('CHƯA')) return 'PENDING';
    return v || undefined;
  })();

  return (
    <Modal title={t.title} open={open} onCancel={onCancel} footer={null} width={700}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label={t.category}>{record.category || '-'}</Descriptions.Item>
        <Descriptions.Item label={t.content}>{record.issueDescription || '-'}</Descriptions.Item>
        <Descriptions.Item label={t.responsible}>
          {record.responsible ? (
            Array.isArray(record.responsible) 
              ? (record.responsible.length > 0 ? record.responsible.map(getResponsibleDisplay).join(', ') : '-')
              : getResponsibleDisplay(record.responsible)
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t.collaborators}>{Array.isArray(record.collaborators) && record.collaborators.length ? record.collaborators.map(getResponsibleDisplay).join(', ') : '-'}</Descriptions.Item>
        <Descriptions.Item label={t.improvementEvent}>{record.improvementEvent?.eventName || record.improvementEventName || '-'}</Descriptions.Item>
        <Descriptions.Item label={t.actionPlan}>{record.actionPlan || '-'}</Descriptions.Item>
        <Descriptions.Item label={t.planned}>{formatDateOnlyVN(record.plannedDueAt)}</Descriptions.Item>
        <Descriptions.Item label={t.completed}>{formatDateShortVN(record.completedAt)}</Descriptions.Item>
        <Descriptions.Item label={t.note}>{record.note || '-'}</Descriptions.Item>
        <Descriptions.Item label={t.status}>{statusCode ? t.statusMap[statusCode] : '-'}</Descriptions.Item>
        <Descriptions.Item label={t.progress}>{record.progress != null ? `${record.progress}%` : '-'}</Descriptions.Item>
        <Descriptions.Item label={t.files}>
          {Array.isArray(record.files) && record.files.length > 0 ? (
            <div>
              {record.files.map((file, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <a 
                    href={`${API_CONFIG.BACKEND_URL}${file.url || file.filePath}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1677ff' }}
                  >
                    {file.name || file.fileName || `File ${index + 1}`}
                  </a>
                </div>
              ))}
            </div>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t.lastEditedBy}>{getUserDisplayName(record.lastEditedBy)}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}



