-- ============================================================
-- SCHÉMA SUPABASE — Gestion de stock de bougies (Paroisse)
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Table des lieux
CREATE TABLE lieux (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des références de bougies
CREATE TABLE bougies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stock par lieu (une ligne par combinaison bougie × lieu)
CREATE TABLE stock_par_lieu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bougie_id UUID NOT NULL REFERENCES bougies(id) ON DELETE CASCADE,
  lieu_id UUID NOT NULL REFERENCES lieux(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bougie_id, lieu_id)
);

-- 4. Historique des mouvements
CREATE TABLE mouvements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bougie_id UUID NOT NULL REFERENCES bougies(id) ON DELETE CASCADE,
  lieu_id UUID REFERENCES lieux(id) ON DELETE SET NULL,
  lieu_destination_id UUID REFERENCES lieux(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'transfert', 'import_csv')),
  quantite INTEGER NOT NULL,
  motif TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Profils utilisateurs (lié à Supabase Auth)
CREATE TABLE profils (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'utilisateur' CHECK (role IN ('admin', 'utilisateur')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================
INSERT INTO lieux (nom) VALUES
  ('Église'),
  ('Chapelle'),
  ('Sacristie'),
  ('Réserve');

-- ============================================================
-- TRIGGER : mise à jour automatique de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_updated_at
  BEFORE UPDATE ON stock_par_lieu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER : création automatique du profil à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION create_profil_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profils (id, email, role)
  VALUES (NEW.id, NEW.email, 'utilisateur');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_profil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profil_on_signup();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE bougies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_par_lieu ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;

-- Helper : récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profils WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Lieux : lecture pour tous, écriture admin seulement
CREATE POLICY "lieux_read" ON lieux FOR SELECT TO authenticated USING (true);
CREATE POLICY "lieux_write" ON lieux FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Bougies : lecture pour tous, écriture admin seulement
CREATE POLICY "bougies_read" ON bougies FOR SELECT TO authenticated USING (true);
CREATE POLICY "bougies_write" ON bougies FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Stock : lecture pour tous, écriture pour tous les connectés
CREATE POLICY "stock_read" ON stock_par_lieu FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_write" ON stock_par_lieu FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Mouvements : lecture pour tous, insertion pour tous
CREATE POLICY "mouvements_read" ON mouvements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mouvements_insert" ON mouvements FOR INSERT TO authenticated
  WITH CHECK (true);

-- Profils : chacun voit le sien, admin voit tout
CREATE POLICY "profils_self" ON profils FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "profils_admin_write" ON profils FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin');
