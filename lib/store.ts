import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import clientReducer from '@/features/clients/clientSlice';
import themeReducer from '@/features/theme/themeSlice';
import { api } from '@/lib/api';

export const store = configureStore({
  reducer: {
    clients: clientReducer,
    theme: themeReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;