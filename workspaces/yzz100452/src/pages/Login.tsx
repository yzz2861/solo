import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  User,
  Lock,
  Smartphone,
  ShieldCheck,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Store,
  Wrench,
  Briefcase,
  Send,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import {
  useAuthStore,
  ROLE_DISPLAY,
  type UserRole,
} from "@/store/authStore";

type LoginMode = "password" | "sms";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  clerk: Store,
  inspector: Wrench,
  manager: Briefcase,
  consignor: Send,
  buyer: ShoppingBag,
};

const ROLE_DEFAULT_ACCOUNTS: Record<UserRole, { username: string; displayName: string }> = {
  clerk: { username: "clerk01", displayName: "张店员" },
  inspector: { username: "tech01", displayName: "李技师" },
  manager: { username: "manager01", displayName: "王经理" },
  consignor: { username: "owner01", displayName: "陈委托" },
  buyer: { username: "buyer01", displayName: "刘买家" },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [mode, setMode] = useState<LoginMode>("password");
  const [role, setRole] = useState<UserRole>("clerk");
  const [username, setUsername] = useState("clerk01");
  const [password, setPassword] = useState("123456");
  const [phone, setPhone] = useState("13800138000");
  const [smsCode, setSmsCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const from = (location.state as { from?: Location })?.from;

  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    setError(null);
    setUsername(ROLE_DEFAULT_ACCOUNTS[r].username);
  };

  const handleSendSms = () => {
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的11位手机号");
      return;
    }
    setError(null);
    setSmsSent(true);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setSmsSent(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "password") {
      if (!username.trim() || !password.trim()) {
        setError("请输入账号和密码");
        return;
      }
    } else {
      if (!/^1\d{10}$/.test(phone)) {
        setError("请输入正确的11位手机号");
        return;
      }
      if (smsCode !== "1234") {
        setError("验证码错误（Mock: 1234）");
        return;
      }
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);

    const account = ROLE_DEFAULT_ACCOUNTS[role];
    login({
      id: `user-${role}-${Date.now()}`,
      username: account.username,
      displayName: account.displayName,
      role,
      phone,
    });

    const redirectMap: Record<UserRole, string> = {
      clerk: "/clerk/dashboard",
      inspector: "/inspector/workbench",
      manager: "/manager/price-audit",
      consignor: "/consignor/portal",
      buyer: "/showroom",
    };

    navigate(from?.pathname || redirectMap[role], { replace: true });
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-space-950">
      <style>{`
        .brass-bg-pattern {
          background-image:
            radial-gradient(ellipse at 20% 20%, rgba(224,185,110,0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(147,112,61,0.15) 0%, transparent 50%),
            ${BRASS_GRADIENT};
        }
        .grid-overlay {
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px,
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .scan-line {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35, transparent);
        }
      `}</style>

      <div className="hidden lg:flex lg:w-[52% relative overflow-hidden">
        <div className="absolute inset-0 brass-bg-pattern" />
        <div className="absolute inset-0 grid-overlay opacity-60" />
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 h-full flex flex-col justify-between px-16 py-14">
          <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 52,
                height: 52,
                background: "rgba(15,17,21,0.35)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Camera className="w-7 h-7" strokeWidth={2} style={{ color: "#1a1d23" }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-mono font-bold text-2xl tracking-wide text-space-950">
                镜头銘
              </span>
              <span className="font-mono text-xs mt-1 tracking-[0.2em] text-space-900/70">
                LENS · INSCRIPTION
              </span>
            </div>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          >
            <div className="font-mono text-xs tracking-[0.3em] text-space-900/70 mb-4">
              — PRECISION · CRAFTSMANSHIP
            </div>
            <h1 className="font-mono text-5xl font-bold text-space-950 leading-[1.15 tracking-tight">
              时光铸就
              <br />
              光学之<span style={{ color: "rgba(15,17,21,0.85)" }}>铭</span>
            </h1>
            <div className="mt-5 max-w-md">
              <p className="text-[15px] text-space-900/75 leading-relaxed">
                专业二手相机检测寄卖平台，以匠人之心，鉴每一支镜头的光影流转，
                <br />
                让每一台相机，都有其应得之名。
              </p>
            </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="relative h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(15,17,21,0.18)", maxWidth: 380 }}
            >
              <div
              className="absolute inset-y-0 left-0 w-1/3 scan-line animate-pulse-soft"
            />
            <div
              className="h-full rounded-full"
              style={{
                width: "68%",
                background: "linear-gradient(90deg, #1a1d23 0%, rgba(15,17,21,0.9) 100%)",
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 max-w-lg"
          >
            {[
              { k: "2,847", v: "已鉴设备" },
              { k: "99.2%", v: "检测精度" },
              { k: "48h", v: "极速成交" },
            ].map((stat) => (
              <div key={stat.v} className="space-y-1">
                <div className="font-mono font-bold text-xl text-space-950">
                  {stat.k}
                </div>
                <div className="font-mono text-[11px] tracking-wider text-space-900/60 uppercase">
                  {stat.v}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="font-mono text-[11px] text-space-900/50 tracking-wider"
        >
          © 2026 LENS INSCRIPTION · ALL RIGHTS RESERVED
        </motion.div>
      </div>
    </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 relative">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="font-mono text-2xl font-bold text-space-100 tracking-wide">
              登錄 // LOGIN
            </h2>
            <p className="mt-2 text-sm text-space-400">
              身份验证以访问系统控制台
            </p>
          </div>

          <div
            className="relative mb-6 rounded-lg p-1 flex bg-space-800/80 border border-space-700"
          >
            <button
              onClick={() => setMode("password")}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-300 ${
                mode === "password"
                  ? "text-space-950"
                  : "text-space-400 hover:text-space-200"
              }`}
            >
              <Lock className="w-4 h-4" />
              账号密码
              {mode === "password" && (
                <motion.div
                  layoutId="login-mode-tab"
                  className="absolute inset-0 rounded-md -z-0"
                  style={{ background: BRASS_GRADIENT }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setMode("sms")}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-300 ${
                mode === "sms"
                  ? "text-space-950"
                  : "text-space-400 hover:text-space-200"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              短信验证
            </button>
          </div>

          <div className="mb-6">
            <label className="label-field">选择角色 / SELECT ROLE</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(ROLE_DISPLAY) as UserRole[]).map((r) => {
                const Icon = ROLE_ICONS[r];
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`relative group flex flex-col items-center justify-center gap-1.5 py-3 rounded-md border transition-all duration-200 ${
                      active
                        ? "border-transparent"
                        : "border-space-700 bg-space-800/50 hover:border-space-600 hover:bg-space-800"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="role-select-indicator"
                        className="absolute inset-0 rounded-md"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(224,185,110,0.18) 0%, rgba(147,112,61,0.18) 100%)",
                          border: "1px solid rgba(201,169,110,0.5)",
                          boxShadow: "0 0 12px rgba(201,169,110,0.2)",
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`w-4.5 h-4.5 relative z-10 w-5 h-5 ${
                        active ? "text-brass-300" : "text-space-400 group-hover:text-space-200"
                      }`}
                      strokeWidth={active ? 2.1 : 1.8}
                    />
                    <span
                      className={`relative z-10 text-[10px] font-medium tracking-wide ${
                        active ? "text-brass-200" : "text-space-400"
                      }`}
                    >
                      {ROLE_DISPLAY[r].slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-5"
              >
                {mode === "password" ? (
                  <>
                    <div>
                      <label className="label-field">账号 / USERNAME</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="input-field pl-10"
                          placeholder="请输入账号"
                          autoComplete="username"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label-field">密码 / PASSWORD</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-field pl-10 pr-10"
                          placeholder="请输入密码（任意6位以上）"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label-field">手机号 / PHONE</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input-field pl-10"
                          placeholder="请输入11位手机号"
                          maxLength={11}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label-field">验证码 / SMS CODE</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                          <input
                            type="text"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                            className="input-field pl-10"
                            placeholder="验证码：1234"
                            maxLength={6}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendSms}
                          disabled={smsSent}
                          className="btn-industrial btn-ghost whitespace-nowrap text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {smsSent ? `${countdown}s 后重发` : "获取验证码"}
                        </button>
                      </div>
                      {smsSent && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 flex items-center gap-1.5 text-xs text-signal-green"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          验证码已发送（Mock: 1234）
                        </motion.div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/25 text-sm text-signal-red"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="btn-industrial w-full py-3 text-[14px] font-semibold tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: BRASS_GRADIENT,
                color: "#1a1d23",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(201,169,110,0.3)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  验证中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  进入系统
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 divider-brass">
            <div className="flex items-center justify-between text-[11px] font-mono text-space-500">
              <span className="tracking-wider">SECURE CONNECTION · TLS 1.3</span>
              <span className="tracking-wider">v1.0.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
