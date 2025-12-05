import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, BarChart3, LogOut, User } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-dark-900">Restaurant POS</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{user?.username}</span>
              <span className="text-xs text-slate-500">({user?.role})</span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <h2 className="text-3xl font-bold text-dark-900 mb-8">¿Qué deseas hacer?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/sales')}
            className="card p-8 hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary-100 rounded-xl">
                <ShoppingCart className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-dark-900 mb-1">Ventas</h3>
                <p className="text-slate-600">Realizar ventas y gestionar órdenes</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="card p-8 hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-xl">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-dark-900 mb-1">Reportes</h3>
                <p className="text-slate-600">Ver estadísticas y análisis de ventas</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
