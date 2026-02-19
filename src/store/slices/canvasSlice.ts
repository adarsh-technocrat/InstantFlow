import { createSlice } from "@reduxjs/toolkit";

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export type ThemeVariables = Record<string, string>;

export interface FrameState {
  id: string;
  label: string;
  left: number;
  top: number;
  /** Full HTML document for the screen (head + body). Managed by agent. */
  html: string;
}

interface CanvasState {
  transform: CanvasTransform;
  frames: FrameState[];
  selectedFrameIds: string[];
  theme: ThemeVariables;
}

const initialState: CanvasState = {
  selectedFrameIds: [],
  transform: {
    x: 255.24,
    y: 410.117,
    scale: 0.556382,
  },
  frames: [],
  theme: {},
};

const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    setTransform: (state, action: { payload: Partial<CanvasTransform> }) => {
      state.transform = { ...state.transform, ...action.payload };
    },
    setZoom: (state, action: { payload: number }) => {
      state.transform.scale = action.payload;
    },
    addFrame: (state, action: { payload: Omit<FrameState, "id"> }) => {
      const id = String(Date.now());
      const payload = action.payload;
      state.frames.push({
        id,
        label: payload.label,
        left: payload.left,
        top: payload.top,
        html: payload.html ?? "",
      });
    },
    updateFrame: (
      state,
      action: { payload: { id: string; changes: Partial<FrameState> } },
    ) => {
      const frame = state.frames.find((f) => f.id === action.payload.id);
      if (frame) Object.assign(frame, action.payload.changes);
    },
    removeFrame: (state, action: { payload: string }) => {
      state.frames = state.frames.filter((f) => f.id !== action.payload);
      state.selectedFrameIds = state.selectedFrameIds.filter(
        (id) => id !== action.payload,
      );
    },
    duplicateFrame: (state, action: { payload: string }) => {
      const frame = state.frames.find((f) => f.id === action.payload);
      if (!frame) return;
      const newId = String(Date.now());
      state.frames.push({
        ...frame,
        id: newId,
        left: frame.left + 40,
        top: frame.top + 40,
      });
      state.selectedFrameIds = [newId];
    },
    updateFrameHtml: (state, action: { payload: { id: string; html: string } }) => {
      const frame = state.frames.find((f) => f.id === action.payload.id);
      if (frame) frame.html = action.payload.html;
    },
    setTheme: (state, action: { payload: Partial<ThemeVariables> }) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    replaceTheme: (state, action: { payload: ThemeVariables }) => {
      state.theme = action.payload;
    },
    reorderFrames: (state, action: { payload: string[] }) => {
      const order = action.payload;
      state.frames.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    },
    setSelectedFrames: (state, action: { payload: string[] }) => {
      state.selectedFrameIds = action.payload;
    },
    toggleFrameInSelection: (state, action: { payload: string }) => {
      const id = action.payload;
      const i = state.selectedFrameIds.indexOf(id);
      if (i >= 0) {
        state.selectedFrameIds = state.selectedFrameIds.filter((x) => x !== id);
      } else {
        state.selectedFrameIds = [...state.selectedFrameIds, id];
      }
    },
  },
});

export const {
  setTransform,
  setZoom,
  addFrame,
  updateFrame,
  removeFrame,
  duplicateFrame,
  reorderFrames,
  setSelectedFrames,
  toggleFrameInSelection,
  updateFrameHtml,
  setTheme,
  replaceTheme,
} = canvasSlice.actions;

export default canvasSlice.reducer;
