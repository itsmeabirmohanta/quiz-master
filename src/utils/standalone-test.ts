/**
 * Standalone Supabase connection tester
 * This can be run directly with Node.js without relying on the Next.js framework
 * 
 * Usage: 
 * 1. Save your Supabase URL and key as environment variables:
 *    SUPABASE_URL=your_url SUPABASE_KEY=your_key node standalone-test.js
 * 2. Or modify this file to hardcode them below
 */

// Fill these in manually if not using environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://epzairhbslwwpdihufov.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwemFpcmhic2x3d3BkaWh1Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMjAwMzcsImV4cCI6MjA1NTg5NjAzN30.II-57No3pXomef544VNp9YgUa9HnpOPJ2hhTPqdizu0';

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_KEY.substring(0, 10)}...${SUPABASE_KEY.substring(SUPABASE_KEY.length - 5)}`);
  
  try {
    // 1. Try a basic connection to the Supabase REST API
    console.log('\n📡 Attempting to connect to Supabase REST API...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('❌ Authentication failed (401 Unauthorized)');
      console.log('   Your API key may be invalid or expired.');
      
      // Try without auth to check if the project exists
      const projectResponse = await fetch(`${SUPABASE_URL}`);
      
      if (projectResponse.status === 404) {
        console.log('❌ Project not found (404)');
        console.log('   The Supabase project may have been deleted or renamed.');
      } else {
        console.log(`✅ Project exists (${projectResponse.status})`);
        console.log('   The problem is likely with your API key, not the project URL.');
      }
    } else if (response.status === 404) {
      console.log('❌ Project not found (404)');
      console.log('   The Supabase project may have been deleted or renamed.');
    } else if (response.ok) {
      console.log('✅ Successfully connected to Supabase!');
      
      // Try to get some data
      const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/quiz_results?limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (tablesResponse.ok) {
        const data = await tablesResponse.json();
        console.log('✅ Successfully queried quiz_results table!');
        console.log(`   ${data.length} records returned`);
      } else {
        console.log(`❌ Error querying quiz_results: ${tablesResponse.status} ${tablesResponse.statusText}`);
      }
    } else {
      console.log(`❌ Connection failed with status ${response.status}`);
    }
    
    // Get response headers for debugging
    console.log('\n📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Try to get response body
    try {
      const text = await response.text();
      console.log('\n📄 Response Body:');
      console.log(text);
    } catch (e) {
      console.log('\n❌ Error reading response body:', e);
    }
    
  } catch (error) {
    console.log('❌ Error testing connection:');
    console.error(error);
  }
  
  console.log('\n🔍 Recommendations:');
  console.log('1. Check if your Supabase project still exists at: https://app.supabase.com');
  console.log('2. Verify your API key is correct and hasn\'t expired');
  console.log('3. Try generating a new API key in the Supabase dashboard');
  console.log('4. Check for network issues or firewall restrictions');
}

// Run the test function
testSupabaseConnection();

// To make this TypeScript compatible with browser/Node environments
export {}; 