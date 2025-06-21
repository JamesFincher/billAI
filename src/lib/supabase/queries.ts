import { createClient } from './server'
import type { Database } from '@/types/database'

export async function getInvoiceStats(userId: string) {
  const supabase = await createClient()
  
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('status, total_amount')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching invoice stats:', error)
    return {
      total: 0,
      paid: 0,
      pending: 0,
      totalRevenue: 0
    }
  }

  const stats = invoices.reduce(
    (acc, invoice) => {
      acc.total += 1
      if (invoice.status === 'paid') {
        acc.paid += 1
        acc.totalRevenue += invoice.total_amount
      } else if (invoice.status === 'sent') {
        acc.pending += 1
      }
      return acc
    },
    { total: 0, paid: 0, pending: 0, totalRevenue: 0 }
  )

  return stats
}

export async function getRecentInvoices(userId: string, limit = 5) {
  const supabase = await createClient()
  
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, email)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent invoices:', error)
    return []
  }

  return invoices
}

export async function getCustomers(userId: string) {
  const supabase = await createClient()
  
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customers:', error)
    return []
  }

  return customers
} 