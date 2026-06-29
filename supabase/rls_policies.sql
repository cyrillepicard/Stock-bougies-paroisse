-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Gestion de stock bougies
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Fonction utilitaire : vérifie si l'utilisateur connecté est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profils
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLE : lieux
-- ============================================================
ALTER TABLE lieux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lieux_select" ON lieux;
DROP POLICY IF EXISTS "lieux_insert" ON lieux;
DROP POLICY IF EXISTS "lieux_update" ON lieux;
DROP POLICY IF EXISTS "lieux_delete" ON lieux;

CREATE POLICY "lieux_select" ON lieux FOR SELECT TO authenticated USING (true);
CREATE POLICY "lieux_insert" ON lieux FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "lieux_update" ON lieux FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "lieux_delete" ON lieux FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : familles
-- ============================================================
ALTER TABLE familles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "familles_select" ON familles;
DROP POLICY IF EXISTS "familles_insert" ON familles;
DROP POLICY IF EXISTS "familles_update" ON familles;
DROP POLICY IF EXISTS "familles_delete" ON familles;

CREATE POLICY "familles_select" ON familles FOR SELECT TO authenticated USING (true);
CREATE POLICY "familles_insert" ON familles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "familles_update" ON familles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "familles_delete" ON familles FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : sous_familles
-- ============================================================
ALTER TABLE sous_familles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sous_familles_select" ON sous_familles;
DROP POLICY IF EXISTS "sous_familles_insert" ON sous_familles;
DROP POLICY IF EXISTS "sous_familles_update" ON sous_familles;
DROP POLICY IF EXISTS "sous_familles_delete" ON sous_familles;

CREATE POLICY "sous_familles_select" ON sous_familles FOR SELECT TO authenticated USING (true);
CREATE POLICY "sous_familles_insert" ON sous_familles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "sous_familles_update" ON sous_familles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "sous_familles_delete" ON sous_familles FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : bougies
-- ============================================================
ALTER TABLE bougies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bougies_select" ON bougies;
DROP POLICY IF EXISTS "bougies_insert" ON bougies;
DROP POLICY IF EXISTS "bougies_update" ON bougies;
DROP POLICY IF EXISTS "bougies_delete" ON bougies;

CREATE POLICY "bougies_select" ON bougies FOR SELECT TO authenticated USING (true);
CREATE POLICY "bougies_insert" ON bougies FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "bougies_update" ON bougies FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "bougies_delete" ON bougies FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : stock_par_lieu
--   INSERT/UPDATE : tous (entrée, sortie, transfert)
--   DELETE : admin uniquement
-- ============================================================
ALTER TABLE stock_par_lieu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_select" ON stock_par_lieu;
DROP POLICY IF EXISTS "stock_insert" ON stock_par_lieu;
DROP POLICY IF EXISTS "stock_update" ON stock_par_lieu;
DROP POLICY IF EXISTS "stock_delete" ON stock_par_lieu;

CREATE POLICY "stock_select" ON stock_par_lieu FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_insert" ON stock_par_lieu FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stock_update" ON stock_par_lieu FOR UPDATE TO authenticated USING (true);
CREATE POLICY "stock_delete" ON stock_par_lieu FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : mouvements
--   INSERT : tous (traçabilité des actions)
--   DELETE : admin uniquement
-- ============================================================
ALTER TABLE mouvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mouvements_select" ON mouvements;
DROP POLICY IF EXISTS "mouvements_insert" ON mouvements;
DROP POLICY IF EXISTS "mouvements_delete" ON mouvements;

CREATE POLICY "mouvements_select" ON mouvements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mouvements_insert" ON mouvements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mouvements_delete" ON mouvements FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- TABLE : profils
--   Lecture : chacun voit son propre profil; admin voit tous
--   UPDATE/DELETE : admin uniquement
-- ============================================================
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profils_select_own" ON profils;
DROP POLICY IF EXISTS "profils_update" ON profils;
DROP POLICY IF EXISTS "profils_delete" ON profils;

CREATE POLICY "profils_select_own" ON profils FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profils_update" ON profils FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "profils_delete" ON profils FOR DELETE TO authenticated USING (public.is_admin());
