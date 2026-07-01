import {
  Briefcase,
  Building2,
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Filter,
  Flag,
  IdCard,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  api,
  type CreateUserPayload,
  type PaginationMeta,
  type RoleRecord,
  type SortOrder,
  type UpdateUserPayload,
  type UserRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";

type UserStatusFilter = "all" | UserRecord["status"];
type UserSortField = "department" | "email" | "fullName" | "lastLoginAt" | "status";

type CreateUserFormState = {
  confirmPassword: string;
  department: string;
  email: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  location: string;
  notes: string;
  password: string;
  phone: string;
  roleId: string;
  status: UserRecord["status"];
};

type ManageUserFormState = {
  department: string;
  email: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  location: string;
  mustChangePassword: boolean;
  notes: string;
  password: string;
  phone: string;
  roleId: string;
  status: UserRecord["status"];
};

type UsersMetrics = {
  active: number;
  administrators: number;
  inactive: number;
  total: number;
};

type UsersStatCard = {
  icon: LucideIcon;
  label: string;
  note: string;
  tone: "blue" | "green" | "orange";
  value: string;
};

const usersPageSize = 8;
const minimumPasswordLength = 12;

const initialCreateUserForm: CreateUserFormState = {
  confirmPassword: "",
  department: "",
  email: "",
  employeeId: "",
  fullName: "",
  jobTitle: "",
  location: "",
  notes: "",
  password: "",
  phone: "",
  roleId: "",
  status: "active"
};

const emptyPagination: PaginationMeta = {
  hasPreviousPage: false,
  limit: usersPageSize,
  page: 1,
  totalItems: 0,
  totalPages: 0
};

const usersCopy = {
  ar: {
    actions: {
      createUser: "إنشاء عضو فريق",
      filter: "تصفية",
      nextPage: "الصفحة التالية",
      previousPage: "الصفحة السابقة",
      rowActions: "إجراءات عضو الفريق",
      rowEdit: "تعديل عضو الفريق",
      sortBy: "ترتيب حسب"
    },
    empty: "لا يوجد أعضاء فريق مطابقون.",
    error: "تعذر تحميل أعضاء الفريق.",
    filters: {
      allRoles: "كل الأدوار",
      allStatuses: "كل الحالات",
      search: "ابحث بالاسم أو البريد أو القسم..."
    },
    loading: "جار تحميل أعضاء الفريق...",
    modal: {
      assignRole: "تعيين الدور",
      cancel: "إلغاء",
      close: "إغلاق",
      create: "إنشاء المستخدم",
      createSubtitle: "أدخل بيانات المستخدم وحدد الدور والصلاحية.",
      createTitle: "إنشاء مستخدم",
      department: "القسم",
      email: "البريد الإلكتروني",
      fullName: "الاسم الكامل",
      jobTitle: "المسمى الوظيفي",
      manageSubtitle: "تغيير الدور أو الحالة أو إعادة تعيين كلمة المرور.",
      manageTitle: "إدارة المستخدم",
      mustChangePassword: "إجبار تغيير كلمة المرور عند تسجيل الدخول",
      password: "كلمة المرور",
      passwordHelp: "يجب أن تكون كلمة المرور 12 حرفاً على الأقل.",
      phone: "الهاتف",
      resetPassword: "تغيير كلمة المرور",
      role: "الدور",
      saveChanges: "حفظ التغييرات",
      selectRole: "اختر الدور",
      status: "الحالة",
      validation: "أكمل الحقول المطلوبة بكلمة مرور لا تقل عن 12 حرفاً."
    },
    pagination: {
      empty: "لا يوجد أعضاء فريق",
      showing: "عرض {from} إلى {to} من {total} عضو فريق"
    },
    roles: {
      employee: "موظف",
      it_manager: "مدير تقنية المعلومات",
      management_committee: "لجنة الإدارة",
      supervisor: "مشرف",
      super_admin: "مدير النظام"
    },
    stats: {
      active: {
        label: "أعضاء فريق نشطون",
        note: "نشطون حالياً"
      },
      administrators: {
        label: "المديرون",
        note: "مديرو النظام"
      },
      inactive: {
        label: "أعضاء فريق غير نشطين",
        note: "غير نشطين حالياً"
      },
      total: {
        label: "إجمالي أعضاء الفريق",
        note: "كل أعضاء فريق النظام"
      }
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
      suspended: "موقوف"
    },
    table: {
      actions: "الإجراءات",
      department: "القسم",
      email: "البريد الإلكتروني",
      lastLogin: "آخر دخول",
      role: "الدور",
      status: "الحالة",
      user: "عضو الفريق"
    }
  },
  en: {
    actions: {
      createUser: "Create Team Member",
      filter: "Filter",
      nextPage: "Next page",
      previousPage: "Previous page",
      rowActions: "Team member actions",
      rowEdit: "Edit team member",
      sortBy: "Sort by"
    },
    empty: "No matching team members.",
    error: "Team members could not be loaded.",
    filters: {
      allRoles: "All Roles",
      allStatuses: "All Statuses",
      search: "Search by name, email or department..."
    },
    loading: "Loading team members...",
    modal: {
      assignRole: "Assign Role",
      cancel: "Cancel",
      close: "Close",
      create: "Create User",
      createSubtitle: "Enter the user details and assign their system role.",
      createTitle: "Create User",
      department: "Department",
      email: "Email",
      fullName: "Full Name",
      jobTitle: "Job Title",
      manageSubtitle: "Update user information and system access.",
      manageTitle: "Edit User",
      mustChangePassword: "Force password change on next sign in",
      password: "Password",
      passwordHelp: "Leave blank to keep the current password. Password must be at least 12 characters.",
      phone: "Phone",
      resetPassword: "Leave blank to keep current password",
      role: "Role",
      saveChanges: "Save Changes",
      selectRole: "Select role",
      status: "Status",
      validation: "Complete the required fields and use a password of at least 12 characters."
    },
    pagination: {
      empty: "No team members",
      showing: "Showing {from} to {to} of {total} team members"
    },
    roles: {
      employee: "Employee",
      it_manager: "IT Manager",
      management_committee: "Management Committee",
      supervisor: "Supervisor",
      super_admin: "Super Administrator"
    },
    stats: {
      active: {
        label: "Active Team Members",
        note: "Currently active"
      },
      administrators: {
        label: "Administrators",
        note: "System administrators"
      },
      inactive: {
        label: "Inactive Team Members",
        note: "Currently inactive"
      },
      total: {
        label: "Total Team Members",
        note: "All system team members"
      }
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspended"
    },
    table: {
      actions: "Actions",
      department: "Department",
      email: "Email",
      lastLogin: "Last Login",
      role: "Role",
      status: "Status",
      user: "Team Member"
    }
  }
} as const;

const createUserModalCopy = {
  ar: {
    active: "نشط",
    activeHelp: "سيتمكن المستخدم من الوصول إلى النظام",
    accountAccess: "الحساب والصلاحيات",
    accountSecurity: "أمان الحساب",
    additionalInfo: "معلومات إضافية",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أكد كلمة المرور",
    departmentPlaceholder: "اختر القسم",
    employeeId: "الرقم الوظيفي",
    employeeIdPlaceholder: "أدخل الرقم الوظيفي (اختياري)",
    emailPlaceholder: "أدخل البريد الإلكتروني",
    fullNamePlaceholder: "أدخل الاسم الكامل",
    infoCallout: "الدور يحدد صلاحيات المستخدم والوصول إلى النظام",
    jobTitlePlaceholder: "أدخل المسمى الوظيفي",
    location: "الموقع",
    locationPlaceholder: "اختر الموقع",
    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات إضافية (اختياري)",
    passwordMismatch: "تأكيد كلمة المرور لا يطابق كلمة المرور.",
    passwordNote:
      "يجب أن تكون كلمة المرور 12 حرفا على الأقل وتحتوي على أحرف كبيرة وصغيرة وأرقام ورموز.",
    passwordPlaceholder: "أدخل كلمة المرور",
    personalInfo: "المعلومات الشخصية",
    phonePlaceholder: "أدخل رقم الهاتف",
    rolePlaceholder: "اختر دور المستخدم",
    strength: "القوة",
    subtitle: "أضف عضو فريق جديد إلى النظام",
    title: "إنشاء مستخدم جديد"
  },
  en: {
    active: "Active",
    activeHelp: "User will be able to access the system",
    accountAccess: "Account & Access",
    accountSecurity: "Account Security",
    additionalInfo: "Additional Information",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Confirm password",
    departmentPlaceholder: "Select department",
    employeeId: "Employee ID",
    employeeIdPlaceholder: "Enter employee ID (optional)",
    emailPlaceholder: "Enter email address",
    fullNamePlaceholder: "Enter full name",
    infoCallout: "Role determines the user's permissions and system access",
    jobTitlePlaceholder: "Enter job title",
    location: "Location",
    locationPlaceholder: "Select location",
    notes: "Notes",
    notesPlaceholder: "Additional notes (optional)",
    passwordMismatch: "Password confirmation does not match the password.",
    passwordNote:
      "Password must be at least 12 characters and include uppercase, lowercase, numbers, and symbols.",
    passwordPlaceholder: "Enter password",
    personalInfo: "Personal Information",
    phonePlaceholder: "Enter phone number",
    rolePlaceholder: "Select user role",
    strength: "Strength",
    subtitle: "Add a new team member to the system",
    title: "Create New User"
  }
} as const;

const editUserModalCopy = {
  ar: {
    deactivate: "Deactivate User",
    forceChange: "Force password change",
    forceChangeHelp: "User must change this password at next sign in.",
    inactive: "Inactive",
    inactiveHelp: "User cannot access the system",
    notesHelp: "Optional notes about the user",
    passwordPlaceholder: "Leave blank to keep current password"
  },
  en: {
    deactivate: "Deactivate User",
    forceChange: "Force password change",
    forceChangeHelp: "User must change this password at next sign in.",
    inactive: "Inactive",
    inactiveHelp: "User cannot access the system",
    notesHelp: "Optional notes about the user",
    passwordPlaceholder: "Leave blank to keep current password"
  }
} as const;

const departmentOptions = [
  "ERP",
  "IT",
  "Operations",
  "Projects",
  "Finance",
  "HR",
  "Maintenance",
  "Facilities",
  "Infrastructure"
] as const;

const locationOptions = [
  "Tripoli HQ",
  "Data Center",
  "Field Operations",
  "Training Center",
  "Maintenance Office"
] as const;

function UsersContentView({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { language } = useI18n();
  const copy = usersCopy[language];
  const [searchParams, setSearchParams] = useSearchParams();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [metrics, setMetrics] = useState<UsersMetrics>({
    active: 0,
    administrators: 0,
    inactive: 0,
    total: 0
  });
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<UserSortField>("fullName");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [createForm, setCreateForm] =
    useState<CreateUserFormState>(initialCreateUserForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageForm, setManageForm] = useState<ManageUserFormState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchQuery, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadUsersPage() {
      setStatus((current) => (current === "ready" ? current : "loading"));
      setErrorMessage(null);

      try {
        const rolesResult = await api.getRoles({
          limit: 100,
          sortBy: "displayName",
          sortOrder: "asc"
        });
        const adminRoleIds = rolesResult.data
          .filter((role) =>
            role.name === "super_admin" ||
            role.name === "it_manager" ||
            role.name === "management_committee"
          )
          .map((role) => role.id);
        const [
          pageResult,
          totalResult,
          activeResult,
          inactiveResult,
          suspendedResult,
          ...adminResults
        ] = await Promise.all([
          api.getUsers({
            limit: usersPageSize,
            page,
            roleId: roleFilter === "all" ? undefined : roleFilter,
            search: searchQuery || undefined,
            sortBy,
            sortOrder,
            status: statusFilter === "all" ? undefined : statusFilter
          }),
          api.getUsers({ limit: 1 }),
          api.getUsers({ limit: 1, status: "active" }),
          api.getUsers({ limit: 1, status: "inactive" }),
          api.getUsers({ limit: 1, status: "suspended" }),
          ...adminRoleIds.map((roleId) => api.getUsers({ limit: 1, roleId }))
        ]);

        if (!isMounted) {
          return;
        }

        setRoles(rolesResult.data);
        setUsers(pageResult.data);
        setPagination(pageResult.pagination);
        setMetrics({
          active: getTotalItems(activeResult.pagination),
          administrators: adminResults.reduce(
            (total, result) => total + getTotalItems(result.pagination),
            0
          ),
          inactive:
            getTotalItems(inactiveResult.pagination) +
            getTotalItems(suspendedResult.pagination),
          total: getTotalItems(totalResult.pagination)
        });
        setStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : copy.error);
        setStatus("error");
      }
    }

    void loadUsersPage();

    return () => {
      isMounted = false;
    };
  }, [
    copy.error,
    page,
    refreshSignal,
    reloadKey,
    roleFilter,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter
  ]);

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles]
  );
  const stats = useMemo(
    () => buildUsersStats(metrics, copy),
    [copy, metrics]
  );
  const showingText = formatPaginationText(pagination, users.length, copy);
  const totalPages = Math.max(1, pagination.totalPages ?? 1);

  useEffect(() => {
    if (searchParams.get("action") !== "create") {
      return;
    }

    setCreateForm(initialCreateUserForm);
    setCreateError(null);
    setIsCreateModalOpen(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("action");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  function handleSort(nextSortBy: UserSortField) {
    setPage(1);
    setSortBy((currentSortBy) => {
      if (currentSortBy !== nextSortBy) {
        setSortOrder("asc");
        return nextSortBy;
      }

      setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
      return currentSortBy;
    });
  }

  function refreshUsers() {
    setReloadKey((current) => current + 1);
  }

  function closeCreateModal() {
    setCreateForm(initialCreateUserForm);
    setCreateError(null);
    setIsCreateModalOpen(false);
  }

  function openManageModal(user: UserRecord) {
    setSelectedUser(user);
    setManageForm({
      department: user.department ?? "",
      email: user.email,
      employeeId: user.employeeId ?? "",
      fullName: user.fullName,
      jobTitle: user.jobTitle ?? "",
      location: user.location ?? "",
      mustChangePassword: true,
      notes: user.notes ?? "",
      password: "",
      phone: user.phone ?? "",
      roleId: user.roleId,
      status: user.status
    });
    setManageError(null);
  }

  function closeManageModal() {
    setSelectedUser(null);
    setManageForm(null);
    setManageError(null);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCreateUserFormValid(createForm)) {
      setCreateError(copy.modal.validation);
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError(createUserModalCopy[language].passwordMismatch);
      return;
    }

    const payload: CreateUserPayload = {
      ...(createForm.department.trim() ? { department: createForm.department.trim() } : {}),
      email: createForm.email.trim(),
      ...(createForm.employeeId.trim() ? { employeeId: createForm.employeeId.trim() } : {}),
      fullName: createForm.fullName.trim(),
      ...(createForm.jobTitle.trim() ? { jobTitle: createForm.jobTitle.trim() } : {}),
      ...(createForm.location.trim() ? { location: createForm.location.trim() } : {}),
      ...(createForm.notes.trim() ? { notes: createForm.notes.trim() } : {}),
      password: createForm.password,
      ...(createForm.phone.trim() ? { phone: createForm.phone.trim() } : {}),
      roleId: createForm.roleId,
      status: createForm.status
    };

    setIsSavingUser(true);
    setCreateError(null);

    try {
      await api.createUser(payload);
      closeCreateModal();
      setPage(1);
      refreshUsers();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : copy.error);
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleManageUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser || !manageForm) {
      return;
    }

    if (!manageForm.fullName.trim() || !manageForm.roleId) {
      setManageError(copy.modal.validation);
      return;
    }

    if (
      manageForm.password.trim().length > 0 &&
      manageForm.password.trim().length < minimumPasswordLength
    ) {
      setManageError(copy.modal.validation);
      return;
    }

    setIsSavingUser(true);
    setManageError(null);

    try {
      const profilePayload: UpdateUserPayload = {};
      const fullName = manageForm.fullName.trim();
      const department = manageForm.department.trim();
      const employeeId = manageForm.employeeId.trim();
      const jobTitle = manageForm.jobTitle.trim();
      const location = manageForm.location.trim();
      const notes = manageForm.notes.trim();
      const phone = manageForm.phone.trim();

      if (fullName !== selectedUser.fullName) {
        profilePayload.fullName = fullName;
      }

      if (department && department !== normalizedOptionalValue(selectedUser.department)) {
        profilePayload.department = department;
      }

      if (employeeId && employeeId !== normalizedOptionalValue(selectedUser.employeeId)) {
        profilePayload.employeeId = employeeId;
      }

      if (jobTitle && jobTitle !== normalizedOptionalValue(selectedUser.jobTitle)) {
        profilePayload.jobTitle = jobTitle;
      }

      if (location && location !== normalizedOptionalValue(selectedUser.location)) {
        profilePayload.location = location;
      }

      if (notes && notes !== normalizedOptionalValue(selectedUser.notes)) {
        profilePayload.notes = notes;
      }

      if (phone && phone !== normalizedOptionalValue(selectedUser.phone)) {
        profilePayload.phone = phone;
      }

      if (Object.keys(profilePayload).length > 0) {
        await api.updateUser(selectedUser.id, profilePayload);
      }

      if (manageForm.roleId !== selectedUser.roleId) {
        await api.assignUserRole(selectedUser.id, { roleId: manageForm.roleId });
      }

      if (manageForm.status !== selectedUser.status) {
        await api.updateUserStatus(selectedUser.id, { status: manageForm.status });
      }

      if (manageForm.password.trim()) {
        await api.resetUserPassword(selectedUser.id, {
          mustChangePassword: manageForm.mustChangePassword,
          password: manageForm.password
        });
      }

      closeManageModal();
      refreshUsers();
    } catch (error) {
      setManageError(error instanceof Error ? error.message : copy.error);
    } finally {
      setIsSavingUser(false);
    }
  }

  return (
    <section
      className={`users-canvas${isCreateModalOpen || selectedUser ? " has-modal-open" : ""}`}
      aria-label={language === "ar" ? "إدارة الفريق" : "Team management"}
    >
      <div className="users-page-actions">
        <button
          className="users-create-button"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          <UserPlus size={18} strokeWidth={2.35} aria-hidden="true" />
          <span>{copy.actions.createUser}</span>
        </button>
      </div>

      <div className="users-stat-grid" aria-label={language === "ar" ? "ملخص الفريق" : "Team summary"}>
        {stats.map((card) => {
          const Icon = card.icon;

          return (
            <article className="users-stat-card" key={card.label}>
              <span className={`users-stat-icon users-tone-${card.tone}`}>
                <Icon size={28} strokeWidth={2.15} aria-hidden="true" />
              </span>
              <div>
                <span>{card.label}</span>
                <strong>{status === "loading" ? "-" : card.value}</strong>
                <small>{card.note}</small>
              </div>
            </article>
          );
        })}
      </div>

      <section className="users-table-card">
        <header className="users-table-toolbar">
          <div className="users-filter-controls">
            <label>
              <span className="sr-only">{copy.filters.allRoles}</span>
              <select
                aria-label={copy.filters.allRoles}
                onChange={(event) => setRoleFilter(event.target.value)}
                value={roleFilter}
              >
                <option value="all">{copy.filters.allRoles}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatRole(role, language, copy)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{copy.filters.allStatuses}</span>
              <select
                aria-label={copy.filters.allStatuses}
                onChange={(event) => setStatusFilter(event.target.value as UserStatusFilter)}
                value={statusFilter}
              >
                <option value="all">{copy.filters.allStatuses}</option>
                {(["active", "inactive", "suspended"] as const).map((value) => (
                  <option key={value} value={value}>
                    {copy.status[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="users-table-search" role="search">
            <Search size={17} strokeWidth={2.15} aria-hidden="true" />
            <input
              aria-label={copy.filters.search}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={copy.filters.search}
              value={searchInput}
            />
          </div>

          <button className="users-filter-button" onClick={() => setPage(1)} type="button">
            <Filter size={17} strokeWidth={2.2} aria-hidden="true" />
            <span>{copy.actions.filter}</span>
          </button>

          <button className="users-more-button" type="button" aria-label={copy.actions.rowActions}>
            <MoreVertical size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </header>

        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader
                  active={sortBy === "fullName"}
                  label={copy.table.user}
                  onSort={() => handleSort("fullName")}
                  sortOrder={sortOrder}
                />
                <SortableHeader
                  active={sortBy === "email"}
                  label={copy.table.email}
                  onSort={() => handleSort("email")}
                  sortOrder={sortOrder}
                />
                <SortableHeader
                  active={sortBy === "department"}
                  label={copy.table.department}
                  onSort={() => handleSort("department")}
                  sortOrder={sortOrder}
                />
                <th>{copy.table.role}</th>
                <SortableHeader
                  active={sortBy === "status"}
                  label={copy.table.status}
                  onSort={() => handleSort("status")}
                  sortOrder={sortOrder}
                />
                <SortableHeader
                  active={sortBy === "lastLoginAt"}
                  label={copy.table.lastLogin}
                  onSort={() => handleSort("lastLoginAt")}
                  sortOrder={sortOrder}
                />
                <th className="users-actions-cell">{copy.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {status === "loading" ? (
                <tr>
                  <td colSpan={7}>{copy.loading}</td>
                </tr>
              ) : null}

              {status === "error" ? (
                <tr>
                  <td colSpan={7}>{errorMessage ?? copy.error}</td>
                </tr>
              ) : null}

              {status === "ready" && users.length === 0 ? (
                <tr>
                  <td colSpan={7}>{copy.empty}</td>
                </tr>
              ) : null}

              {status === "ready"
                ? users.map((user) => (
                    <UserRow
                      copy={copy}
                      key={user.id}
                      language={language}
                      onManage={openManageModal}
                      role={roleById.get(user.roleId)}
                      user={user}
                    />
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <footer className="users-table-footer">
          <span>{showingText}</span>
          <div className="users-pagination" aria-label={language === "ar" ? "صفحات الفريق" : "Team pages"}>
            <button
              aria-label={copy.actions.previousPage}
              disabled={!pagination.hasPreviousPage || status === "loading"}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((pageNumber) => (
              <button
                aria-current={page === pageNumber ? "page" : undefined}
                className={page === pageNumber ? "is-active" : ""}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label={copy.actions.nextPage}
              disabled={!pagination.hasNextPage || status === "loading"}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      {isCreateModalOpen ? (
        <CreateUserModal
          copy={copy}
          error={createError}
          form={createForm}
          isSubmitting={isSavingUser}
          onClose={closeCreateModal}
          onSubmit={handleCreateUser}
          onUpdate={(key, value) => {
            setCreateForm((current) => ({ ...current, [key]: value }));
            setCreateError(null);
          }}
          roles={roles}
          language={language}
        />
      ) : null}

      {selectedUser && manageForm ? (
        <ManageUserModal
          copy={copy}
          error={manageError}
          form={manageForm}
          isSubmitting={isSavingUser}
          language={language}
          onClose={closeManageModal}
          onSubmit={handleManageUser}
          onUpdate={(key, value) => {
            setManageForm((current) => (current ? { ...current, [key]: value } : current));
            setManageError(null);
          }}
          roles={roles}
        />
      ) : null}
    </section>
  );
}

export const UsersContent = memo(UsersContentView);

function CreateUserModal({
  copy,
  error,
  form,
  isSubmitting,
  language,
  onClose,
  onSubmit,
  onUpdate,
  roles
}: {
  copy: (typeof usersCopy)[AppLanguage];
  error: string | null;
  form: CreateUserFormState;
  isSubmitting: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof CreateUserFormState>(
    key: TKey,
    value: CreateUserFormState[TKey]
  ) => void;
  roles: RoleRecord[];
}) {
  const modalCopy = createUserModalCopy[language];
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const passwordStrength = getPasswordStrength(form.password);

  return (
    <div className="users-modal-backdrop" role="presentation">
      <form
        aria-labelledby="create-user-title"
        className="users-modal users-create-modal"
        onSubmit={onSubmit}
      >
        <header className="users-create-modal-header">
          <span className="users-create-modal-title-icon">
            <UserPlus size={30} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div>
            <h2 id="create-user-title">{modalCopy.title}</h2>
            <p>{modalCopy.subtitle}</p>
          </div>
          <button
            aria-label={copy.modal.close}
            className="users-modal-close users-create-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={22} strokeWidth={2.35} aria-hidden="true" />
          </button>
        </header>

        <div className="users-create-modal-body">
          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <UserRound size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.personalInfo}</span>
            </h3>
            <CreateUserField
              icon={UserRound}
              label={copy.modal.fullName}
              required
            >
              <input
                autoComplete="name"
                onChange={(event) => onUpdate("fullName", event.target.value)}
                placeholder={modalCopy.fullNamePlaceholder}
                required
                value={form.fullName}
              />
            </CreateUserField>
            <CreateUserField icon={Mail} label={copy.modal.email} required>
              <input
                autoComplete="email"
                onChange={(event) => onUpdate("email", event.target.value)}
                placeholder={modalCopy.emailPlaceholder}
                required
                type="email"
                value={form.email}
              />
            </CreateUserField>
            <CreateUserField icon={Phone} label={copy.modal.phone}>
              <input
                autoComplete="tel"
                onChange={(event) => onUpdate("phone", event.target.value)}
                placeholder={modalCopy.phonePlaceholder}
                value={form.phone}
              />
            </CreateUserField>
            <CreateUserField icon={Briefcase} label={copy.modal.jobTitle}>
              <input
                onChange={(event) => onUpdate("jobTitle", event.target.value)}
                placeholder={modalCopy.jobTitlePlaceholder}
                value={form.jobTitle}
              />
            </CreateUserField>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <ShieldCheck size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.accountAccess}</span>
            </h3>
            <CreateUserField icon={ShieldCheck} label={copy.modal.role} required>
              <select
                onChange={(event) => onUpdate("roleId", event.target.value)}
                required
                value={form.roleId}
              >
                <option value="">{modalCopy.rolePlaceholder}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatRole(role, language, copy)}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <div className="users-create-info-callout">
              <Info size={18} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.infoCallout}</span>
            </div>
            <CreateUserField icon={Building2} label={copy.modal.department}>
              <select
                onChange={(event) => onUpdate("department", event.target.value)}
                value={form.department}
              >
                <option value="">{modalCopy.departmentPlaceholder}</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <CreateUserField icon={IdCard} label={modalCopy.employeeId}>
              <input
                onChange={(event) => onUpdate("employeeId", event.target.value)}
                placeholder={modalCopy.employeeIdPlaceholder}
                value={form.employeeId}
              />
            </CreateUserField>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <SlidersHorizontal size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.accountSecurity}</span>
            </h3>
            <CreateUserField icon={LockKeyhole} label={copy.modal.password} required>
              <input
                autoComplete="new-password"
                minLength={minimumPasswordLength}
                onChange={(event) => onUpdate("password", event.target.value)}
                placeholder={modalCopy.passwordPlaceholder}
                required
                type={isPasswordVisible ? "text" : "password"}
                value={form.password}
              />
              <button
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                className="users-create-password-toggle"
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? (
                  <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
                ) : (
                  <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
                )}
              </button>
            </CreateUserField>
            <div className="users-create-strength" aria-hidden="true">
              <div>
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    className={index < passwordStrength ? "is-filled" : ""}
                    key={index}
                  />
                ))}
              </div>
              <span>{modalCopy.strength}</span>
            </div>
            <CreateUserField
              icon={LockKeyhole}
              label={modalCopy.confirmPassword}
              required
            >
              <input
                autoComplete="new-password"
                minLength={minimumPasswordLength}
                onChange={(event) => onUpdate("confirmPassword", event.target.value)}
                placeholder={modalCopy.confirmPasswordPlaceholder}
                required
                type={isConfirmPasswordVisible ? "text" : "password"}
                value={form.confirmPassword}
              />
              <button
                aria-label={
                  isConfirmPasswordVisible ? "Hide password" : "Show password"
                }
                className="users-create-password-toggle"
                onClick={() =>
                  setIsConfirmPasswordVisible((current) => !current)
                }
                type="button"
              >
                {isConfirmPasswordVisible ? (
                  <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
                ) : (
                  <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
                )}
              </button>
            </CreateUserField>
            <div className="users-create-security-note">
              <ShieldCheck size={19} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.passwordNote}</span>
            </div>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <Flag size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.additionalInfo}</span>
            </h3>
            <CreateUserField icon={MapPin} label={modalCopy.location}>
              <select
                onChange={(event) => onUpdate("location", event.target.value)}
                value={form.location}
              >
                <option value="">{modalCopy.locationPlaceholder}</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <div className="users-create-status-block">
              <span>{copy.modal.status}</span>
              <button
                aria-checked={form.status === "active"}
                className="users-create-status-switch"
                onClick={() =>
                  onUpdate(
                    "status",
                    form.status === "active" ? "inactive" : "active"
                  )
                }
                role="switch"
                type="button"
              >
                <span />
              </button>
              <div>
                <strong>{modalCopy.active}</strong>
                <small>{modalCopy.activeHelp}</small>
              </div>
            </div>
            <CreateUserField icon={IdCard} label={modalCopy.notes}>
              <textarea
                maxLength={500}
                onChange={(event) => onUpdate("notes", event.target.value)}
                placeholder={modalCopy.notesPlaceholder}
                value={form.notes}
              />
            </CreateUserField>
          </section>
        </div>

        {error ? <p className="users-modal-error">{error}</p> : null}

        <DialogFooter
          cancelLabel={copy.modal.cancel}
          isSubmitting={isSubmitting}
          onClose={onClose}
          submitIcon={<UserPlus size={17} strokeWidth={2.3} aria-hidden="true" />}
          submitLabel={copy.modal.create}
        />
      </form>
    </div>
  );
}

