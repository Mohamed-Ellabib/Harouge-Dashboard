import type { AppLanguage } from "./locale";

type MessageTree = {
  [key: string]: string | MessageTree;
};

export const messages = {
  ar: {
    dashboard: {
      actions: {
        assignTask: {
          description: "إسناد عمل السبرنت إلى الفريق",
          title: "إسناد عنصر سبرنت"
        },
        createUser: {
          description: "إضافة مستخدم جديد",
          title: "إنشاء مستخدم"
        },
        newRequest: {
          description: "إضافة عنصر عمل جديد للسبرنت",
          title: "إضافة عنصر سبرنت"
        }
      },
      activity: {
        accessUpdated: "تم تحديث صلاحيات عمر الحربي بواسطة جيمس ميلر",
        completedTask: "أكمل أحمد خان المهمة TASK-3046",
        requestSubmitted: "قدمت سارة أحمد الطلب REQ-1023",
        roleUpdated: "تم تحديث دور دعم تقنية المعلومات بواسطة مدير النظام",
        taskAssigned: "أسند مدير النظام المهمة TASK-3051 إلى ماريا سانتوس"
      },
      aria: {
        currentDate: "التاريخ الحالي",
        currentPage: "الصفحة الحالية",
        mainNavigation: "أقسام النظام الرئيسية",
        primaryNavigation: "التنقل الرئيسي",
        quickActions: "إجراءات سريعة",
        search: "بحث",
        summary: "ملخص لوحة التحكم",
        userMenu: "قائمة المستخدم",
        workspace: "مساحة لوحة التحكم"
      },
      common: {
        activeUsers: "أعضاء فريق نشطون",
        awaitingApproval: "بانتظار الاعتماد",
        high: "عالية",
        highPriorityCount: "12 أولوية عالية",
        inProgress: "قيد التنفيذ",
        low: "منخفضة",
        medium: "متوسطة",
        open: "مفتوح",
        pending: "معلق",
        requireAttention: "تتطلب الانتباه",
        resolved: "تم الحل"
      },
      dates: {
        earlyMorning: "29 مايو 2026 08:10 ص",
        eightTwentyFive: "29 مايو 2026 08:25 ص",
        eightForty: "29 مايو 2026 08:40 ص",
        eightFiftyFive: "29 مايو 2026 08:55 ص",
        nineTen: "29 مايو 2026 09:10 ص",
        req1022: "29 مايو 2026 07:20 ص",
        req1023: "29 مايو 2026 07:55 ص",
        req1024: "29 مايو 2026 08:30 ص",
        req1025: "29 مايو 2026 08:42 ص",
        req1026: "29 مايو 2026 09:15 ص",
        today1pm: "اليوم، 1:00 م",
        today2pm: "اليوم، 2:00 م",
        today9am: "اليوم، 9:00 ص",
        today10am: "اليوم، 10:00 ص",
        today11am: "اليوم، 11:00 ص"
      },
      departments: {
        administration: "الإدارة",
        corporateIt: "تقنية المعلومات",
        fieldOperations: "العمليات الميدانية",
        finance: "المالية",
        hr: "الموارد البشرية",
        infrastructure: "البنية التحتية",
        projects: "المشاريع"
      },
      footer: {
        company: "Harouge Oil Operations",
        copyright: "2026 ©",
        internalUseOnly: "للاستخدام الداخلي فقط"
      },
      loading: {
        checkingSession: "جار التحقق من الجلسة..."
      },
      navigation: {
        managementDashboard: "Management View",
        modules: "Modules",
        auditLogs: "سجلات التدقيق",
        dashboard: "لوحة التحكم",
        myTasks: "مهامي",
        permissions: "الصلاحيات",
        reports: "التقارير",
        requests: "السبرنتات",
        roles: "الأدوار",
        settings: "الإعدادات",
        sprintItems: "عناصر السبرنت",
        sprints: "السبرنتات",
        tasks: "عناصر السبرنت",
        team: "الفريق",
        users: "الفريق"
      },
      panels: {
        focus: {
          action: "عرض كل البنود العاجلة",
          description: "عناصر سبرنت حرجة تحتاج إلى متابعة فورية.",
          title: "تركيز السبرنت"
        },
        recentActivity: {
          action: "عرض كل السجلات",
          title: "آخر النشاطات"
        },
        recentRequests: {
          action: "عرض كل عناصر السبرنت",
          title: "آخر عناصر السبرنت"
        },
        requestsTable: {
          created: "آخر تحديث",
          department: "مجال السبرنت",
          id: "المعرف",
          priority: "الأولوية",
          requestedBy: "المسؤول",
          status: "الحالة",
          title: "عنصر السبرنت"
        },
        team: {
          action: "عرض الفريق بالكامل",
          description: "حجم العمل الحالي لكل عضو في الفريق.",
          title: "أعباء الفريق"
        },
        workQueue: {
          action: "عرض كل عناصر السبرنت",
          description: "عناصر السبرنت المستحقة أو قيد التنفيذ.",
          title: "عمل السبرنت الحالي"
        }
      },
      people: {
        ahmedKhan: "أحمد خان",
        davidJohnson: "ديفيد جونسون",
        fatimaAlMansoori: "فاطمة المنصوري",
        jamesMiller: "جيمس ميلر",
        liamBrown: "ليام براون",
        mariaSantos: "ماريا سانتوس",
        michaelChen: "مايكل تشين",
        omarAlHarbi: "عمر الحربي",
        saraSalem: "سارة سالم",
        sarahAhmed: "سارة أحمد"
      },
      requests: {
        accessProjectFiles: "الوصول إلى ملفات المشروع",
        emailServiceOutage: "انقطاع خدمة البريد الإلكتروني",
        newEmployeeOnboarding: "تهيئة موظف جديد",
        printerNotResponding: "الطابعة لا تستجيب",
        unableErp: "تعذر الوصول إلى نظام ERP",
        vpnAccessNotWorking: "تعذر عمل اتصال VPN"
      },
      roles: {
        employee: "موظف",
        itManager: "مدير تقنية المعلومات",
        managementCommittee: "لجنة الإدارة",
        supervisor: "مشرف",
        superAdmin: "مدير النظام"
      },
      search: {
        placeholder: "ابحث في مجالات السبرنت أو العناصر أو الفريق أو المعرفات..."
      },
      sprintAreas: {
        development: "سبرنت التطوير",
        facility: "سبرنت المرافق",
        infrastructure: "سبرنت البنية التحتية",
        masterDataCollection: "جمع البيانات الرئيسية",
        latestItems: "آخر خمسة عناصر",
        noRecentItems: "لا توجد عناصر حديثة.",
        title: "مجالات السبرنت",
        viewMore: "عرض المزيد"
      },
      tasks: {
        onboardEmployee: "تهيئة موظف جديد",
        resetPassword: "إعادة تعيين كلمة مرور المستخدم",
        reviewAccessRequest: "مراجعة طلب صلاحية",
        serverBackupFailed: "فشل النسخ الاحتياطي للخادم",
        serverPatch: "تحديث تصحيحات الخادم",
        softwareInstallation: "تثبيت برنامج"
      },
      titles: {
        infrastructureEngineer: "مهندس بنية تحتية",
        itSupportSpecialist: "أخصائي دعم تقنية المعلومات",
        systemAdministrator: "مدير نظام",
        systemEngineer: "مهندس نظم"
      },
      userMenu: {
        collapseSidebar: "طي الشريط الجانبي",
        expandSidebar: "توسيع الشريط الجانبي",
        language: "اللغة",
        signOut: "تسجيل الخروج",
        signingOut: "جار تسجيل الخروج..."
      },
      welcome: {
        message: "إليك ما يحدث اليوم في تقدم سبرنت ERP.",
        title: "مرحبًا بعودتك، {name}"
      }
    },
    language: {
      appLanguage: "لغة النظام",
      arabic: "العربية",
      english: "English"
    },
    login: {
      failed: "تعذر إكمال طلب تسجيل الدخول.",
      footer: "Harouge Oil Operations | 2026 ©",
      hidePassword: "إخفاء كلمة المرور",
      internalUseOnly: "للاستخدام الداخلي فقط",
      invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      panelSummary: "نظام داخلي للشركة. يرجى استخدام بيانات اعتمادك للمتابعة.",
      panelTitle: "تسجيل الدخول",
      password: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      rememberMe: "تذكرني",
      showPassword: "إظهار كلمة المرور",
      signIn: "تسجيل الدخول",
      signingIn: "جار تسجيل الدخول...",
      username: "البريد الإلكتروني",
      usernamePlaceholder: "أدخل البريد الإلكتروني"
    },
    shell: {
      systemName: "نظام متابعة تقدم سبرنت ERP"
    }
  },
  en: {
    dashboard: {
      actions: {
        assignTask: {
          description: "Assign sprint work to team",
          title: "Assign Sprint Item"
        },
        createUser: {
          description: "Add new user",
          title: "Create User"
        },
        newRequest: {
          description: "Add a new sprint work item",
          title: "Add Sprint Item"
        }
      },
      activity: {
        accessUpdated: "Omar Al-Harbi's access was updated by James Miller",
        completedTask: "Ahmed Khan completed TASK-3046",
        requestSubmitted: "Sarah Ahmed submitted request REQ-1023",
        roleUpdated: "Role \"IT Support\" was updated by Admin Admin",
        taskAssigned: "Admin Admin assigned TASK-3051 to Maria Santos"
      },
      aria: {
        currentDate: "Current date",
        currentPage: "Current page",
        mainNavigation: "Main sections",
        primaryNavigation: "Primary navigation",
        quickActions: "Quick actions",
        search: "Search",
        summary: "Dashboard summary",
        userMenu: "User menu",
        workspace: "Dashboard workspace"
      },
      common: {
        activeUsers: "Active team members",
        awaitingApproval: "Awaiting approval",
        high: "High",
        highPriorityCount: "12 high priority",
        inProgress: "In Progress",
        low: "Low",
        medium: "Medium",
        open: "Open",
        pending: "Pending",
        requireAttention: "Require attention",
        resolved: "Resolved"
      },
      dates: {
        earlyMorning: "May 29, 2026 08:10 AM",
        eightTwentyFive: "May 29, 2026 08:25 AM",
        eightForty: "May 29, 2026 08:40 AM",
        eightFiftyFive: "May 29, 2026 08:55 AM",
        nineTen: "May 29, 2026 09:10 AM",
        req1022: "May 29, 2026 07:20 AM",
        req1023: "May 29, 2026 07:55 AM",
        req1024: "May 29, 2026 08:30 AM",
        req1025: "May 29, 2026 08:42 AM",
        req1026: "May 29, 2026 09:15 AM",
        today1pm: "Today, 1:00 PM",
        today2pm: "Today, 2:00 PM",
        today9am: "Today, 9:00 AM",
        today10am: "Today, 10:00 AM",
        today11am: "Today, 11:00 AM"
      },
      departments: {
        administration: "Administration",
        corporateIt: "Corporate IT",
        fieldOperations: "Field Operations",
        finance: "Finance",
        hr: "HR",
        infrastructure: "Infrastructure",
        projects: "Projects"
      },
      footer: {
        company: "Harouge Oil Operations",
        copyright: "2026 ©",
        internalUseOnly: "Internal use only"
      },
      loading: {
        checkingSession: "Checking session..."
      },
      navigation: {
        auditLogs: "Audit Logs",
        dashboard: "Dashboard",
        departments: "Departments",
        managementDashboard: "Management View",
        modules: "Modules",
        myTasks: "My Tasks",
        permissions: "Permissions",
        reports: "Reports",
        requests: "Sprints",
        roles: "Roles",
        settings: "Settings",
        sprintItems: "Sprint Items",
        sprints: "Sprints",
        tasks: "Sprint Items",
        team: "Team",
        users: "Team"
      },
      panels: {
        focus: {
          action: "View all urgent items",
          description: "Critical sprint items that need immediate attention.",
          title: "Sprint Focus"
        },
        recentActivity: {
          action: "View all logs",
          title: "Recent Activity"
        },
        recentRequests: {
          action: "View all sprint items",
          title: "Recent Sprint Items"
        },
        requestsTable: {
          created: "Updated",
          department: "Sprint Area",
          id: "ID",
          priority: "Priority",
          requestedBy: "Owner",
          status: "Status",
          title: "Sprint Item"
        },
        team: {
          action: "View full team",
          description: "Current workload by team member.",
          title: "Team Workload"
        },
        workQueue: {
          action: "View all sprint items",
          description: "Sprint items due or in progress.",
          title: "Current Sprint Work"
        }
      },
      people: {
        ahmedKhan: "Ahmed Khan",
        davidJohnson: "David Johnson",
        fatimaAlMansoori: "Fatima Al-Mansoori",
        jamesMiller: "James Miller",
        liamBrown: "Liam Brown",
        mariaSantos: "Maria Santos",
        michaelChen: "Michael Chen",
        omarAlHarbi: "Omar Al-Harbi",
        saraSalem: "Sara Salem",
        sarahAhmed: "Sarah Ahmed"
      },
      requests: {
        accessProjectFiles: "Access to project files",
        emailServiceOutage: "Email service outage",
        newEmployeeOnboarding: "New employee onboarding",
        printerNotResponding: "Printer not responding",
        unableErp: "Unable to access ERP system",
        vpnAccessNotWorking: "VPN access not working"
      },
      roles: {
        employee: "Employee",
        itManager: "IT Manager",
        managementCommittee: "Management Committee",
        supervisor: "Supervisor",
        superAdmin: "Super Administrator"
      },
      search: {
        placeholder: "Search sprint areas, sprint items, team, or IDs..."
      },
      sprintAreas: {
        development: "Development",
        facility: "Facilities",
        infrastructure: "Infrastructure",
        masterDataCollection: "Master Data Collection",
        latestItems: "Latest five items",
        noRecentItems: "No recent items.",
        title: "Sprint Areas",
        viewMore: "View more"
      },
      tasks: {
        onboardEmployee: "Onboard new employee",
        resetPassword: "Reset user password",
        reviewAccessRequest: "Review access request",
        serverBackupFailed: "Server backup failed",
        serverPatch: "Server patch update",
        softwareInstallation: "Software installation"
      },
      titles: {
        infrastructureEngineer: "Infrastructure Engineer",
        itSupportSpecialist: "IT Support Specialist",
        systemAdministrator: "System Administrator",
        systemEngineer: "System Engineer"
      },
      userMenu: {
        collapseSidebar: "Collapse sidebar",
        expandSidebar: "Expand sidebar",
        language: "Language",
        signOut: "Sign out",
        signingOut: "Signing out..."
      },
      welcome: {
        message: "Here's what's happening across ERP sprint progress today.",
        title: "Welcome back, {name}"
      }
    },
    language: {
      appLanguage: "App language",
      arabic: "العربية",
      english: "English"
    },
    login: {
      failed: "The login request could not be completed.",
      footer: "Harouge Oil Operations | 2026 ©",
      hidePassword: "Hide password",
      internalUseOnly: "Internal use only",
      invalidCredentials: "The email or password is wrong.",
      panelSummary: "Internal company system. Please use your credentials to continue.",
      panelTitle: "Sign in",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      rememberMe: "Remember me",
      showPassword: "Show password",
      signIn: "Sign in",
      signingIn: "Signing in...",
      username: "Email",
      usernamePlaceholder: "Enter your email"
    },
    shell: {
      systemName: "ERP Sprint Progress System"
    }
  }
} as const satisfies Record<AppLanguage, MessageTree>;

export type TranslationTree = MessageTree;
