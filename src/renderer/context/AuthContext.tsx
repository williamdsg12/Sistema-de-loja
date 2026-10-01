import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isGerente: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    // Recupera usuário salvo na sessão local caso exista
    const salvo = localStorage.getItem('nexpdv_usuario');
    if (salvo) {
      try {
        setUsuario(JSON.parse(salvo));
      } catch {
        localStorage.removeItem('nexpdv_usuario');
      }
    }
    setCarregando(false);
  }, []);

  const login = async (loginStr: string, senhaStr: string): Promise<boolean> => {
    try {
      if (!window.api?.auth) {
        console.error('window.api.auth não disponível');
        return false;
      }
      const user = await window.api.auth.login(loginStr, senhaStr);
      if (user) {
        setUsuario(user);
        localStorage.setItem('nexpdv_usuario', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro no login:', err);
      return false;
    }
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('nexpdv_usuario');
  };

  const isAdmin = usuario?.perfil === 'admin';
  const isGerente = usuario?.perfil === 'admin' || usuario?.perfil === 'gerente';

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, isAdmin, isGerente }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
