import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden bg-space-950">
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center px-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-8 flex items-center justify-center rounded-2xl"
          style={{
            width: 108,
            height: 108,
            background:
              "linear-gradient(135deg, rgba(224,185,110,0.12) 0%, rgba(147,112,61,0.12) 100%)",
            border: "1px solid rgba(201,169,110,0.3)",
            boxShadow: "0 0 32px rgba(201,169,110,0.15)",
          }}
        >
          <ShieldAlert
            className="w-14 h-14"
            strokeWidth={1.6}
            style={{
              background: BRASS_GRADIENT,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="font-mono text-[11px] tracking-[0.4em] text-space-500 mb-3">
            ERROR CODE
          </div>
          <h1
            className="font-mono font-bold text-7xl mb-2 tracking-tight"
            style={{
              background: BRASS_GRADIENT,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            403
          </h1>
          <h2 className="font-mono text-xl font-semibold text-space-200 mb-3 tracking-wide">
            ACCESS DENIED · 访问被拒绝
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-sm text-space-400 max-w-md mx-auto mb-8 leading-relaxed"
        >
          当前账户角色无权访问此资源。如您认为这是错误，请联系管理员提升权限等级，
          或返回上一页面继续操作。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center justify-center gap-3"
        >
          <button
            onClick={() => navigate(-1)}
            className="btn-industrial btn-ghost text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="btn-industrial text-sm font-medium"
            style={{
              background: BRASS_GRADIENT,
              color: "#1a1d23",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 4px rgba(201,169,110,0.3)",
            }}
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-12 pt-6 divider-brass"
        >
          <div className="font-mono text-[10px] tracking-widest text-space-600">
            LENS INSCRIPTION · ACCESS CONTROL MODULE
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
