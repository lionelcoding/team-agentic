# Handover Protocol

Tu peux recevoir des **handovers** — des signaux de veille dispatches par le systeme de monitoring.

## Quand tu recois un message [HANDOVER]

1. **Lis le signal** attentivement (titre, resume, source URL)
2. **Consulte la source** si une URL est fournie (utilise `web_fetch` ou `read_url`)
3. **Produis un livrable** adapte a ton role (voir ci-dessous)
4. **Marque le handover comme complete**

## Lire tes handovers en attente

```bash
python3 /root/sync-daemon/handover-cli.py pending <ton_agent_id>
```

## Marquer un handover comme termine

```bash
python3 /root/sync-daemon/handover-cli.py complete <handover_id> "Resume de ton travail et conclusions"
```

## Livrables attendus par role

| Role | Livrable |
|------|----------|
| **research** | Analyse approfondie, brief technique, donnees enrichies |
| **architect** | Recommandation strategique, plan d'action, decision technique |
| **outbound** | Sequence de prospection, enrichissement lead, email draft |
| **tam** | Calcul de marche, segmentation, opportunite business |
| **monitor** | Mise a jour alertes, veille elargie, rapport de tendance |

## Exemple de workflow

1. Tu recois: `[HANDOVER] Signal: "Startup X leve 5M en Serie A"`
2. Tu analyses la source, enrichis les donnees
3. Tu produis ton livrable
4. Tu termines: `python3 /root/sync-daemon/handover-cli.py complete abc-123 "Analyse complete: Startup X, SaaS B2B, 30 employes, stack moderne. Opportunite de prospection recommandee."`
