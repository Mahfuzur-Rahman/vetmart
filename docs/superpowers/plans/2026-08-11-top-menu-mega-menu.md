# Top Menu & Category Mega-Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the storefront top menu into a solid, opaque 3-tier header featuring an interactive Category Mega-Menu dropdown and full bilingual responsiveness.

**Architecture:** Update `Header.tsx` to remove background blur/transparency, add state management for the Mega-Menu popover, build the 3-column Mega-Menu dropdown layout, and update the mobile menu drawer for full solid opacity.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind CSS, TypeScript, `next-intl`.

## Global Constraints

- Header must be 100% solid opaque (`bg-card opacity-100 shadow-sm border-b border-border`).
- Mega-Menu must include 3 distinct columns: Livestock & Species, Pharmacological Categories, and Quick Services.
- Must support English (`en`) and Bengali (`bn`) locales.
- Zero breaking changes to existing Cart or Auth session state.

---

### Task 1: Refactor `Header.tsx` to Solid Opaque Styling & Add Mega-Menu Dropdown State

**Files:**
- Modify: `components/storefront/Header.tsx`

**Interfaces:**
- Consumes: `SPECIES`, `getMockCustomerSession`, `clearMockCustomerSession`
- Produces: Updated solid opaque Header component with Category Mega-Menu

- [ ] **Step 1: Update Header container CSS to solid opaque**

Replace `bg-background/95 backdrop-blur-md border-b border-border/60` with `bg-card border-b border-border shadow-sm` to ensure zero transparency.

- [ ] **Step 2: Add Mega-Menu state and 3-column dropdown layout**

Add `megaMenuOpen` state in `Header.tsx`. Create the "All Categories ▾" (সকল ক্যাটাগরি ▾) button on Tier 3. Render the 3-column popover when open:
- Column 1: Species & Livestock (Cattle, Poultry, Aqua, Pets, Goat/Sheep)
- Column 2: Medicine Types (Vaccines, Antibiotics, Feed Additives, Disinfectants, Dewormers)
- Column 3: Services & Quick Links (Prescription Upload, 24/7 Helpline, Cold-Chain Specs)

- [ ] **Step 3: Update Mobile Menu Drawer for solid opacity**

Update mobile drawer overlay and container to use solid opaque card backgrounds (`bg-card border-b border-border shadow-2xl`).

- [ ] **Step 4: Run typecheck to verify TypeScript compilation**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

Commit: `git add components/storefront/Header.tsx && git commit -m "feat: implement solid opaque top menu with category mega-menu"`
