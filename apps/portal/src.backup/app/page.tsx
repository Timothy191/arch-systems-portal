import { redirect } from "next/navigation";

/**
 * Root — redirect to the main portal dashboard.
 * Adjust the target route once auth/i18n routing is wired up.
 */
export default function RootPage() {
  redirect("/login");
}
