# Step Scrubbing Controls and Canvas-Native Narration

For V1, algorithm playback uses a streamlined control dock containing the step counter (`Step K / N`) and stepping buttons (`Reset`, `Previous`, `Play/Pause`, `Next`), positioned to prevent overlap with the floating AI prompt bubble. Scrubbing timelines and speed selectors are omitted to preserve whiteboard simplicity.

Step narration and titles are rendered as canvas-native text elements in Excalidraw's hand-drawn typography, positioned with collision clearance above the active array. Pointers transition smoothly across cells (~300ms gliding) during normal playback and snap instantly during rapid navigation. Keyboard navigation uses `ArrowLeft`/`ArrowRight` and `Spacebar` when input fields are not focused.
