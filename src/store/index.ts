import { configureStore } from "@reduxjs/toolkit";
import canvasReducer from "./slices/canvasSlice";
import uiReducer from "./slices/uiSlice";
import projectReducer from "./slices/projectSlice";
import agentReducer from "./slices/agentSlice";

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    ui: uiReducer,
    project: projectReducer,
    agent: agentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
