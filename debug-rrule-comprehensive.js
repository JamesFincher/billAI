#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { rrulestr } = require('rrule');
const { format, addDays, parseISO } = require('date-fns');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test RRULE generation function (copy from rrule-utils.ts)
function generateBillInstances(rruleString, dtstart, generateUntil, templateData) {
  try {
    console.log('🔄 RRULE Generation Input:');
    console.log('  - RRULE:', rruleString);
    console.log('  - Start Date:', dtstart);
    console.log('  - Generate Until:', generateUntil);
    console.log('  - Template Data:', templateData);

    // Parse the RRULE
    const rule = rrulestr(rruleString, { dtstart });
    console.log('✅ RRULE parsed successfully');
    
    // Get occurrences between now and generateUntil
    const now = new Date();
    console.log('  - Current time:', now);
    const occurrences = rule.between(now, generateUntil, true);
    console.log(`📅 Found ${occurrences.length} occurrences:`, occurrences);
    
    const instances = occurrences.map(date => ({
      due_date: format(date, 'yyyy-MM-dd'),
      amount: templateData.amount || 0,
      title: templateData.title,
      description: templateData.description,
    }));

    console.log('📋 Generated instances:', instances);
    return instances;
  } catch (error) {
    console.error('❌ Error generating bill instances:', error);
    return [];
  }
}

async function authenticateUser() {
  console.log('🔐 Authenticating user...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@billai.com',
    password: 'testpassword123'
  });

  if (error) {
    console.error('❌ Authentication failed:', error.message);
    return null;
  }

  console.log('✅ User authenticated:', data.user.email);
  return data.user;
}

async function testRRuleGeneration() {
  console.log('\n🧪 Testing RRULE Generation...\n');

  // Test 1: Basic weekly recurrence
  console.log('=== Test 1: Basic Weekly Recurrence ===');
  const weeklyRRule = 'FREQ=WEEKLY;INTERVAL=1';
  const dtstart = new Date('2025-01-20T10:00:00Z'); // Monday
  const generateUntil = addDays(new Date(), 90); // Next 3 months

  const weeklyInstances = generateBillInstances(
    weeklyRRule,
    dtstart,
    generateUntil,
    {
      title: 'Weekly Test Bill',
      amount: 100,
      description: 'Test weekly recurring bill'
    }
  );

  console.log(`Generated ${weeklyInstances.length} weekly instances\n`);

  // Test 2: Monthly recurrence
  console.log('=== Test 2: Monthly Recurrence ===');
  const monthlyRRule = 'FREQ=MONTHLY;INTERVAL=1';
  const monthlyInstances = generateBillInstances(
    monthlyRRule,
    dtstart,
    generateUntil,
    {
      title: 'Monthly Test Bill',
      amount: 1200,
      description: 'Test monthly recurring bill'
    }
  );

  console.log(`Generated ${monthlyInstances.length} monthly instances\n`);

  // Test 3: Different start dates
  console.log('=== Test 3: Different Start Dates ===');
  const pastStart = new Date('2024-12-01T10:00:00Z');
  const futureStart = new Date('2025-03-01T10:00:00Z');
  
  console.log('--- Past Start Date ---');
  const pastInstances = generateBillInstances(
    weeklyRRule,
    pastStart,
    generateUntil,
    { title: 'Past Start Bill', amount: 50 }
  );
  console.log(`Generated ${pastInstances.length} instances from past start\n`);

  console.log('--- Future Start Date ---');
  const futureInstances = generateBillInstances(
    weeklyRRule,
    futureStart,
    generateUntil,
    { title: 'Future Start Bill', amount: 75 }
  );
  console.log(`Generated ${futureInstances.length} instances from future start\n`);

  return { weeklyInstances, monthlyInstances, pastInstances, futureInstances };
}

async function testTemplateCreation(user) {
  console.log('\n🏗️ Testing Template Creation...\n');

  const templateData = {
    user_id: user.id,
    title: 'Debug Weekly Bill',
    description: 'Testing weekly recurrence in debug script',
    amount: 150.00,
    currency: 'USD',
    category_id: null,
    is_recurring: true,
    rrule: 'FREQ=WEEKLY;INTERVAL=1',
    dtstart: new Date().toISOString(),
    timezone: 'UTC',
    is_active: true,
    auto_generate_days_ahead: 90,
    notes: 'Debug test bill',
    priority: 3,
    ai_confidence_score: 0.0,
    ai_metadata: {}
  };

  console.log('📝 Creating template with data:', templateData);

  const { data: template, error: templateError } = await supabase
    .from('bill_templates')
    .insert(templateData)
    .select()
    .single();

  if (templateError) {
    console.error('❌ Failed to create template:', templateError);
    return null;
  }

  console.log('✅ Template created:', template);
  return template;
}

