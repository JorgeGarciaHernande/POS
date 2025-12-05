
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Filter, ArrowLeft } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Reports() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [leastProducts, setLeastProducts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [dateRange, startDate, endDate]);

  const getDateFilter = () => {
    const today = new Date();
    let start, end;

    switch (dateRange) {
      case 'today':
        start = format(startOfDay(today), 'yyyy-MM-dd');
        end = format(endOfDay(today), 'yyyy-MM-dd');
        break;
      case 'week':
        start = format(subDays(today, 7), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'month':
        start = format(subDays(today, 30), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      default:
        start = null;
        end = null;
    }

    return { startDate: start, endDate: end };
  };

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const filter = getDateFilter();

      const salesResult = await ipcRenderer.invoke('reports:getSales', filter);
      if (salesResult.success) {
        setSalesData(salesResult.data);
        
        const totalSales = salesResult.data.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = salesResult.data.length;
        const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        setStats({ totalSales, totalOrders, averageTicket });
      }

      const topResult = await ipcRenderer.invoke('reports:getTopProducts', { 
        limit: 3,
        ...filter 
      });
      if (topResult.success) {
        setTopProducts(topResult.data);
      }

      const leastResult = await ipcRenderer.invoke('reports:getLeastProducts', { 
        limit: 3,
        ...filter 
      });
      if (leastResult.success) {
        setLeastProducts(leastResult.data);
      }

      const dailyResult = await ipcRenderer.invoke('reports:getDailySales', filter);
      if (dailyResult.success) {
        const formattedData = dailyResult.data.map(day => ({
          date: format(new Date(day.date), 'dd MMM', { locale: es }),
          sales: day.total_sales,
          orders: day.order_count,
        }));
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-dark-900">Reportes</h1>
              <p className="text-slate-600 mt-1">Análisis y estadísticas de ventas</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-dark-900">Filtros</h2>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDateRangeChange('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === 'today'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => handleDateRangeChange('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === 'week'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => handleDateRangeChange('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === 'month'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => handleDateRangeChange('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === 'custom'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Ventas</p>
                    <p className="text-3xl font-bold text-dark-900">${stats.totalSales.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Órdenes</p>
                    <p className="text-3xl font-bold text-dark-900">{stats.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Ticket Promedio</p>
                    <p className="text-3xl font-bold text-dark-900">${stats.averageTicket.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold text-dark-900 mb-6">Ventas por Día</h2>
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                        formatter={(value) => `$${value.toFixed(2)}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#f17013" 
                        strokeWidth={3}
                        dot={{ fill: '#f17013', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p>No hay datos para mostrar en este período</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-900">Top 3 Más Vendidos</h2>
                </div>
                
                <div className="space-y-4">
                  {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-white rounded-lg border border-green-100">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700 text-lg">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-dark-900">{product.name}</h3>
                          <p className="text-sm text-slate-600">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{product.total_quantity} vendidos</p>
                          <p className="text-sm text-slate-600">${product.total_revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-900">Top 3 Menos Vendidos</h2>
                </div>
                
                <div className="space-y-4">
                  {leastProducts.length > 0 ? (
                    leastProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-100">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-700 text-lg">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-dark-900">{product.name}</h3>
                          <p className="text-sm text-slate-600">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{product.total_quantity} vendidos</p>
                          <p className="text-sm text-slate-600">${product.total_revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
