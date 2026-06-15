-- ============================================================
-- MIGRATION 2 — Familles et sous-familles de bougies
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table des familles
CREATE TABLE familles (
  id   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom  TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des sous-familles (liée à une famille)
CREATE TABLE sous_familles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  famille_id UUID NOT NULL REFERENCES familles(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(famille_id, nom)
);

-- 3. Colonnes sur bougies
ALTER TABLE bougies
  ADD COLUMN IF NOT EXISTS famille_id     UUID REFERENCES familles(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sous_famille_id UUID REFERENCES sous_familles(id) ON DELETE SET NULL;

-- 4. RLS
ALTER TABLE familles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sous_familles ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les connectés
CREATE POLICY "familles_read"      ON familles      FOR SELECT TO authenticated USING (true);
CREATE POLICY "sous_familles_read" ON sous_familles FOR SELECT TO authenticated USING (true);

-- Écriture admin uniquement
CREATE POLICY "familles_admin"      ON familles      FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "sous_familles_admin" ON sous_familles FOR ALL TO authenticated
  USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
