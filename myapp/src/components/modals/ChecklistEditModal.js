import React, { useEffect, useMemo } from "react";
import { Modal, Form, Input, DatePicker, InputNumber, Select, Cascader, message, notification } from "antd";
import axios from "../../plugins/axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useSelector } from "react-redux";
import { useLanguage } from "../../contexts/LanguageContext";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ChecklistEditModal({ open, record, onCancel, onSaved }) {
  const [form] = Form.useForm();
  const { nguoiDung } = useSelector(state => state.user);
  const { lang } = useLanguage();
  const [groupOptions, setGroupOptions] = React.useState([]);
  const [userOptions, setUserOptions] = React.useState([]);
  const [timeRepeatOptions, setTimeRepeatOptions] = React.useState([]);
  const [sopOptions, setSopOptions] = React.useState([]);
  const [selectedSopPath, setSelectedSopPath] = React.useState([]);

  const labels = {
    vi: {
      title: "Sửa công việc",
      save: "Lưu",
      cancel: "Hủy",
      taskName: "Tên công việc",
      taskNamePlaceholder: "Nhập tên công việc...",
      taskNameRequired: "Vui lòng nhập tên công việc",
      workContent: "Nội dung công việc",
      workContentPlaceholder: "Nhập nội dung chi tiết công việc...",
      sops: "Tài liệu SOPs",
      sopsPlaceholder: "Chọn tài liệu SOPs",
      startAt: "Thời gian bắt đầu",
      repeatTime: "Thời gian lặp lại",
      repeatTimePlaceholder: "Chọn thời gian lặp lại",
      dueTime: "Thời gian cần hoàn thành",
      dueTimePlaceholder: "Chọn thời gian cần hoàn thành",
      implementers: "Người thực hiện",
      implementersPlaceholder: "Chọn nhóm hoặc tài khoản",
      groupsOpt: "— Nhóm —",
      usersOpt: "— Tài khoản —",
      status: "Trạng thái",
      statusPlaceholder: "Chọn trạng thái",
      active: "Hoạt động",
      inactive: "Không hoạt động",
      unitMap: { day: "ngày", week: "tuần", month: "tháng", year: "năm" },
      system: "Hệ thống",
      updateSuccess: "Cập nhật công việc thành công",
      updateFail: "Cập nhật công việc thất bại",
    },
    zh: {
      title: "编辑任务",
      save: "保存",
      cancel: "取消",
      taskName: "任务名称",
      taskNamePlaceholder: "请输入任务名称...",
      taskNameRequired: "请输入任务名称",
      workContent: "工作内容",
      workContentPlaceholder: "请输入任务详细内容...",
      sops: "SOP 文档",
      sopsPlaceholder: "选择 SOP 文档",
      startAt: "开始时间",
      repeatTime: "重复时间",
      repeatTimePlaceholder: "选择重复时间",
      dueTime: "完成时限",
      dueTimePlaceholder: "选择完成时限",
      implementers: "执行人",
      implementersPlaceholder: "选择组或账户",
      groupsOpt: "— 组 —",
      usersOpt: "— 账户 —",
      status: "状态",
      statusPlaceholder: "选择状态",
      active: "启用中",
      inactive: "未启用",
      unitMap: { day: "天", week: "周", month: "月", year: "年" },
      system: "系统",
      updateSuccess: "更新任务成功",
      updateFail: "更新任务失败",
    },
  };
  const t = labels[lang] || labels.vi;

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
    const unitToLabel = t.unitMap;
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
  const dueCascaderValue = useMemo(() => {
    if (!dueInDaysWatch) return [];
    const matched = (timeRepeatOptions || []).find((r) => convertToDays(r.unit, r.number) === Number(dueInDaysWatch));
    return matched ? [matched.unit, matched.id] : [];
  }, [dueInDaysWatch, timeRepeatOptions]);


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
          sopDocumentId: docId,
          status: record.status || 'ACTIVE',
        });

        if (docId) {
          try {
            const existingCat = (sopOptions || []).find(o => Array.isArray(o.children) && o.children.some(c => Number(c.value) === Number(docId)));
            if (existingCat) {
              setSelectedSopPath([existingCat.value, Number(docId)]);
              return;
            }
            const listRes = await axios.get('/api/sops', { params: { page: 0, size: 1000 } }).catch(() => ({ data: [] }));
            const list = Array.isArray(listRes.data) ? listRes.data : (listRes.data && Array.isArray(listRes.data.content) ? listRes.data.content : []);
            const categories = (list || []).map(s => s.id).filter(Boolean);
            for (const catId of categories) {
              try {
                const docsRes = await axios.get(`/api/sops/${encodeURIComponent(String(catId))}/documents`, { params: { _t: Date.now() } });
                const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
                const found = docs.find(d => Number(d.documentID) === Number(docId));
                if (found) {
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
      const payload = {
        taskName: values.taskName,
        workContent: values.workContent,
        implementers: values.implementers || [],
        repeatId: resolvedRepeatId,
        dueInDays: values.dueInDays,
        sopDocumentId: values.sopDocumentId ? Number(values.sopDocumentId) : null,
        lastEditedBy: nguoiDung?.userID,
        status: values.status || 'ACTIVE',
      };
      if (values.startAt) {
        const newStartIso = values.startAt.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss');
        const oldIso = record?.startAt ? dayjs(record.startAt).format('YYYY-MM-DDTHH:mm:ss') : null;
        if (!oldIso || newStartIso !== oldIso) {
          payload.startAt = newStartIso;
        }
      }

      await axios.patch(`/api/checklists/${encodeURIComponent(String(record.id))}`, payload);
      notification.success({
        message: t.system,
        description: t.updateSuccess,
        placement: "bottomRight",
        duration: 3,
      });      
      onSaved?.();
      onCancel?.();
    } catch (e) {
      notification.error({
        message: t.system,
        description: t.updateFail,
        placement: "bottomRight",
        duration: 3,
      });
    }
  };

  return (
    <Modal
      title={t.title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={t.save}
      cancelText={t.cancel}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="taskName" label={t.taskName} rules={[{ required: true, message: t.taskNameRequired }]}>
          <Input placeholder={t.taskNamePlaceholder} />
        </Form.Item>

        <Form.Item name="workContent" label={t.workContent}>
          <Input.TextArea 
            placeholder={t.workContentPlaceholder} 
            rows={4}
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Form.Item label={t.sops}>
          <Cascader
            placeholder={t.sopsPlaceholder}
            options={sopOptions}
            loadData={loadSopDocuments}
            key={Array.isArray(selectedSopPath) ? selectedSopPath.join('-') : 'none'}
            defaultValue={selectedSopPath}
            displayRender={(labels, selectedOptions) => {
              if (selectedOptions && selectedOptions.length === 2) {
                return selectedOptions[1]?.label ?? labels[labels.length - 1];
              }
              return labels[labels.length - 1];
            }}
            onChange={(path) => {
              const docId = Array.isArray(path) && path.length === 2 ? path[1] : null;
              form.setFieldsValue({ sopDocumentId: docId || null });
            }}
            changeOnSelect={false}
            allowClear
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="sopDocumentId" noStyle>
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>

        {}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item 
              name="startAt" 
              label={t.startAt}
            >
              <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item label={t.repeatTime}>
              <Cascader
                placeholder={t.repeatTimePlaceholder}
                options={repeatCascaderOptions}
                value={repeatCascaderValue}
                displayRender={(labels, selectedOptions) => {
                  if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                  const unit = selectedOptions[0]?.value;
                  const numberLabel = selectedOptions[1]?.label;
                  const unitLabel = t.unitMap[unit] || unit;
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

        {}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item label={t.dueTime}>
              <Cascader
                placeholder={t.dueTimePlaceholder}
                options={repeatCascaderOptions}
                value={dueCascaderValue}
                displayRender={(labels, selectedOptions) => {
                  if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                  const unit = selectedOptions[0]?.value;
                  const numberLabel = selectedOptions[1]?.label;
                  const unitLabel = t.unitMap[unit] || unit;
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
        </div>

        {}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Form.Item name="implementers" label={t.implementers}>
              <Select
                placeholder={t.implementersPlaceholder}
                options={[
                  { label: t.groupsOpt, options: groupOptions },
                  { label: t.usersOpt, options: userOptions },
                ]}
                showSearch
                optionFilterProp="label"
                allowClear
                mode="multiple"
              />
            </Form.Item>
          </div>
          <div style={{ flex: 1 }}>
            <Form.Item name="status" label={t.status}>
              <Select
                placeholder={t.statusPlaceholder}
                options={[
                  { value: 'ACTIVE', label: t.active },
                  { value: 'INACTIVE', label: t.inactive },
                ]}
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
}



