import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUser(id, payload) {
  const { error } = await supabase.from('User').update(payload).eq('id', id);
  if (error) {
    throw error;
  }
}

async function main() {
  const leaderId = '737ccb24-18b5-44d7-87e4-5fb52b5031ac';
  const otherId = '96815403-f409-4eae-abb6-af841ba9264c';

  await updateUser(leaderId, { role: 'ADMIN', yearOfStudy: 1, studyGroup: null });
  await updateUser(otherId, { yearOfStudy: 1 });

  const { data: users, error } = await supabase
    .from('User')
    .select('id,email,role,studyGroup,yearOfStudy')
    .in('id', [leaderId, otherId])
    .order('email', { ascending: true });

  if (error) {
    throw error;
  }

  console.log(JSON.stringify(users, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
