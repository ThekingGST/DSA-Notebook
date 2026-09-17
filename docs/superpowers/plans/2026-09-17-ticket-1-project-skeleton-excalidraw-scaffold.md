# Ticket 1: Project Skeleton & Excalidraw Canvas Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Vite + React + TypeScript web application embedding `@excalidraw/excalidraw` in full-viewport with a top application header and mode switcher (`Student Mode` vs `Teacher Mode`), verified by a Vitest test suite.

**Architecture:** A single-page application where the top bar holds global mode state (`"student"` | `"teacher"`) and controls, while the main canvas area renders the `@excalidraw/excalidraw` whiteboard with hand-drawn styling and full-viewport responsiveness. Decoupled vanilla CSS for layout and aesthetics.

**Tech Stack:** React 18, TypeScript, Vite, `@excalidraw/excalidraw`, Vitest, `@testing-library/react`, jsdom, Vanilla CSS.

**Spec:** `docs/spec-v1-mvp.md` (Issue #8) / [Ticket 1 (Issue #9)](https://github.com/ThekingGST/DSA-Notebook/issues/9).

## Global Constraints

- Modern typography and curated dark mode palette (Zinc / Slate with purple `#8257e5` and green `#04d361` accents).
- `@excalidraw/excalidraw` requires non-zero height parent container and `process.env.IS_PREACT` defined in Vite.
- Test runner must use Vitest with jsdom environment.
- Tests must verify observable behavior at the interface, not internal component details.

---

### Task 1: Initialize Vite, TypeScript, and Vitest Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.ts`

**Interfaces:**
- Produces: Runnable npm scripts (`dev`, `build`, `test`) and a configured Vitest test environment with jsdom.

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "dsa-notebook",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@excalidraw/excalidraw": "^0.18.0",
    "clsx": "^2.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^20.14.9",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.2",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, tsconfig.node.json, and vite.config.ts**

`vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.IS_PREACT": JSON.stringify("true"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`src/test/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Write failing smoke test**

`src/test/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("Smoke test", () => {
  it("verifies test environment is active", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 4: Install dependencies and run test**

Run: `npm install && npm test`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts src/test/
git commit -m "chore: scaffold Vite, TypeScript, and Vitest project setup"
```

---

### Task 2: Build the Header & Mode Switcher Component

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Header.css`
- Create: `src/components/Header.test.tsx`

**Interfaces:**
- Consumes: None
- Produces: `<Header mode={mode} onModeChange={setMode} />` component where `mode` is `"student" | "teacher"`.

- [ ] **Step 1: Write failing test for Header & Mode Switcher**

`src/components/Header.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Header } from "./Header";

