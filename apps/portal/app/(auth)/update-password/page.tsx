import { createServerSupabaseClient } from "@repo/supabase/server";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function UpdatePasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return <UpdatePasswordForm />;
}
