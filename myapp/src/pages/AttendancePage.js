import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  TimePicker,
  DatePicker,
  Select,
  Pagination,
  message,
  notification,
  Card,
  Row,
  Col,
  Statistic,
  Avatar,
  Popconfirm,
  Switch,
  Dropdown,
  Tooltip,
} from "antd";
import {
  ClockCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  StarOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";
import attendanceService from "../services/attendanceService";
import PersonIcon from "../components/PersonIcon";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;
const { TextArea } = Input;

function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userAttendanceList, setUserAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserAttendance, setLoadingUserAttendance] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, attendance, tracking
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [groupFilter, setGroupFilter] = useState(undefined);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  // Pagination states for present and absent lists
  const [presentPage, setPresentPage] = useState(1);
  const [absentPage, setAbsentPage] = useState(1);
  const PAGE_SIZE = 6;
  // Tracking filters
  const [trackingSearchText, setTrackingSearchText] = useState("");
  const [trackingGroupFilter, setTrackingGroupFilter] = useState(undefined);
  const [trackingActiveFilter, setTrackingActiveFilter] = useState(undefined);
  const [filteredTrackingList, setFilteredTrackingList] = useState([]);
  const { lang } = useLanguage();
  const { quyenList, nguoiDung } = useSelector((state) => state.user) || {};

  // Quyền thêm mới/chỉnh sửa - chỉ admin và manager
  const hasAddPermission = useMemo(() => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(
      (role) =>
        role === "ADMIN" ||
        role === "MANAGER" ||
        role === "ROLE_ADMIN" ||
        role === "ROLE_MANAGER"
    );
  }, [quyenList]);

  // Lấy userID của user hiện tại
  const currentUserId = nguoiDung?.userID;

  // Kiểm tra xem user có thể chỉnh sửa record này không
  // Admin/Manager: full quyền
  // User thường: chỉ được sửa chính mình
  const canEditRecord = (record) => {
    if (hasAddPermission) return true; // Admin/Manager có full quyền
    
    // User thường chỉ được sửa chính mình
    const recordUserId = record.user?.userID || record.userId;
    return currentUserId && recordUserId && currentUserId === recordUserId;
  };

  // Tất cả users đều có thể xem danh sách theo dõi
  const hasTrackingAccess = true;

  const labels = {
    vi: {
      title: "Attendance",
      date: "Ngày",
      employee: "Nhân viên",
      area: "Nhóm",
      status: "Trạng thái",
      clockIn: "Giờ vào",
      clockOut: "Giờ ra",
      note: "Ghi chú",
      action: "Thao tác",
      edit: "Sửa",
      present: "Có mặt",
      halfDay: "Nửa ngày",
      absent: "Vắng mặt",
      late: "Đi muộn",
      leave: "Nghỉ phép",
      weekendOff: "Nghỉ CN",
      addNew: "Thêm mới",
      addEmployee: "Thêm nhân viên",
      addEmployeeDescription: "Chọn nhân viên (có thể nhiều) để thêm vào danh sách theo dõi điểm danh",
      addSuccess: "Đã thêm nhân viên",
      addError: "Không thể tạo điểm danh cho nhân viên",
      summary: "Tổng quan",
      presentCount: "Có mặt",
      halfDayCount: "Nửa ngày",
      absentCount: "Vắng",
      leaveCount: "Nghỉ phép",
      editAttendance: "Chỉnh sửa điểm danh",
      statusRequired: "Vui lòng chọn trạng thái",
      userRequired: "Vui lòng chọn nhân viên",
      dateRequired: "Vui lòng chọn ngày",
      saveSuccess: "Đã lưu thông tin điểm danh",
      saveError: "Không thể lưu thông tin điểm danh",
      loadError: "Không thể tải dữ liệu điểm danh",
      cannotLoadUsers: "Không thể tải danh sách nhân viên",
      employeeList: "Danh sách nhân viên",
      attendanceBoard: "Điểm danh",
      trackingList: "Danh sách theo dõi",
      dashboard: "Tổng quan",
      isActive: "Hoạt động",
      shift: "Ca",
      shiftDay: "Ngày",
      shiftNight: "Đêm",
      removeConfirm: "Bạn có chắc chắn muốn xóa nhân viên này khỏi danh sách theo dõi?",
      removeSuccess: "Đã xóa nhân viên khỏi danh sách theo dõi",
      removeError: "Không thể xóa nhân viên khỏi danh sách",
      updateSuccess: "Đã cập nhật thông tin",
      updateError: "Không thể cập nhật thông tin",
      cannotLoadTrackingList: "Không thể tải danh sách theo dõi",
      exportPrint: "Xuất/In",
      exportPDF: "In PDF",
      exportExcel: "Xuất Excel",
    },
    zh: {
      title: "考勤表",
      date: "日期",
      employee: "员工",
      area: "组",
      status: "状态",
      clockIn: "上班时间",
      clockOut: "下班时间",
      note: "备注",
      action: "操作",
      edit: "编辑",
      present: "出勤",
      halfDay: "半天",
      absent: "缺勤",
      late: "迟到",
      leave: "请假",
      weekendOff: "周日休",
      addNew: "新增",
      addEmployee: "添加员工",
      addEmployeeDescription: "选择一个或多个员工添加到考勤跟踪列表。系统将自动生成每日考勤记录，并预先创建未来7天的记录，默认状态为'出勤'",
      addSuccess: "已成功为员工创建7天考勤记录",
      addError: "无法为员工创建考勤记录",
      summary: "总览",
      presentCount: "出勤",
      halfDayCount: "半天",
      absentCount: "缺勤",
      leaveCount: "请假",
      editAttendance: "编辑考勤",
      statusRequired: "请选择状态",
      userRequired: "请选择员工",
      dateRequired: "请选择日期",
      saveSuccess: "已保存考勤信息",
      saveError: "无法保存考勤信息",
      loadError: "无法加载考勤数据",
      cannotLoadUsers: "无法加载员工列表",
      employeeList: "员工列表",
      attendanceBoard: "考勤表",
      trackingList: "跟踪列表",
      dashboard: "总览",
      isActive: "正在跟踪",
      shift: "班次",
      shiftDay: "日班",
      shiftNight: "夜班",
      removeConfirm: "您确定要从跟踪列表中删除此员工吗？",
      removeSuccess: "已从跟踪列表中删除员工",
      removeError: "无法从跟踪列表中删除员工",
      updateSuccess: "已更新信息",
      updateError: "无法更新信息",
      cannotLoadTrackingList: "无法加载跟踪列表",
      exportPrint: "导出/打印",
      exportPDF: "打印PDF",
      exportExcel: "导出Excel",
    },
  };

  const t = labels[lang];

  const activeTrackedUserIds = new Set(
    (userAttendanceList || [])
      .filter((item) => item && item.isActive)
      .map((item) => item.user?.userID ?? item.userId)
  );

  // Tính toán thống kê
  const calculateStats = () => {
    const stats = {
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
    };

    const isActiveRecord = (record) => {
      const uid = record.user?.userID || record.userId;
      return activeTrackedUserIds.has(uid);
    };

    attendanceData.filter(isActiveRecord).forEach((record) => {
      const status = record.status || "";
      if (status.includes("Có mặt") || status.includes("出勤")) {
        stats.present++;
      } else if (status.includes("Nửa ngày") || status.includes("半天")) {
        stats.halfDay++;
      } else if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
        stats.absent++;
      } else if (
        status.includes("Nghỉ phép") ||
        status.includes("请假") ||
        status.includes("Nghỉ CN") ||
        status.includes("周日休")
      ) {
        stats.leave++;
      }
    });

    return stats;
  };

  const stats = calculateStats();

  const activeAttendanceData = attendanceData.filter(
    (record) => activeTrackedUserIds.has(record.user?.userID || record.userId)
  );

  // Calculate stats from filtered data
  const calculateFilteredStats = () => {
    const filteredStats = {
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
    };

    filteredAttendanceData.forEach((record) => {
      const status = record.status || "";
      if (status.includes("Có mặt") || status.includes("出勤")) {
        filteredStats.present++;
      } else if (status.includes("Nửa ngày") || status.includes("半天")) {
        filteredStats.halfDay++;
      } else if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
        filteredStats.absent++;
      } else if (
        status.includes("Nghỉ phép") ||
        status.includes("请假") ||
        status.includes("Nghỉ CN") ||
        status.includes("周日休")
      ) {
        filteredStats.leave++;
      }
    });

    return filteredStats;
  };

  const filteredStats = calculateFilteredStats();

  function collectGroups(groupsValue) {
    if (!groupsValue) return [];
    if (Array.isArray(groupsValue)) return groupsValue;
    if (groupsValue instanceof Set) return Array.from(groupsValue);
    if (groupsValue.size !== undefined) return Array.from(groupsValue);
    return [];
  }

  function getUserGroup(user) {
    if (!user) return "-";
    const foundUser = typeof user === "object" ? user : users.find((u) => u.userID === user);
    if (!foundUser) return "-";

    let userGroups = collectGroups(foundUser.groups);
    if (userGroups.length === 0) {
      const fromUsers = users.find((u) => u.userID === foundUser.userID);
      userGroups = collectGroups(fromUsers?.groups);
    }

    if (userGroups.length > 0) {
      const firstGroup = userGroups[0];
      const byId = groups.find((g) => String(g.id) === String(firstGroup?.id));
      return firstGroup?.name || byId?.name || "-";
    }
    return "-";
  }

  function getUserGroupId(user) {
    if (!user) return null;
    const foundUser = typeof user === "object" ? user : users.find((u) => u.userID === user);
    if (!foundUser) return null;

    let userGroups = collectGroups(foundUser.groups);
    if (userGroups.length === 0) {
      const fromUsers = users.find((u) => u.userID === foundUser.userID);
      userGroups = collectGroups(fromUsers?.groups);
    }

    if (userGroups.length > 0) {
      const firstGroup = userGroups[0];
      if (firstGroup && firstGroup.id !== undefined) return firstGroup.id;
      const byName = groups.find((g) => g.name === firstGroup?.name);
      return byName ? byName.id : null;
    }
    return null;
  }

  function getUserShift(user, record) {
    if (!user) return "-";
    const userId = typeof user === "object" ? (user?.userID || user?.userId) : user;
    if (!userId) return "-";
    
    // Ưu tiên lấy shift từ record trước (nếu có)
    if (record && record.shift) {
      const shift = String(record.shift).trim();
      return shift === "Đêm" ? t.shiftNight : t.shiftDay;
    }
    
    // Fallback: lấy từ userAttendanceList
    const userAttendance = userAttendanceList.find(
      (ua) => {
        const uaUserId = ua.user?.userID || ua.userId;
        // Compare as both string and number to handle type mismatches
        return String(uaUserId) === String(userId) || uaUserId === userId;
      }
    );
    
    if (userAttendance && userAttendance.shift) {
      // Normalize shift value: trim whitespace and handle case
      const shift = String(userAttendance.shift).trim();
      return shift === "Đêm" ? t.shiftNight : t.shiftDay;
    }
    return "-";
  }
  
  function getUserShiftRaw(user, record) {
    if (!user) return null;
    const userId = typeof user === "object" ? (user?.userID || user?.userId) : user;
    if (!userId) return null;
    
    // Ưu tiên lấy shift từ record trước (nếu có)
    if (record && record.shift) {
      return String(record.shift).trim();
    }
    
    // Fallback: lấy từ userAttendanceList
    const userAttendance = userAttendanceList.find(
      (ua) => {
        const uaUserId = ua.user?.userID || ua.userId;
        return String(uaUserId) === String(userId) || uaUserId === userId;
      }
    );
    
    if (userAttendance && userAttendance.shift) {
      return String(userAttendance.shift).trim();
    }
    return "Ngày"; // Default
  }

  // Filtered lists for detailed sections with memoization
  const presentFiltered = useMemo(() => {
    return activeAttendanceData
      .filter((record) => {
        const gid = getUserGroupId(record.user || record.userId);
        return !groupFilter || groupFilter === "all" || String(gid) === String(groupFilter);
      })
      .filter(
        (record) =>
          record.status?.includes("Có mặt") ||
          record.status?.includes("出勤") ||
          record.status?.includes("Đi muộn") ||
          record.status?.includes("迟到") ||
          record.status?.includes("Nửa ngày") ||
          record.status?.includes("半天")
      );
  }, [activeAttendanceData, groupFilter]);

  const absentFiltered = useMemo(() => {
    return activeAttendanceData
      .filter((record) => {
        const gid = getUserGroupId(record.user || record.userId);
        return !groupFilter || groupFilter === "all" || String(gid) === String(groupFilter);
      })
      .filter(
        (record) =>
          record.status?.includes("Vắng") ||
          record.status?.includes("Vắng mặt") ||
          record.status?.includes("缺勤") ||
          record.status?.includes("Nghỉ phép") ||
          record.status?.includes("请假") ||
          record.status?.includes("Nghỉ CN") ||
          record.status?.includes("周日休")
      );
  }, [activeAttendanceData, groupFilter]);

  // Reset page when filters or dataset change
  useEffect(() => {
    setPresentPage(1);
    setAbsentPage(1);
  }, [groupFilter, selectedDate, attendanceData]);

  // Lấy danh sách users
  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      setUsers(response.data || []);
    } catch (error) {
      message.error({
        content: t.cannotLoadUsers,
        placement: "bottomRight",
      });
    }
  };

  // Lấy danh sách nhân viên đang theo dõi
  const fetchUserAttendanceList = async () => {
    setLoadingUserAttendance(true);
    try {
      const response = await axios.get("/api/user-attendance");
      setUserAttendanceList(response.data || []);
    } catch (error) {
      message.error({
        content: t.cannotLoadTrackingList,
        placement: "bottomRight",
      });
    } finally {
      setLoadingUserAttendance(false);
    }
  };

  // Lấy dữ liệu điểm danh theo ngày
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const data = await attendanceService.getAttendanceByDate(dateStr);
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error({
        content: t.loadError,
        placement: "bottomRight",
      });
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách groups
  const fetchGroups = async () => {
    try {
      const response = await axios.get("/api/groups");
      setGroups(response.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  useEffect(() => {
    // Tất cả users đều có thể xem danh sách theo dõi
    fetchUserAttendanceList();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  // Filter attendance data
  useEffect(() => {
    let filtered = [...attendanceData];

    // Filter by search text (tên, mã nhân viên)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((record) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        if (foundUser) {
          const fullName = (foundUser.fullName || "").toLowerCase();
          const manv = (foundUser.manv || "").toLowerCase();
          return fullName.includes(searchLower) || manv.includes(searchLower);
        }
        return false;
      });
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((record) => {
        const status = record.status || "";
        if (statusFilter === "Có mặt" || statusFilter === "出勤") {
          return status.includes("Có mặt") || status.includes("出勤");
        } else if (statusFilter === "Đi muộn" || statusFilter === "迟到") {
          return status.includes("Đi muộn") || status.includes("迟到");
        } else if (statusFilter === "Nửa ngày" || statusFilter === "半天") {
          return status.includes("Nửa ngày") || status.includes("半天");
        } else if (statusFilter === "Vắng mặt" || statusFilter === "缺勤") {
          return status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤");
        } else if (statusFilter === "Nghỉ phép" || statusFilter === "请假") {
          return status.includes("Nghỉ phép") || status.includes("请假");
        } else if (statusFilter === "Nghỉ CN" || statusFilter === "周日休") {
          return status.includes("Nghỉ CN") || status.includes("周日休");
        }
        return false;
      });
    }

    // Filter by group
    if (groupFilter && groupFilter !== 'all') {
      filtered = filtered.filter((record) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        if (foundUser && foundUser.groups) {
          let userGroups = [];
          if (Array.isArray(foundUser.groups)) {
            userGroups = foundUser.groups;
          } else if (foundUser.groups instanceof Set) {
            userGroups = Array.from(foundUser.groups);
          } else if (foundUser.groups.size !== undefined) {
            userGroups = Array.from(foundUser.groups);
          }
          return userGroups.some((g) => String(g.id) === String(groupFilter));
        }
        return false;
      });
    }

    setFilteredAttendanceData(filtered);
  }, [attendanceData, searchText, statusFilter, groupFilter, users]);

  // Lọc danh sách theo dõi theo tìm kiếm, nhóm và trạng thái hoạt động
  useEffect(() => {
    let filtered = [...userAttendanceList];

    if (trackingSearchText && trackingSearchText.trim() !== "") {
      const keyword = trackingSearchText.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const user = item.user || {};
        const name = (user.fullName || "").toLowerCase();
        const manv = (user.manv || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(keyword) || manv.includes(keyword) || email.includes(keyword);
      });
    }

    if (trackingGroupFilter) {
      filtered = filtered.filter((item) => {
        const gid = getUserGroupId(item.user || item.userId);
        return String(gid) === String(trackingGroupFilter);
      });
    }

    if (trackingActiveFilter) {
      filtered = filtered.filter((item) => {
        if (trackingActiveFilter === 'active') return !!item.isActive;
        if (trackingActiveFilter === 'inactive') return !item.isActive;
        return true;
      });
    }

    setFilteredTrackingList(filtered);
  }, [userAttendanceList, trackingSearchText, trackingGroupFilter, trackingActiveFilter, users, groups]);

  // Không cần kiểm tra quyền để chuyển tab nữa vì tất cả users đều có thể xem

  const handleAddEmployee = async () => {
    try {
      const values = await addForm.validateFields();
      const userIds = Array.isArray(values.userIds) ? values.userIds : [];
      const shift = values.shift || "Ngày";

      if (userIds.length === 0) {
        message.warning(lang === "vi" ? "Vui lòng chọn ít nhất một nhân viên" : "请至少选择一名员工");
        return;
      }

      const results = await Promise.allSettled(
        userIds.map((userId) => axios.post("/api/user-attendance", { userId, shift }))
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        notification.success({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? `Đã thêm ${successCount} nhân viên và tạo điểm danh 7 ngày`
              : `已成功添加 ${successCount} 名员工并生成未来 7 天的考勤`,
          placement: "bottomRight",
        });
      }

      if (failCount > 0) {
        notification.warning({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? `${failCount} nhân viên không thể thêm (có thể đã tồn tại trong danh sách)`
              : `${failCount} 名员工未能添加（可能已在列表中）`,
          placement: "bottomRight",
        });
      }

      setIsAddModalVisible(false);
      addForm.resetFields();
      fetchAttendance();
      fetchUserAttendanceList(); // Refresh danh sách theo dõi
    } catch (error) {
      message.error({
        content: t.addError,
        placement: "bottomRight",
      });
    }
  };

  const handleRemoveUser = async (id) => {
    try {
      await axios.delete(`/api/user-attendance/${id}`);
      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.removeSuccess,
        placement: "bottomRight",
      });
      fetchUserAttendanceList();
    } catch (error) {
      message.error({
        content: t.removeError,
        placement: "bottomRight",
      });
    }
  };

  const handleToggleActive = async (record) => {
    try {
      const nextActive = !record.isActive;

      await axios.put(`/api/user-attendance/${record.id}`, {
        isActive: nextActive,
      });

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.updateSuccess,
        placement: "bottomRight",
      });

      fetchUserAttendanceList();
      fetchAttendance();
    } catch (error) {
      message.error({
        content: t.updateError,
        placement: "bottomRight",
      });
    }
  };

  const handleUpdateShift = async (record, newShift) => {
    const oldShift = record.shift;
    try {
      // Optimistically update UI
      setUserAttendanceList((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item.id === record.id ? { ...item, shift: newShift } : item
            )
          : prev
      );

      // Send update to backend
      const response = await axios.put(`/api/user-attendance/${record.id}`, {
        shift: newShift,
      });

      // Update with response data to ensure consistency
      if (response.data && response.data.shift) {
        setUserAttendanceList((prev) =>
          Array.isArray(prev)
            ? prev.map((item) =>
                item.id === record.id ? { ...item, shift: response.data.shift } : item
              )
            : prev
        );
      }

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.updateSuccess,
        placement: "bottomRight",
      });

      // Refresh data from server
      fetchUserAttendanceList();
      fetchAttendance();
    } catch (error) {
      // Rollback on error
      setUserAttendanceList((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item.id === record.id ? { ...item, shift: oldShift } : item
            )
          : prev
      );
      message.error({
        content: t.updateError,
        placement: "bottomRight",
      });
    }
  };


  const handleCancelAdd = () => {
    setIsAddModalVisible(false);
    addForm.resetFields();
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const tableData = filteredAttendanceData.map((record, index) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        const userName = foundUser ? foundUser.fullName : "-";
        const manv = foundUser ? foundUser.manv : "-";
        const groupName = getUserGroup(record.user || record.userId);
        const status = record.status || "-";
        const clockInTime = record.clockInTime || "-";
        const clockOutTime = record.clockOutTime || "-";
        const note = record.note || "-";
        
        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: left;">${userName}</td>
            <td style="text-align: left;">${manv}</td>
            <td style="text-align: left;">${groupName}</td>
            <td style="text-align: center;">${status}</td>
            <td style="text-align: center;">${clockInTime}</td>
            <td style="text-align: center;">${clockOutTime}</td>
            <td style="text-align: left;">${note}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${lang === 'vi' ? 'Attendance' : '考勤表'}</title>
          <style>
            @page { 
              margin: 0;
              size: landscape;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
            }
            h1 { 
              text-align: center; 
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 30px;
              margin-top: 20px;
              color: #000;
            }
            .info {
              margin-bottom: 20px;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
              font-size: 12px;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
          </style>
        </head>
        <body>
          <h1>${lang === 'vi' ? 'Attendance' : '考勤表'}</h1>
          <div class="info">
            <strong>${lang === 'vi' ? 'Ngày' : '日期'}:</strong> ${selectedDate.format('DD/MM/YYYY')}
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>${t.employee}</th>
                <th>${lang === 'vi' ? 'Mã NV' : '员工编号'}</th>
                <th>${t.area}</th>
                <th>${t.status}</th>
                <th>${t.clockIn}</th>
                <th>${t.clockOut}</th>
                <th>${t.note}</th>
              </tr>
            </thead>
            <tbody>
              ${tableData}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi in PDF: ' : '打印PDF错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        'STT',
        t.employee,
        lang === 'vi' ? 'Mã NV' : '员工编号',
        t.area,
        t.status,
        t.clockIn,
        t.clockOut,
        t.note
      ];

      const csvRows = [
        headers.join(','),
        ...filteredAttendanceData.map((record, index) => {
          const userId = record.user?.userID || record.userId;
          const foundUser = users.find((u) => u.userID === userId);
          const userName = foundUser ? foundUser.fullName : "-";
          const manv = foundUser ? foundUser.manv : "-";
          const groupName = getUserGroup(record.user || record.userId);
          const status = record.status || "-";
          const clockInTime = record.clockInTime || "-";
          const clockOutTime = record.clockOutTime || "-";
          const note = (record.note || "-").replace(/,/g, ';');
          
          return [
            index + 1,
            `"${userName}"`,
            `"${manv}"`,
            `"${groupName}"`,
            `"${status}"`,
            `"${clockInTime}"`,
            `"${clockOutTime}"`,
            `"${note}"`
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${selectedDate.format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi xuất Excel: ' : '导出Excel错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    // Mặc định giờ vào 8:00 AM và giờ ra 17:00 PM nếu chưa có
    const defaultClockIn = record.clockInTime 
      ? dayjs(record.clockInTime, "HH:mm") 
      : dayjs("08:00", "HH:mm");
    const defaultClockOut = record.clockOutTime 
      ? dayjs(record.clockOutTime, "HH:mm") 
      : dayjs("17:00", "HH:mm");
    
    form.setFieldsValue({
      userId: record.user?.userID || record.userId,
      attendanceDate: dayjs(record.attendanceDate),
      status: record.status,
      clockInTime: defaultClockIn,
      clockOutTime: defaultClockOut,
      note: record.note,
    });
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Lấy shift từ record (nếu đang edit) hoặc từ userAttendanceList
      let shift = null;
      if (editingRecord && editingRecord.shift) {
        shift = editingRecord.shift;
      } else {
        shift = getUserShiftRaw(values.userId, null);
      }
      
      const payload = {
        userId: values.userId,
        attendanceDate: values.attendanceDate.format("YYYY-MM-DD"),
        status: values.status,
        clockInTime: values.clockInTime ? values.clockInTime.format("HH:mm") : null,
        clockOutTime: values.clockOutTime ? values.clockOutTime.format("HH:mm") : null,
        note: values.note || null,
        shift: shift || "Ngày",
      };

      if (editingRecord) {
        await attendanceService.updateAttendance(editingRecord.id, payload);
      } else {
        await attendanceService.createAttendance(payload);
      }

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.saveSuccess,
        placement: "bottomRight",
      });

      setIsModalVisible(false);
      form.resetFields();
      setEditingRecord(null);
      fetchAttendance();
    } catch (error) {
      message.error({
        content: t.saveError,
        placement: "bottomRight",
      });
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const getStatusIcon = (status) => {
    if (!status) return <PersonIcon status="" size="sm" />;
    return <PersonIcon status={status} size="sm" />;
  };

  const getStatusTag = (status) => {
    if (!status) return <Tag color="red">{t.absent}</Tag>;
    if (status.includes("Có mặt") || status.includes("出勤")) {
      return <Tag color="green">{t.present}</Tag>;
    }
    if (status.includes("Đi muộn") || status.includes("迟到")) {
      return <Tag color="orange">{t.late}</Tag>;
    }
    if (status.includes("Nửa ngày") || status.includes("半天")) {
      return <Tag color="orange">{t.halfDay}</Tag>;
    }
    if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
      return <Tag color="red">{t.absent}</Tag>;
    }
    if (status.includes("Nghỉ CN") || status.includes("周日休")) {
      return <Tag color="geekblue">{t.weekendOff}</Tag>;
    }
    if (status.includes("Nghỉ phép") || status.includes("请假")) {
      return <Tag color="blue">{t.leave}</Tag>;
    }
    return <Tag>{status}</Tag>;
  };

  const getUserName = (user) => {
    if (!user) return "-";
    if (typeof user === "object") {
      return user.fullName || "-";
    }
    const foundUser = users.find((u) => u.userID === user);
    return foundUser ? foundUser.fullName : "-";
  };

  const columns = [
    {
      title: <div style={{ textAlign: "center" }}>STT</div>,
      key: "stt",
      width: "5%",
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
      dataIndex: "user",
      key: "employee",
      width: "20%",
      render: (user, record) => {
        const userId = user?.userID || record.userId;
        const userName = getUserName(user || userId);
        const foundUser = users.find((u) => u.userID === userId);
        const initial = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{userName}</div>
              {foundUser && (
                <div style={{ fontSize: 12, color: "#999" }}>
                  {foundUser.manv || ""}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.area}</div>,
      key: "area",
      width: "10%",
      align: "center",
      render: (_, record) => getUserGroup(record.user || record.userId),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.shift}</div>,
      key: "shift",
      width: "8%",
      align: "center",
      render: (_, record) => getUserShift(record.user || record.userId, record),
    },
    {
      title: <div style={{ textAlign: "center" }}>Icon</div>,
      key: "icon",
      width: "5%",
      align: "center",
      render: (_, record) => getStatusIcon(record.status),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.status}</div>,
      dataIndex: "status",
      key: "status",
      width: "12%",
      align: "center",
      render: (status) => getStatusTag(status),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.clockIn}</div>,
      dataIndex: "clockInTime",
      key: "clockInTime",
      width: "10%",
      align: "center",
      render: (time) => time || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.clockOut}</div>,
      dataIndex: "clockOutTime",
      key: "clockOutTime",
      width: "10%",
      align: "center",
      render: (time) => time || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.note}</div>,
      dataIndex: "note",
      key: "note",
      width: "12%",
      render: (note) => note || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.action}</div>,
      key: "action",
      width: "10%",
      align: "center",
      render: (_, record) => {
        // Kiểm tra xem ngày điểm danh có quá 7 ngày không
        const attendanceDate = record.attendanceDate ? dayjs(record.attendanceDate) : null;
        const today = dayjs();
        const sevenDaysAgo = today.subtract(7, 'day').startOf('day');
        const isOlderThan7Days = attendanceDate && attendanceDate.isBefore(sevenDaysAgo);
        
        return (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isOlderThan7Days}
            title={isOlderThan7Days ? (lang === 'vi' ? 'Không thể sửa điểm danh quá 7 ngày' : '不能编辑超过7天的考勤') : ''}
          />
        );
      },
    },
  ];

  // Columns cho bảng danh sách theo dõi
  const trackingColumns = [
    {
      title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
      dataIndex: "user",
      key: "employee",
      width: "40%",
      render: (user) => {
        const userName = user?.fullName || "-";
        const initial = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{userName}</div>
              {user && (
                <div style={{ fontSize: 12, color: "#999" }}>
                  {user.manv || user.email || ""}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.area}</div>,
      key: "group",
      width: "15%",
      align: "center",
      render: (_, record) => getUserGroup(record.user || record.userId),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.shift}</div>,
      dataIndex: "shift",
      key: "shift",
      width: "15%",
      align: "center",
      render: (shift, record) => {
        // Normalize shift value to handle both "Ngày" and "Ngay" (without accent)
        const normalizedShift = (shift || record.shift || "Ngày").trim();
        const isDayShift = normalizedShift === "Ngày" || normalizedShift === "Ngay" || normalizedShift.toLowerCase() === "ngày" || normalizedShift.toLowerCase() === "ngay";
        
        return (
          <Switch
            checked={isDayShift}
            disabled={!canEditRecord(record)}
            onChange={(checked) => handleUpdateShift(record, checked ? "Ngày" : "Đêm")}
            checkedChildren={t.shiftDay}
            unCheckedChildren={t.shiftNight}
          />
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.isActive}</div>,
      dataIndex: "isActive",
      key: "isActive",
      width: "15%",
      align: "center",
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          disabled={!canEditRecord(record)}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Có"
          unCheckedChildren="Không"
        />
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.action}</div>,
      key: "action",
      width: "15%",
      align: "center",
      render: (_, record) => {
        // Chỉ admin/manager mới được xóa
        if (!hasAddPermission) {
          return "-";
        }
        return (
          <Popconfirm
            title={t.removeConfirm}
            onConfirm={() => handleRemoveUser(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              aria-label={lang === "vi" ? "Xóa" : "删除"}
            />
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "4px",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "8px 20px",
              border: "none",
              background: activeTab === "dashboard" ? "#f5f5f5" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: activeTab === "dashboard" ? 500 : 400,
              color: activeTab === "dashboard" ? "#333" : "#666",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "dashboard") {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "dashboard") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <DashboardOutlined style={{ fontSize: 16 }} />
            {t.dashboard}
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            style={{
              padding: "8px 20px",
              border: "none",
              background: activeTab === "attendance" ? "#f5f5f5" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: activeTab === "attendance" ? 500 : 400,
              color: activeTab === "attendance" ? "#333" : "#666",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "attendance") {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "attendance") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 16 }} />
            {t.attendanceBoard}
          </button>
          {hasTrackingAccess && (
            <button
              onClick={() => setActiveTab("tracking")}
              style={{
                padding: "8px 20px",
                border: "none",
                background: activeTab === "tracking" ? "#f5f5f5" : "transparent",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: activeTab === "tracking" ? 500 : 400,
                color: activeTab === "tracking" ? "#333" : "#666",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "tracking") {
                  e.currentTarget.style.background = "#fafafa";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "tracking") {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <UserOutlined style={{ fontSize: 16 }} />
              {t.trackingList}
            </button>
          )}
        </div>
        {(activeTab === "attendance" || activeTab === "dashboard") && (
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="DD/MM/YYYY"
            placeholder={t.date}
            style={{ width: 200 }}
            allowClear={false}
          />
        )}
        {hasAddPermission && activeTab === "tracking" && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsAddModalVisible(true);
              addForm.resetFields();
            }}
          >
            {t.addNew}
          </Button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div>
          {/* Dashboard Title */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              {lang === "vi" ? "Bảng điểm danh" : "点名表"}
            </h3>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              {lang === "vi" ? "Ngày" : "日期"}: {selectedDate.format("DD/MM/YYYY")}
            </p>
          </div>

          {/* Overall Stats Cards */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Card>
                <Statistic
                  title={lang === "vi" ? "Tổng nhân viên" : "总员工数"}
                  value={activeTrackedUserIds.size}
                  prefix={<TeamOutlined style={{ color: "#1890ff" }} />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Card>
                <Statistic
                  title={t.presentCount}
                  value={stats.present}
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Card>
                <Statistic
                  title={t.halfDayCount}
                  value={stats.halfDay}
                  prefix={<ExclamationCircleOutlined style={{ color: "#ff7a45" }} />}
                  valueStyle={{ color: "#ff7a45" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Card>
                <Statistic
                  title={t.absentCount}
                  value={stats.absent}
                  prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                  valueStyle={{ color: "#ff4d4f" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card>
                <Statistic
                  title={t.leaveCount}
                  value={stats.leave}
                  prefix={<StarOutlined style={{ color: "#1890ff" }} />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Overall Attendance Rate and Group Stats */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card>
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ marginBottom: 24 }}>
                    {lang === "vi" ? "Tỉ lệ đi làm tổng thể" : "总体出勤率"}
                  </h4>
                  <div style={{ position: "relative", display: "inline-block", width: 160, height: 160 }}>
                    {(() => {
                      const effectivePresent = stats.present + stats.halfDay * 0.5;
                      const totalActive = activeTrackedUserIds.size;
                      const overallRate = totalActive > 0
                        ? Math.round((effectivePresent / totalActive) * 100)
                        : 0;
                      const color = overallRate >= 80 ? "#52c41a" : overallRate >= 50 ? "#ff7a45" : "#ff4d4f";
                      const circumference = 2 * Math.PI * 40; // radius = 40
                      const offset = circumference - (overallRate / 100) * circumference;
                      
                      return (
                        <>
                          <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="8"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={color}
                              strokeWidth="8"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              fontSize: 32,
                              fontWeight: "bold",
                              color: color,
                            }}
                          >
                            {overallRate}%
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {groups.map((group) => {
                    const groupUsers = users.filter((u) => {
                      if (!activeTrackedUserIds.has(u.userID)) return false;
                      if (!u.groups) return false;
                      let userGroups = [];
                      if (Array.isArray(u.groups)) {
                        userGroups = u.groups;
                      } else if (u.groups instanceof Set) {
                        userGroups = Array.from(u.groups);
                      } else if (u.groups.size !== undefined) {
                        userGroups = Array.from(u.groups);
                      }
                      return userGroups.some((g) => g.id === group.id);
                    });

                    const groupAttendance = attendanceData.filter((record) => {
                      const userId = record.user?.userID || record.userId;
                      return groupUsers.some((u) => u.userID === userId);
                    });

                    const groupPresent = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Có mặt") || status.includes("出勤");
                    }).length;

                    const groupHalfDay = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Nửa ngày") || status.includes("半天");
                    }).length;

                    const groupAbsent = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤");
                    }).length;

                    const effectivePresent = groupPresent + groupHalfDay * 0.5;
                    const groupRate = groupUsers.length > 0 
                      ? Math.round((effectivePresent / groupUsers.length) * 100) 
                      : 0;

                    return (
                      <div key={group.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <div>
                            <span style={{ fontWeight: 500 }}>
                              {lang === "vi" ? "Nhóm" : "组"} {group.name}
                            </span>
                            <span style={{ color: "#666", marginLeft: 8 }}>
                              ({groupUsers.length} {lang === "vi" ? "người" : "人"})
                            </span>
                          </div>
                          <span
                            style={{
                              color: groupRate >= 80 ? "#52c41a" : groupRate >= 50 ? "#ff7a45" : "#ff4d4f",
                              fontWeight: 500,
                            }}
                          >
                            {groupRate}%
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: "#f0f0f0",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${groupRate}%`,
                                height: "100%",
                                backgroundColor: groupRate >= 80 ? "#52c41a" : groupRate >= 50 ? "#ff7a45" : "#ff4d4f",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                          <div style={{ color: "#666", fontSize: 12, whiteSpace: "nowrap" }}>
                            {groupPresent} {lang === "vi" ? "có mặt" : "出勤"}, {groupHalfDay}{" "}
                            {lang === "vi" ? "nửa ngày" : "半天"}, {groupAbsent}{" "}
                            {lang === "vi" ? "vắng" : "缺勤"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>

          </Row>

          {/* Employee Status Visualization */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>
                {lang === "vi" ? "Trạng thái nhân viên ngày" : "员工状态"} {selectedDate.format("DD/MM/YYYY")}
              </h4>
              <Select
                placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
                value={groupFilter}
                onChange={setGroupFilter}
                style={{ width: 180 }}
                allowClear
              >
                <Option value="all">{lang === "vi" ? "Tất cả các nhóm" : "所有组"}</Option>
                {groups.map((group) => (
                  <Option key={group.id} value={String(group.id)}>
                    {group.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                justifyContent: "center",
                padding: "20px 0",
              }}
            >
              {activeAttendanceData
                 .filter((record) => {
                   const gid = getUserGroupId(record.user || record.userId);
                   return !groupFilter || groupFilter === "all" || String(gid) === String(groupFilter);
                 })
                 .map((record) => {
                const userId = record.user?.userID || record.userId;
                const foundUser = users.find((u) => u.userID === userId);
                const userName = foundUser ? foundUser.fullName : "-";
                const groupName = getUserGroup(record.user || record.userId);
                const shiftName = getUserShift(record.user || record.userId, record);
                
                const tooltipContent = (
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{userName}</div>
                    <div style={{ fontSize: 12, marginBottom: 2 }}>
                      {lang === "vi" ? "Nhóm" : "组"}: {groupName}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {lang === "vi" ? "Ca làm việc" : "班次"}: {shiftName}
                    </div>
                  </div>
                );
                
                return (
                  <div
                    key={record.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 80,
                    }}
                  >
                    <Tooltip title={tooltipContent} placement="top">
                      <div style={{ cursor: "pointer" }}>
                        <PersonIcon status={record.status} size="md" />
                      </div>
                    </Tooltip>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "#666",
                        maxWidth: 80,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userName.split(" ").pop()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 24,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Có mặt" size="sm" />
                <span style={{ color: "#666" }}>{t.present}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nửa ngày" size="sm" />
                <span style={{ color: "#666" }}>{t.halfDay}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Vắng mặt" size="sm" />
                <span style={{ color: "#666" }}>{t.absent}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nghỉ phép" size="sm" />
                <span style={{ color: "#666" }}>{t.leave}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nghỉ CN" size="sm" />
                <span style={{ color: "#666" }}>{t.weekendOff}</span>
              </div>
            </div>
          </Card>

          {/* Detailed Lists */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card>
                <h4 style={{ marginBottom: 16 }}>
                  {lang === "vi" ? "Nhân viên có mặt" : "出勤员工"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {presentFiltered
                    .slice((presentPage - 1) * PAGE_SIZE, presentPage * PAGE_SIZE)
                    .map((record) => {
                      const userId = record.user?.userID || record.userId;
                      const foundUser = users.find((u) => u.userID === userId);
                      const userName = foundUser ? foundUser.fullName : "-";
                      const groupName = getUserGroup(record.user || record.userId);
                      const statusInfo = getStatusTag(record.status);
                      return (
                        <div
                          key={record.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar style={{ backgroundColor: "#1890ff" }}>
                              {userName.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{userName}</div>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {lang === "vi" ? "Nhóm" : "组"} {groupName}
                                {record.clockInTime && ` • ${lang === "vi" ? "Vào" : "进入"}: ${record.clockInTime}`}
                                {record.clockOutTime && ` • ${lang === "vi" ? "Ra" : "离开"}: ${record.clockOutTime}`}
                              </div>
                            </div>
                          </div>
                          {statusInfo}
                        </div>
                      );
                    })}
                  {presentFiltered.length === 0 && (
                    <p style={{ textAlign: "center", color: "#999", padding: 20 }}>
                      {lang === "vi" ? "Chưa có nhân viên nào điểm danh" : "暂无员工打卡"}
                    </p>
                  )}
                  {presentFiltered.length > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        size="small"
                        current={presentPage}
                        pageSize={PAGE_SIZE}
                        total={presentFiltered.length}
                        showSizeChanger={false}
                        onChange={(p) => setPresentPage(p)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <h4 style={{ marginBottom: 16 }}>
                  {lang === "vi" ? "Vắng mặt & Nghỉ phép" : "缺勤和请假"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {absentFiltered
                    .slice((absentPage - 1) * PAGE_SIZE, absentPage * PAGE_SIZE)
                    .map((record) => {
                      const userId = record.user?.userID || record.userId;
                      const foundUser = users.find((u) => u.userID === userId);
                      const userName = foundUser ? foundUser.fullName : "-";
                      const groupName = getUserGroup(record.user || record.userId);
                      const statusInfo = getStatusTag(record.status);
                      return (
                        <div
                          key={record.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar style={{ backgroundColor: "#999" }}>
                              {userName.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{userName}</div>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {lang === "vi" ? "Nhóm" : "组"} {groupName}
                                {record.note && ` • ${record.note}`}
                              </div>
                            </div>
                          </div>
                          {statusInfo}
                        </div>
                      );
                    })}
                  {absentFiltered.length === 0 && (
                    <p style={{ textAlign: "center", color: "#999", padding: 20 }}>
                      {lang === "vi" ? "Tất cả nhân viên đều có mặt" : "所有员工都出勤"}
                    </p>
                  )}
                  {absentFiltered.length > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        size="small"
                        current={absentPage}
                        pageSize={PAGE_SIZE}
                        total={absentFiltered.length}
                        showSizeChanger={false}
                        onChange={(p) => setAbsentPage(p)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {activeTab === "attendance" && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Input
              placeholder={lang === "vi" ? "Tìm kiếm theo tên, mã nhân viên" : "按姓名、员工编号搜索"}
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder={lang === "vi" ? "Lọc theo trạng thái" : "按状态筛选"}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="Có mặt">{t.present}</Option>
              <Option value="Đi muộn">{t.late}</Option>
              <Option value="Nửa ngày">{t.halfDay}</Option>
              <Option value="Vắng mặt">{t.absent}</Option>
              <Option value="Nghỉ phép">{t.leave}</Option>
              <Option value="Nghỉ CN">{t.weekendOff}</Option>
            </Select>
            <Select
              placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
              value={groupFilter}
              onChange={setGroupFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="all">{lang === "vi" ? "Tất cả các nhóm" : "所有组"}</Option>
              {groups.map((group) => (
                <Option key={group.id} value={String(group.id)}>
                  {group.name}
                </Option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setSearchText("");
                setStatusFilter(undefined);
                setGroupFilter(undefined);
              }}
            >
              {lang === "vi" ? "Xóa bộ lọc" : "清除筛选"}
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'pdf',
                    label: t.exportPDF,
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExportPDF()
                  },
                  {
                    key: 'excel',
                    label: t.exportExcel,
                    icon: <FileExcelOutlined />,
                    onClick: () => handleExportExcel()
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />}>
                {t.exportPrint}
              </Button>
            </Dropdown>
          </div>

          {/* Summary Statistics - Compact */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 16,
              padding: "12px 0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.presentCount}: <strong style={{ color: "#333" }}>{filteredStats.present}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ExclamationCircleOutlined style={{ color: "#ff7a45", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.halfDayCount}: <strong style={{ color: "#333" }}>{filteredStats.halfDay}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.absentCount}: <strong style={{ color: "#333" }}>{filteredStats.absent}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StarOutlined style={{ color: "#1890ff", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.leaveCount}: <strong style={{ color: "#333" }}>{filteredStats.leave}</strong>
              </span>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredAttendanceData}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </div>
      )}

      {hasTrackingAccess && activeTab === "tracking" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, color: "#666" }}>
              {lang === "vi"
                ? "Danh sách nhân viên được theo dõi điểm danh tự động. Hệ thống sẽ tự động tạo điểm danh hàng ngày lúc 00:00 cho các nhân viên có trạng thái 'Hoạt động' bật."
                : "自动考勤跟踪的员工列表。系统将在每天00:00为状态为'正在跟踪'的员工自动生成考勤记录。"}
            </p>
          </Card>

          {/* Filter Bar for Tracking */}
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Input
              placeholder={lang === "vi" ? "Tìm kiếm theo tên, mã nhân viên" : "按姓名、员工编号搜索"}
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={trackingSearchText}
              onChange={(e) => setTrackingSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder={lang === "vi" ? "Lọc theo trạng thái" : "按状态筛选"}
              value={trackingActiveFilter}
              onChange={setTrackingActiveFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="active">{t.isActive}</Option>
              <Option value="inactive">{lang === "vi" ? "Không" : "未跟踪"}</Option>
            </Select>
            <Select
              placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
              value={trackingGroupFilter}
              onChange={setTrackingGroupFilter}
              style={{ width: 180 }}
              allowClear
            >
              {groups.map((group) => (
                <Option key={group.id} value={String(group.id)}>
                  {group.name}
                </Option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setTrackingSearchText("");
                setTrackingGroupFilter(undefined);
                setTrackingActiveFilter(undefined);
              }}
            >
              {lang === "vi" ? "Xóa bộ lọc" : "清除筛选"}
            </Button>
          </div>

          <Table
            columns={trackingColumns}
            dataSource={filteredTrackingList}
            rowKey="id"
            loading={loadingUserAttendance}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
          />
        </div>
      )}

      <Modal
        title={t.editAttendance}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label={t.employee}
            rules={[{ required: true, message: t.userRequired }]}
          >
            <Select
              placeholder={t.employee}
              disabled={!!editingRecord}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {users.map((user) => (
                <Option key={user.userID} value={user.userID} label={user.fullName}>
                  {user.fullName} ({user.manv || user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="attendanceDate"
            label={t.date}
            rules={[{ required: true, message: t.dateRequired }]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="DD/MM/YYYY" 
              allowClear={false}
              disabled={!!editingRecord}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label={t.status}
            rules={[{ required: true, message: t.statusRequired }]}
          >
            <Select placeholder={t.status}>
              <Option value="Có mặt">{t.present}</Option>
              <Option value="Đi muộn">{t.late}</Option>
              <Option value="Nửa ngày">{t.halfDay}</Option>
              <Option value="Vắng mặt">{t.absent}</Option>
              <Option value="Nghỉ phép">{t.leave}</Option>
              <Option value="Nghỉ CN">{t.weekendOff}</Option>
            </Select>
          </Form.Item>

          <Form.Item name="clockInTime" label={t.clockIn}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>

          <Form.Item name="clockOutTime" label={t.clockOut}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>

          <Form.Item name="note" label={t.note}>
            <TextArea rows={3} placeholder={t.note} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thêm nhân viên mới */}
      <Modal
        title={t.addEmployee}
        open={isAddModalVisible}
        onOk={handleAddEmployee}
        onCancel={handleCancelAdd}
        width={500}
      >
        <p style={{ marginBottom: 16, color: "#666" }}>
          {t.addEmployeeDescription}
        </p>
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="userIds"
            label={t.employee}
            rules={[{ required: true, message: t.userRequired }]}
          >
            <Select
              mode="multiple"
              placeholder={t.employee}
              allowClear
              maxTagCount="responsive"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {users.map((user) => (
                <Option key={user.userID} value={user.userID} label={user.fullName}>
                  {user.fullName} ({user.manv || user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="shift"
            label={t.shift}
            initialValue="Ngày"
            rules={[{ required: true, message: lang === "vi" ? "Vui lòng chọn ca" : "请选择班次" }]}
          >
            <Select placeholder={t.shift}>
              <Option value="Ngày">{t.shiftDay}</Option>
              <Option value="Đêm">{t.shiftNight}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AttendancePage;

