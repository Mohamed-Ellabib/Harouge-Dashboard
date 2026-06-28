import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  House,
  LogOut,
  Plus,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon
} from "lucide-react";

import {
  api,
  type Session,
  type TaskReportRow,
  type UserRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";
import {
  UserCreateQuickActionModal,
  UsersContent
} from "../users/UsersContent";
import { AuditLogsContent } from "./AuditLogsContent";
import { DashboardContent } from "./DashboardContent";
import { MyTasksContent } from "./MyTasksContent";
import { ProjectProgressContent } from "./ProjectProgressContent";
import { SprintAreaContent } from "./SprintAreaContent";
import {
  SprintItemsContent,
  SprintItemsQuickActionModal
} from "./SprintItemsContent";
import { SprintsContent } from "./SprintsContent";
import { getSprintAreaDefinition } from "./sprintAreas";

type DashboardShellProps = {
  onSignOut: () => Promise<void>;
  session: Session;
};

type ShellPage =
  | "auditLogs"
  | "dashboard"
  | "myTasks"
  | "projectProgress"
  | "reports"
  | "settings"
  | "sprintItems"
  | "sprints"
  | "users";

type PageChrome = {
  breadcrumb?: Array<{
    label: string;
    path?: string;
  }>;
  searchPlaceholder: string;
  subtitle: string;
  title: string;
};

type QuickActionModal = "addSprintItem" | "assignSprintItem" | "createUser" | null;

const adminNavigationItems: Array<{
  icon: LucideIcon;
  labelKey: string;
  page?: ShellPage;
  path?: string;
}> = [
  { icon: House, labelKey: "dashboard.navigation.dashboard", page: "dashboard", path: "/dashboard" },
  { icon: ClipboardList, labelKey: "dashboard.navigation.sprints", page: "sprints", path: "/sprints" },
  { icon: ClipboardCheck, labelKey: "dashboard.navigation.sprintItems", page: "sprintItems", path: "/sprint-items" },
  { icon: Users, labelKey: "dashboard.navigation.team", page: "users", path: "/users" },
  { icon: UserCog, labelKey: "dashboard.navigation.roles" },
  { icon: ShieldCheck, labelKey: "dashboard.navigation.permissions" },
  { icon: FileText, labelKey: "dashboard.navigation.auditLogs", page: "auditLogs", path: "/audit-logs" },
  { icon: ScrollText, labelKey: "dashboard.navigation.reports", page: "reports", path: "/reports" },
  { icon: Settings, labelKey: "dashboard.navigation.settings", page: "settings", path: "/settings" }
];

const employeeNavigationItems: typeof adminNavigationItems = [
  { icon: SquareCheckBig, labelKey: "dashboard.navigation.myTasks", page: "myTasks", path: "/my-tasks" },
  { icon: ClipboardList, labelKey: "dashboard.navigation.sprints", page: "sprints", path: "/sprints" },
  { icon: ClipboardCheck, labelKey: "dashboard.navigation.sprintItems", page: "sprintItems", path: "/sprint-items" },
  { icon: Users, labelKey: "dashboard.navigation.team", page: "users", path: "/users" },
  { icon: ScrollText, labelKey: "dashboard.navigation.reports", page: "reports", path: "/reports" },
  { icon: Settings, labelKey: "dashboard.navigation.settings", page: "settings", path: "/settings" }
];

const quickActions = [
  {
    action: "addSprintItem",
    descriptionKey: "dashboard.actions.newRequest.description",
    icon: Plus,
    permission: "tasks:create",
    titleKey: "dashboard.actions.newRequest.title"
  },
  {
    action: "assignSprintItem",
    descriptionKey: "dashboard.actions.assignTask.description",
    icon: ClipboardCheck,
    permission: "tasks:assign",
    titleKey: "dashboard.actions.assignTask.title"
  },
  {
    action: "createUser",
    descriptionKey: "dashboard.actions.createUser.description",
    icon: UserPlus,
    permission: "users:create",
    titleKey: "dashboard.actions.createUser.title"
  }
] as const;

export function DashboardShell({ onSignOut, session }: DashboardShellProps) {
  const { direction, language, setLanguage, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [quickActionModal, setQuickActionModal] = useState<QuickActionModal>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [dataRefreshVersion, setDataRefreshVersion] = useState(api.getDataVersion());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const activePage = resolveActivePage(location.pathname);
  const pageChrome = resolvePageChrome(
    activePage,
    language,
    t,
    location.pathname,
    session.roleCode
  );
  const breadcrumb = pageChrome.breadcrumb ?? [];
  const currentDate = new Date();
  const dateLocale = language === "ar" ? "ar-LY" : "en-US";
  const formattedDate = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(currentDate);
  const weekday = new Intl.DateTimeFormat(dateLocale, {
    weekday: "long"
  }).format(currentDate);

  const displayName = resolveDisplayName(session);
  const avatarInitials = resolveInitials(displayName, session.email);
  const CollapseIcon = direction === "rtl" ? ChevronRight : ChevronLeft;
  const isEmployee = session.roleCode === "employee";
  const navigationItems = isEmployee ? employeeNavigationItems : adminNavigationItems;
  const visibleQuickActions = quickActions.filter((action) =>
    session.permissionCodes.includes(action.permission)
  );

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (userMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsUserMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    return api.subscribeToDataChanges((event) => {
      setDataRefreshVersion(event.version);
    });
  }, []);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await onSignOut();
    } catch (error) {
      setIsSigningOut(false);
      console.warn("Sign out failed.", error);
    }
  }

  function handleQuickAction(action: (typeof quickActions)[number]["action"]) {
    setQuickActionModal(action);
  }

  function handleQuickActionCompleted() {
    setDashboardRefreshKey((current) => current + 1);
  }

  return (
    <div
      className={`dashboard-shell${isSidebarCollapsed ? " is-sidebar-collapsed" : ""}${
        activePage === "projectProgress" ? " is-project-progress-page" : ""
      }`}
    >
      <aside className="dashboard-sidebar" aria-label={t("dashboard.aria.primaryNavigation")}>
        <div className="dashboard-sidebar-top">
          <img
            className="dashboard-sidebar-logo"
            src="/harouge-logo.svg"
            alt="Harouge Operations"
          />
          <button
            aria-expanded={!isSidebarCollapsed}
            className="dashboard-collapse-button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
            aria-label={
              isSidebarCollapsed
                ? t("dashboard.userMenu.expandSidebar")
                : t("dashboard.userMenu.collapseSidebar")
            }
          >
            <CollapseIcon size={19} strokeWidth={2.4} />
          </button>
        </div>

        <nav className="dashboard-nav" aria-label={t("dashboard.aria.mainNavigation")}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey);
            const isActive = item.page === activePage;

            return (
              <button
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`dashboard-nav-item${isActive ? " is-active" : ""}`}
                key={item.labelKey}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  }
                }}
                title={label}
                type="button"
              >
                <Icon size={21} strokeWidth={2.15} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-footer-rule" />
          <div className="dashboard-internal">
            <ShieldCheck size={20} strokeWidth={2.1} />
            <strong>{t("dashboard.footer.internalUseOnly")}</strong>
          </div>
          <p>
            {t("dashboard.footer.company")}
            <br />
            {t("dashboard.footer.copyright")}
          </p>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <section className="dashboard-title-block" aria-label={t("dashboard.aria.currentPage")}>
            {breadcrumb.length > 0 ? (
              <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
                {breadcrumb.map((item, index) => (
                  <span key={`${item.label}-${index}`}>
                    {item.path ? (
                      <button
                        onClick={() => {
                          if (item.path) {
                            navigate(item.path);
                          }
                        }}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <b>{item.label}</b>
                    )}
                    {index < breadcrumb.length - 1 ? <i>/</i> : null}
                  </span>
                ))}
              </nav>
            ) : null}
            <h1>{pageChrome.title}</h1>
            <p>{pageChrome.subtitle}</p>
          </section>

          <div className="dashboard-search" role="search">
            <Search size={20} strokeWidth={2.1} />
            <input
              aria-label={t("dashboard.aria.search")}
              placeholder={pageChrome.searchPlaceholder}
            />
            <kbd>Ctrl K</kbd>
          </div>

          <section className="dashboard-date-card" aria-label={t("dashboard.aria.currentDate")}>
            <CalendarDays size={21} strokeWidth={2.15} />
            <div>
              <strong>{formattedDate}</strong>
              <span>{weekday}</span>
            </div>
          </section>

          <div className="dashboard-user-menu" ref={userMenuRef}>
            <button
              aria-controls="dashboard-user-menu"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="dashboard-user-card"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              type="button"
            >
              <span className="dashboard-avatar">{avatarInitials}</span>
              <span className="dashboard-user-meta">
                <strong>{displayName}</strong>
                <span>{resolveRoleLabel(session.roleCode, t)}</span>
              </span>
              <ChevronDown
                className="dashboard-user-chevron"
                size={18}
                strokeWidth={2.2}
              />
            </button>

            {isUserMenuOpen ? (
              <div className="dashboard-user-dropdown" id="dashboard-user-menu" role="menu">
                <div className="dashboard-menu-identity">
                  <strong>{displayName}</strong>
                  <span>{session.email}</span>
                </div>
                <div
                  className="dashboard-menu-language"
                  role="group"
                  aria-label={t("language.appLanguage")}
                >
                  <span>{t("dashboard.userMenu.language")}</span>
                  <div className="dashboard-language-switch" dir="ltr">
                    <button
                      aria-label={t("language.english")}
                      aria-pressed={language === "en"}
                      onClick={() => setLanguage("en")}
                      type="button"
                    >
                      EN
                    </button>
                    <button
                      aria-label={t("language.arabic")}
                      aria-pressed={language === "ar"}
                      onClick={() => setLanguage("ar")}
                      type="button"
                    >
                      AR
                    </button>
                  </div>
                </div>
                <button
                  className="dashboard-sign-out-button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  role="menuitem"
                  type="button"
                >
                  <LogOut size={17} strokeWidth={2.2} />
                  <span>
                    {isSigningOut
                      ? t("dashboard.userMenu.signingOut")
                      : t("dashboard.userMenu.signOut")}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {activePage === "dashboard" ? (
          <>
            <section className="dashboard-hero" aria-label={t("dashboard.aria.currentPage")}>
              <div className="dashboard-welcome">
                <span className="dashboard-welcome-icon" aria-hidden="true">
                  <Building2 size={33} strokeWidth={1.95} />
                </span>
                <div>
                  <h2>{t("dashboard.welcome.title", { name: displayName })}</h2>
                  <p>{t("dashboard.welcome.message")}</p>
                </div>
              </div>

              {visibleQuickActions.length > 0 ? (
                <div className="dashboard-actions" aria-label={t("dashboard.aria.quickActions")}>
                  {visibleQuickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        className="dashboard-action-card"
                        key={action.titleKey}
                        onClick={() => handleQuickAction(action.action)}
                        type="button"
                      >
                        <span>
                          <Icon size={23} strokeWidth={2.3} />
                        </span>
                        <strong>{t(action.titleKey)}</strong>
                        <small>{t(action.descriptionKey)}</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <DashboardContent
              key={dashboardRefreshKey}
              refreshSignal={dataRefreshVersion}
              session={session}
            />
          </>
        ) : activePage === "myTasks" ? (
          <MyTasksContent refreshSignal={dataRefreshVersion} session={session} />
        ) : activePage === "projectProgress" ? (
          <ProjectProgressContent refreshSignal={dataRefreshVersion} session={session} />
        ) : activePage === "sprints" ? (
          location.pathname === "/sprints" ? (
            <SprintsContent refreshSignal={dataRefreshVersion} />
          ) : (
            <SprintAreaContent refreshSignal={dataRefreshVersion} session={session} />
          )
        ) : activePage === "sprintItems" ? (
          <SprintItemsContent refreshSignal={dataRefreshVersion} session={session} />
        ) : activePage === "reports" ? (
          <FuturePage
            message={
              language === "ar"
                ? "سيتم إضافة صفحة التقارير لاحقا."
                : "Reports page will be added later."
            }
            title={t("dashboard.navigation.reports")}
          />
        ) : activePage === "auditLogs" ? (
          <AuditLogsContent refreshSignal={dataRefreshVersion} />
        ) : activePage === "settings" ? (
          <FuturePage
            message={
              language === "ar"
                ? "سيتم إضافة صفحة الإعدادات لاحقا."
                : "Settings page will be added later."
            }
            title={t("dashboard.navigation.settings")}
          />
        ) : isEmployee ? (
          <EmployeeTeamContent refreshSignal={dataRefreshVersion} />
        ) : (
          <UsersContent refreshSignal={dataRefreshVersion} />
        )}

        {quickActionModal === "addSprintItem" ? (
          <SprintItemsQuickActionModal
            action="create"
            onClose={() => setQuickActionModal(null)}
            onCompleted={handleQuickActionCompleted}
            session={session}
          />
        ) : null}

        {quickActionModal === "assignSprintItem" ? (
          <SprintItemsQuickActionModal
            action="assign"
            onClose={() => setQuickActionModal(null)}
            onCompleted={handleQuickActionCompleted}
            session={session}
          />
        ) : null}

        {quickActionModal === "createUser" ? (
          <UserCreateQuickActionModal
            onClose={() => setQuickActionModal(null)}
            onCompleted={handleQuickActionCompleted}
          />
        ) : null}
      </main>
    </div>
  );
}

function FuturePage({ message, title }: { message: string; title: string }) {
  return (
    <section className="shell-future-page">
      <ScrollText size={38} strokeWidth={1.9} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

function EmployeeTeamContent({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { language } = useI18n();
  const [items, setItems] = useState<TaskReportRow[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");

  useEffect(() => {
    let isMounted = true;

    setStatus((current) => (current === "ready" ? current : "loading"));

    Promise.all([
      api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc", status: "active" }),
      api.getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" })
    ])
      .then(([userResult, taskResult]) => {
        if (!isMounted) {
          return;
        }

        setUsers(userResult.data);
        setItems(taskResult.data);
        setStatus("ready");
      })
      .catch(() => {
        if (isMounted) {
          setStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSignal]);

  const workload = buildVisibleTeamWorkload(users, items);

  return (
    <section className="employee-team-page">
      <section className="employee-team-card">
        <header>
          <h2>{language === "ar" ? "حمل عمل الفريق" : "Team Workload"}</h2>
          <p>
            {language === "ar"
              ? "عرض مبسط لحمل العمل من عناصر السبرنت المرئية لك."
              : "View every active team member, assigned sprint item count, and average progress."}
          </p>
        </header>

        {status === "loading" ? (
          <p className="dashboard-empty-state">
            {language === "ar" ? "جار تحميل حمل العمل..." : "Loading workload..."}
          </p>
        ) : null}

        {status === "error" ? (
          <p className="dashboard-empty-state">
            {language === "ar"
              ? "تعذر تحميل حمل عمل الفريق."
              : "Team workload could not be loaded."}
          </p>
        ) : null}

        {status === "ready" && workload.length === 0 ? (
          <p className="dashboard-empty-state">
            {language === "ar"
              ? "لا يوجد حمل عمل ظاهر حاليا."
              : "No visible workload right now."}
          </p>
        ) : null}

        {status === "ready" && workload.length > 0 ? (
          <div className="employee-team-list">
            {workload.map((member) => (
              <article className="employee-team-row" key={member.id}>
                <span>{resolveInitials(member.name, member.email)}</span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.subtitle}</small>
                </div>
                <div className="employee-team-meter">
                  <i style={{ width: member.progressPercent + "%" }} />
                </div>
                <div className="employee-team-stats">
                  <b>{member.assignedCount}</b>
                  <small>{language === "ar" ? "مهام" : "tasks"}</small>
                </div>
                <div className="employee-team-stats">
                  <b>{member.progressPercent}%</b>
                  <small>{language === "ar" ? "تقدم" : "progress"}</small>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function buildVisibleTeamWorkload(users: UserRecord[], items: TaskReportRow[]) {
  const members = new Map<
    string,
    {
      activeCount: number;
      assignedCount: number;
      email: string;
      id: string;
      name: string;
      progressPercent: number;
      progressTotal: number;
      subtitle: string;
    }
  >();

  for (const user of users) {
    members.set(user.id, {
      activeCount: 0,
      assignedCount: 0,
      email: user.email,
      id: user.id,
      name: user.fullName,
      progressPercent: 0,
      progressTotal: 0,
      subtitle: user.jobTitle ?? user.department ?? user.email
    });
  }

  for (const item of items) {
    const assignedUsers = item.assignees.length > 0
      ? item.assignees
      : item.assignedTo
        ? [item.assignedTo]
        : [];

    if (assignedUsers.length === 0) {
      continue;
    }

    for (const user of assignedUsers) {
      const existing = members.get(user.id) ?? {
        activeCount: 0,
        assignedCount: 0,
        email: user.email,
        id: user.id,
        name: user.fullName,
        progressPercent: 0,
        progressTotal: 0,
        subtitle: user.jobTitle ?? user.department ?? user.email
      };

      existing.assignedCount += 1;
      existing.progressTotal += item.progress;

      if (!["completed", "cancelled"].includes(item.status)) {
        existing.activeCount += 1;
      }

      members.set(user.id, existing);
    }
  }

  return [...members.values()]
    .map((member) => ({
      ...member,
      progressPercent:
        member.assignedCount > 0
          ? Math.round(member.progressTotal / member.assignedCount)
          : 0
    }))
    .sort((left, right) =>
      right.assignedCount === left.assignedCount
        ? left.name.localeCompare(right.name)
        : right.assignedCount - left.assignedCount
    );
}

function resolveActivePage(pathname: string): ShellPage {
  if (pathname === "/project-progress") {
    return "projectProgress";
  }

  if (pathname === "/my-tasks") {
    return "myTasks";
  }

  if (pathname === "/audit-logs") {
    return "auditLogs";
  }

  if (pathname === "/reports") {
    return "reports";
  }

  if (pathname === "/settings") {
    return "settings";
  }

  if (pathname === "/sprint-items") {
    return "sprintItems";
  }

  if (pathname.startsWith("/sprints")) {
    return "sprints";
  }

  return pathname === "/users" ? "users" : "dashboard";
}

function resolvePageChrome(
  page: ShellPage,
  language: AppLanguage,
  t: (key: string) => string,
  pathname: string,
  roleCode: string
): PageChrome {
  if (page === "myTasks") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في مهامي...",
          subtitle: "متابعة عناصر السبرنت المسندة إليك وتحديث التقدم",
          title: t("dashboard.navigation.myTasks")
        }
      : {
          searchPlaceholder: "Search my tasks...",
          subtitle: "Track assigned sprint items, due dates, progress, and reports",
          title: t("dashboard.navigation.myTasks")
        };
  }

  if (page === "projectProgress") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في تقدم المشروع...",
          subtitle: "تعديل نسبة تقدم مشروع ERP العامة بشكل مستقل عن السبرنتات.",
          title: "تقدم المشروع العام"
        }
      : {
          searchPlaceholder: "Search project progress...",
          subtitle: "Edit the ERP project progress percentage independently from sprint progress.",
          title: "Overall Project Progress"
        };
  }

  if (page === "sprints") {
    const area = pathname.startsWith("/sprints/")
      ? getSprintAreaDefinition(pathname.split("/")[2])
      : undefined;

    if (!area) {
      return language === "ar"
        ? {
            searchPlaceholder: "ابحث في السبرنتات حسب الاسم أو المسؤول أو الكلمات...",
            subtitle: "إدارة ومتابعة مجالات سبرنت ERP الرئيسية.",
            title: t("dashboard.navigation.sprints")
          }
        : {
            searchPlaceholder: "Search sprints by name, owner, or keywords...",
            subtitle: "Manage and monitor the main ERP sprint areas.",
            title: t("dashboard.navigation.sprints")
          };
    }

    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في عناصر السبرنت...",
          subtitle: "تفاصيل مجال السبرنت",
          title: area ? t(area.labelKey) : t("dashboard.navigation.sprints")
        }
      : {
          breadcrumb: [
            { label: t("dashboard.navigation.sprints"), path: "/sprints" },
            { label: t(area.labelKey) }
          ],
          searchPlaceholder: "Search sprints by name, owner, or keywords...",
          subtitle: resolveSprintSubtitle(area.key),
          title: t(area.labelKey)
        };
  }

  if (page === "sprintItems") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في عناصر السبرنت حسب العنوان أو المعرف أو الكلمات...",
          subtitle: "إدارة ومتابعة كل عناصر السبرنت عبر برنامج ERP.",
          title: t("dashboard.navigation.sprintItems")
        }
      : {
          searchPlaceholder: "Search sprint items by title, ID, or keywords...",
          subtitle: "Manage and track all sprint items across the ERP program.",
          title: t("dashboard.navigation.sprintItems")
        };
  }

  if (page === "users") {
    if (roleCode === "employee") {
      return language === "ar"
        ? {
            searchPlaceholder: "ابحث في الفريق...",
            subtitle: "عرض حمل العمل لعناصر السبرنت المرئية لك",
            title: "الفريق"
          }
        : {
            searchPlaceholder: "Search team...",
            subtitle: "View workload for sprint items visible to you",
            title: "Team"
          };
    }

    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في أعضاء الفريق...",
          subtitle: "إدارة أعضاء الفريق وصلاحيات النظام",
          title: "الفريق"
        }
      : {
          searchPlaceholder: "Search team members...",
          subtitle: "Manage team members and system access",
          title: "Team"
        };
  }

  if (page === "reports") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في التقارير...",
          subtitle: "تقارير تقدم السبرنت وعناصر العمل",
          title: t("dashboard.navigation.reports")
        }
      : {
          searchPlaceholder: "Search reports...",
          subtitle: "Sprint progress and work item reports",
          title: t("dashboard.navigation.reports")
        };
  }

  if (page === "auditLogs") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في سجلات التدقيق...",
          subtitle: "تتبع ومراجعة نشاط النظام عبر عمليات سبرنت ERP",
          title: t("dashboard.navigation.auditLogs")
        }
      : {
          searchPlaceholder: "Search audit logs...",
          subtitle: "Track and review system activity across ERP sprint operations",
          title: t("dashboard.navigation.auditLogs")
        };
  }

  if (page === "settings") {
    return language === "ar"
      ? {
          searchPlaceholder: "ابحث في الإعدادات...",
          subtitle: "إعدادات النظام والحساب",
          title: t("dashboard.navigation.settings")
        }
      : {
          searchPlaceholder: "Search settings...",
          subtitle: "System and account settings",
          title: t("dashboard.navigation.settings")
        };
  }

  return {
    searchPlaceholder: t("dashboard.search.placeholder"),
    subtitle: t("shell.systemName"),
    title: t("dashboard.navigation.dashboard")
  };
}

function resolveSprintSubtitle(areaKey: string): string {
  switch (areaKey) {
    case "facility":
      return "Track rooms, workstation readiness, training, rollout support, and facility delivery progress.";
    case "infrastructure":
      return "Track servers, network, hosting, backup, access, and security delivery progress.";
    default:
      return "Track software modules, APIs, UI, integrations, testing, and delivery progress.";
  }
}

function resolveDisplayName(session: Session) {
  const displayName = session.displayName.trim();

  return displayName.length > 0 ? displayName : session.email;
}

function resolveInitials(displayName: string, email: string) {
  const source = displayName.includes("@") ? email : displayName;
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials.length > 0 ? initials : "U";
}

function resolveRoleLabel(roleCode: string, t: (key: string) => string) {
  switch (roleCode) {
    case "super_admin":
      return t("dashboard.roles.superAdmin");
    case "it_manager":
      return t("dashboard.roles.itManager");
    case "supervisor":
      return t("dashboard.roles.supervisor");
    case "employee":
      return t("dashboard.roles.employee");
    default:
      return t("dashboard.roles.superAdmin");
  }
}
