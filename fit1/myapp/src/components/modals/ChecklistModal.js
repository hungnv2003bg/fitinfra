import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, DatePicker, InputNumber, Select, Cascader, notification } from "antd";
import { useLanguage } from "../../contexts/LanguageContext";
import dayjs from "dayjs";
import axios from "../../plugins/axios";
import { useSelector } from "react-redux";
import { getCurrentDateVN } from "../../utils/dateUtils";

export default function ChecklistModal({ open, onCancel, onAdded }) {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const { nguoiDung } = useSelector(state => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const [groupOptions, setGroupOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [timeRepeatOptions, setTimeRepeatOptions] = useState([]);
  const [sopOptions, setSopOptions] = useState([]);
  const [selectedSopPath, setSelectedSopPath] = useState([]);
  const [selectedDocumentLabel, setSelectedDocumentLabel] = useState('');

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

        // Fetch SOPs for level-1 options (documents are loaded lazily)
        try {
          const sopsRes = await axios.get("/api/sops", { params: { page: 0, size: 1000 } });
          const sops = Array.isArray(sopsRes.data) ? sopsRes.data : (sopsRes.data && Array.isArray(sopsRes.data.content) ? sopsRes.data.content : []);
          setSopOptions((sops || []).map(s => ({ value: s.id, label: s.name || `SOP ${s.id}`, isLeaf: false })));
        } catch (error) {
          setSopOptions([]);
        }
      } catch {}
    };
    fetchOptions();
  }, []);

  const repeatCascaderOptions = useMemo(() => {
    if (!Array.isArray(timeRepeatOptions) || timeRepeatOptions.length === 0) return [];
    const unitToLabel = lang === 'zh'
      ? { day: "天", week: "周", month: "月", year: "年" }
      : { day: "ngày", week: "tuần", month: "tháng", year: "năm" };
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
        label: d.title || `Tài liệu ${d.documentID ?? d.id}`,
        isLeaf: true,
      }));
      // Force re-render by creating a completely new array
      setSopOptions(prevOptions => {
        const newOptions = JSON.parse(JSON.stringify(prevOptions));
        return newOptions;
      });
    } catch (error) {
      target.children = [];
      setSopOptions(prevOptions => {
        const newOptions = JSON.parse(JSON.stringify(prevOptions));
        return newOptions;
      });
    } finally {
      target.loading = false;
    }
  };

  const openNotification = (type, title, desc) =>
    api[type]({ message: title, description: desc, placement: "bottomRight" });

  const t = lang === 'zh' ? {
    addTitle: "新增任务",
    ok: "新增",
    cancel: "取消",
    taskName: "任务名称",
    taskNamePh: "输入任务名称...",
    workContent: "工作内容",
    workContentPh: "输入详细工作内容...",
    sops: "SOP 文档",
    sopsPh: "选择 SOP 文档",
    startAt: "开始时间",
    startAtPh: "选择开始时间",
    repeat: "重复时间",
    repeatPh: "选择重复时间",
    due: "完成时限",
    duePh: "选择完成时限",
    remind: "提前提醒",
    remindPh: "选择提醒时间",
    implementers: "执行人",
    implementersPh: "选择组或账号",
    sys: "系统",
    err: "错误",
    addSuccess: "新增任务成功",
    addFail: "新增任务失败",
    startTimeInvalid: "开始时间必须大于当前时间",
    pleaseChoose: "请选择",
  } : {
    addTitle: "Thêm công việc",
    ok: "Thêm",
    cancel: "Hủy",
    taskName: "Tên công việc",
    taskNamePh: "Nhập tên công việc...",
    workContent: "Nội dung công việc",
    workContentPh: "Nhập nội dung chi tiết công việc...",
    sops: "Tài liệu SOPs",
    sopsPh: "Chọn tài liệu SOPs",
    startAt: "Thời gian bắt đầu",
    startAtPh: "Chọn thời gian bắt đầu",
    repeat: "Thời gian lặp lại",
    repeatPh: "Chọn thời gian lặp lại",
    due: "Thời gian cần hoàn thành",
    duePh: "Chọn thời gian cần hoàn thành",
    remind: "Nhắc nhở trước ngày hoàn thành",
    remindPh: "Chọn thời gian nhắc nhở",
    implementers: "Người thực hiện",
    implementersPh: "Chọn nhóm hoặc tài khoản",
    sys: "Hệ thống",
    err: "Lỗi",
    addSuccess: "Thêm công việc thành công",
    addFail: "Thêm công việc thất bại",
    startTimeInvalid: "Thời gian bắt đầu phải lớn hơn thời gian hiện tại",
    pleaseChoose: "Vui lòng chọn",
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // Additional cross-field validations
      if (!values.repeatId) {
        openNotification("error", t.err, `${t.pleaseChoose.toLowerCase()} ${t.repeat.toLowerCase()}`);
        return;
      }
      if (values.dueInDays == null) {
        openNotification("error", t.err, `${t.pleaseChoose.toLowerCase()} ${t.due.toLowerCase()}`);
        return;
      }
      if (values.remindInDays == null) {
        openNotification("error", t.err, `${t.pleaseChoose.toLowerCase()} ${t.remind.toLowerCase()}`);
        return;
      }
      if (Number(values.remindInDays) >= Number(values.dueInDays)) {
        openNotification("error", t.err, lang === 'zh' ? "提醒时间必须小于完成时限" : "Thời gian nhắc nhở phải nhỏ hơn thời gian cần hoàn thành");
        return;
      }
      setIsLoading(true);

      const resolvedRepeatId = values.repeatId ? Number(values.repeatId) : null;

      const payload = {
        taskName: values.taskName,
        workContent: values.workContent,
        implementers: values.implementers || [],
        startAt: values.startAt ? values.startAt.format('YYYY-MM-DDTHH:mm:ss') : null,
        repeatId: resolvedRepeatId,
        dueInDays: values.dueInDays,
        remindInDays: values.remindInDays,
        sopDocumentId: values.sopIds && values.sopIds.length > 0 ? values.sopIds[0] : null,
        creator: String(nguoiDung?.userID ?? '').trim() || null,
        status: 'ACTIVE',
      };

      await axios.post("/api/checklists", payload);

      openNotification("success", t.sys, t.addSuccess);
      form.resetFields();
      setSelectedSopPath([]);
      setSelectedDocumentLabel('');
      onAdded?.();
      onCancel?.();
    } catch (err) {
      if (err?.response?.status === 400) {
        openNotification("error", t.err, t.startTimeInvalid);
      } else {
        openNotification("error", t.sys, t.addFail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t.addTitle}
        open={open}
        onCancel={() => {
          form.resetFields();
          setSelectedSopPath([]);
          setSelectedDocumentLabel('');
          onCancel?.();
        }}
        onOk={handleOk}
        okButtonProps={{ loading: isLoading }}
        okText={t.ok}
        cancelText={t.cancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="taskName"
            label={t.taskName}
            rules={[{ required: true, message: lang === 'zh' ? '请输入任务名称' : 'Vui lòng nhập tên công việc' }]}
          >
            <Input placeholder={t.taskNamePh} />
          </Form.Item>

          <Form.Item
            name="workContent"
            label={t.workContent}
          >
            <Input.TextArea 
              placeholder={t.workContentPh}
              rows={4}
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item name="sopIds" label={t.sops}>
            <Cascader
              placeholder={t.sopsPh}
              options={sopOptions}
              loadData={loadSopDocuments}
              value={selectedSopPath}
              displayRender={(labels, selectedOptions) => {
                // Use stored document label if available
                if (selectedDocumentLabel) {
                  return selectedDocumentLabel;
                }
                
                // Fallback to normal display logic
                if (selectedOptions && selectedOptions.length === 2) {
                  const documentLabel = selectedOptions[1]?.label;
                  return documentLabel || labels[labels.length - 1];
                }
                
                return labels[labels.length - 1];
              }}
              onChange={(path) => {
                setSelectedSopPath(path || []);
                // Handle single selection
                if (Array.isArray(path) && path.length === 2) {
                  form.setFieldsValue({ sopIds: [path[1]] }); // Document ID, not SOP ID
                  
                  // Find and store document label for display
                  const findDocumentLabel = (options, targetId) => {
                    for (const option of options) {
                      if (String(option.value) === String(targetId)) {
                        return option.label;
                      }
                      if (option.children) {
                        const found = findDocumentLabel(option.children, targetId);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const documentLabel = findDocumentLabel(sopOptions, path[1]);
                  setSelectedDocumentLabel(documentLabel || '');
                } else {
                  form.setFieldsValue({ sopIds: [] });
                  setSelectedDocumentLabel('');
                }
              }}
              changeOnSelect={false}
              allowClear
              placement="bottomLeft"
              getPopupContainer={(trigger) => trigger.parentElement}
              style={{ width: '100%' }}
              showSearch={false}
            />
          </Form.Item>

          <Form.Item 
            name="startAt" 
            label={t.startAt}
            rules={[
              { required: true, message: 'Vui lòng chọn thời gian bắt đầu' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  const now = dayjs();
                  if (value.isBefore(now)) {
                    return Promise.reject(new Error(t.startTimeInvalid));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY HH:mm"
              placeholder={t.startAtPh}
              getPopupContainer={(trigger) => trigger.parentElement}
            />
          </Form.Item>

          <Form.Item label={t.repeat}>
            <Cascader
              placeholder={t.repeatPh}
              options={repeatCascaderOptions}
              value={repeatCascaderValue}
              displayRender={(labels, selectedOptions) => {
                if (!selectedOptions || selectedOptions.length !== 2) return labels.join(" / ");
                const unit = selectedOptions[0]?.value;
                const numberLabel = selectedOptions[1]?.label;
                const unitLabel = lang === 'zh' ? { day: "天", week: "周", month: "月", year: "年" }[unit] || unit : { day: "ngày", week: "tuần", month: "tháng", year: "năm" }[unit] || unit;
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
          <Form.Item name="repeatId" noStyle rules={[{ required: true, message: 'Vui lòng chọn thời gian lặp lại' }]}>
            <InputNumber style={{ display: 'none' }} />
          </Form.Item>

          <Form.Item label={t.due}>
            <Cascader
              placeholder={t.duePh}
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
          <Form.Item name="dueInDays" noStyle rules={[{ required: true, message: 'Vui lòng chọn thời gian cần hoàn thành' }]}>
            <InputNumber style={{ display: 'none' }} />
          </Form.Item>

          <Form.Item label={t.remind}>
            <Cascader
              placeholder={t.remindPh}
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
          <Form.Item name="remindInDays" noStyle rules={[{ required: true, message: 'Vui lòng chọn thời gian nhắc nhở' }]}>
            <InputNumber style={{ display: 'none' }} />
          </Form.Item>

          <Form.Item name="implementers" label={t.implementers}>
            <Select
              placeholder={t.implementersPh}
              options={[
                { label: lang === 'zh' ? '— 组 —' : '— Nhóm —', options: groupOptions },
                { label: lang === 'zh' ? '— 账号 —' : '— Tài khoản —', options: userOptions },
              ]}
              showSearch
              optionFilterProp="label"
              allowClear
              mode="multiple"
            />
          </Form.Item>

        </Form>
      </Modal>
    </>
  );
}



