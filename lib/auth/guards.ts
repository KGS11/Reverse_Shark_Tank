import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface UserProfile {
  id: string;
  role: "admin" | "judge" | "team";
  display_name: string;
  is_active: boolean;
  must_change_password: boolean;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireProfile(): Promise<UserProfile> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, is_active, must_change_password")
    .eq("id", user.id)
    .single();

  if (error || !profile || !profile.is_active) {
    redirect("/login?error=Unauthorized");
  }

  return profile as UserProfile;
}

export async function requireRole(allowedRoles: ("admin" | "judge" | "team")[]): Promise<UserProfile> {
  const profile = await requireProfile();
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${profile.role}`);
  }
  return profile;
}

export async function getCurrentTeam() {
  const profile = await requireRole(["team"]);
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  if (error || !team) {
    throw new Error("No active team registration associated with this account.");
  }

  return team;
}

export async function getCurrentJudge() {
  const profile = await requireRole(["judge"]);
  const supabase = await createClient();

  const { data: judge, error } = await supabase
    .from("judges")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  if (error || !judge) {
    throw new Error("No active judge registration associated with this account.");
  }

  return judge;
}
