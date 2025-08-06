// lib/permissions.ts
// Arquivo centralizado para todas as constantes de permissões

// Lista de todas as permissões possíveis
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_CLIENTS: 'manage_clients',
  MANAGE_ANALYSIS: 'manage_analysis',
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_HISTORY: 'view_history',
  USE_AI: 'use_ai',
  VIEW_CLIENTS: 'view_clients', // Nova permissão apenas para visualizar clientes
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = 'superuser' | 'admin' | 'analyst' | 'user';

// Permissões padrão para cada tipo de usuário
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  superuser: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.MANAGE_ANALYSIS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.USE_AI,
    PERMISSIONS.VIEW_CLIENTS,
  ],
  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.MANAGE_ANALYSIS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.USE_AI,
    PERMISSIONS.VIEW_CLIENTS,
  ],
  analyst: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_ANALYSIS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.USE_AI,
    PERMISSIONS.VIEW_CLIENTS, // Pode apenas visualizar clientes
  ],
  user: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_HISTORY,
  ],
};

// Descrições amigáveis das permissões
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.VIEW_DASHBOARD]: 'Visualizar Dashboard',
  [PERMISSIONS.MANAGE_CLIENTS]: 'Gerenciar Clientes',
  [PERMISSIONS.MANAGE_ANALYSIS]: 'Gerenciar Análises',
  [PERMISSIONS.MANAGE_USERS]: 'Gerenciar Usuários',
  [PERMISSIONS.MANAGE_SETTINGS]: 'Gerenciar Configurações',
  [PERMISSIONS.VIEW_HISTORY]: 'Visualizar Histórico',
  [PERMISSIONS.USE_AI]: 'Usar Inteligência Artificial',
};

// Descrições dos tipos de usuário
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superuser: 'Super Usuário - Acesso total ao sistema',
  admin: 'Administrador - Gerencia clientes, análises e visualiza dados',
  user: 'Usuário - Pode criar análises e visualizar dados básicos',
};

// Grupos de permissões para organização na UI
export const PERMISSION_GROUPS = {
  dashboard: {
    name: 'Dashboard',
    permissions: [PERMISSIONS.VIEW_DASHBOARD]
  },
  clients: {
    name: 'Clientes',
    permissions: [PERMISSIONS.MANAGE_CLIENTS]
  },
  analysis: {
    name: 'Análises',
    permissions: [PERMISSIONS.MANAGE_ANALYSIS, PERMISSIONS.USE_AI]
  },
  system: {
    name: 'Sistema',
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_SETTINGS]
  },
  data: {
    name: 'Dados',
    permissions: [PERMISSIONS.VIEW_HISTORY]
  }
} as const;