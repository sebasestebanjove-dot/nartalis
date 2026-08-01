import type { Metadata } from 'next';
import DermoWrapper from '@/components/farma/dermo/DermoWrapper';

export const metadata: Metadata = {
  title: 'Dermo — Nartalis',
  robots: { index: false, follow: true },
};

export default function DermoPage() {
  return <DermoWrapper />;
}
