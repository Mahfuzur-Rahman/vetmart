# Top Menu & Category Mega-Menu Redesign

## Goal & Problem Statement
The current storefront header uses semi-transparent styling with basic species chips. To improve usability, clarity, and navigation for veterinary customers, we will redesign the top menu into a solid, opaque 2-tier header featuring a rich, interactive **Category Mega-Menu** and multi-level navigation.

## Proposed Design

### 1. Solid Opaque Header Styling
- Replace `bg-background/95 backdrop-blur-md` with `bg-card opacity-100 border-b border-border shadow-sm`.
- Ensure zero backdrop bleed or see-through transparency over hero banners.

### 2. Header Structure & Tiering

#### Tier 1: Top Announcement Bar
- Solid primary background (`bg-primary text-primary-foreground`).
- Nationwide shipping & helpline notice (Emergency vet line: 16624).

#### Tier 2: Main Navigation Bar
- **Brand Logo**: `VetMartBD` logo with medical badge.
- **Search Bar**: Centered wide input with autocomplete placeholder ("Search drug, generic name, species...").
- **Actions**: Language Toggle (`BN` / `EN`), Customer Login / Profile Dropdown, Shopping Cart badge count.

#### Tier 3: Category Mega-Menu & Secondary Navigation Bar
- **"All Categories ▾" (সকল ক্যাটাগরি ▾)** Button:
  - Positioned prominently on the left with a subtle primary highlight.
  - Hover / Click triggers a 3-column Mega-Menu dropdown panel:
    - **Column 1 (Species & Livestock)**: Cattle (🐄), Poultry (🐓), Aqua (🐟), Pets (🐶), Goat & Sheep (🐐).
    - **Column 2 (Pharmacological Types)**: Vaccines & Biologicals (💉), Antibiotics & Anti-infectives (💊), Feed Additives & Vitamins (🌾), Disinfectants & Biosecurity (🧼), Dewormers & Antiparasitics (🧪).
    - **Column 3 (Quick Services)**: Prescription Upload (📋), 24/7 Vet Consultation (📞), Cold-Chain Delivery Specs (❄️).
- **Secondary Quick Links**: Home, All Products, Prescription Upload, Vet Helpline, Species Links.

### 3. Responsive Mobile Menu
- Slide-out drawer updated with accordion sections for Categories, Species, Services, and Account actions.
- Opaque solid background for full contrast.
