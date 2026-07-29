import type { Metadata } from 'next';
import FarmaWrapper from '@/components/farma/FarmaWrapper';

export const metadata: Metadata = {
  title: 'Nartalis — Te ayuda a cuidar tu salud y la de los tuyos',
  description: 'Nartalis te ayuda a cuidar tu salud y la de los tuyos.',
};

export default function FarmaPage() {
  return <FarmaWrapper />;
}
