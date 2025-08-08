import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  permissions: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  permissions: [],
  login: async () => {},
  logout: () => {},
  hasPermission: () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const router = useRouter();

  // Verificar token salvo ao iniciar
  useEffect(() => {
    const token = Cookies.get('auth_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    } else {
      // Se não houver token, fazer logout
      logout();
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }

      const data = await response.json();

      setIsAuthenticated(true);
      setUser(data.user);
      setPermissions(data.permissions);
      
      // Salvar token nos cookies (expira em 24h)
      Cookies.set('auth_token', data.token, { expires: 1 });
      
      // Salvar dados do usuário no localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      router.push('/');
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setPermissions([]);
    Cookies.remove('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const hasPermission = (permission: string): boolean => {
    console.log('=== DEBUG hasPermission ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('user?.permissions:', user?.permissions);
    console.log('permission solicitada:', permission);
    
    if (!isAuthenticated || !user?.permissions) {
      console.log('Retornando false - não autenticado ou sem permissões');
      return false;
    }
    
    const hasIt = user.permissions.includes('all') || user.permissions.includes(permission);
    console.log('Tem permissão:', hasIt);
    console.log('========================');
    
    return hasIt;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        permissions,
        login, 
        logout,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 