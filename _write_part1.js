const fs = require("fs");
const path = require("path");

const P1 = `import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  User,
  PawPrint,
  Scissors,
  Clock,
  CalendarDays,
  MessageSquareText,
  CheckCircle2,
  XCircle,
  PlayCircle,
  AlertCircle,
  X,
  Wallet,
  Ticket,
  Banknote,
  MessageCircle,
  CreditCard as CreditCardIcon,
  StickyNote,
  Send,
  History,
  ArrowRight,
  Star,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { format, parseISO, addMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Appointment, AppointmentStatus, PayType, ConsumptionRecord, Service, Groomer } from "@/types";

const statusBannerConfig: Record<AppointmentStatus, { bg: string; text: string; label: string; desc: string }> = {
  pending: { bg: "bg-petal-100", text: "text-petal-700", label: "待确认", desc: "客户已提交预约，等待您确认" },
  confirmed: { bg: "bg-sage-100", text: "text-sage-700", label: "已确认", desc: "预约已确认，请按时服务" },
  in_service: { bg: "bg-terracotta-100", text: "text-terracotta-700", label: "服务中", desc: "正在为宠物进行美容服务" },
  completed: { bg: "bg-gray-100", text: "text-gray-600", label: "已完成", desc: "本次服务已完成" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", label: "已取消", desc: "本次预约已取消" },
};

const smsStatusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: "已发送", className: "bg-sage-100 text-sage-600 border-sage-200" },
  pending: { label: "待发送", className: "bg-cream-100 text-sage-600 border-cream-200" },
  failed: { label: "发送失败", className: "bg-petal-100 text-petal-600 border-petal-200" },
  disabled: { label: "未启用", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const payOptions: { key: PayType; label: string; icon: typeof Wallet; color: string; desc: string }[] = [
  { key: "balance", label: "余额", icon: Wallet, color: "bg-sage-500 hover:bg-sage-600", desc: "直接从会员余额扣除" },
  { key: "credit", label: "次卡", icon: Ticket, color: "bg-sky2-400 hover:bg-sky2-300", desc: "使用剩余服务次数" },
  { key: "cash", label: "现金", icon: Banknote, color: "bg-terracotta-400 hover:bg-terracotta-500", desc: "线下现金收款" },
  { key: "wechat", label: "微信", icon: MessageCircle, color: "bg-green-500 hover:bg-green-600", desc: "扫码支付" },
  { key: "alipay", label: "支付宝", icon: CreditCardIcon, color: "bg-blue-500 hover:bg-blue-600", desc: "扫码支付" },
];

function getAvatar(name: string) {
  const colors = [
    "bg-petal-200 text-petal-600",
    "bg-sage-200 text-sage-700",
    "bg-terracotta-200 text-terracotta-600",
    "bg-sky2-200 text-sky2-600",
    "bg-cream-300 text-sage-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const color = getAvatar(name);
  const initial = name.charAt(0);
  return <div className={cn("flex items-center justify-center rounded-full font-medium shrink-0", color, className)}>{initial}</div>;
}
`;

process.env.P1 = P1;
fs.writeFileSync(path.join(process.cwd(), "_P1.txt"), P1);
console.log("P1 written");
