// components/storefront/SpeciesGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { SPECIES, type SpeciesInfo } from '@/lib/services/species';
import type { Locale } from '@/lib/i18n/config';

interface SpeciesGridProps {
  locale: Locale;
  initialSpecies?: SpeciesInfo[];
}

export function SpeciesGrid({ locale, initialSpecies }: SpeciesGridProps) {
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>(
    initialSpecies && initialSpecies.length > 0 ? initialSpecies : SPECIES.filter((s) => s.showOnHomepage !== false)
  );

  useEffect(() => {
    if (initialSpecies && initialSpecies.length > 0) {
      setSpeciesList(initialSpecies);
    }

    // Refresh active homepage species from API
    const fetchHomepageSpecies = () => {
      fetch('/api/v1/species?homepage=true')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setSpeciesList(json.data);
          }
        })
        .catch((e) => console.warn('Could not fetch homepage species:', e));
    };

    fetchHomepageSpecies();
  }, [initialSpecies]);

  if (speciesList.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-display">
            {locale === 'bn' ? 'প্রজাতি অনুযায়ী ক্যাটাগরি' : 'Browse by Target Species'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'bn'
              ? 'আপনার খামার বা পোষা প্রাণীর ধরন বেছে নিন'
              : 'Select your farm or pet animal category'}
          </p>
        </div>
      </div>

      {/* Bento Grid layout with asymmetric variance per Taste-Skill rules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {speciesList.map((s) => (
          <Link
            key={s.key}
            href={`/species/${s.slug}`}
            className="group relative p-5 rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-200">
                {s.emoji || '🐾'}
              </span>
              <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                →
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {locale === 'bn' ? s.nameBn : s.nameEn}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {s.description ? (locale === 'bn' ? s.description.bn : s.description.en) : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

