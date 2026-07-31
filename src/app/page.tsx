import type { Metadata } from 'next';
import FarmaWrapper from '@/components/farma/FarmaWrapper';
import { getNartalisSession, toPublicUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Nartalis — Te ayuda a cuidar tu salud y la de los tuyos',
  description: 'Nartalis te ayuda a cuidar tu salud y la de los tuyos.',
};

export const dynamic = 'force-dynamic';

export default async function FarmaPage() {
  const user = await getNartalisSession();
  return <FarmaWrapper initialSessionUser={user ? toPublicUser(user) : null} />;
}
