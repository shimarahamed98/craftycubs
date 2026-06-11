import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export function getUserProfile(email) {
  const known = {
    'shimar':  { name: 'Shimar',  initial: 'S', color: '#7C6FF7', bg: '#F0EFFE', role: 'Admin' },
    'thaman':  { name: 'Thamana', initial: 'T', color: '#6EC5B8', bg: '#EBF8F6', role: 'Co-founder' },
    'rumana':  { name: 'Rumana',  initial: 'R', color: '#F78C6B', bg: '#FEF0EB', role: 'Co-founder' },
  };
  if (!email) return { name: 'User', initial: '?', color: '#2E3A59', bg: '#EEF1F8', role: '' };
  const namePart = email.split('@')[0].toLowerCase();
  for (const key of Object.keys(known)) {
    if (namePart.includes(key)) return known[key];
  }
  const display = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  return { name: display, initial: display.charAt(0).toUpperCase(), color: '#2E3A59', bg: '#EEF1F8', role: '' };
}
