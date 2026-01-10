import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=======================================');
console.log('VAPID Keys Generated');
console.log('=======================================');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('=======================================');
console.log('1. Save the Public Key in your Frontend .env.local as VITE_VAPID_PUBLIC_KEY');
console.log('2. Save user VAPID details in your Supabase Edge Function secrets:');
console.log('   supabase secrets set VAPID_PUBLIC_KEY=...');
console.log('   supabase secrets set VAPID_PRIVATE_KEY=...');
console.log('   supabase secrets set VAPID_SUBJECT=mailto:admin@example.com');
console.log('=======================================');
