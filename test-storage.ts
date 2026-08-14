import { supabase } from './src/supabase';
async function test() {
  const { data } = await supabase.from('media').select('image_url').limit(1);
  console.log(data);
}
test();
