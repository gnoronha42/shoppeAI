import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const pathname = usePathname();

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/selleria', '/obrigado'];

  // Verificar token salvo ao iniciar
  useEffect(() => {
    const token = Cookies.get('auth_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    } else {
      // Se não houver token e não for rota pública, fazer logout
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      if (!isPublicRoute) {
        logout();
      }
    }
  }, [pathname]);

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
      
      // Cliente vai direto para a Calculadora 2026
      router.push(data.user?.role === 'cliente' ? '/calculadora-2026' : '/');
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
    if (!isAuthenticated || !user?.permissions) {
      return false;
    }
    
    return user.permissions.includes('all') || user.permissions.includes(permission);
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