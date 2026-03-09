// lib/permissions.ts
// Arquivo centralizado para todas as constantes de permissões

// Lista de todas as permissões possíveis
export const PERMISSIONS = {
  // Dashboard
  view_dashboard: 'Visualizar dashboard',
  
  // Análises
  manage_analysis: 'Gerenciar análises',
  view_history: 'Visualizar histórico',
  
  // IA
  use_ai: 'Usar funcionalidades de IA',
  
  // Clientes - Separando as permissões
  view_clients: 'Visualizar clientes',
  create_clients: 'Criar clientes',
  edit_clients: 'Editar clientes',
  delete_clients: 'Deletar clientes',
  manage_client_checklist: 'Gerenciar checklist de clientes',
  
  // Usuários
  manage_users: 'Gerenciar usuários',
  
  // Configurações
  manage_settings: 'Gerenciar configurações',

  // Calculadora (acesso exclusivo para perfil cliente)
  use_calculator: 'Usar calculadora 2026',
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Role = 'superuser' | 'admin' | 'analyst' | 'inactive_analyst' | 'user' | 'cliente' | 'inactive_cliente';

// Permissões por role
export const ROLE_PERMISSIONS = {
  superuser: [
    'view_dashboard',
    'manage_analysis',
    'view_history',
    'use_ai',
    'view_clients',
    'create_clients',
    'edit_clients',
    'delete_clients',
    'manage_client_checklist',
    'manage_users',
    'manage_settings',
  ],
  admin: [
    'view_dashboard',
    'manage_analysis',
    'view_history',
    'use_ai',
    'view_clients',
    'create_clients',
    'edit_clients',
    'delete_clients',
    'manage_client_checklist',
    'manage_users',
    'manage_settings',
  ],
  analyst: [
    'view_dashboard',
    'manage_analysis',
    'view_history',
    'use_ai',
    'view_clients',
    'manage_client_checklist', // Analistas podem gerenciar checklist mas não criar/editar clientes
  ],
  inactive_analyst: [
    'view_dashboard',
    'view_history',
    'view_clients',
  ],
  user: [
    'view_dashboard',
    'view_history',
  ],
  cliente: [
    'use_calculator',
  ],
  inactive_cliente: [], // sem permissões; usado quando cliente é desativado
} as const;

// Permissões padrão para cada tipo de usuário
export const DEFAULT_PERMISSIONS = {
  superuser: ROLE_PERMISSIONS.superuser,
  admin: ROLE_PERMISSIONS.admin,
  analyst: ROLE_PERMISSIONS.analyst,
  inactive_analyst: ROLE_PERMISSIONS.inactive_analyst,
  user: ROLE_PERMISSIONS.user,
  cliente: ROLE_PERMISSIONS.cliente,
  inactive_cliente: ROLE_PERMISSIONS.inactive_cliente,
} as const;

// Descrições amigáveis das permissões
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  view_dashboard: 'Visualizar Dashboard',
  manage_analysis: 'Gerenciar Análises',
  view_history: 'Visualizar Histórico',
  use_ai: 'Usar Inteligência Artificial',
  view_clients: 'Visualizar Clientes',
  create_clients: 'Criar Clientes',
  edit_clients: 'Editar Clientes',
  delete_clients: 'Deletar Clientes',
  manage_client_checklist: 'Gerenciar Checklist de Clientes',
  manage_users: 'Gerenciar Usuários',
  manage_settings: 'Gerenciar Configurações',
  use_calculator: 'Usar Calculadora 2026',
};

// Descrições dos tipos de usuário
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superuser: 'Super Usuário - Acesso total ao sistema',
  admin: 'Administrador - Gerencia clientes, análises e visualiza dados',
  analyst: 'Analista - Pode criar análises e visualizar dados',
  inactive_analyst: 'Analista Inativo - Acesso limitado apenas para visualização',
  user: 'Usuário - Pode visualizar dados básicos',
  cliente: 'Cliente - Acesso apenas à Calculadora 2026',
  inactive_cliente: 'Cliente Inativo - Acesso bloqueado',
};

// Grupos de permissões para organização na UI
export const PERMISSION_GROUPS = {
  dashboard: {
    name: 'Dashboard',
    permissions: [PERMISSIONS.view_dashboard]
  },
  clients: {
    name: 'Clientes',
    permissions: [
      PERMISSIONS.view_clients,
      PERMISSIONS.create_clients,
      PERMISSIONS.edit_clients,
      PERMISSIONS.delete_clients,
      PERMISSIONS.manage_client_checklist,
    ]
  },
  analysis: {
    name: 'Análises',
    permissions: [PERMISSIONS.manage_analysis, PERMISSIONS.use_ai]
  },
  system: {
    name: 'Sistema',
    permissions: [PERMISSIONS.manage_users, PERMISSIONS.manage_settings]
  },
  data: {
    name: 'Dados',
    permissions: [PERMISSIONS.view_history]
  },
  calculator: {
    name: 'Calculadora',
    permissions: [PERMISSIONS.use_calculator]
  }
} as const;