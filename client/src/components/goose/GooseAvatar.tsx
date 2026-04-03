import { GooseStage, EquippedAccessory } from "@waddle/shared";
import { clsx } from "clsx";

interface GooseAvatarProps {
  stage: GooseStage;
  accessories?: EquippedAccessory[];
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 40,
  sm: 64,
  md: 100,
  lg: 150,
  xl: 220,
};

// ── SVG Goose shapes by stage ──────────────────────────────────────────────────

function EggSVG({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.32;
  const ry = size * 0.4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Egg body */}
      <ellipse cx={cx} cy={cy + size * 0.04} rx={rx} ry={ry} fill="#F5E6C8" />
      <ellipse cx={cx} cy={cy + size * 0.04} rx={rx} ry={ry} fill="url(#eggShine)" opacity="0.4" />
      {/* Spots */}
      <ellipse cx={cx - rx * 0.3} cy={cy - ry * 0.1} rx={rx * 0.12} ry={ry * 0.09} fill="#E8C88A" opacity="0.6" />
      <ellipse cx={cx + rx * 0.25} cy={cy + ry * 0.2} rx={rx * 0.08} ry={ry * 0.07} fill="#E8C88A" opacity="0.6" />
      {/* Crack hint */}
      <path
        d={`M ${cx - rx * 0.05} ${cy - ry * 0.3} l ${rx * 0.15} ${ry * 0.15} l -${rx * 0.1} ${ry * 0.12}`}
        stroke="#D4A84B"
        strokeWidth={Math.max(1, size * 0.018)}
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <defs>
        <radialGradient id="eggShine" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function HatchlingSVG({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size * 0.28;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Fluffy body */}
      <circle cx={cx} cy={cy + size * 0.08} r={bodyR} fill="#F5C842" />
      {/* Head */}
      <circle cx={cx} cy={cy - size * 0.15} r={bodyR * 0.65} fill="#F5C842" />
      {/* Eyes */}
      <circle cx={cx - size * 0.07} cy={cy - size * 0.17} r={size * 0.04} fill="#1A1A2E" />
      <circle cx={cx + size * 0.07} cy={cy - size * 0.17} r={size * 0.04} fill="#1A1A2E" />
      <circle cx={cx - size * 0.055} cy={cy - size * 0.19} r={size * 0.015} fill="white" />
      <circle cx={cx + size * 0.085} cy={cy - size * 0.19} r={size * 0.015} fill="white" />
      {/* Beak */}
      <path
        d={`M ${cx} ${cy - size * 0.08} l ${size * 0.07} ${size * 0.025} l -${size * 0.07} ${size * 0.025} Z`}
        fill="#E07B00"
      />
      {/* Wing nubs */}
      <ellipse cx={cx - bodyR * 0.9} cy={cy + size * 0.05} rx={bodyR * 0.35} ry={bodyR * 0.22} fill="#E0AC14" />
      <ellipse cx={cx + bodyR * 0.9} cy={cy + size * 0.05} rx={bodyR * 0.35} ry={bodyR * 0.22} fill="#E0AC14" />
      {/* Feet */}
      <ellipse cx={cx - size * 0.1} cy={cy + size * 0.36} rx={size * 0.1} ry={size * 0.04} fill="#E07B00" />
      <ellipse cx={cx + size * 0.1} cy={cy + size * 0.36} rx={size * 0.1} ry={size * 0.04} fill="#E07B00" />
    </svg>
  );
}

