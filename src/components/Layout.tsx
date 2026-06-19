import { Outlet, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  CalendarDays,
  Users,
  Gift,
  Ticket,
  Settings,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const menuItems = [
  { path: "/", label: "仪表盘", icon: Home, breadcrumb: "仪表盘" },
  { path: "/appointments", label: "预约管理", icon: CalendarDays, breadcrumb: "预约管理" },
  { path: "/members", label: "会员管理", icon: Users, breadcrumb: "会员管理" },
  { path: "/points", label: "积分中心", icon: Gift, breadcrumb: "积分中心" },
  { path: "/services", label: "服务项目", icon: Ticket, breadcrumb: "服务项目" },
  { path: "/settings", label: "规则设置", icon: Settings, breadcrumb: "规则设置" },
  { path: "/reports", label: "统计报表", icon: BarChart3, breadcrumb: "统计报表" },
];

function getBreadcrumb(pathname: string): { label: string; subLabel?: string } {
  if (pathname === "/") return { label: "仪表盘" };
  for (const item of menuItems) {
    if (item.path !== "/" && pathname.startsWith(item.path)) {
      if (pathname === item.path) {
        return { label: item.breadcrumb };
      }
      if (pathname.startsWith(`${item.path}/new`)) {
        return { label: item.breadcrumb, subLabel: "新建" };
      }
      const idMatch = pathname.match(new RegExp(`^${item.path}/([^/]+)$`));
      if (idMatch) {
        return { label: item.breadcrumb, subLabel: "详情" };
      }
    }
  }
  return { label: "页面" };
}

export default function Layout() {
  const location = useLocation();
  const breadcrumb = getBreadcrumb(location.pathname);
  const today = format(new Date(), "yyyy年MM月dd日 EEEE", { locale: zhCN });

  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="fixed left-0 top-0 h-screen w-[240px] flex flex-col bg-cream-50 border-r border-cream-200 z-10">
        <div className="px-6 py-6 border-b border-cream-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <h1 className="text-lg font-bold text-sage-700">毛球之家</h1>
          </div>
          <p className="mt-1 text-xs text-sage-500 pl-9">宠物美容管理</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sage-600 text-cream-50 shadow-soft"
                      : "text-sage-600 hover:bg-cream-200 hover:text-sage-700"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-cream-200">
          <p className="text-xs text-sage-500 font-medium">今日日期</p>
          <p className="mt-1 text-sm text-sage-700">{today}</p>
        </div>
      </aside>

      <main className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <div className="px-8 pt-6 pb-4 border-b border-cream-200 bg-cream-100/80 backdrop-blur-sm sticky top-0 z-5">
          <div className="flex items-center gap-2 text-sm text-sage-500">
            <Home size={14} strokeWidth={2} />
            <ChevronRight size={14} strokeWidth={2} />
            <span className="text-sage-700 font-medium">{breadcrumb.label}</span>
            {breadcrumb.subLabel && (
              <>
                <ChevronRight size={14} strokeWidth={2} />
                <span className="text-sage-600">{breadcrumb.subLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
