// lib/mock-data/prescriptions.ts

function createRxImageSvg(doctorName: string, bvcNo: string, patient: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
    <rect width="600" height="800" fill="#f8fafc" rx="12"/>
    <rect x="20" y="20" width="560" height="760" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="8"/>
    <!-- Header -->
    <rect x="40" y="40" width="520" height="90" fill="#0284c7" rx="6"/>
    <text x="60" y="75" fill="#ffffff" font-size="22" font-weight="bold" font-family="sans-serif">${doctorName}</text>
    <text x="60" y="100" fill="#e0f2fe" font-size="14" font-family="sans-serif">BVC Registration No: ${bvcNo} | Registered Veterinary Surgeon</text>
    <text x="60" y="118" fill="#bae6fd" font-size="12" font-family="sans-serif">Upazila Veterinary Hospital, Mymensingh Sadar</text>
    
    <!-- Patient Info -->
    <line x1="40" y1="150" x2="560" y2="150" stroke="#0284c7" stroke-width="2"/>
    <text x="50" y="175" fill="#334155" font-size="14" font-weight="bold" font-family="sans-serif">Patient Species: ${patient}</text>
    <text x="350" y="175" fill="#334155" font-size="14" font-family="sans-serif">Date: 2026-08-11</text>
    <text x="50" y="195" fill="#64748b" font-size="13" font-family="sans-serif">Owner: Rahim Poultry Farm | Mob: 01711000000</text>
    <line x1="40" y1="210" x2="560" y2="210" stroke="#e2e8f0" stroke-width="1"/>
    
    <!-- Rx Symbol -->
    <text x="50" y="270" fill="#0284c7" font-size="42" font-weight="900" font-family="serif">Rx</text>
    
    <!-- Prescribed Medicines -->
    <text x="80" y="320" fill="#0f172a" font-size="16" font-weight="bold" font-family="sans-serif">1. Soln. Renaflox (Enrofloxacin 100mg/ml)</text>
    <text x="100" y="345" fill="#475569" font-size="14" font-family="sans-serif">1 ml / 2L drinking water for 5 consecutive days.</text>
    
    <text x="80" y="390" fill="#0f172a" font-size="16" font-weight="bold" font-family="sans-serif">2. Inj. Acimec 1% (Ivermectin 10ml)</text>
    <text x="100" y="415" fill="#475569" font-size="14" font-family="sans-serif">1 ml S/C per 50 kg body weight single dose.</text>
    
    <!-- Doctor Signature Seal -->
    <rect x="360" y="650" width="180" height="80" fill="#f0f9ff" stroke="#0284c7" stroke-dasharray="4" rx="8"/>
    <text x="450" y="680" fill="#0369a1" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle">VERIFIED VET SURGEON</text>
    <text x="450" y="705" fill="#0284c7" font-size="12" font-family="sans-serif" text-anchor="middle">Digital Signature Seal</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface MockPrescription {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  vetName: string;
  bvcRegNo: string;
  species: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  rxImageUrl: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export const MOCK_PRESCRIPTIONS: MockPrescription[] = [
  {
    id: 'rx-201',
    orderId: 'ord-101',
    orderNumber: 'VM-BD-98214',
    customerName: 'Dr. Anisur Rahman',
    customerPhone: '01711000000',
    vetName: 'Dr. Anisur Rahman, DVM',
    bvcRegNo: 'BVC-REG-10492',
    species: 'Poultry & Cattle',
    status: 'pending',
    rxImageUrl: createRxImageSvg('Dr. Anisur Rahman, DVM', 'BVC-REG-10492', 'Poultry & Cattle'),
    uploadedAt: '2026-08-11T14:32:00Z',
  },
  {
    id: 'rx-202',
    orderId: 'ord-105',
    orderNumber: 'VM-BD-98209',
    customerName: 'Siddique Hossain',
    customerPhone: '01819998877',
    vetName: 'Dr. Mahbubul Alam, DVM',
    bvcRegNo: 'BVC-REG-08812',
    species: 'Dairy Cattle',
    status: 'approved',
    rxImageUrl: createRxImageSvg('Dr. Mahbubul Alam, DVM', 'BVC-REG-08812', 'Dairy Cattle'),
    uploadedAt: '2026-08-10T11:15:00Z',
    reviewedAt: '2026-08-10T11:45:00Z',
    reviewedBy: 'Registered Pharmacist (pharmacist@vetmart.bd)',
  },
];
