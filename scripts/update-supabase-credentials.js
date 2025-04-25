/**
 * Supabase Credentials Updater
 * This script helps update Supabase credentials in your .env.local file
 * 
 * Usage:
 * node scripts/update-supabase-credentials.js --url=your-new-url --key=your-new-key
 * 
 * Or run without args for an interactive prompt:
 * node scripts/update-supabase-credentials.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--url=')) {
    acc.url = arg.replace('--url=', '');
  } else if (arg.startsWith('--key=')) {
    acc.key = arg.replace('--key=', '');
  }
  return acc;
}, { url: null, key: null });

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env.local file
const envFilePath = path.join(process.cwd(), '.env.local');

// Function to read current .env.local file
function readEnvFile() {
  try {
    return fs.readFileSync(envFilePath, 'utf8');
  } catch (error) {
    console.error('Error reading .env.local file:', error.message);
    console.log('Creating a new .env.local file instead.');
    return '# Supabase Configuration\nNEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\n\n# In a production environment, set this to your actual domain\nNEXT_PUBLIC_SITE_URL=http://localhost:3000';
  }
}

// Function to update the .env.local file with new credentials
function updateEnvFile(envContent, url, key) {
  // Replace URL and key in the content using regex
  let updatedContent = envContent;
  
  if (url) {
    updatedContent = updatedContent.replace(
      /NEXT_PUBLIC_SUPABASE_URL=.*/,
      `NEXT_PUBLIC_SUPABASE_URL=${url}`
    );
  }
  
  if (key) {
    updatedContent = updatedContent.replace(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}`
    );
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(envFilePath, updatedContent);
  
  console.log('\n✅ .env.local file updated successfully!');
  console.log(`File location: ${envFilePath}`);
}

// Main function
async function updateCredentials() {
  console.log('🔑 Supabase Credentials Updater');
  console.log('This will update your Supabase credentials in .env.local\n');
  
  // Read current .env.local file
  const envContent = readEnvFile();
  
  // Extract current values using regex
  const currentUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1] || '';
  const currentKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1] || '';
  
  console.log('Current configuration:');
  console.log(`URL: ${currentUrl || 'Not set'}`);
  console.log(`Key: ${currentKey ? currentKey.substring(0, 10) + '...' : 'Not set'}\n`);
  
  // If URL and key are provided as command line args, use those
  // Otherwise prompt for them
  let newUrl = args.url;
  let newKey = args.key;
  
  if (!newUrl) {
    newUrl = await new Promise(resolve => {
      rl.question(`Enter new Supabase URL (leave empty to keep current): `, answer => {
        resolve(answer.trim() || currentUrl);
      });
    });
  }
  
  if (!newKey) {
    newKey = await new Promise(resolve => {
      rl.question(`Enter new Supabase anon key (leave empty to keep current): `, answer => {
        resolve(answer.trim() || currentKey);
      });
    });
  }
  
  // Confirm the changes
  console.log('\nNew configuration will be:');
  console.log(`URL: ${newUrl}`);
  console.log(`Key: ${newKey.substring(0, 10)}...\n`);
  
  const confirm = await new Promise(resolve => {
    rl.question('Apply these changes? (y/n): ', answer => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
  
  if (confirm) {
    updateEnvFile(envContent, newUrl, newKey);
    
    console.log('\n🔄 Remember to restart your Next.js server');
    console.log('To test the new credentials, run: node scripts/test-supabase.js');
  } else {
    console.log('\n❌ Update cancelled. No changes were made.');
  }
  
  rl.close();
}

// Run the script
updateCredentials(); 