function ManageUserModal({
  copy,
  error,
  form,
  isSubmitting,
  language,
  onClose,
  onSubmit,
  onUpdate,
  roles
}: {
  copy: (typeof usersCopy)[AppLanguage];
  error: string | null;
  form: ManageUserFormState;
  isSubmitting: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof ManageUserFormState>(
    key: TKey,
    value: ManageUserFormState[TKey]
  ) => void;
  roles: RoleRecord[];
}) {
  const modalCopy = createUserModalCopy[language];
  const editCopy = editUserModalCopy[language];
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isActive = form.status === "active";
  const statusTitle = isActive ? modalCopy.active : copy.status[form.status];
  const statusHelp = isActive ? modalCopy.activeHelp : editCopy.inactiveHelp;

  return (
    <div className="users-modal-backdrop" role="presentation">
      <form
        aria-labelledby="manage-user-title"
        className="users-modal users-create-modal users-edit-modal"
        onSubmit={onSubmit}
      >
        <header className="users-create-modal-header users-edit-modal-header">
          <span className="users-create-modal-title-icon">
            <UserPlus size={30} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div>
            <h2 id="manage-user-title">{copy.modal.manageTitle}</h2>
            <p>{copy.modal.manageSubtitle}</p>
          </div>
          <button
            aria-label={copy.modal.close}
            className="users-modal-close users-create-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={22} strokeWidth={2.35} aria-hidden="true" />
          </button>
        </header>

        <div className="users-create-modal-body users-edit-modal-body">
          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <UserRound size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.personalInfo}</span>
            </h3>
            <CreateUserField icon={UserRound} label={copy.modal.fullName} required>
              <input
                autoComplete="name"
                onChange={(event) => onUpdate("fullName", event.target.value)}
                required
                value={form.fullName}
              />
            </CreateUserField>
            <CreateUserField icon={Mail} label={copy.modal.email} required>
              <input
                aria-readonly="true"
                autoComplete="email"
                readOnly
                type="email"
                value={form.email}
              />
            </CreateUserField>
            <CreateUserField icon={Phone} label={copy.modal.phone}>
              <input
                autoComplete="tel"
                onChange={(event) => onUpdate("phone", event.target.value)}
                placeholder={modalCopy.phonePlaceholder}
                value={form.phone}
              />
            </CreateUserField>
            <CreateUserField icon={Briefcase} label={copy.modal.jobTitle}>
              <input
                onChange={(event) => onUpdate("jobTitle", event.target.value)}
                placeholder={modalCopy.jobTitlePlaceholder}
                value={form.jobTitle}
              />
            </CreateUserField>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <ShieldCheck size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.accountAccess}</span>
            </h3>
            <CreateUserField icon={ShieldCheck} label={copy.modal.role} required>
              <select
                onChange={(event) => onUpdate("roleId", event.target.value)}
                required
                value={form.roleId}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatRole(role, language, copy)}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <div className="users-create-info-callout">
              <Info size={18} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.infoCallout}</span>
            </div>
            <CreateUserField icon={Building2} label={copy.modal.department}>
              <select
                onChange={(event) => onUpdate("department", event.target.value)}
                value={form.department}
              >
                <option value="">{modalCopy.departmentPlaceholder}</option>
                {form.department &&
                !departmentOptions.includes(
                  form.department as (typeof departmentOptions)[number]
                ) ? (
                  <option value={form.department}>{form.department}</option>
                ) : null}
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <CreateUserField icon={IdCard} label={modalCopy.employeeId}>
              <input
                onChange={(event) => onUpdate("employeeId", event.target.value)}
                placeholder={modalCopy.employeeIdPlaceholder}
                value={form.employeeId}
              />
            </CreateUserField>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <SlidersHorizontal size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.accountSecurity}</span>
            </h3>
            <CreateUserField icon={LockKeyhole} label={copy.modal.password}>
              <input
                autoComplete="new-password"
                minLength={minimumPasswordLength}
                onChange={(event) => onUpdate("password", event.target.value)}
                placeholder={editCopy.passwordPlaceholder}
                type={isPasswordVisible ? "text" : "password"}
                value={form.password}
              />
              <button
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                className="users-create-password-toggle"
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? (
                  <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
                ) : (
                  <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
                )}
              </button>
            </CreateUserField>
            <p className="users-edit-password-help">{copy.modal.passwordHelp}</p>
            <div className="users-edit-switch-block">
              <button
                aria-checked={form.mustChangePassword}
                className="users-create-status-switch"
                onClick={() =>
                  onUpdate("mustChangePassword", !form.mustChangePassword)
                }
                role="switch"
                type="button"
              >
                <span />
              </button>
              <div>
                <strong>{editCopy.forceChange}</strong>
                <small>{editCopy.forceChangeHelp}</small>
              </div>
            </div>
          </section>

          <section className="users-create-section">
            <h3 className="users-create-section-title">
              <Flag size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>{modalCopy.additionalInfo}</span>
            </h3>
            <CreateUserField icon={MapPin} label={modalCopy.location}>
              <select
                onChange={(event) => onUpdate("location", event.target.value)}
                value={form.location}
              >
                <option value="">{modalCopy.locationPlaceholder}</option>
                {form.location &&
                !locationOptions.includes(
                  form.location as (typeof locationOptions)[number]
                ) ? (
                  <option value={form.location}>{form.location}</option>
                ) : null}
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </CreateUserField>
            <div className="users-create-status-block">
              <span>{copy.modal.status}</span>
              <button
                aria-checked={isActive}
                className="users-create-status-switch"
                onClick={() =>
                  onUpdate("status", isActive ? "inactive" : "active")
                }
                role="switch"
                type="button"
              >
                <span />
              </button>
              <div>
                <strong>{statusTitle}</strong>
                <small>{statusHelp}</small>
              </div>
            </div>
            <CreateUserField icon={IdCard} label={modalCopy.notes}>
              <textarea
                maxLength={500}
                onChange={(event) => onUpdate("notes", event.target.value)}
                placeholder={modalCopy.notesPlaceholder}
                value={form.notes}
              />
            </CreateUserField>
            <div className="users-edit-notes-meta">
              <span>{editCopy.notesHelp}</span>
              <span>{form.notes.length} / 500</span>
            </div>
          </section>
        </div>

        {error ? <p className="users-modal-error">{error}</p> : null}

        <footer className="users-modal-footer users-edit-modal-footer">
          <button
            className="users-edit-danger"
            disabled={isSubmitting || form.status === "inactive"}
            onClick={() => onUpdate("status", "inactive")}
            type="button"
          >
            <UserRoundX size={17} strokeWidth={2.25} aria-hidden="true" />
            {editCopy.deactivate}
          </button>
          <div className="users-edit-footer-actions">
            <button
              className="users-modal-cancel"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              {copy.modal.cancel}
            </button>
            <button className="users-modal-submit" disabled={isSubmitting} type="submit">
              <Save size={17} strokeWidth={2.3} aria-hidden="true" />
              {copy.modal.saveChanges}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function DialogFooter({
  cancelLabel,
  isSubmitting,
  onClose,
  submitIcon,
  submitLabel
}: {
  cancelLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
  submitIcon: ReactNode;
  submitLabel: string;
}) {
  return (
    <footer className="users-modal-footer">
      <button
        className="users-modal-cancel"
        disabled={isSubmitting}
        onClick={onClose}
        type="button"
      >
        {cancelLabel}
      </button>
      <button className="users-modal-submit" disabled={isSubmitting} type="submit">
        {submitIcon}
        {submitLabel}
      </button>
    </footer>
  );
}