describe("Header component", () => {
  it("renders branding title and segmented mode buttons", () => {
    const onModeChange = vi.fn();
    render(<Header mode="student" onModeChange={onModeChange} />);

    expect(screen.getByText("DSA Notebook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /student mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /teacher mode/i })).toBeInTheDocument();
  });

  it("calls onModeChange when teacher mode button is clicked", () => {
    const onModeChange = vi.fn();
    render(<Header mode="student" onModeChange={onModeChange} />);

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(onModeChange).toHaveBeenCalledWith("teacher");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Header.test.tsx`
Expected: FAIL ("Cannot find module './Header'")

- [ ] **Step 3: Implement Header component and CSS**

`src/components/Header.tsx`:
```tsx
import React from "react";
import "./Header.css";

export type WorkspaceMode = "student" | "teacher";

interface HeaderProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-logo">⚡</span>
        <h1 className="header-title">DSA Notebook</h1>
        <span className="header-badge">v1 MVP</span>
      </div>
      <div className="header-center">
        <div className="mode-toggle" role="group" aria-label="Workspace mode">
          <button
            type="button"
            className={`mode-btn ${mode === "student" ? "active" : ""}`}
            onClick={() => onModeChange("student")}
            aria-pressed={mode === "student"}
          >
            🎓 Student Mode
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "teacher" ? "active" : ""}`}
            onClick={() => onModeChange("teacher")}
            aria-pressed={mode === "teacher"}
          >
            👨‍🏫 Teacher Mode
          </button>
        </div>
      </div>
      <div className="header-right">
        <span className="status-indicator">● Online</span>
      </div>
    </header>
  );
};
```

`src/components/Header.css`:
```css
.app-header {
  height: 52px;
  background: #18181b;
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: #f4f4f5;
  user-select: none;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-logo {
  font-size: 18px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fafafa;
  margin: 0;
}

.header-badge {
  font-size: 11px;
  font-weight: 600;
  background: rgba(130, 87, 229, 0.2);
  color: #996dff;
  padding: 2px 6px;
  border-radius: 4px;
}

.mode-toggle {
  display: flex;
  background: #27272a;
  padding: 3px;
  border-radius: 8px;
  gap: 2px;
}

.mode-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  color: #f4f4f5;
}

.mode-btn.active {
  background: #3f3f46;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.header-right {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #04d361;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Header.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/Header.css src/components/Header.test.tsx
git commit -m "feat: add application Header and mode switcher component"
```

---

### Task 3: Build Whiteboard Canvas Wrapper & App Layout

**Files:**
- Create: `src/components/WhiteboardCanvas.tsx`
- Create: `src/components/WhiteboardCanvas.css`
- Create: `src/components/WhiteboardCanvas.test.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src/main.tsx`
- Create: `index.html`

**Interfaces:**
- Consumes: `<Header />`, `@excalidraw/excalidraw`
- Produces: Full-screen interactive application running the Excalidraw whiteboard under the header.

- [ ] **Step 1: Write failing test for WhiteboardCanvas component**

`src/components/WhiteboardCanvas.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";

// Mock @excalidraw/excalidraw since it requires full Canvas/WebGL APIs in JSDOM
vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw-canvas">Excalidraw Canvas Mock</div>,
}));

describe("WhiteboardCanvas component", () => {
  it("renders the canvas container with Excalidraw child", () => {
    render(<WhiteboardCanvas mode="student" />);
    expect(screen.getByTestId("whiteboard-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("mock-excalidraw-canvas")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/WhiteboardCanvas.test.tsx`
Expected: FAIL ("Cannot find module './WhiteboardCanvas'")

- [ ] **Step 3: Implement WhiteboardCanvas, App, and index.html**

`src/components/WhiteboardCanvas.tsx`:
```tsx
import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./WhiteboardCanvas.css";
import { WorkspaceMode } from "./Header";

interface WhiteboardCanvasProps {
  mode: WorkspaceMode;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ mode }) => {
  return (
    <div className="whiteboard-wrapper" data-testid="whiteboard-wrapper" data-mode={mode}>
      <Excalidraw
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
};
```

`src/components/WhiteboardCanvas.css`:
```css
.whiteboard-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Ensure excalidraw fills the container */
.whiteboard-wrapper .excalidraw {
  height: 100% !important;
  width: 100% !important;
}
```

`src/App.tsx`:
```tsx
import React, { useState } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import "./App.css";

export const App: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>("student");

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <main className="main-viewport">
        <WhiteboardCanvas mode={mode} />
      </main>
    </div>
  );
};

export default App;
```

`src/App.css`:
```css
html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #121214;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.main-viewport {
  flex: 1;
  width: 100%;
  height: calc(100vh - 52px);
  position: relative;
  overflow: hidden;
}
```

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DSA Notebook</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/WhiteboardCanvas.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/WhiteboardCanvas.tsx src/components/WhiteboardCanvas.css src/components/WhiteboardCanvas.test.tsx src/App.tsx src/App.css src/main.tsx index.html
git commit -m "feat: add full-screen Excalidraw whiteboard canvas layout and App shell"
```

---

### Task 4: End-to-End Build & Smoke Verification

**Files:**
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `<App />`
- Produces: Verification that entire app renders, mode toggles, and production build succeeds.

- [ ] **Step 1: Write integration test for App**

`src/App.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw">Mock Excalidraw Canvas</div>,
}));

describe("App root component", () => {
  it("boots with default Student Mode and toggles to Teacher Mode", () => {
    render(<App />);

    expect(screen.getByText("DSA Notebook")).toBeInTheDocument();
    expect(screen.getByTestId("mock-excalidraw")).toBeInTheDocument();

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(teacherBtn).toHaveClass("active");
    expect(screen.getByTestId("whiteboard-wrapper")).toHaveAttribute("data-mode", "teacher");
  });
});
```

- [ ] **Step 2: Run all tests to ensure clean green pass**

Run: `npm test`
Expected: PASS (all tests across smoke, Header, WhiteboardCanvas, App)

- [ ] **Step 3: Run production build verification**

Run: `npm run build`
Expected: Exit code 0, bundle emitted in `dist/` without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.test.tsx
git commit -m "test: add root App integration test and verify production bundle"
```
