import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  chatPanelOpen: boolean;
}

const initialState: UIState = {
  chatPanelOpen: false,
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
  },
});

export const { setChatPanelOpen, toggleChatPanel } = uiSlice.actions;
export default uiSlice.reducer;
