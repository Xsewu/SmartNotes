const regions = [
  'eu-central-1', // Frankfurt
  'eu-central-2', // Warszawa
  'eu-west-1',    // Irlandia
  'eu-west-2',    // Londyn
  'eu-west-3',    // Paryż
  'eu-north-1',   // Sztokholm
  'us-east-1'     // N. Virginia
];

const projectRef = 'yizkaxynfwexfjgfksbg';
const password = 'sSmznwEyQy08CzC3';

async function testRegions() {
  const { Client } = await import('pg');

  console.log('Rozpoczynam automatyczne poszukiwanie Twojej bazy danych Supabase...');
  
  for (const region of regions) {
    for (const awsNum of [0, 1]) {
      const host = `aws-${awsNum}-${region}.pooler.supabase.com`;
      const client = new Client({
        user: `postgres.${projectRef}`,
        password: password,
        host: host,
        port: 6543,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
      });

      try {
        await client.connect();
        console.log(`\n\n✅ SUKCES! Twoja baza znajduje się na serwerze: ${host}`);
        console.log(`\n======================================================`);
        console.log(`Otwórz na dysku swoje PRAWDZIWE pliki .env ORAZ .env.local i podmień linki na te poniżej:`);
        console.log(`DATABASE_URL="postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"`);
        console.log(`DIRECT_URL="postgresql://postgres.${projectRef}:${password}@${host}:5432/postgres?sslmode=require"`);
        console.log(`======================================================\n`);
        await client.end();
        return;
      } catch (err) {
        if (err.message.includes('Tenant or user not found')) {
           process.stdout.write('.'); // Serwer odpowiedział, ale to zły region
        } else if (err.message.includes('password authentication failed')) {
           console.log(`\n🔑 Znaleziono Twój projekt na serwerze ${host}, ale wpisane HASŁO jest NIEPOPRAWNE!`);
           return;
        }
      }
    }
  }
  console.log('\n\n❌ Nie znaleziono bazy w żadnym standardowym regionie. Upewnij się, że projekt w panelu Supabase nie jest zawieszony/uśpiony (Paused).');
}

testRegions();