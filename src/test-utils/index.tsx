import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const mockSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
)

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data factories
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_metadata: {
    name: 'Test User',
  },
}

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}

export const mockBillTemplate = {
  id: 'test-template-id',
  user_id: 'test-user-id',
  title: 'Test Bill',
  amount: 100.00,
  description: 'Test description',
  is_recurring: true,
  rrule: 'FREQ=MONTHLY;INTERVAL=1',
  dtstart: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockBillInstance = {
  id: 'test-instance-id',
  template_id: 'test-template-id',
  user_id: 'test-user-id',
  title: 'Test Bill',
  amount: 100.00,
  due_date: new Date().toISOString(),
  status: 'pending' as const,
  is_historical: false,
  can_edit: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Test helpers
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const mockSupabaseClient = mockSupabase 