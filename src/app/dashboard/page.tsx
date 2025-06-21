import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import type { BillWithDetails } from '@/types/bill-database';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Get current month for initial load
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Fetch initial bills with all relations
  const { data: billsData, error: billsError } = await supabase
    .from('bill_instances')
    .select(`
      *,
      category:bill_categories(*),
      tags:bill_instance_tags(
        tag:bill_tags(*)
      ),
      attachments:bill_attachments(*),
      template:bill_templates(*)
    `)
    .gte('due_date', startDate.toISOString().split('T')[0])
    .lte('due_date', endDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (billsError) {
    console.error('Error fetching bills:', billsError);
  }

  // Transform data to match BillWithDetails interface
  const bills: BillWithDetails[] = (billsData || []).map(bill => ({
    ...bill,
    category: bill.category || null,
    tags: bill.tags?.map((tagRelation: any) => tagRelation.tag) || [],
    attachments: bill.attachments || [],
    template: bill.template || null
  }));

  // Calculate initial stats
  const totalBills = bills.length;
  const paidBills = bills.filter(bill => bill.status === 'paid').length;
  const pendingBills = bills.filter(bill => bill.status === 'pending').length;
  const overdueBills = bills.filter(bill =>
    bill.status === 'pending' && new Date(bill.due_date) < new Date()
  ).length;

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const paidAmount = bills.filter(bill => bill.status === 'paid')
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);

  const initialStats = {
    totalBills,
    paidBills,
    pendingBills,
    overdueBills,
    totalAmount,
    paidAmount
  };

  return (
    <DashboardClient
      initialStats={initialStats}
      initialBills={bills}
      initialMonth={currentMonth}
    />
  );
} 