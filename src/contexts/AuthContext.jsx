
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Verificar si Electron está disponible
      if (typeof window !== 'undefined' && window.require) {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('auth:login', { username, password });
        
        if (result.success) {
          setUser(result.user);
          localStorage.setItem('user', JSON.stringify(result.user));
          return { success: true };
        }
        return { success: false, error: 'Credenciales inválidas' };
      } else {
        // Modo desarrollo sin Electron - login de prueba
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'cajero' && password === 'cajero123')) {
          const testUser = { 
            id: 1, 
            username, 
            role: username === 'admin' ? 'admin' : 'cashier' 
          };
          setUser(testUser);
          localStorage.setItem('user', JSON.stringify(testUser));
          return { success: true };
        }
        return { success: false, error: 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