function CreateUserField({
  children,
  icon: Icon,
  label,
  required = false
}: {
  children: ReactNode;
  icon: LucideIcon;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="users-create-field">
      <span className="users-create-field-label">
        {label}
        {required ? <b aria-hidden="true">*</b> : null}
      </span>
      <span className="users-create-input-shell">
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
        {children}
      </span>
    </label>
  );
}

function UserRow({
  copy,
  language,
  onManage,
  role,
  user
}: {
  copy: (typeof usersCopy)[AppLanguage];
  language: AppLanguage;
  onManage: (user: UserRecord) => void;
  role: RoleRecord | undefined;
  user: UserRecord;
}) {
  return (
    <tr>
      <td>
        <div className="users-person-cell">
          <span className="users-avatar">{resolveInitials(user.fullName, user.email)}</span>
          <div>
            <strong>{user.fullName}</strong>
            <span>{user.jobTitle ?? "-"}</span>
          </div>
        </div>
      </td>
      <td>{user.email}</td>
      <td>{user.department ?? "-"}</td>
      <td>
        <span className={`users-role-badge users-role-${role?.name ?? "employee"}`}>
          {role ? formatRole(role, language, copy) : "-"}
        </span>
      </td>
      <td>
        <span className={`users-status-badge users-status-${user.status}`}>
          {user.status === "active" ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}
          {copy.status[user.status]}
        </span>
      </td>
      <td>{formatDateTime(user.lastLoginAt, language)}</td>
      <td className="users-actions-cell">
        <button
          type="button"
          aria-label={`${copy.actions.rowEdit}: ${user.fullName}`}
          onClick={() => onManage(user)}
        >
          <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function SortableHeader({
  active,
  label,
  onSort,
  sortOrder
}: {
  active: boolean;
  label: string;
  onSort: () => void;
  sortOrder: SortOrder;
}) {
  return (
    <th>
      <button
        aria-label={`${label} ${active ? sortOrder : ""}`.trim()}
        className={active ? "is-active" : ""}
        onClick={onSort}
        type="button"
      >
        <span>{label}</span>
        <ChevronsUpDown size={13} strokeWidth={2.3} aria-hidden="true" />
      </button>
    </th>
  );
}

function buildUsersStats(
  metrics: UsersMetrics,
  copy: (typeof usersCopy)[AppLanguage]
): UsersStatCard[] {
  return [
    {
      icon: Users,
      label: copy.stats.total.label,
      note: copy.stats.total.note,
      tone: "blue",
      value: String(metrics.total)
    },
    {
      icon: UserCheck,
      label: copy.stats.active.label,
      note: copy.stats.active.note,
      tone: "green",
      value: String(metrics.active)
    },
    {
      icon: UserRoundX,
      label: copy.stats.inactive.label,
      note: copy.stats.inactive.note,
      tone: "orange",
      value: String(metrics.inactive)
    },
    {
      icon: ShieldCheck,
      label: copy.stats.administrators.label,
      note: copy.stats.administrators.note,
      tone: "blue",
      value: String(metrics.administrators)
    }
  ];
}

function isCreateUserFormValid(form: CreateUserFormState): boolean {
  return Boolean(
    form.fullName.trim() &&
      form.email.trim() &&
      form.roleId &&
      form.password.length >= minimumPasswordLength &&
      form.confirmPassword.length >= minimumPasswordLength
  );
}

function normalizedOptionalValue(value: string | undefined): string {
  return (value ?? "").trim();
}

export function UserCreateQuickActionModal({
  onClose,
  onCompleted
}: {
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { language } = useI18n();
  const copy = usersCopy[language];
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [form, setForm] = useState<CreateUserFormState>(initialCreateUserForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    api.getRoles({ limit: 100, sortBy: "displayName", sortOrder: "asc" })
      .then((result) => {
        if (isMounted) {
          setRoles(result.data);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : copy.error);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [copy.error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCreateUserFormValid(form)) {
      setError(copy.modal.validation);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(createUserModalCopy[language].passwordMismatch);
      return;
    }

    const payload: CreateUserPayload = {
      ...(form.department.trim() ? { department: form.department.trim() } : {}),
      email: form.email.trim(),
      ...(form.employeeId.trim() ? { employeeId: form.employeeId.trim() } : {}),
      fullName: form.fullName.trim(),
      ...(form.jobTitle.trim() ? { jobTitle: form.jobTitle.trim() } : {}),
      ...(form.location.trim() ? { location: form.location.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      password: form.password,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      roleId: form.roleId,
      status: form.status
    };

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createUser(payload);
      onCompleted();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreateUserModal
      copy={copy}
      error={error}
      form={form}
      isSubmitting={isSubmitting}
      language={language}
      onClose={onClose}
      onSubmit={handleSubmit}
      onUpdate={(key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setError(null);
      }}
      roles={roles}
    />
  );
}

function getPasswordStrength(password: string): number {
  if (!password) {
    return 0;
  }

  const checks = [
    password.length >= minimumPasswordLength,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];

  return Math.max(1, checks.filter(Boolean).length);
}

function formatRole(
  role: RoleRecord,
  _language: AppLanguage,
  copy: (typeof usersCopy)[AppLanguage]
): string {
  return copy.roles[role.name];
}

function formatDateTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatPaginationText(
  pagination: PaginationMeta,
  rowCount: number,
  copy: (typeof usersCopy)[AppLanguage]
): string {
  const total = getTotalItems(pagination);

  if (total === 0) {
    return copy.pagination.empty;
  }

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(from + rowCount - 1, total);

  return copy.pagination.showing
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));
}

function getTotalItems(pagination: PaginationMeta): number {
  return pagination.totalItems ?? 0;
}

function resolveInitials(name: string, email: string) {
  const source = name.trim().length ? name : email;
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}
