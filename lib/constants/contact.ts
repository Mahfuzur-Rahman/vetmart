// lib/constants/contact.ts
/**
 * Single source of truth for VetMart customer support & helpline contact info (§5, §11).
 * The primary phone number (01353920501) is displayed across headers, footers,
 * emergency cards, WhatsApp templates, and invoices.
 */

export const VETMART_CONTACT = {
  // Primary helpline number
  phone: '01353920501',
  phoneFormatted: '01353-920501',
  phoneInternational: '+8801353920501',
  phoneBangla: '০১৩৫৩৯২০৫০১',

  // Links
  telHref: 'tel:01353920501',
  whatsappNumber: '8801353920501',
  whatsappHref: 'https://wa.me/8801353920501',

  // Email & Address
  email: 'support@vetmart.com.bd',
  addressEn: 'Level 4, VetMart Tower, Uttara, Dhaka-1230',
  addressBn: 'লেভেল ৪, ভেটমার্ট টাওয়ার, উত্তরা, ঢাকা-১২৩০',
} as const;
