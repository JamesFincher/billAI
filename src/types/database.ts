export interface Customer {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string
  customer_id: string
  invoice_number: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  invoice_items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>
      }
      invoice_items: {
        Row: InvoiceItem
        Insert: Omit<InvoiceItem, 'id' | 'created_at'>
        Update: Partial<Omit<InvoiceItem, 'id' | 'created_at'>>
      }
    }
  }
} 