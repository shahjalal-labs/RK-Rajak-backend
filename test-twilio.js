// Simple Twilio test script
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('=== TWILIO CREDENTIALS CHECK ===');
console.log('Account SID:', accountSid);
console.log('Account SID Length:', accountSid?.length);
console.log('Auth Token:', authToken);
console.log('Auth Token Length:', authToken?.length);
console.log('Phone Number:', phoneNumber);
console.log('================================');

// Try to initialize Twilio
const twilio = require('twilio');

try {
  const client = twilio(accountSid, authToken);
  
  console.log('\n✅ Twilio client initialized');
  console.log('Testing connection...\n');
  
  // Try to fetch account info
  client.api.accounts(accountSid)
    .fetch()
    .then(account => {
      console.log('✅ SUCCESS! Account verified:');
      console.log('  Friendly Name:', account.friendlyName);
      console.log('  Status:', account.status);
      console.log('  Type:', account.type);
    })
    .catch(error => {
      console.log('❌ FAILED! Error:', error.message);
      console.log('Error Code:', error.code);
      console.log('Status:', error.status);
      
      if (error.code === 20003) {
        console.log('\n💡 Error 20003 Solutions:');
        console.log('1. Log into https://console.twilio.com/');
        console.log('2. Go to Account Info section');
        console.log('3. Copy the correct Account SID and Auth Token');
        console.log('4. Make sure Auth Token is NOT the Test Auth Token');
        console.log('5. Update your .env file with correct values');
      }
    });
} catch (error) {
  console.log('❌ Failed to initialize Twilio client:', error.message);
}
