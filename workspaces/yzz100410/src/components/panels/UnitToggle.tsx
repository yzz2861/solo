import { useStore } from "@/store/useStore";

export default function UnitToggle() {
  const currentUnit = useStore((s) => s.currentUnit);
  const setUnit = useStore((s) => s.setUnit);

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
      <button
        onClick={() => setUnit("m")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
          currentUnit === "m"
            ? "bg-[#00D4AA] text-[#0A2540]"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        米(m)
      </button>
      <button
        onClick={() => setUnit("ft")}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
          currentUnit === "ft"
            ? "bg-[#00D4AA] text-[#0A2540]"
            : "text-white/50 hover:text-white/70"
        }`}
      >
        英尺(ft)
      </button>
    </div>
  );
}