function GoslingSVG({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const bodyW = size * 0.36;
  const bodyH = size * 0.32;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Body */}
      <ellipse cx={cx} cy={cy + size * 0.1} rx={bodyW} ry={bodyH} fill="#F5C842" />
      {/* Neck */}
      <rect x={cx - size * 0.07} y={cy - size * 0.15} width={size * 0.14} height={size * 0.2} rx={size * 0.07} fill="#F5C842" />
      {/* Head */}
      <circle cx={cx} cy={cy - size * 0.2} r={size * 0.17} fill="#F5C842" />
      {/* Cheek patch */}
      <ellipse cx={cx - size * 0.06} cy={cy - size * 0.17} rx={size * 0.06} ry={size * 0.05} fill="#E8E8B0" opacity="0.5" />
      {/* Eyes */}
      <circle cx={cx - size * 0.07} cy={cy - size * 0.22} r={size * 0.035} fill="#1A1A2E" />
      <circle cx={cx + size * 0.07} cy={cy - size * 0.22} r={size * 0.035} fill="#1A1A2E" />
      <circle cx={cx - size * 0.055} cy={cy - size * 0.24} r={size * 0.013} fill="white" />
      <circle cx={cx + size * 0.085} cy={cy - size * 0.24} r={size * 0.013} fill="white" />
      {/* Beak */}
      <path
        d={`M ${cx - size * 0.04} ${cy - size * 0.12} h ${size * 0.08} l ${size * 0.04} ${size * 0.04} l -${size * 0.16} 0 Z`}
        fill="#E07B00"
      />
      {/* Wings */}
      <ellipse cx={cx - bodyW * 0.85} cy={cy + size * 0.08} rx={bodyW * 0.45} ry={bodyH * 0.35} fill="#E0AC14" />
      <ellipse cx={cx + bodyW * 0.85} cy={cy + size * 0.08} rx={bodyW * 0.45} ry={bodyH * 0.35} fill="#E0AC14" />
      {/* Feet */}
      <rect x={cx - size * 0.18} y={cy + size * 0.4} width={size * 0.15} height={size * 0.05} rx={size * 0.025} fill="#E07B00" />
      <rect x={cx + size * 0.03} y={cy + size * 0.4} width={size * 0.15} height={size * 0.05} rx={size * 0.025} fill="#E07B00" />
      {/* Tail feather hint */}
      <path
        d={`M ${cx + bodyW * 0.9} ${cy + size * 0.1} q ${size * 0.12} -${size * 0.12} ${size * 0.08} -${size * 0.22}`}
        stroke="#E0AC14"
        strokeWidth={Math.max(2, size * 0.025)}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function GooseSVG({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const bodyW = size * 0.38;
  const bodyH = size * 0.3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Shadow */}
      <ellipse cx={cx} cy={cy + size * 0.46} rx={bodyW * 0.8} ry={size * 0.04} fill="black" opacity="0.15" />
      {/* Body */}
      <ellipse cx={cx} cy={cy + size * 0.12} rx={bodyW} ry={bodyH} fill="white" />
      <ellipse cx={cx} cy={cy + size * 0.12} rx={bodyW} ry={bodyH} fill="#F5C842" opacity="0.15" />
      {/* Neck curve */}
      <path
        d={`M ${cx - size * 0.06} ${cy - size * 0.05} Q ${cx - size * 0.18} ${cy - size * 0.28} ${cx} ${cy - size * 0.32}`}
        stroke="white"
        strokeWidth={size * 0.12}
        strokeLinecap="round"
        fill="none"
      />
      {/* Head */}
      <circle cx={cx} cy={cy - size * 0.32} r={size * 0.16} fill="white" />
      {/* Black head marking */}
      <ellipse cx={cx} cy={cy - size * 0.35} rx={size * 0.1} ry={size * 0.08} fill="#1A1A2E" />
      {/* Eyes */}
      <circle cx={cx - size * 0.06} cy={cy - size * 0.34} r={size * 0.028} fill="#1A1A2E" />
      <circle cx={cx + size * 0.06} cy={cy - size * 0.34} r={size * 0.028} fill="#1A1A2E" />
      <circle cx={cx - size * 0.047} cy={cy - size * 0.355} r={size * 0.011} fill="white" />
      <circle cx={cx + size * 0.073} cy={cy - size * 0.355} r={size * 0.011} fill="white" />
      {/* Beak — long and flat */}
      <path
        d={`M ${cx - size * 0.05} ${cy - size * 0.23} h ${size * 0.1} l ${size * 0.12} ${size * 0.03} l -${size * 0.12} ${size * 0.03} h -${size * 0.1} Z`}
        fill="#E07B00"
      />
      <line
        x1={cx - size * 0.05}
        y1={cy - size * 0.2}
        x2={cx + size * 0.17}
        y2={cy - size * 0.2}
        stroke="#B05500"
        strokeWidth={Math.max(1, size * 0.012)}
      />
      {/* Wings */}
      <ellipse
        cx={cx - bodyW * 0.82}
        cy={cy + size * 0.1}
        rx={bodyW * 0.42}
        ry={bodyH * 0.5}
        fill="#E8E8E8"
        transform={`rotate(-15, ${cx - bodyW * 0.82}, ${cy + size * 0.1})`}
      />
      <ellipse
        cx={cx + bodyW * 0.82}
        cy={cy + size * 0.1}
        rx={bodyW * 0.42}
        ry={bodyH * 0.5}
        fill="#E8E8E8"
        transform={`rotate(15, ${cx + bodyW * 0.82}, ${cy + size * 0.1})`}
      />
      {/* Tail feathers */}
      <path
        d={`M ${cx + bodyW * 0.85} ${cy + size * 0.08}
            q ${size * 0.1} -${size * 0.15} ${size * 0.06} -${size * 0.28}
            M ${cx + bodyW * 0.8} ${cy}
            q ${size * 0.14} -${size * 0.1} ${size * 0.12} -${size * 0.24}`}
        stroke="#E8E8E8"
        strokeWidth={Math.max(2, size * 0.022)}
        strokeLinecap="round"
        fill="none"
      />
      {/* Feet & legs */}
      <line x1={cx - size * 0.12} y1={cy + size * 0.4} x2={cx - size * 0.12} y2={cy + size * 0.46} stroke="#E07B00" strokeWidth={Math.max(2, size * 0.025)} strokeLinecap="round" />
      <line x1={cx + size * 0.12} y1={cy + size * 0.4} x2={cx + size * 0.12} y2={cy + size * 0.46} stroke="#E07B00" strokeWidth={Math.max(2, size * 0.025)} strokeLinecap="round" />
      <path d={`M ${cx - size * 0.2} ${cy + size * 0.46} h ${size * 0.16}`} stroke="#E07B00" strokeWidth={Math.max(2, size * 0.022)} strokeLinecap="round" />
      <path d={`M ${cx + size * 0.04} ${cy + size * 0.46} h ${size * 0.16}`} stroke="#E07B00" strokeWidth={Math.max(2, size * 0.022)} strokeLinecap="round" />
    </svg>
  );
}

