/**
 * DIGITAL REVERSE SHARK TANK - DEMO SEED SCRIPT
 * IEEE Computer Society – VVCE Student Branch
 *
 * For Development & Staging Testing ONLY.
 * Usage: node scripts/seed-demo-event.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_TEAMS = [
  {
    team_no: 1,
    name: "Phoenix Diagnostics",
    failed_company: "Theranos",
    pitch_summary: "Pivoted from fraudulent proprietary hardware to an open cloud-validation software layer for certified hospital analyzers.",
    email: "team1@vvce.ieee.org",
    password: "TeamPhoenix@2026",
  },
  {
    team_no: 2,
    name: "AssetLight Workspace",
    failed_company: "WeWork",
    pitch_summary: "Replaced master lease debt liabilities with revenue-share landlord partnerships and high-margin enterprise flex software.",
    email: "team2@vvce.ieee.org",
    password: "TeamWeWork@2026",
  },
  {
    team_no: 3,
    name: "EthicalEd",
    failed_company: "Byju's",
    pitch_summary: "Eliminated hyper-aggressive predatory loan sales in favor of transparent micro-subscriptions and institutional college tie-ups.",
    email: "team3@vvce.ieee.org",
    password: "TeamByjus@2026",
  },
  {
    team_no: 4,
    name: "CryptaShield",
    failed_company: "FTX",
    pitch_summary: "Architected a zero-custody decentralized trading exchange with cryptographically verifiable proofs of reserve and separated assets.",
    email: "team4@vvce.ieee.org",
    password: "TeamFTX@2026",
  },
  {
    team_no: 5,
    name: "MicroBite Media",
    failed_company: "Quibi",
    pitch_summary: "Scrapped proprietary standalone app costs and syndicates premium Hollywood short-form episodes directly to TikTok and Reels.",
    email: "team5@vvce.ieee.org",
    password: "TeamQuibi@2026",
  },
];

const DEMO_JUDGES = [
  {
    display_name: "Dr. Sandeep Rao",
    email: "judge1@vvce.ieee.org",
    password: "JudgeRao@2026",
  },
  {
    display_name: "Prof. Ananya Hegde",
    email: "judge2@vvce.ieee.org",
    password: "JudgeHegde@2026",
  },
  {
    display_name: "Mr. Vikramaditya V.",
    email: "judge3@vvce.ieee.org",
    password: "JudgeVikram@2026",
  },
];

async function seed() {
  console.log("🌱 Seeding Demo Teams and Judges for Digital Reverse Shark Tank...");

  // 1. Seed Teams
  for (const t of DEMO_TEAMS) {
    try {
      // Check auth user
      let userId;
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existing = userList?.users?.find((u) => u.email.toLowerCase() === t.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, { password: t.password });
      } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: t.email,
          password: t.password,
          email_confirm: true,
          user_metadata: { display_name: t.name },
        });
        if (error) throw error;
        userId = newUser.user.id;
      }

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        role: "team",
        display_name: t.name,
        is_active: true,
        must_change_password: false,
      });

      // Upsert team
      await supabase.from("teams").upsert(
        {
          profile_id: userId,
          team_no: t.team_no,
          name: t.name,
          failed_company: t.failed_company,
          pitch_summary: t.pitch_summary,
          presentation_order: t.team_no,
          presentation_status: "Pending",
          is_active: true,
        },
        { onConflict: "team_no" }
      );

      console.log(`✅ Seeded Team #${t.team_no}: ${t.name} (${t.email})`);
    } catch (err) {
      console.error(`Failed to seed team ${t.name}:`, err.message);
    }
  }

  // 2. Seed Judges
  for (const j of DEMO_JUDGES) {
    try {
      let userId;
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existing = userList?.users?.find((u) => u.email.toLowerCase() === j.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, { password: j.password });
      } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: j.email,
          password: j.password,
          email_confirm: true,
          user_metadata: { display_name: j.display_name },
        });
        if (error) throw error;
        userId = newUser.user.id;
      }

      await supabase.from("profiles").upsert({
        id: userId,
        role: "judge",
        display_name: j.display_name,
        is_active: true,
        must_change_password: false,
      });

      await supabase.from("judges").upsert(
        {
          profile_id: userId,
          display_name: j.display_name,
        },
        { onConflict: "profile_id" }
      );

      console.log(`✅ Seeded Judge: ${j.display_name} (${j.email})`);
    } catch (err) {
      console.error(`Failed to seed judge ${j.display_name}:`, err.message);
    }
  }

  console.log("\n🎉 Demo seed complete! Teams and judges are ready.");
}

seed();
