const { Client } = require('pg');

const regions = [
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1", 
  "us-east-1", "us-east-2", "us-west-1", "us-west-2"
];

async function check() {
  for (const region of regions) {
    const url = `postgresql://postgres.yizkaxynfwexfjgfksbg:sSmznwEyQy08CzC3@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log(`Region found: ${region}`);
      process.exit(0);
    } catch (e) {
      if (e.message.includes('self-signed')) {
        console.log(`Region found (self-signed): ${region}`);
        process.exit(0);
      } else if (!e.message.includes('Tenant or user not found')) {
        console.log(`Region ${region} failed: ${e.message}`);
      }
    } finally {
        await client.end().catch(()=> {});
    }
  }
  console.log("No region matched.");
}

check();