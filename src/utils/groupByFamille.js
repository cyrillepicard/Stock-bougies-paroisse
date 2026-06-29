const SANS_FAMILLE = '__sans_famille__'

export function groupByFamille(rows) {
  const groups = {}
  rows.forEach(row => {
    const bougie = row.bougie || row
    const famId = bougie.famille_id || SANS_FAMILLE
    const famNom = bougie.familles?.nom || (famId === SANS_FAMILLE ? 'Sans famille' : famId)
    const sfId = bougie.sous_famille_id || '__sans_sf__'
    const sfNom = bougie.sous_familles?.nom || null

    if (!groups[famId]) groups[famId] = { nom: famNom, sousFamilles: {}, order: famId === SANS_FAMILLE ? 'zzz' : famNom }
    if (!groups[famId].sousFamilles[sfId]) groups[famId].sousFamilles[sfId] = { nom: sfNom, rows: [] }
    groups[famId].sousFamilles[sfId].rows.push(row)
  })
  return Object.values(groups)
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(g => ({
      ...g,
      sousFamilles: Object.values(g.sousFamilles).sort((a, b) => {
        if (!a.nom && !b.nom) return 0
        if (!a.nom) return -1
        if (!b.nom) return 1
        return a.nom.localeCompare(b.nom)
      })
    }))
}

export function groupBougiesByFamille(bougies) {
  const SANS_FAM = '__sans_famille__'
  const groups = {}
  bougies.forEach(b => {
    const famId = b.famille_id || SANS_FAM
    const famNom = b.familles?.nom || 'Sans famille'
    const sfId = b.sous_famille_id || '__sans_sf__'
    const sfNom = b.sous_familles?.nom || null
    if (!groups[famId]) groups[famId] = { nom: famNom, order: famId === SANS_FAM ? 'zzz' : famNom, sfs: {} }
    if (!groups[famId].sfs[sfId]) groups[famId].sfs[sfId] = { nom: sfNom, bougies: [] }
    groups[famId].sfs[sfId].bougies.push(b)
  })
  return Object.values(groups)
    .sort((a, z) => a.order.localeCompare(z.order))
    .map(g => ({
      ...g,
      sfs: Object.values(g.sfs).sort((a, b) => {
        if (!a.nom && !b.nom) return 0
        if (!a.nom) return -1
        if (!b.nom) return 1
        return a.nom.localeCompare(b.nom)
      })
    }))
}
