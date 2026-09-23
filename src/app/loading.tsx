import DotWheelSpinner from "@/components/ui/DotWheelSpinner";

export default function Loading() {
  return (
    <div className="dot-wheel-overlay pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
      <DotWheelSpinner size={48} />
    </div>
  );
}
