import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { UserCircle, Shield } from "lucide-react";

export default function OperatorModal() {
  const setOperator = useAppStore((s) => s.setOperator);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [mode, setMode] = useState<"op" | "pw">("op");
  const setBossPassword = useAppStore((s) => s.setBossPassword);

  const currentOperator = useAppStore((s) => s.currentOperator);
  const [show, setShow] = useState(!currentOperator);

  useEffect(() => {
    if (!currentOperator) setShow(true);
  }, [currentOperator]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm no-print">
      <div className="w-[420px] bg-white rounded-2xl shadow-2xl border-2 border-brand-500/20 p-6 animate-[tag-in_0.3s_ease-out]">
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-white text-3xl">
            🍊
          </div>
        </div>
        <h2 className="font-display text-2xl text-center text-brand-500 mb-1">
          欢迎使用鲜果价签通
        </h2>
        <p className="text-center text-sm text-ink-light mb-5">
          请先设置当班店员姓名，以便交班核对
        </p>

        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            className={[
              "flex-1 px-3 py-2 text-sm font-medium transition border-b-2 -mb-px",
              mode === "op"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-ink-light hover:text-ink",
            ].join(" ")}
            onClick={() => setMode("op")}
          >
            <UserCircle size={14} className="inline mr-1" /> 设置店员
          </button>
          <button
            className={[
              "flex-1 px-3 py-2 text-sm font-medium transition border-b-2 -mb-px",
              mode === "pw"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-ink-light hover:text-ink",
            ].join(" ")}
            onClick={() => setMode("pw")}
          >
            <Shield size={14} className="inline mr-1" /> 老板密码
          </button>
        </div>

        {mode === "op" ? (
          <>
            <label className="block text-xs text-ink-light mb-1">当班店员姓名</label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-brand-500/15 focus:border-brand-500 focus:outline-none text-ink text-base"
              placeholder="如：张小明 / 早班李"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  setOperator(name.trim());
                  setShow(false);
                }
              }}
            />
            <button
              className="w-full mt-4 btn-primary py-2.5 text-base"
              disabled={!name.trim()}
              onClick={() => {
                setOperator(name.trim());
                setShow(false);
              }}
            >
              开始今日改价 →
            </button>
          </>
        ) : (
          <>
            <label className="block text-xs text-ink-light mb-1">
              当前密码（默认 888888）
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-brand-500/15 focus:border-brand-500 focus:outline-none text-ink text-base font-mono tracking-widest"
              placeholder="6 位数字"
              value={pw}
              onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <label className="block text-xs text-ink-light mb-1 mt-3">
              新密码（6 位数字）
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-brand-500/15 focus:border-brand-500 focus:outline-none text-ink text-base font-mono tracking-widest"
              placeholder="6 位数字"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              className="w-full mt-4 btn-warn py-2.5 text-base"
              disabled={!/^\d{6}$/.test(pw) || !/^\d{6}$/.test(newPw)}
              onClick={() => {
                const ok = setBossPassword(pw, newPw);
                if (ok) {
                  alert("老板密码已修改成功");
                  setPw("");
                  setNewPw("");
                } else {
                  alert("修改失败，请检查当前密码是否正确");
                }
              }}
            >
              修改老板确认密码
            </button>
            {currentOperator && (
              <button
                className="w-full mt-2 text-sm text-ink-light hover:text-ink py-2"
                onClick={() => setShow(false)}
              >
                关闭
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
