const DOT_COUNT = 8;

export default function DotWheelSpinner({ size = 40 }: { size?: number }) {
  const radius = size / 2 - 3;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (i / DOT_COUNT) * 360;
        return (
          <span
            key={i}
            className="dot-wheel-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-brand"
            style={{
              transform: `rotate(${angle}deg) translate(0, -${radius}px)`,
              marginLeft: "-3px",
              marginTop: "-3px",
              animationDelay: `${-(i / DOT_COUNT)}s`,
            }}
          />
        );
      })}
    </div>
  );
}