const STAGE_COMPONENTS: Record<GooseStage, React.FC<{ size: number }>> = {
  [GooseStage.EGG]: EggSVG,
  [GooseStage.HATCHLING]: HatchlingSVG,
  [GooseStage.GOSLING]: GoslingSVG,
  [GooseStage.GOOSE]: GooseSVG,
};

const STAGE_LABELS: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Egg",
  [GooseStage.HATCHLING]: "Hatchling",
  [GooseStage.GOSLING]: "Gosling",
  [GooseStage.GOOSE]: "Goose",
};

export default function GooseAvatar({
  stage,
  accessories = [],
  size = "md",
  animated = false,
  className,
}: GooseAvatarProps) {
  const px = sizeMap[size];
  const GooseComponent = STAGE_COMPONENTS[stage];

  return (
    <div
      className={clsx(
        "relative inline-flex items-center justify-center",
        animated && "animate-float",
        className
      )}
      style={{ width: px, height: px }}
      title={STAGE_LABELS[stage]}
    >
      <GooseComponent size={px} />

      {/* Accessory overlays — positioned absolutely over the goose */}
      {accessories.map((ea) => (
        <div
          key={ea.accessoryId}
          className="absolute inset-0 flex items-start justify-center"
          style={{ paddingTop: px * 0.04 }}
        >
          {ea.accessory.imageUrl ? (
            <img
              src={ea.accessory.imageUrl}
              alt={ea.accessory.name}
              style={{ width: px * 0.45, height: "auto" }}
              className="object-contain"
            />
          ) : (
            /* Placeholder hat shape if no image */
            <div
              style={{
                width: px * 0.4,
                height: px * 0.18,
                backgroundColor: "#4A90D9",
                borderRadius: `${px * 0.05}px ${px * 0.05}px 0 0`,
                opacity: 0.85,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
