'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import LogoutButton from '@/components/auth/LogoutButton';
import { V } from './V2Styles';

interface Props {
  name: string;
  role: string;
  plan: string;
}

function shortName(full: string): string {
  const raw = (full || '').trim();
  if (!raw) return '';
  const first = raw.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export default function V2Header({ name, role, plan }: Props) {
  const firstName = shortName(name);

  return (
    <div>
      <div style={V.heroTop}>
        <div style={V.heroBrand}>
          <Image
            src="/logos/logo_ok_2026.png"
            alt="Logo Nartalis"
            width={1254}
            height={1254}
            sizes="30px"
            style={{ width: 30, height: 30, flexShrink: 0, borderRadius: V.heroBrandMark.borderRadius }}
          />
          <span style={V.heroBrandText}>Nartalis</span>
        </div>
        <div style={V.heroControls}>
          {role === 'ADMIN' && (
            <Link href="/admin" style={V.adminPill} aria-label="Panel Admin">
              <Shield size={13} />
              Admin
            </Link>
          )}
          <LogoutButton style={V.logoutPill} />
        </div>
      </div>
      <h1 style={V.greeting}>
        {firstName ? `Hola, ${firstName}` : 'Tu espacio'}
      </h1>
      <p style={V.subtitle}>
        Tu espacio personal de salud
        <span style={V.planBadge}>{plan === 'PREMIUM' ? 'PREMIUM' : 'FREE'}</span>
      </p>
    </div>
  );
}
