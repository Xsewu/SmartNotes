const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.yizkaxynfwexfjgfksbg:' + process.env.DATABASE_URL.split(':')[2].split('@')[0] + '@db.yizkaxynfwexfjgfksbg.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error).finally(() => pool.end());