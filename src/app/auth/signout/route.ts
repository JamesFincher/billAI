import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()

  // Sign out the user
  await supabase.auth.signOut()

  return redirect('/')
} 