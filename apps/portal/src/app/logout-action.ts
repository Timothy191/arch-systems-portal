'use server'

import { createServerSupabaseClient } from '@repo/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
