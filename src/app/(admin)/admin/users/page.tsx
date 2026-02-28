import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const supabase = createAdminClient();

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, plan_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Fetch auth users for emails and last sign-in
  const {
    data: { users: authUsers },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  // Merge profile data with auth data
  const users = (profiles ?? []).map((profile) => {
    const authUser = authUsers?.find((u) => u.id === profile.id);
    return {
      id: profile.id,
      email: authUser?.email ?? "unknown",
      full_name: profile.full_name,
      plan_id: profile.plan_id,
      created_at: profile.created_at,
      last_sign_in: authUser?.last_sign_in_at ?? null,
      banned: authUser?.banned_until
        ? new Date(authUser.banned_until) > new Date()
        : false,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          {users.length} total users
        </p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
