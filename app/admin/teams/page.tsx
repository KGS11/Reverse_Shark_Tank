import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TeamsManager } from "@/components/admin/teams-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select(`
      id,
      profile_id,
      team_no,
      name,
      failed_company,
      pitch_summary,
      presentation_order,
      presentation_status,
      is_active,
      profile:profiles (
        must_change_password
      )
    `)
    .order("presentation_order", { ascending: true })
    .order("team_no", { ascending: true });

  return <TeamsManager initialTeams={(teams as any) || []} />;
}
