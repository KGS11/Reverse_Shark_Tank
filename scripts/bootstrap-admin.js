/**
 * DIGITAL REVERSE SHARK TANK - ONE-TIME ADMIN BOOTSTRAP SCRIPT
 * IEEE Computer Society – VVCE Student Branch
 *
 * Usage: node scripts/bootstrap-admin.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load local .env.local if present
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
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local or environment.");
  process.exit(1);
}

const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@vvce.ieee.org";
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "AdminVVCE@2026!";
const adminName = process.env.ADMIN_BOOTSTRAP_NAME || "IEEE VVCE Event Administrator";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrap() {
  console.log("==================================================================");
  console.log("🚀 BOOTSTRAPPING DIGITAL REVERSE SHARK TANK ADMIN ACCOUNT");
  console.log(`Organization: IEEE Computer Society – VVCE Student Branch`);
  console.log(`Admin Email:  ${adminEmail}`);
  console.log("==================================================================");

  try {
    // 1. Check if user already exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let adminUser = users.users.find((u) => u.email.toLowerCase() === adminEmail.toLowerCase());

    if (!adminUser) {
      console.log("Creating new Supabase auth user for administrator...");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { display_name: adminName },
      });
      if (createError) throw createError;
      adminUser = newUser.user;
      console.log(`✅ Auth user created with ID: ${adminUser.id}`);
    } else {
      console.log(`ℹ️ Admin auth user already exists (ID: ${adminUser.id}). Updating credentials...`);
      await supabase.auth.admin.updateUserById(adminUser.id, {
        password: adminPassword,
        email_confirm: true,
      });
    }

    // 2. Upsert profile with role 'admin'
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: adminUser.id,
      role: "admin",
      display_name: adminName,
      is_active: true,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;
    console.log("✅ Admin profile verified in public.profiles table.");

    // 3. Ensure Default Event exists
    const { data: events, error: eventError } = await supabase.from("events").select("id").limit(1);
    if (eventError) throw eventError;

    if (!events || events.length === 0) {
      console.log("Creating default event configuration...");
      await supabase.from("events").insert({
        name: "Digital Reverse Shark Tank 2026",
        stage: "SETUP",
        initial_balance: 1000,
        weight_judge: 60.00,
        weight_invest: 40.00,
        reveal_received_totals: false,
      });
      console.log("✅ Default event created (Stage: SETUP, 60/40 Split, 1000 Pts).");
    }

    // 4. Ensure Default Criteria exist
    const { data: criteria, error: critError } = await supabase.from("criteria").select("id").limit(1);
    if (critError) throw critError;

    if (!criteria || criteria.length === 0) {
      console.log("Seeding default 5 competition evaluation criteria...");
      await supabase.from("criteria").insert([
        { name: "Problem Analysis", description: "Depth of root-cause failure diagnosis.", max_score: 10.0, weight: 20.0, sort_order: 1, is_active: true },
        { name: "Recovery Strategy Quality", description: "Innovativeness and validity of the turnaround plan.", max_score: 10.0, weight: 20.0, sort_order: 2, is_active: true },
        { name: "Feasibility & Execution", description: "Operational roadmap and risk mitigation realism.", max_score: 10.0, weight: 20.0, sort_order: 3, is_active: true },
        { name: "Financial & Market Reasoning", description: "Capital efficiency and economic logic.", max_score: 10.0, weight: 20.0, sort_order: 4, is_active: true },
        { name: "Presentation & Q&A Defensibility", description: "Clarity, composure, and defense under scrutiny.", max_score: 10.0, weight: 20.0, sort_order: 5, is_active: true },
      ]);
      console.log("✅ Seeded default criteria (5 x 20% weights, max 10 pts).");
    }

    console.log("\n🎉 Bootstrap successful! You can now log in at /login with:");
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
  } catch (err) {
    console.error("❌ Bootstrap failed with error:", err);
    process.exit(1);
  }
}

bootstrap();
