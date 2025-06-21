import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';
import { 
  ChartBarIcon, 
  CreditCardIcon, 
  LightBulbIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-effect border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient-primary">BillAI</span>
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full text-sm font-medium text-blue-700 mb-8">
              <SparklesIcon className="h-4 w-4" />
              AI-Powered Financial Management
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              Smart Billing
              <span className="text-gradient-primary block">Made Simple</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Take control of your financial future with intelligent bill tracking, AI-powered insights, 
              and seamless automation. Never miss a payment again.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" className="btn btn-primary btn-lg group">
                Get Started Free
                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/auth" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to manage bills
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to simplify your financial life and help you stay on top of every payment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LightBulbIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI-Powered Insights
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get intelligent recommendations on spending patterns, bill optimization, 
                and budget planning with our advanced AI analytics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Visualize your spending with beautiful charts and reports. 
                Track trends, identify patterns, and make informed financial decisions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Automated Payments
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Set up automatic bill payments and never worry about late fees again. 
                Smart scheduling ensures you never miss a due date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to take control of your bills?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have simplified their financial management with BillAI.
          </p>
          <Link href="/dashboard" className="btn btn-lg bg-white text-blue-600 hover:bg-gray-50 border-white group">
            Start Your Free Trial
            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">BillAI</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 BillAI. All rights reserved. Built with ❤️ for better financial management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
