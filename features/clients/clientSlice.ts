import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Client } from '@/types';
import { RootState } from '@/lib/store';

interface ClientState {
  clients: Client[];
  selectedClientId: string | null;
}

const initialState: ClientState = {
  clients: [],
  selectedClientId: null,
};

export const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
    },
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload);
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(client => client.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    deleteClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(client => client.id !== action.payload);
      if (state.selectedClientId === action.payload) {
        state.selectedClientId = null;
      }
    },
    selectClient: (state, action: PayloadAction<string | null>) => {
      state.selectedClientId = action.payload;
    },
    clearSelectedClient: (state) => {
      state.selectedClientId = null;
    },
  },
});

export const { 
  setClients, 
  addClient, 
  updateClient, 
  deleteClient, 
  selectClient, 
  clearSelectedClient 
} = clientSlice.actions;

export const selectAllClients = (state: RootState) => state.clients.clients;
export const selectSelectedClientId = (state: RootState) => state.clients.selectedClientId;
export const selectSelectedClient = (state: RootState) => 
  state.clients.clients.find(client => client.id === state.clients.selectedClientId);

export default clientSlice.reducer;