import { configureStore } from "@reduxjs/toolkit";
import canvasReducer from "./slices/canvasSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
