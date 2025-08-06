import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Client, Report } from '@/types';

// Função para extrair token de cookies
const getTokenFromCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// Base API with authentication
export const api = createApi({
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    credentials: 'include', // ✅ IMPORTANTE: Inclui cookies automaticamente
    prepareHeaders: (headers) => {
      // Tentar múltiplas fontes para o token
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') || 
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('auth_token') ||
                   getTokenFromCookie('auth_token') ||  // ✅ NOVO: Procura no cookie
                   getTokenFromCookie('token');
      
      console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');
      console.log('🔑 Fonte do token:', 
        localStorage.getItem('token') ? 'localStorage.token' :
        localStorage.getItem('auth_token') ? 'localStorage.auth_token' :
        sessionStorage.getItem('token') ? 'sessionStorage.token' :
        sessionStorage.getItem('auth_token') ? 'sessionStorage.auth_token' :
        getTokenFromCookie('auth_token') ? 'cookie.auth_token' :
        getTokenFromCookie('token') ? 'cookie.token' : 'NENHUMA'
      );
      console.log('🔑 Token (primeiros 20 chars):', token?.substring(0, 20));
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('✅ Header Authorization definido');
      } else {
        console.log('❌ Nenhum token encontrado');
      }
      
      return headers;
    },
  }),
  tagTypes: ['Clients', 'Reports', 'Analyses'],
  endpoints: (builder) => ({
    getClients: builder.query<{
      data: Client[];
      meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }, {
      page?: number;
      pageSize?: number;
      search?: string;
    }>({
      query: (params = { page: 1, pageSize: 10 }) => {
        console.log('🚀 Fazendo requisição para /api/clientes com params:', params);
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.search) queryParams.append('search', params.search);
        
        const queryString = queryParams.toString();
        return `clientes${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: any) => {
        console.log('📥 Response bruta from clients API:', response);
        
        if (!response) {
          console.log('⚠️ Response vazia');
          return {
            data: [],
            meta: {
              total: 0,
              page: 1,
              pageSize: 10,
              totalPages: 0
            }
          };
        }

        // Garantir que temos a estrutura correta
        const data = Array.isArray(response.data) ? response.data : [];
        const meta = response.meta || {
          total: data.length,
          page: 1,
          pageSize: 10,
          totalPages: 1
        };

        console.log('✅ Dados transformados:', { dataLength: data.length, meta });
        
        return {
          data,
          meta
        };
      },
      providesTags: ['Clients'],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          console.log('✅ Query getClients bem-sucedida:', {
            totalClients: result.data.data.length,
            currentPage: result.data.meta.page,
            totalPages: result.data.meta.totalPages,
            totalRegistros: result.data.meta.total
          });
        } catch (error: any) {
          console.error('❌ Erro na query getClients:', error);
          if (error && typeof error === 'object' && 'error' in error) {
            console.error('Detalhes do erro:', error.error);
          }
        }
      },
    }),
    
    getClient: builder.query<Client, string>({
      query: (id) => {
        console.log('🚀 Fazendo requisição para client específico:', id);
        return `clientes/${id}`;
      },
      transformResponse: (response: unknown, _meta, _arg): Client => {
        console.log('📥 Response from single client API:', response);
        return response as Client;
      },
      providesTags: (_result, _error, id) => [{ type: 'Clients', id }],
    }),
    
    getClientReports: builder.query<Report[], string>({
      query: (clientId) => ({
        url: `reports`,
        params: { clientId },
      }),
      providesTags: (_result, _error, clientId) => [{ type: 'Reports', id: clientId }],
    }),
    
    addClient: builder.mutation<Client, Partial<Client>>({
      query: (client) => {
        console.log('🚀 Criando novo cliente:', client);
        return {
          url: 'clientes',
          method: 'POST',
          body: client,
        };
      },
      invalidatesTags: ['Clients'],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          console.log('✅ Cliente criado com sucesso:', result.data);
        } catch (error: any) {
          console.error('❌ Erro ao criar cliente:', error);
        }
      },
    }),
    
    updateClient: builder.mutation<Client, Partial<Client> & { id: string }>({
      query: ({ id, ...client }) => {
        console.log('🚀 Atualizando cliente:', id, client);
        return {
          url: `clientes`,
          method: 'PATCH',
          body: { id, ...client },
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Clients', id },
        'Clients'
      ],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          console.log('✅ Cliente atualizado com sucesso:', result.data);
        } catch (error: any) {
          console.error('❌ Erro ao atualizar cliente:', error);
        }
      },
    }),
    
    deleteClient: builder.mutation<void, string>({
      query: (id) => {
        console.log('🚀 Deletando cliente:', id);
        return {
          url: `clientes?id=${id}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: ['Clients'],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          console.log('✅ Cliente deletado com sucesso');
        } catch (error: any) {
          console.error('❌ Erro ao deletar cliente:', error);
        }
      },
    }),
    
    generateReport: builder.mutation<{ url: string }, { clientId: string, type: 'account' | 'ads', files: string[] }>({
      query: (data) => ({
        url: 'reports/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'Reports', id: clientId },
        'Reports'
      ],
    }),
    
    getClientAnalyses: builder.query({
      query: (clientId) => {
        console.log("🚀 Fetching analyses for client:", clientId);
        return {
          url: `analises?clientId=${clientId}`,
          method: 'GET',
        };
      },
      transformResponse: (response) => {
        console.log("📥 Raw response from analyses API:", response);
        if (Array.isArray(response)) {
          return response.map(analysis => ({
            id: analysis.id,
            title: analysis.title || `Análise de ${analysis.type === 'account' ? 'Conta' : 'Anúncios'}`,
            type: analysis.type,
            created_at: analysis.created_at,
            content: analysis.analysis_results && analysis.analysis_results.length > 0 
              ? analysis.analysis_results[0].content 
              : undefined
          }));
        }
        return [];
      },
      providesTags: (result, error, clientId) => 
        result 
          ? [
              ...result.map(({ id }) => ({ type: 'Analyses' as const, id })),
              { type: 'Analyses', id: clientId }
            ]
          : [{ type: 'Analyses', id: clientId }],
    }),
  }),
});

export const { 
  useGetClientsQuery, 
  useGetClientQuery,
  useGetClientReportsQuery,
  useAddClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useGenerateReportMutation,
  useGetClientAnalysesQuery
} = api;