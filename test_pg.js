const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.yizkaxynfwexfjgfksbg:sSmznwEyQy08CzC3@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=no-verify'
});
pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error).finally(() => pool.end());