async function testInstanceGeneration(template) {
  console.log('\n⚙️ Testing Instance Generation...\n');

  if (!template.is_recurring || !template.rrule || !template.dtstart) {
    console.error('❌ Template is not configured for recurring bills');
    return [];
  }

  const generateUntil = addDays(new Date(), template.auto_generate_days_ahead);
  const dtstart = parseISO(template.dtstart);
  
  console.log('🔧 Generation parameters:');
  console.log('  - Template ID:', template.id);
  console.log('  - RRULE:', template.rrule);
  console.log('  - Start Date:', dtstart);
  console.log('  - Generate Until:', generateUntil);
  console.log('  - Days Ahead:', template.auto_generate_days_ahead);

  const instances = generateBillInstances(
    template.rrule,
    dtstart,
    generateUntil,
    {
      title: template.title,
      amount: template.amount,
      description: template.description,
    }
  );

  console.log(`📊 Generated ${instances.length} instances for template`);

  if (instances.length === 0) {
    console.log('⚠️ No instances generated. Checking reasons...');
    
    // Check if start date is in the future
    const now = new Date();
    if (dtstart > now) {
      console.log('📅 Start date is in the future:', dtstart);
    }
    
    // Check if generate until is too close
    const daysDiff = Math.ceil((generateUntil - now) / (1000 * 60 * 60 * 24));
    console.log(`🗓️ Days between now and generate until: ${daysDiff}`);
    
    return [];
  }

  // Check for existing instances
  console.log('🔍 Checking for existing instances...');
  const { data: existingInstances, error: existingError } = await supabase
    .from('bill_instances')
    .select('due_date')
    .eq('template_id', template.id);

  if (existingError) {
    console.error('❌ Error checking existing instances:', existingError);
    return [];
  }

  const existingDates = (existingInstances || []).map(d => d.due_date);
  console.log('📋 Existing instance dates:', existingDates);

  const newInstances = instances.filter(
    instance => !existingDates.includes(instance.due_date)
  );

  console.log(`🆕 New instances to create: ${newInstances.length}`);

  if (newInstances.length === 0) {
    console.log('ℹ️ All instances already exist');
    return [];
  }

  // Create the instances
  const billsToInsert = newInstances.map(instance => ({
    user_id: template.user_id,
    template_id: template.id,
    title: instance.title,
    description: instance.description,
    amount: instance.amount,
    currency: template.currency,
    due_date: instance.due_date,
    status: 'scheduled',
    is_recurring: true,
    category_id: template.category_id,
    priority: template.priority,
    ai_confidence_score: template.ai_confidence_score,
    ai_risk_score: 0.0,
    ai_metadata: {},
    created_date: new Date().toISOString(),
    is_historical: false,
  }));

  console.log('💾 Inserting instances:', billsToInsert);

  const { data: insertedInstances, error: insertError } = await supabase
    .from('bill_instances')
    .insert(billsToInsert)
    .select();

  if (insertError) {
    console.error('❌ Failed to insert instances:', insertError);
    return [];
  }

  console.log(`✅ Successfully created ${insertedInstances.length} instances`);
  return insertedInstances;
}

async function testDashboardFlow() {
  console.log('\n🎛️ Testing Dashboard Flow...\n');

  const user = await authenticateUser();
  if (!user) return;

  // Simulate the form data that would come from the dashboard
  const formData = {
    title: 'Dashboard Test Weekly Bill',
    description: 'Testing from dashboard flow',
    amount: 200,
    currency: 'USD',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: true,
    rrule: 'FREQ=WEEKLY;INTERVAL=1',
    dtstart: new Date().toISOString(),
    auto_generate_days_ahead: 90,
    priority: 3,
    category_id: null,
    notes: 'Dashboard flow test'
  };

  console.log('📋 Form data:', formData);

  // Create template
  const template = await testTemplateCreation(user);
  if (!template) return;

  // Generate instances
  const instances = await testInstanceGeneration(template);
  
  console.log('\n📊 Dashboard Flow Results:');
  console.log(`  - Template created: ${template ? 'YES' : 'NO'}`);
  console.log(`  - Instances generated: ${instances.length}`);

  return { template, instances };
}

async function main() {
  try {
    console.log('🚀 Starting Comprehensive RRULE Debug...\n');
    
    // Test 1: RRULE generation without database
    const generationResults = await testRRuleGeneration();
    
    // Test 2: Full dashboard flow with database
    const dashboardResults = await testDashboardFlow();

    console.log('\n📋 Summary:');
    console.log('='.repeat(50));
    console.log(`Weekly instances (no DB): ${generationResults.weeklyInstances.length}`);
    console.log(`Monthly instances (no DB): ${generationResults.monthlyInstances.length}`);
    console.log(`Past start instances: ${generationResults.pastInstances.length}`);
    console.log(`Future start instances: ${generationResults.futureInstances.length}`);
    
    if (dashboardResults) {
      console.log(`Dashboard template created: ${dashboardResults.template ? 'YES' : 'NO'}`);
      console.log(`Dashboard instances created: ${dashboardResults.instances.length}`);
    }

    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

main(); 