import React, { useEffect, useMemo } from "react";
import { Modal, Form, Input, DatePicker, InputNumber, Select, Cascader, message, notification } from "antd";
import axios from "../../plugins/axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useSelector } from "react-redux";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ChecklistEditModal({ open, record, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const { nguoiDung } = useSelector(state => state.user);
  const [groupOptions, setGroupOptions] = React.useState([]);
  const [userOptions, setUserOptions] = React.useState([]);
  const [timeRepeatOptions, setTimeRepeatOptions] = React.useState([]);
  const [sopOptions, setSopOptions] = React.useState([]);
  const [selectedSopPath, setSelectedSopPath] = React.useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [groupsRes, usersRes, timeRepeatsRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/users"),
          axios.get("/api/time-repeats"),
        ]);
        setGroupOptions((groupsRes.data || []).map(g => ({ label: g.name || g.groupName || g.id, value: `group:${g.id}` })));
        setUserOptions((usersRes.data || []).map(u => ({ label: `${(u.manv || '').trim()}${u.fullName ? ` (${u.fullName})` : ''}`.trim(), value: `user:${u.userID}` })));
        const list = (timeRepeatsRes.data || []);
        setTimeRepeatOptions(list.map(r => ({ id: r.id, unit: r.unit, number: r.number, label: `${r.number} ${r.unit}`, value: r.id })));

        try {
          const sopsRes = await axios.get("/api/sops", { params: { page: 0, size: 1000 } });
          const sops = Array.isArray(sopsRes.data) ? sopsRes.data : (sopsRes.data && Array.isArray(sopsRes.data.content) ? sopsRes.data.content : []);
          setSopOptions((sops || []).map(s => ({ value: s.id, label: s.name || `SOP ${s.id}`, isLeaf: false })));
        } catch {
          setSopOptions([]);
        }
      } catch {}
    };
    fetchOptions();
  }, []);

  const repeatCascaderOptions = useMemo(() => {
    if (!Array.isArray(timeRepeatOptions) || timeRepeatOptions.length === 0) return [];
    const unitToLabel = { day: "ngày", week: "tuần", month: "tháng", year: "năm" };
    const groups = timeRepeatOptions.reduce((acc, r) => {
      const key = r.unit;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
    return Object.keys(groups).map((unit) => ({
      value: unit,
      label: unitToLabel[unit] || unit,
      children: groups[unit]
        .slice()
        .sort((a, b) => Number(a.number) - Number(b.number))
        .map((r) => ({ value: r.id, label: String(r.number) })),
    }));
  }, [timeRepeatOptions]);

  const repeatIdWatch = Form.useWatch("repeatId", form);
  const repeatCascaderValue = useMemo(() => {
    const item = (timeRepeatOptions || []).find((i) => i.id === repeatIdWatch);
    return item ? [item.unit, item.id] : [];
  }, [repeatIdWatch, timeRepeatOptions]);

  const convertToDays = (unit, number) => {
    const n = Number(number || 0);
    if (unit === "day") return n;
    if (unit === "week") return n * 7;
    if (unit === "month") return n * 30;
    if (unit === "year") return n * 365;
    return n;
  };

  const dueInDaysWatch = Form.useWatch("dueInDays", form);
  const remindInDaysWatch = Form.useWatch("remindInDays", form);
  const dueCascaderValue = useMemo(() => {
    if (!dueInDaysWatch) return [];
    const matched = (timeRepeatOptions || []).find((r) => convertToDays(r.unit, r.number) === Number(dueInDaysWatch));
    return matched ? [matched.unit, matched.id] : [];
  }, [dueInDaysWatch, timeRepeatOptions]);

  const remindCascaderValue = useMemo(() => {
    if (!remindInDaysWatch) return [];
    const matched = (timeRepeatOptions || []).find((r) => convertToDays(r.unit, r.number) === Number(remindInDaysWatch));
    return matched ? [matched.unit, matched.id] : [];
  }, [remindInDaysWatch, timeRepeatOptions]);

  const loadSopDocuments = async (selectedOptions) => {
    const target = selectedOptions[selectedOptions.length - 1];
    target.loading = true;
    try {
      const res = await axios.get(`/api/sops/${encodeURIComponent(String(target.value))}/documents`);
      const docs = Array.isArray(res.data) ? res.data : [];
      target.children = docs.map(d => ({
        value: d.documentID ?? d.id,
        label: d.title || d.name || d.fileName || `Tài liệu ${d.documentID ?? d.id}`,
        isLeaf: true,
      }));
      setSopOptions(options => options.slice());
    } catch {
      target.children = [];
      setSopOptions(options => options.slice());
    } finally {
      target.loading = false;
    }
  };

  useEffect(() => {
    const initFromRecord = async () => {
      if (record) {
        const docId = record.sopDocumentId ?? record.sopId ?? null;
        form.setFieldsValue({
          taskName: record.taskName,
          workContent: record.workContent,
          implementers: Array.isArray(record.implementers) ? record.implementers : (record.implementer ? [record.implementer] : []),
          startAt: record.startAt ? dayjs(record.startAt) : null,
          repeatId: record.repeatId,
          dueInDays: record.dueInDays,
          remindInDays: record.remindInDays,
          sopDocumentId: docId,
          status: record.status || 'ACTIVE',
        });

        // If we already know the document id, try to preselect cascader path by discovering its category
        if (docId) {
          try {
            // Try fast path: check if any loaded option already has this doc
            const existingCat = (sopOptions || []).find(o => Array.isArray(o.children) && o.children.some(c => Number(c.value) === Number(docId)));
            if (existingCat) {
              setSelectedSopPath([existingCat.value, Number(docId)]);
              return;
            }
            // Otherwise scan categories
            const listRes = await axios.get('/api/sops', { params: { page: 0, size: 1000 } }).catch(() => ({ data: [] }));
            const list = Array.isArray(listRes.data) ? listRes.data : (listRes.data && Array.isArray(listRes.data.content) ? listRes.data.content : []);
            const categories = (list || []).map(s => s.id).filter(Boolean);
            for (const catId of categories) {
              try {
                const docsRes = await axios.get(`/api/sops/${encodeURIComponent(String(catId))}/documents`, { params: { _t: Date.now() } });
                const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
                const found = docs.find(d => Number(d.documentID) === Number(docId));
                if (found) {
                  // ensure options include this category with its documents for display
                  setSopOptions((prev) => {
                    const exists = (prev || []).some(o => o.value === catId);
                    const next = exists ? prev.slice() : [...prev, { value: catId, label: `SOP ${catId}`, isLeaf: false }];
                    const cat = next.find(o => o.value === catId);
                    cat.children = docs.map(d => ({ value: d.documentID ?? d.id, label: d.title || d.name || d.fileName || `Tài liệu ${d.documentID ?? d.id}`, isLeaf: true }));
                    return next.slice();
                  });
                  setSelectedSopPath([catId, Number(docId)]);
                  break;
                }
              } catch {}
            }
          } catch {}
        } else {
          setSelectedSopPath([]);
        }
      } else {
        form.resetFields();
        setSelectedSopPath([]);
      }
    };
    initFromRecord();
  }, [record, timeRepeatOptions, sopOptions]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const resolvedRepeatId = values.repeatId ? Number(values.repeatId) : null;

      await axios.patch(`/api/checklists/${encodeURIComponent(String(record.id))}`, {
        taskName: values.taskName,
        workContent: values.workContent,
        implementers: values.implementers || [],
        startAt: values.startAt ? values.startAt.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss') : null,
        repeatId: resolvedRepeatId,
        dueInDays: values.dueInDays,
        remindInDays: values.remindInDays,
        sopDocumentId: values.sopDocumentId ? Number(values.sopDocumentId) : null,
        lastEditedBy: nguoiDung?.userID,
        status: values.status || 'ACTIVE',
      });
      notification.success({
        message: "Hệ thống",
        description: "Cập nhật công việc thành công",
        placement: "bottomRight",
        duration: 3,
      });      
      onSaved?.();
      onCancel?.();
    } catch (e) {
      if (e?.response?.status === 400) {
        notification.error({
          message: "Lỗi",
          description: "Thời gian bắt đầu phải lớn hơn thời gian hiện tại",
          placement: "bottomRight",
          duration: 3,
        });
      } else {
        notification.error({
          message: "Hệ thống",
          description: "Cập nhật công việc thất bại",
          placement: "bottomRight",
          duration: 3,
        });
      }
    }
  };

  return (
    <Modal
      title="Sửa công việc"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="taskName" label="Tên công việc" rules={[{ required: true, message: "Vui lòng nhập tên công việc" }]}>
          <Input placeholder="Nhập tên công việc..." />
        </Form.Item>

        <Form.Item name="workContent" label="Nội dung công việc">
          <Input.TextArea 
            placeholder="Nhập nội dung chi tiết công việc..." 
            rows={4}
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Form.Item label="Tài liệu SOPs">
          <Cascader
            placeholder="Chọn tài liệu SOPs"
            options={sopOptions}
            loadData={loadSopDocuments}
            value={selectedSopPath}
            displayRender={(labels, selectedOptions) => {
              if (selectedOptions && selectedOptions.length === 2) {
                return selectedOptions[1]?.label ?? labels[labels.length - 1];
              }
              return labels[labels.length - 1];
            }}
            onChange={(path) => {
              const docId = Array.isArray(path) && path.length === 2 ? path[1] : null;
              form.setFieldsValue({ sopDocumentId: docId || null });
              setSelectedSopPath(Array.isArray(path) ? path : []);
            }}
            changeOnSelect={false}
            allowClear
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="sopDocumentId" noStyle>
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>

        {/* Row 1: Thời gian bắt đầu và Thời gian lặp lại */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item 
              name="startAt" 
              label="Thời gian bắt đầu"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    const now = dayjs();
                    if (value.isBefore(now)) {
                      return Promise.reject(new Error('Thời gian bắt đầu phải lớn hơn thời gian hiện tại'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item label="Thời gian lặp lại">
              <Cascader
                placeholder="Chọn thời gian lặp lại"
                options={repeatCascaderOptions}
                value={repeatCascaderValue}
                displayRender={(labels, selectedOptions) => {
                  if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                  const unit = selectedOptions[0]?.value;
                  const numberLabel = selectedOptions[1]?.label;
                  const unitLabel = { day: "ngày", week: "tuần", month: "tháng", year: "năm" }[unit] || unit;
                  return `${numberLabel} ${unitLabel}`;
                }}
                onChange={(path) => {
                  const id = Array.isArray(path) && path.length === 2 ? path[1] : null;
                  form.setFieldsValue({ repeatId: id || null });
                }}
                allowClear
                changeOnSelect={false}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="repeatId" noStyle>
              <InputNumber style={{ display: 'none' }} />
            </Form.Item>
          </div>
        </div>

        {/* Row 2: Thời gian cần hoàn thành và Ngày nhắc nhở */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item label="Thời gian cần hoàn thành">
              <Cascader
                placeholder="Chọn thời gian cần hoàn thành"
                options={repeatCascaderOptions}
                value={dueCascaderValue}
                displayRender={(labels, selectedOptions) => {
                  if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                  const unit = selectedOptions[0]?.value;
                  const numberLabel = selectedOptions[1]?.label;
                  const unitLabel = { day: "ngày", week: "tuần", month: "tháng", year: "năm" }[unit] || unit;
                  return `${numberLabel} ${unitLabel}`;
                }}
                onChange={(path) => {
                  if (Array.isArray(path) && path.length === 2) {
                    const selected = (timeRepeatOptions || []).find((r) => r.id === path[1]);
                    const days = selected ? convertToDays(selected.unit, selected.number) : null;
                    form.setFieldsValue({ dueInDays: days });
                  } else {
                    form.setFieldsValue({ dueInDays: null });
                  }
                }}
                allowClear
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="dueInDays" noStyle>
              <InputNumber style={{ display: 'none' }} />
            </Form.Item>
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item label="Ngày nhắc nhở">
              <Cascader
                placeholder="Chọn thời gian nhắc nhở"
                options={repeatCascaderOptions}
                value={remindCascaderValue}
                displayRender={(labels, selectedOptions) => {
                  if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                  const unit = selectedOptions[0]?.value;
                  const numberLabel = selectedOptions[1]?.label;
                  const unitLabel = { day: "ngày", week: "tuần", month: "tháng", year: "năm" }[unit] || unit;
                  return `${numberLabel} ${unitLabel}`;
                }}
                onChange={(path) => {
                  if (Array.isArray(path) && path.length === 2) {
                    const selected = (timeRepeatOptions || []).find((r) => r.id === path[1]);
                    const days = selected ? convertToDays(selected.unit, selected.number) : null;
                    form.setFieldsValue({ remindInDays: days });
                  } else {
                    form.setFieldsValue({ remindInDays: null });
                  }
                }}
                allowClear
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="remindInDays" noStyle>
              <InputNumber style={{ display: 'none' }} />
            </Form.Item>
          </div>
        </div>

        {/* Row 3: Người thực hiện và Trạng thái */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item name="implementers" label="Người thực hiện">
              <Select
                placeholder="Chọn nhóm hoặc tài khoản"
                options={[
                  { label: "— Nhóm —", options: groupOptions },
                  { label: "— Tài khoản —", options: userOptions },
                ]}
                showSearch
                optionFilterProp="label"
                allowClear
                mode="multiple"
              />
            </Form.Item>
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item name="status" label="Trạng thái">
              <Select
                placeholder="Chọn trạng thái"
                options={[
                  { value: 'ACTIVE', label: 'Hoạt động' },
                  { value: 'INACTIVE', label: 'Không hoạt động' },
                ]}
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
}



