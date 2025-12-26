import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL || 'https://iuvtsvjpmovfymvnmqys.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_9Lijw5z0vmAL6vNJaxcWuA_Z3V4O_F5',
}));
