import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Client, Report } from '@/types';


export const api = createApi({
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    credentials: 'include', 
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
        console.log(' Fazendo requisição para /api/clientes com params:', params);
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.search) queryParams.append('search', params.search);
        
        const queryString = queryParams.toString();
        return `clientes${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: any) => {
        console.log('Response bruta from clients API:', response);
        
        if (!response) {
          console.log(' Response vazia');
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

        
        return {
          data,
          meta
        };
      },
      providesTags: ['Clients'],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
        
        } catch (error: any) {
          console.error(' Erro na query getClients:', error);
          if (error && typeof error === 'object' && 'error' in error) {
            console.error('Detalhes do erro:', error.error);
          }
        }
      },
    }),
    
    getClient: builder.query<Client, string>({
      query: (id) => {
        return `clientes/${id}`;
      },
      transformResponse: (response: unknown, _meta, _arg): Client => {
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
          console.log(' Cliente criado com sucesso:', result.data);
        } catch (error: any) {
          console.error(' Erro ao criar cliente:', error);
        }
      },
    }),
    
    updateClient: builder.mutation<Client, Partial<Client> & { id: string }>({
      query: ({ id, ...client }) => {
        console.log('Atualizando cliente:', id, client);
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
          console.log('Cliente atualizado com sucesso:', result.data);
        } catch (error: any) {
          console.error('Erro ao atualizar cliente:', error);
        }
      },
    }),
    
    deleteClient: builder.mutation<void, string>({
      query: (id) => {
        console.log(' Deletando cliente:', id);
        return {
          url: `clientes?id=${id}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: ['Clients'],
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          console.log(' Cliente deletado com sucesso');
        } catch (error: any) {
          console.error(' Erro ao deletar cliente:', error);
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
        
        return {
          url: `analises?clientId=${clientId}`,
          method: 'GET',
        };
      },
      transformResponse: (response) => {
        
        if (Array.isArray(response)) {
          return response.map(analysis => ({
            id: analysis.id,
            title: analysis.title || `Análise de ${analysis.type === 'account' ? 'Conta' : 'Anúncios'}`,
            type: analysis.type,
            created_at: analysis.created_at,
            creator: analysis.creator,
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