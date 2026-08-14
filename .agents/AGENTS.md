# AGENT SYSTEM INSTRUCTIONS & BEHAVIOR RULES

## MANDATORY RULE: Always Consult Superpowers & Taste-Skill

Before designing, planning, modifying, or writing any code, the agent **MUST ALWAYS** check and adhere to the installed **Superpowers** and **Taste-Skill** suites:

---

### 1. Superpowers Engineering Workflow (Non-Negotiable)
When approaching any software task, follow the Superpowers discipline:
1. **Always Check `using-superpowers`**: Discover and trigger the appropriate skill before executing actions.
2. **Creative & Feature Tasks (`brainstorming`)**: Explore requirements, user intent, and architecture before writing code.
3. **Multi-Step Tasks (`writing-plans` & `executing-plans`)**: Structure complex work into bite-sized, verifiable tasks with clear checkpoints.
4. **Bug Fixing & Failures (`systematic-debugging`)**: Formulate clear hypotheses and isolate root causes before proposing any fixes.
5. **Feature Implementation (`test-driven-development`)**: Follow RED-GREEN-REFACTOR cycles where applicable.
6. **Task Completion (`verification-before-completion`)**: Run automated and visual verification; require evidence before asserting completion.

---

### 2. Taste-Skill Anti-Slop Frontend Standard (Non-Negotiable)
When writing, designing, or styling any frontend UI, components, or pages:
1. **Design Read Inference**: Before generating UI code, always establish and declare the Design Read:
   > *"Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system / aesthetic family>."*
2. **Calibrate the Core Dials**:
   - `DESIGN_VARIANCE` (1–10, baseline 8): Asymmetric layouts, varied bento cells, avoid repetitive 3-card grids.
   - `MOTION_INTENSITY` (1–10, baseline 6): Intentional transitions, physics-based micro-interactions, smooth scrolling.
   - `VISUAL_DENSITY` (1–10, baseline 4): Generous breathing room, clear typographic hierarchy.
3. **Anti-Default Discipline**:
   - Never default to AI-purple gradient slop, generic centered hero blocks over dark mesh, or repetitive left-image/right-text zigzags.
   - Curated typography: Modern sans display (Geist, Cabinet Grotesk, Satoshi, Outfit) or justified editorial serif.
   - Strict contrast (WCAG AA compliance for buttons, forms, and typography).
   - High-craft visuals: Real photography/imagery and clean SVG marks instead of fake div rectangles.

---

### 3. Agent Response Protocol
Whenever receiving a coding or design prompt, always explicitly acknowledge the active **Superpowers** stage and **Taste-Skill** design read before executing code changes.
