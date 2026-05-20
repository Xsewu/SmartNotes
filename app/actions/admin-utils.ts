type AdminUser = {
  role?: string;
  studyGroup?: string | null;
  yearOfStudy?: number | null;
};

export function getEffectiveRole(user: AdminUser) {
  if (!user) return undefined;
  if (user.role !== "ADMIN") return user.role;
  if (user.studyGroup) return "LAB_LEADER";
  if (user.yearOfStudy != null) return "YEAR_LEADER";
  return "ADMIN";
}

export function getRoleLabel(user: AdminUser) {
  const role = getEffectiveRole(user);
  if (role === "YEAR_LEADER") return "Starosta roku";
  if (role === "LAB_LEADER") return "Starosta grupy";
  if (role === "ADMIN") return "Administrator";
  return "Student";
}
