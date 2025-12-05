import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Minus, Trash2, CreditCard, Banknote, 
  ShoppingBag, Search, X, Check, Printer, ArrowLeft 
} from 'lucide-react';

export default function Sales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
    loadModifiers();
  }, []);

  const loadProducts = async () => {
    try {
      // NOTE: window.require is an Electron-specific method.
      const { ipcRenderer } = window.require('electron'); 
      const result = await ipcRenderer.invoke('products:getAll');
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadModifiers = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('modifiers:getAll');
      if (result.success) {
        setModifiers(result.data);
      }
    } catch (error) {
      console.error('Error loading modifiers:', error);
    }
  };

  const categories = ['Todos', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setSelectedModifiers({});
    setShowModifiersModal(true);
  };

  const confirmAddToCart = () => {
    // Calculate final price including modifiers if needed, but the current logic only uses base price
    // You might want to update finalPrice calculation here if modifiers affect the price.
    const cartItem = {
      ...selectedProduct,
      cartId: Date.now(), // Unique ID for the cart item instance
      quantity: 1,
      modifiers: selectedModifiers,
      finalPrice: selectedProduct.price, // Placeholder, update if modifier price is needed
    };

    setCart([...cart, cartItem]);
    setShowModifiersModal(false);
    setSelectedProduct(null);
    setSelectedModifiers({});
  };

  const updateQuantity = (cartId, change) => {
    setCart(cart.map(item => 
      item.cartId === cartId 
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    ));
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Tax calculation
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.16; // 16% IVA (México)
  const total = subtotal + tax;

  const handleModifierChange = (modifierName, option, type) => {
    setSelectedModifiers(prev => {
      if (type === 'radio') {
        // Radio: only one selection possible
        return { ...prev, [modifierName]: [option] };
      } else {
        // Checkbox: multiple selections possible
        const current = prev[modifierName] || [];
        const updated = current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option];
        return { ...prev, [modifierName]: updated };
      }
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const orderData = {
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod,
        userId: user.id,
      };

      const result = await ipcRenderer.invoke('orders:create', orderData);
      
      if (result.success) {
        // Print ticket after successful order creation
        await ipcRenderer.invoke('print:ticket', {
          orderNumber: result.orderNumber,
          items: cart,
          subtotal,
          tax,
          total,
          paymentMethod,
          date: new Date().toLocaleString('es-MX'),
        });

        // Reset state
        setCart([]);
        setShowPaymentModal(false);
        setPaymentMethod('cash');
        
        alert(`¡Venta completada!\nNúmero de orden: ${result.orderNumber}`);
      } else {
        alert(result.message || 'Error al crear la orden.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar el pago. Consulte la consola para más detalles.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="flex-1 flex flex-col">
        {/* === Main Content Header/Search/Categories === */}
        <header className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-primary-600" />
            Punto de Venta
          </h1>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </header>

        {/* === Product Search and Categories === */}
        <div className="p-4 flex-none">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex space-x-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-none px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* === Product Grid === */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => handleAddToCart(product)}
                  className="card p-4 hover:shadow-lg transition-shadow cursor-pointer border border-slate-100"
                >
                  <h3 className="font-semibold text-dark-900 mb-1 truncate">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600">${product.price.toFixed(2)}</p>
                  <p className="text-sm text-slate-500 mt-1">{product.category}</p>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-slate-500 p-8">No se encontraron productos.</p>
            )}
          </div>
        </div>
      </div>

      {/* === Cart Sidebar === */}
      <div className="w-96 flex-none bg-white border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-dark-900">Carrito ({cart.length})</h2>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-slate-500 p-10">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>Agrega productos para comenzar la venta.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartId} className="border border-slate-100 p-3 rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-800 flex-1">{item.name}</span>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 hover:text-red-700 p-1 rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Modifiers display */}
                {Object.entries(item.modifiers).length > 0 && (
                  <ul className="text-xs text-slate-600 list-disc list-inside ml-2">
                    {Object.entries(item.modifiers).map(([name, options]) => (
                      options.map(option => (
                        <li key={`${name}-${option}`}>
                          {name}: {option}
                        </li>
                      ))
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2 border border-slate-300 rounded-lg">
                    <button 
                      onClick={() => updateQuantity(item.cartId, -1)} 
                      disabled={item.quantity <= 1}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-l-lg disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-sm w-5 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, 1)} 
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-r-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-dark-900">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals and Checkout Button */}
        <div className="p-4 flex-none border-t border-slate-200">
          <div className="space-y-1 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">IVA (16%):</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-xl font-bold text-dark-900 py-3 border-t border-slate-300">
            <span>Total:</span>
            <span className="text-primary-600">${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0}
            className="w-full btn btn-primary py-3 mt-3"
          >
            Pagar (${total.toFixed(2)})
          </button>
          <button 
            onClick={clearCart} 
            disabled={cart.length === 0}
            className="w-full btn btn-secondary py-3 mt-2"
          >
            Vaciar Carrito
          </button>
        </div>
      </div>

      {/* ==================================== */}
      {/* Modals (as provided in the original input) */}
      {/* ==================================== */}
      
      {showModifiersModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-dark-900 mb-1">{selectedProduct.name}</h2>
                  <p className="text-lg text-primary-600 font-bold">${selectedProduct.price.toFixed(2)}</p>
                </div>
                <button onClick={() => setShowModifiersModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {modifiers.map(modifier => (
                <div key={modifier.id}>
                  <h3 className="font-semibold text-dark-900 mb-3">{modifier.name}</h3>
                  <div className="space-y-2">
                    {modifier.options.map(option => {
                      const isSelected = selectedModifiers[modifier.name]?.includes(option);
                      return (
                        <button
                          key={option}
                          onClick={() => handleModifierChange(modifier.name, option, modifier.type)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                            isSelected ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={isSelected ? 'text-primary-700 font-medium' : 'text-slate-700'}>{option}</span>
                          {isSelected && <Check className="w-5 h-5 text-primary-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setShowModifiersModal(false)} className="flex-1 btn btn-secondary py-3">
                Cancelar
              </button>
              <button onClick={confirmAddToCart} className="flex-1 btn btn-primary py-3">
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="card max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-dark-900">Método de Pago</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'cash' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-slate-400'}`} />
                  <div className="text-left flex-1">
                    <p className={`font-semibold ${paymentMethod === 'cash' ? 'text-primary-900' : 'text-slate-900'}`}>Efectivo</p>
                    <p className="text-sm text-slate-600">Pago en efectivo</p>
                  </div>
                  {paymentMethod === 'cash' && <Check className="w-6 h-6 text-primary-600" />}
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'card' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-primary-600' : 'text-slate-400'}`} />
                  <div className="text-left flex-1">
                    <p className={`font-semibold ${paymentMethod === 'card' ? 'text-primary-900' : 'text-slate-900'}`}>Tarjeta</p>
                    <p className="text-sm text-slate-600">Débito o crédito</p>
                  </div>
                  {paymentMethod === 'card' && <Check className="w-6 h-6 text-primary-600" />}
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-700">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-slate-700">IVA (16%)</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-dark-900 pt-3 border-t border-slate-300">
                  <span>Total a Pagar</span>
                  <span className="text-primary-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} disabled={isProcessing} className="flex-1 btn btn-secondary py-3">
                Cancelar
              </button>
              <button onClick={processPayment} disabled={isProcessing} className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2">
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    Confirmar y Cobrar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}