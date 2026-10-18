import Link from 'next/link';
import { Search, Home, Pill, User, ShieldCheck } from 'lucide-react';
import ContextualMedSearch from '@/components/farma/ContextualMedSearch';

export default function NotFound() {
  const quickLinks = [
    { name: 'Inicio', href: '/', icon: <Home size={18} /> },
    { name: 'Medicamentos', href: '/medicamentos', icon: <Pill size={18} /> },
    { name: 'Mi Espacio', href: '/espacio', icon: <User size={18} /> },
    { name: 'Metodología', href: '/metodologia', icon: <ShieldCheck size={18} /> },
  ];

  const featuredMeds: { name: string; href: string }[] = [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-6xl font-extrabold text-gray-900">404</h1>
          <h2 className="text-2xl font-bold text-gray-800">Página no encontrada</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Lo sentimos, no hemos podido encontrar la página que buscas. Es posible que la URL sea incorrecta o que el contenido haya sido movido.
          </p>
        </div>

        <div className="w-full max-w-lg mx-auto">
          <ContextualMedSearch 
            heading="Busca el medicamento que necesitas" 
            source="medicine_page"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all group"
            >
              <div className="text-gray-500 group-hover:text-blue-600 mb-2 transition-colors">
                {link.icon}
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {link.name}
              </span>
            </Link>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider font-semibold">
            Consultas frecuentes
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {featuredMeds.map((med) => (
              <Link
                key={med.name}
                href={med.href}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                {med.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
