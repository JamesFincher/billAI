const { createClient } = require('@supabase/supabase-js');

// Test script to verify recurring bill functionality
async function testRecurringBill() {
  console.log('🧪 Testing recurring bill functionality...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  );

  try {
    // Check if bill_templates table exists and has data
    console.log('📋 Checking bill_templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('bill_templates')
      .select('*')
      .limit(5);
    
    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
    } else {
      console.log(`✅ Found ${templates.length} bill templates`);
      templates.forEach(template => {
        console.log(`  - ${template.title}: ${template.rrule ? 'Has RRULE' : 'No RRULE'}`);
      });
    }

    // Check if bill_instances table has data
    console.log('\n📋 Checking bill_instances table...');
    const { data: instances, error: instancesError } = await supabase
      .from('bill_instances')
      .select('*')
      .limit(10);
    
    if (instancesError) {
      console.error('❌ Error fetching instances:', instancesError);
    } else {
      console.log(`✅ Found ${instances.length} bill instances`);
      instances.forEach(instance => {
        console.log(`  - ${instance.title}: Due ${instance.due_date} (${instance.status})`);
      });
    }

    // Check for instances created from templates
    if (templates.length > 0 && instances.length > 0) {
      const templateInstances = instances.filter(instance => instance.template_id);
      console.log(`\n🔗 Found ${templateInstances.length} instances linked to templates`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testRecurringBill(); 