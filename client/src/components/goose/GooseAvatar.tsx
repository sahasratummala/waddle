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

const STAGE_IMAGES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "/goose/egg.png",
  [GooseStage.HATCHLING]: "/goose/hatchling.png",
  [GooseStage.GOSLING]: "/goose/gosling.png",
  [GooseStage.GOOSE]: "/goose/goose.png",
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
      {/* Base goose image */}
      <img
        src={STAGE_IMAGES[stage]}
        alt={STAGE_LABELS[stage]}
        style={{ width: px, height: px, objectFit: "contain" }}
      />

      {/* Accessory overlays */}
      {accessories.map((ea) => (
        ea.accessory?.imageUrl && (
          <img
            key={ea.accessoryId}
            src={ea.accessory.imageUrl}
            alt={ea.accessory.name}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: px,
              height: px,
              objectFit: "contain",
            }}
          />
        )
      ))}
    </div>
  );
}