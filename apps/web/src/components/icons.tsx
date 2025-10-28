export function EditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" opacity="0.9"/>
      <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
    </svg>
  );
}

export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
    </svg>
  );
}

export function AddIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
    </svg>
  );
}

export function ToggleIcon({ size = 16, on = false }: { size?: number; on?: boolean }) {
  return (
    <svg width={size} height={(size||16)*0.6} viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="2" width="40" height="20" rx="10" fill={on ? 'currentColor' : 'transparent'} stroke="currentColor" strokeWidth="2" opacity={on ? 0.9 : 0.6}/>
      <circle cx={on ? 32 : 12} cy="12" r="8" fill={on ? 'white' : 'currentColor'} opacity={on ? 1 : 0.8}/>
    </svg>
  );
}



