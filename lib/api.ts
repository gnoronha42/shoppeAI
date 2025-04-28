import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Client, Report } from '@/types';

// Base API with mock functionality
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Clients', 'Reports'],
  endpoints: (builder) => ({
    getClients: builder.query<Client[], void>({
      queryFn: () => {
        // Mock data
        return { 
          data: [
            { id: '1', name: 'Loja Fantástica', ownerName: 'João Silva' },
            { id: '2', name: 'Moda Express', ownerName: 'Maria Oliveira' },
            { id: '3', name: 'Tech Solutions', ownerName: 'Carlos Santos' },
          ] 
        };
      },
      providesTags: ['Clients'],
    }),
    getClient: builder.query<Client, string>({
      query: (id) => `lojas/${id}`,
      transformResponse: (response: unknown, _meta, _arg): Client => {
        return response as Client;
      },
      providesTags: (_result, _error, id) => [{ type: 'Clients', id }],
    }),
    getClientReports: builder.query<Report[], string>({
      queryFn: async (clientId) => {
        const reports: Report[] = [
          {
            id: '1',
            clientId: '1',
            type: 'account' as const,
            createdAt: '2025-04-10T14:30:00Z',
            url: '/reports/1.pdf',
            metrics: []
          },
          {
            id: '2',
            clientId: '1',
            type: 'ads' as const,
            createdAt: '2025-04-09T10:15:00Z',
            url: '/reports/2.pdf',
            metrics: []
          },
          {
            id: '3',
            clientId: '2',
            type: 'account' as const,
            createdAt: '2025-04-05T16:45:00Z',
            url: '/reports/3.pdf',
            metrics: []
          }
        ];
        return { data: reports.filter(report => report.clientId === clientId) };
      },
      providesTags: (_result, _error, clientId) => [{ type: 'Reports', id: clientId }],
    }),
    addClient: builder.mutation<Client, Omit<Client, 'id'>>({
      queryFn: (newClient) => {
        // Mock implementation
        return { 
          data: { 
            id: Date.now().toString(),
            ...newClient
          } 
        };
      },
      invalidatesTags: ['Clients'],
    }),
    generateReport: builder.mutation<{ url: string }, { clientId: string, type: 'account' | 'ads', files: string[] }>({
      queryFn: (data) => {
        // Mock implementation to simulate generating a report
        console.log('Generating report for:', data);
        return { 
          data: { 
            url: `/reports/mock-report-${data.type}-${data.clientId}.pdf` 
          } 
        };
      },
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'Reports', id: clientId },
        'Reports'
      ],
    }),
  }),
});

export const { 
  useGetClientsQuery, 
  useGetClientQuery,
  useGetClientReportsQuery,
  useAddClientMutation,
  useGenerateReportMutation
} = api;