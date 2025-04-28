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
    selectClient: (state, action: PayloadAction<string>) => {
      state.selectedClientId = action.payload;
    },
    clearSelectedClient: (state) => {
      state.selectedClientId = null;
    },
  },
});

export const { setClients, addClient, selectClient, clearSelectedClient } = clientSlice.actions;

export const selectAllClients = (state: RootState) => state.clients.clients;
export const selectSelectedClientId = (state: RootState) => state.clients.selectedClientId;
export const selectSelectedClient = (state: RootState) => 
  state.clients.clients.find(client => client.id === state.clients.selectedClientId);

export default clientSlice.reducer;