import type { Metadata } from 'next';
import FarmaWrapper from '@/components/farma/FarmaWrapper';

export const metadata: Metadata = {
  title: 'Prospecto Fácil — Prospectos médicos accesibles',
  description: 'Busca medicamentos y consulta su prospecto en un formato claro, accesible y de alta legibilidad.',
};

export default function FarmaPage() {
  return <FarmaWrapper />;
}
