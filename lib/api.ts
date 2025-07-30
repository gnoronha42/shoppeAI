import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Client, Report } from '@/types';

// Base API with authentication
export const api = createApi({
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      // Pegar o token do localStorage
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Clients', 'Reports', 'Analyses'],
  endpoints: (builder) => ({
    getClients: builder.query<Client[], void>({
      query: () => 'clientes',
      providesTags: ['Clients'],
    }),
    getClient: builder.query<Client, string>({
      query: (id) => `clientes/${id}`,
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
      query: (client) => ({
        url: 'clientes',
        method: 'POST',
        body: client,
      }),
      invalidatesTags: ['Clients'],
    }),
    updateClient: builder.mutation<Client, Partial<Client> & { id: string }>({
      query: ({ id, ...client }) => ({
        url: `clientes/${id}`,
        method: 'PATCH',
        body: client,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Clients', id },
        'Clients'
      ]
    }),
    deleteClient: builder.mutation<void, string>({
      query: (id) => ({
        url: `clientes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Clients']
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
        console.log("Fetching analyses for client:", clientId);
        return {
          url: `analises?clientId=${clientId}`,
          method: 'GET',
        };
      },
      transformResponse: (response) => {
        console.log("Raw response from analyses API:", response);
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