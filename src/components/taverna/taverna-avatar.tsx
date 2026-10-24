import { cn } from "@/utils/cn";

const AVATAR_COLORS = [
  "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-teal-500/20 text-teal-700 dark:text-teal-300",
  "bg-orange-500/20 text-orange-700 dark:text-orange-300",
];

function colorFor(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

type TavernaAvatarProps = {
  userId: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  speaking?: boolean;
  online?: boolean;
  className?: string;
};

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-20 text-2xl",
};

export function TavernaAvatar({ userId, name, size = "md", speaking, online, className }: TavernaAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold ring-2 ring-transparent transition-shadow",
          SIZES[size],
          colorFor(userId),
          speaking && "ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
        )}
      >
        {initialsOf(name)}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "border-background absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2",
            online ? "bg-emerald-500" : "bg-muted-foreground/50",
          )}
        />
      )}
    </div>
  );
}
