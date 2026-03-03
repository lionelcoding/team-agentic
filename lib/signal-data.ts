export type SignalSource = "Twitter" | "Reddit" | "YouTube" | "LinkedIn" | "RSS"
export type SignalImpact = "HIGH" | "MEDIUM" | "LOW"
export type SignalStatus = "pending" | "approved" | "rejected" | "dispatched"
export type SignalTab = "knowledge" | "strategy" | "outbound"

export interface SignalItem {
  id: string
  tab: SignalTab
  source: SignalSource
  sourceHandle: string
  impact: SignalImpact
  status: SignalStatus
  title: string
  content: string
  url: string
  company?: {
    name: string
    sector: string
  }
  createdAt: Date
}

export const SIGNAL_ITEMS: SignalItem[] = [
  {
    id: "sig-001",
    tab: "knowledge",
    source: "Twitter",
    sourceHandle: "@benedictevans",
    impact: "HIGH",
    status: "pending",
    title: "L'IA générative réduit de 40% le temps de qualification des leads B2B en 2025",
    content:
      "Thread fascinant sur l'impact de l'IA dans les processus de vente. Les équipes utilisant des agents IA pour la qualification voient leur cycle de vente réduit de 40% en moyenne. Les données de 120 SaaS B2B européens montrent une adoption massive depuis Q3 2024.",
    url: "https://twitter.com/benedictevans/status/example",
    company: { name: "Benedict Evans", sector: "Analyse Tech" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "sig-002",
    tab: "knowledge",
    source: "Reddit",
    sourceHandle: "r/SaaS",
    impact: "HIGH",
    status: "approved",
    title: "Retour d'expérience : 6 mois avec un stack de prospection 100% automatisé",
    content:
      "Post viral sur r/SaaS avec 847 upvotes. Un fondateur détaille comment il a automatisé l'intégralité de son outreach B2B avec des agents IA. Résultats : 3x plus de rendez-vous qualifiés, 60% de réduction des coûts de prospection. Mentionne explicitement des outils comme Clay et Apollo.",
    url: "https://reddit.com/r/SaaS/comments/example",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: "sig-003",
    tab: "knowledge",
    source: "YouTube",
    sourceHandle: "Lenny's Podcast",
    impact: "MEDIUM",
    status: "pending",
    title: "Product-Led Growth vs Sales-Led en 2025 : quelle stratégie pour les SaaS B2B ?",
    content:
      "Interview de 90 minutes avec le CEO de Notion sur l'évolution des stratégies GTM. Points clés : le PLG seul ne suffit plus pour les deals enterprise, le modèle hybride PLG+Sales devient la norme, l'IA permet d'automatiser la détection des PQL (Product Qualified Leads).",
    url: "https://youtube.com/watch?v=example",
    company: { name: "Lenny's Podcast", sector: "Média Tech" },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: "sig-004",
    tab: "knowledge",
    source: "LinkedIn",
    sourceHandle: "Guillaume Moubeche",
    impact: "HIGH",
    status: "dispatched",
    title: "Nouveau framework de scoring ICP pour SaaS B2B : les 7 signaux qui prédisent la conversion",
    content:
      "Post de Guillaume Moubeche (lemlist) avec 2,400 réactions. Il détaille un nouveau modèle de scoring basé sur 7 signaux comportementaux et firmographiques. Inclut des données exclusives sur 50,000 prospects analysés. Très pertinent pour notre module de scoring Diane.",
    url: "https://linkedin.com/posts/example",
    company: { name: "lemlist", sector: "Sales Automation" },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: "sig-005",
    tab: "knowledge",
    source: "RSS",
    sourceHandle: "TechCrunch",
    impact: "MEDIUM",
    status: "pending",
    title: "Funding : Cognism lève 100M$ pour son moteur de données B2B alimenté par l'IA",
    content:
      "TechCrunch rapporte la levée de fonds record de Cognism. Le concurrent direct développe un nouveau moteur de données firmographiques utilisant le LLM pour l'enrichissement en temps réel. Implique une accélération de la concurrence sur le segment de la donnée B2B européenne.",
    url: "https://techcrunch.com/example",
    company: { name: "Cognism", sector: "B2B Data" },
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
  },
  {
    id: "sig-006",
    tab: "knowledge",
    source: "Twitter",
    sourceHandle: "@jasonlk",
    impact: "LOW",
    status: "rejected",
    title: "Les cold emails sont morts, vive le warm outbound piloté par les données d'intention",
    content:
      "Jason Lemkin partage ses observations sur l'évolution du cold outbound. Les taux de réponse aux cold emails chutent sous 1% tandis que les séquences warm outbound (basées sur des signaux d'intention) atteignent 12-18%. Recommande de prioriser les données d'intention d'achat.",
    url: "https://twitter.com/jasonlk/status/example",
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
  },
  {
    id: "sig-007",
    tab: "knowledge",
    source: "Reddit",
    sourceHandle: "r/B2Bmarketing",
    impact: "MEDIUM",
    status: "approved",
    title: "Comparatif 2025 : Apollo vs Clay vs Lemlist pour l'outreach automatisé",
    content:
      "Discussion de 200+ commentaires comparant les principales plateformes d'outreach. Consensus : Clay s'impose pour l'enrichissement multi-sources, Apollo pour la base de données, lemlist pour la personnalisation IA. Plusieurs mentions de stacks hybrides utilisant les trois outils en combinaison.",
    url: "https://reddit.com/r/B2Bmarketing/comments/example",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
  },
  {
    id: "sig-008",
    tab: "knowledge",
    source: "LinkedIn",
    sourceHandle: "Thibault Louis",
    impact: "HIGH",
    status: "pending",
    title: "RGPD & prospection B2B en 2025 : ce qui change pour les données tierces",
    content:
      "Article détaillé d'un expert RGPD français sur les nouvelles obligations pour la prospection B2B. La CNIL a émis de nouvelles lignes directrices en janvier 2025. Points critiques : consentement implicite pour les données professionnelles, durée de conservation limitée à 3 ans, droit à l'effacement renforcé.",
    url: "https://linkedin.com/posts/example2",
    company: { name: "Cabinet Juridique RGPD", sector: "Droit Digital" },
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
  },
  {
    id: "sig-009",
    tab: "knowledge",
    source: "YouTube",
    sourceHandle: "SaaStr",
    impact: "MEDIUM",
    status: "pending",
    title: "Comment HubSpot a utilisé l'IA pour tripler ses leads qualifiés en 12 mois",
    content:
      "Conférence SaaStr Annual 2025 : le VP Growth de HubSpot détaille leur transformation IA. Ils ont déployé 8 agents IA spécialisés sur l'ensemble du funnel d'acquisition. Résultats annoncés : +312% de MQL, -45% de coût par lead qualifié, +78% de taux de conversion MQL→SQL.",
    url: "https://youtube.com/watch?v=example2",
    company: { name: "HubSpot", sector: "CRM SaaS" },
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    id: "sig-010",
    tab: "knowledge",
    source: "RSS",
    sourceHandle: "The SaaS CFO",
    impact: "MEDIUM",
    status: "dispatched",
    title: "Benchmarks SaaS Q1 2025 : CAC, LTV, Churn et NRR par segment de marché",
    content:
      "Rapport trimestriel The SaaS CFO avec les métriques clés pour les SaaS B2B. Médiane CAC : €1,200 (SMB), €8,500 (Mid-Market), €45,000 (Enterprise). NRR médian : 108% tous segments confondus. Le CAC payback period s'allonge à 18 mois pour les solutions complexes.",
    url: "https://thesaascfo.com/benchmarks-q1-2025",
    company: { name: "The SaaS CFO", sector: "Finance SaaS" },
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
  },
  {
    id: "sig-011",
    tab: "knowledge",
    source: "Twitter",
    sourceHandle: "@coreyhainesco",
    impact: "LOW",
    status: "pending",
    title: "Thread : Les 10 erreurs que font les SaaS B2B sur leur ICP en phase de croissance",
    content:
      "Corey Haines (ex-Baremetrics) partage ses observations après avoir travaillé avec 200+ SaaS. Erreur n°1 : définir l'ICP trop large pour 'ne pas rater d'opportunités'. Erreur n°3 : ignorer les signaux négatifs (churners). Recommande un audit ICP tous les 6 mois.",
    url: "https://twitter.com/coreyhainesco/status/example",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
  },
  {
    id: "sig-012",
    tab: "knowledge",
    source: "LinkedIn",
    sourceHandle: "Benoît Dubos",
    impact: "HIGH",
    status: "approved",
    title: "Étude de cas : comment ce SaaS français a atteint 1M ARR avec 0 commercial",
    content:
      "Benoît Dubos (Scalezia) publie une étude de cas détaillée sur un SaaS B2B français qui a atteint 1M€ ARR sans aucune équipe commerciale. Stratégie : content marketing + outbound IA + trials automatisés. Le CEO partage toute la stack technique et les résultats mois par mois.",
    url: "https://linkedin.com/posts/example3",
    company: { name: "Scalezia", sector: "Growth Agency" },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
]

export const AGENTS_FOR_DISPATCH = [
  { id: "iris", name: "Iris", role: "Veille PESTEL", pole: "ACQ" },
  { id: "hugo", name: "Hugo", role: "Scraper", pole: "ACQ" },
  { id: "simon", name: "Simon", role: "Enrichissement", pole: "ACQ" },
  { id: "diane", name: "Diane", role: "ICP Scoring", pole: "ACQ" },
  { id: "alice", name: "Alice", role: "Emailing", pole: "GRO" },
  { id: "thomas", name: "Thomas", role: "Nurturing", pole: "GRO" },
]

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  return `Il y a ${diffDays}j`
}

export const TAB_COUNTS: Record<SignalTab, number> = {
  knowledge: 12,
  strategy: 7,
  outbound: 5,
}
