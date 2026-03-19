function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "U";
}

export default function UserProfileChip({
  userName,
  userRole,
  variant = "topbar",
}: {
  userName: string;
  userRole: string;
  variant?: "topbar" | "sidebar";
}) {
  if (variant === "sidebar") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[#2a6ef5]/30 bg-[#2a6ef5]/20 text-xs font-bold text-[#2a6ef5]">
          {getInitial(userName)}
        </div>
        <div className="min-w-0">
          <p className="max-w-[130px] truncate text-xs font-bold text-slate-900 dark:text-white">
            {userName}
          </p>
          <p className="max-w-[130px] truncate text-[10px] text-slate-500 dark:text-slate-400">
            {userRole}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden max-w-[140px] text-right lg:block">
        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{userName}</p>
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{userRole}</p>
      </div>
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[#2a6ef5]/30 bg-[#2a6ef5]/20 text-xs font-bold text-[#2a6ef5]">
        {getInitial(userName)}
      </div>
    </div>
  );
}
