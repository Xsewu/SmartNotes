import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main(){
  const buffer = await readFile('test-avatar.png');
  const fileName = `avatars/${randomUUID()}.png`;
  console.log('Uploading to storage as', fileName);
  const { error: storageError } = await supabase.storage.from('uploads').upload(fileName, buffer, { contentType: 'image/png' });
  if (storageError) {
    console.error('Storage error', storageError);
    process.exit(2);
  }
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  console.log('Public URL:', data.publicUrl);

  const targetEmail = '999001@stud.prz.edu.pl';
  // get user id
  const { data: users } = await supabase.from('User').select('id').eq('email', targetEmail).limit(1).single();
  const userId = users?.id || null;
  if (!userId) {
    console.error('User not found for', targetEmail);
    process.exit(3);
  }

  const { error: updateErr } = await supabase.from('User').update({ image: data.publicUrl }).eq('id', userId);
  if (updateErr) {
    console.error('Update error', updateErr);
    process.exit(4);
  }

  console.log('Updated user', userId, 'with avatar');
}

main();
