// lib/mock-data/auth.ts

export interface MockUserSession {
  email: string;
  name: string;
  roleKey: string;
  roleName: string;
  isLoggedIn: boolean;
}

export interface MockCustomerSession {
  phone: string;
  name: string;
  tier: string;
  isVerifiedVet: boolean;
  bvcRegNo?: string;
  isLoggedIn: boolean;
}

export const MOCK_ADMIN_ACCOUNTS = [
  {
    email: 'master@vetmart.bd',
    password: 'Master123!',
    name: 'Master Admin Operator',
    roleKey: 'super_admin',
    roleName: 'Master Admin',
    description: 'Hardcoded Master Admin (Full Access)',
  },
  {
    email: 'admin@vetmart.bd',
    password: 'Admin123!',
    name: 'Super Admin Operator',
    roleKey: 'super_admin',
    roleName: 'Super Admin',
    description: 'Full system control & settings',
  },
  {
    email: 'pharmacist@vetmart.bd',
    password: 'Pharmacist123!',
    name: 'Dr. Shahinur Islam, Reg Pharmacist',
    roleKey: 'pharmacist',
    roleName: 'Registered Pharmacist',
    description: 'Rx review & prescription approvals',
  },
];

export const MOCK_CUSTOMER_ACCOUNT = {
  email: 'anisur.vet@gmail.com',
  password: 'VetPass123!',
  phone: '01711000000',
  otp: '123456',
  name: 'Dr. Anisur Rahman',
  tier: 'vet',
  isVerifiedVet: true,
  bvcRegNo: 'BVC-REG-10492',
};

const SESSION_STORAGE_KEY = 'vetmart_demo_admin_session';

export function getMockAdminSession(): MockUserSession | null {
  if (typeof window === 'undefined') {
    return {
      email: 'admin@vetmart.bd',
      name: 'Super Admin Operator',
      roleKey: 'super_admin',
      roleName: 'Super Admin',
      isLoggedIn: true,
    };
  }
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Session read error:', e);
  }
  return {
    email: 'admin@vetmart.bd',
    name: 'Super Admin Operator',
    roleKey: 'super_admin',
    roleName: 'Super Admin',
    isLoggedIn: true,
  };
}

export function setMockAdminSession(session: MockUserSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    document.cookie = `vetmart_admin_session=${encodeURIComponent(session.roleKey)}; path=/; max-age=86400`;
  }
}

export function clearMockAdminSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    document.cookie = `vetmart_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

const CUSTOMER_SESSION_KEY = 'vetmart_demo_customer_session';

export function getMockCustomerSession(): MockCustomerSession | null {
  if (typeof window === 'undefined') {
    return null; // Return null on server by default to avoid hydration mismatch
  }
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Customer session read error:', e);
  }
  return null;
}

export function setMockCustomerSession(session: MockCustomerSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    document.cookie = `vetmart_customer_session=${encodeURIComponent(session.phone)}; path=/; max-age=86400`;
  }
}

export function clearMockCustomerSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    document.cookie = `vetmart_customer_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}
