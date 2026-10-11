import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { JudgesManager } from "@/components/admin/judges-manager";

export const dynamic = "force-dynamic";

export default async function AdminJudgesPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: judges } = await supabase
    .from("judges")
    .select(`
      id,
      profile_id,
      display_name,
      profile:profiles(is_active),
      exclusions:judge_team_exclusions(
        id,
        team_id,
        reason,
        team:teams(name, team_no)
      )
    `)
    .order("created_at", { ascending: true });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, team_no")
    .eq("is_active", true)
    .order("team_no", { ascending: true });

  return (
    <JudgesManager
      initialJudges={(judges as any) || []}
      allTeams={teams || []}
    />
  );
}
