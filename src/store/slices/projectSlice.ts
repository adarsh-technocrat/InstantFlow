import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loadFrames } from "./canvasSlice";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

export interface ProjectState {
  messages: unknown[];
  loaded: boolean;
}

const initialState: ProjectState = {
  messages: [],
  loaded: false,
};

export const fetchProject = createAsyncThunk(
  "project/fetch",
  async (_, { dispatch }) => {
    const res = await fetch(`/api/project?id=${DEFAULT_PROJECT_ID}`).then((r) =>
      r.json(),
    );
    const frames = Array.isArray(res?.frames) ? res.frames : [];
    const messages = Array.isArray(res?.messages) ? res.messages : [];
    if (frames.length > 0) {
      dispatch(loadFrames(frames));
    }
    return { messages };
  },
);

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
        state.loaded = true;
      })
      .addCase(fetchProject.rejected, (state) => {
        state.loaded = true;
      });
  },
});

export default projectSlice.reducer;
