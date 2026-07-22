'use server'

import { createServerSupabaseClient } from '@repo/supabase/server'
import { inngest } from '@repo/utils/inngest'
import { revalidatePath } from 'next/cache'

export async function triggerManualAudit() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Validate user role is admin, manager or safety officer
  const { data: employee } = await supabase
    .from('employees')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (
    !employee ||
    (employee.role !== 'admin' && employee.role !== 'manager' && employee.role !== 'safety')
  ) {
    throw new Error('Unauthorized')
  }

  // Trigger manual generation event via Inngest
  await inngest.send({
    name: 'report/automated-audit',
    data: {},
  })

  revalidatePath('/safety/audit-dashboard')
}
