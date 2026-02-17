import { createSlice } from "@reduxjs/toolkit";

export type CanvasToolMode = "select" | "hand";

interface UIState {
  chatPanelOpen: boolean;
  canvasToolMode: CanvasToolMode;
}

const initialState: UIState = {
  chatPanelOpen: false,
  canvasToolMode: "select",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setChatPanelOpen: (state, action: { payload: boolean }) => {
      state.chatPanelOpen = action.payload;
    },
    toggleChatPanel: (state) => {
      state.chatPanelOpen = !state.chatPanelOpen;
    },
    setCanvasToolMode: (state, action: { payload: CanvasToolMode }) => {
      state.canvasToolMode = action.payload;
    },
  },
});

export const { setChatPanelOpen, toggleChatPanel, setCanvasToolMode } =
  uiSlice.actions;
export default uiSlice.reducer;
