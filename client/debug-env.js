// Simple script to test environment variable loading
console.log('=== Environment Variable Debug ===');
console.log('process.env.EXPO_PUBLIC_SERVER_URL:', process.env.EXPO_PUBLIC_SERVER_URL);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

// List all EXPO_PUBLIC_ variables
console.log('\n=== All EXPO_PUBLIC_ Variables ===');
Object.keys(process.env)
  .filter(key => key.startsWith('EXPO_PUBLIC_'))
  .forEach(key => {
    console.log(`${key}:`, process.env[key]);
  });

console.log('\n=== .env file content ===');
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(envContent);
} catch (error) {
  console.log('Error reading .env file:', error.message);
}
