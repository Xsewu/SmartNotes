"use client";

import { useTransition } from "react";
import { updateUserRoleAction } from "@/app/actions/admin";
import { getRoleLabel } from "@/app/actions/admin-utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string | null;
  role: string;
  studyGroup: string | null;
  yearOfStudy: number | null;
  calculatedRole: string;
}

export default function AdminUserRow({ 
  member, 
  isSuperAdmin 
}: { 
  member: User; 
  isSuperAdmin: boolean 
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await updateUserRoleAction(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(`Zaktualizowano uprawnienia dla ${member.email}`);
        }
      } catch (err) {
        toast.error("Wystąpił nieoczekiwany błąd serwera.");
      }
    });
  };

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
        {member.email}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider
          ${member.calculatedRole === 'ADMIN' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 
            member.calculatedRole === 'YEAR_LEADER' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
            member.calculatedRole === 'LAB_LEADER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
        `}>
          {getRoleLabel(member)}
        </span>
      </td>
      <td className="px-6 py-4">
        <form action={handleAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="targetUserId" value={member.id} />
          
          <select
            name="role"
            disabled={isPending}
            defaultValue={member.calculatedRole}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-400 disabled:opacity-50"
          >
            <option value="STUDENT">Student</option>
            {isSuperAdmin && <option value="ADMIN">Administrator</option>}
            <option value="YEAR_LEADER">Starosta roku</option>
            <option value="LAB_LEADER">Starosta grupy</option>
          </select>
          
          <input
            type="number"
            name="yearOfStudy"
            disabled={isPending}
            placeholder="Rok"
            defaultValue={member.yearOfStudy || ""}
            className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-400 disabled:opacity-50"
            title="Przypisz rocznik"
          />
          
          <input
            type="text"
            name="studyGroup"
            disabled={isPending}
            placeholder="Grupa"
            defaultValue={member.studyGroup || ""}
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-400 disabled:opacity-50"
            title="Przypisz grupę laboratoryjną"
          />

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center min-w-[80px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-blue-500/20 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Zapisz"
            )}
          </button>
        </form>
      </td>
    </tr>
  );
}