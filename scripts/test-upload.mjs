import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main(){
  try{
    const buf = await readFile('test-upload.txt');
    const fileName = `test-upload-script-${Date.now()}.txt`;
    console.log('Uploading', fileName);
    const { error: storageError } = await supabase.storage.from('uploads').upload(fileName, buf, { contentType: 'text/plain', upsert: false });
    if(storageError){
      console.error('Storage Error:', storageError);
      process.exit(2);
    }
    const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
    console.log('Public URL:', data.publicUrl);

    // Ensure author user exists
    const userId = 'script-test';
    const { data: upsertedUser, error: upsertUserErr } = await supabase.from('User').upsert({
      id: userId,
      email: 'script@test',
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'id' }).select('id').single();
    if (upsertUserErr) {
      console.error('User upsert error:', upsertUserErr);
      process.exit(4);
    }

    const { randomUUID } = await import('crypto');
    const { data: newFile, error: fileError } = await supabase.from('File').insert({
      id: randomUUID(),
      title: 'Test Upload Script',
      url: data.publicUrl,
      format: 'txt',
      visibility: 'PRIVATE',
      authorId: userId,
    }).select('*').single();

    if(fileError){
      console.error('File insert error:', fileError);
      process.exit(3);
    }

    console.log('Inserted file row:', newFile.id);
  }catch(e){
    console.error(e);
    process.exit(10);
  }
}

main();
