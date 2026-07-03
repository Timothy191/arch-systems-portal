import { createServerSupabaseClient } from "@repo/supabase/server";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

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
