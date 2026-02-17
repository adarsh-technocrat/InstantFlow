import { createSlice } from "@reduxjs/toolkit";

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface FrameState {
  id: string;
  label: string;
  left: number;
  top: number;
}

interface CanvasState {
  transform: CanvasTransform;
  frames: FrameState[];
}

const initialState: CanvasState = {
  transform: {
    x: 255.24,
    y: 410.117,
    scale: 0.556382,
  },
  frames: [
    { id: "1", label: "Home", left: -210, top: -500 },
    { id: "2", label: "Training Plans", left: 310, top: -500 },
    { id: "3", label: "Progress", left: 830, top: -500 },
    { id: "4", label: "Workout Detail", left: 1350, top: -500 },
  ],
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
      state.frames.push({ ...action.payload, id });
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
    },
    reorderFrames: (state, action: { payload: string[] }) => {
      const order = action.payload;
      state.frames.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    },
  },
});

export const {
  setTransform,
  setZoom,
  addFrame,
  updateFrame,
  removeFrame,
  reorderFrames,
} = canvasSlice.actions;

export default canvasSlice.reducer;
