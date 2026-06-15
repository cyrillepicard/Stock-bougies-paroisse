-- ============================================================
-- MIGRATION — À exécuter dans Supabase SQL Editor
-- Ajoute photo_url et qte_mini sur la table bougies
-- ============================================================

-- 1. Nouvelles colonnes sur bougies
ALTER TABLE bougies
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qte_mini INTEGER DEFAULT NULL;

-- 2. Créer le bucket de stockage pour les photos
-- (à faire aussi dans Supabase > Storage > New bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bougies-photos', 'bougies-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politique RLS pour le bucket : lecture publique, écriture admin
CREATE POLICY "photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bougies-photos');

CREATE POLICY "photos_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bougies-photos'
    AND (SELECT role FROM profils WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "photos_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bougies-photos'
    AND (SELECT role FROM profils WHERE id = auth.uid()) = 'admin'
  );
