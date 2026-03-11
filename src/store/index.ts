import { configureStore } from "@reduxjs/toolkit";
import canvasReducer from "./slices/canvasSlice";
import uiReducer from "./slices/uiSlice";
import projectReducer from "./slices/projectSlice";

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    project: projectReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
