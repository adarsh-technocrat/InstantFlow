import { createSlice } from "@reduxjs/toolkit";
import { wrapScreenBody, extractBodyContent } from "@/lib/screen-utils";

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
  width?: number;
  height?: number;
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
    /** Add frame with a specific id. Used for placeholder frames from tool streaming. */
    addFrameWithId: (
      state,
      action: {
        payload: {
          id: string;
          label: string;
          left: number;
          top: number;
          html?: string;
        };
      },
    ) => {
      const { id, label, left, top, html = "" } = action.payload;
      if (state.frames.some((f) => f.id === id)) return;
      state.frames.push({ id, label, left, top, html });
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
    updateFrameHtml: (
      state,
      action: { payload: { id: string; html: string } },
    ) => {
      const frame = state.frames.find((f) => f.id === action.payload.id);
      if (frame) frame.html = action.payload.html;
    },
    setTheme: (state, action: { payload: Partial<ThemeVariables> }) => {
      const updates = action.payload;
      for (const k of Object.keys(updates)) {
        const v = updates[k];
        if (v !== undefined) state.theme[k] = v;
      }
      const fullTheme = { ...state.theme };
      for (const frame of state.frames) {
        const bodyContent = extractBodyContent(frame.html);
        if (bodyContent) {
          frame.html = wrapScreenBody(bodyContent, fullTheme);
        }
      }
    },
    replaceTheme: (state, action: { payload: ThemeVariables }) => {
      state.theme = { ...action.payload };
      for (const frame of state.frames) {
        const bodyContent = extractBodyContent(frame.html);
        if (bodyContent) {
          frame.html = wrapScreenBody(bodyContent, state.theme);
        }
      }
    },
    reorderFrames: (state, action: { payload: string[] }) => {
      const order = action.payload;
      state.frames.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    },
    setSelectedFrames: (state, action: { payload: string[] }) => {
      state.selectedFrameIds = action.payload;
    },
    loadFrames: (
      state,
      action: {
        payload: Array<{
          id: string;
          label?: string;
          left?: number;
          top?: number;
          html?: string;
        }>;
      },
    ) => {
      state.frames = action.payload.map((f) => ({
        id: f.id,
        label: f.label ?? "Screen",
        left: f.left ?? 0,
        top: f.top ?? 0,
        html: f.html ?? "",
      }));
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
  addFrameWithId,
  loadFrames,
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
