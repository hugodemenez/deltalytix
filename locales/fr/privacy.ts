export default {
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 1 novembre 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (« nous ») s'engage à protéger votre vie privée. Cette politique décrit les catégories de données personnelles que nous collectons, les finalités, les destinataires, les durées de conservation et les contrôles dont vous disposez lorsque vous utilisez notre service, y compris l'API publique et les connecteurs Model Context Protocol (MCP).",
    },
    collect: {
      title: "2. Informations que nous collectons",
      lead: "Nous collectons uniquement les données nécessaires au journal, à l'analyse, à la facturation et aux applications connectées. Les catégories sont :",
      account:
        "Informations de compte : adresse e-mail, nom, langue, et URL de la photo de profil Discord si vous vous connectez via Discord.",
      trades:
        "Les trades que vous importez ou saisissez, notamment instruments, prix, dates, quantités, PnL, commissions, commentaires, tags et captures d'écran jointes.",
      journal:
        "Les entrées de journal et de mindset que vous rédigez, y compris les notes d'humeur et le contenu associé.",
      connections:
        "Métadonnées de connexion courtier : service, environnement, dernière synchronisation et numéros de comptes liés. Les mots de passe, clés API et autres secrets courtier sont stockés uniquement pour synchroniser vos comptes et ne sont jamais renvoyés via l'API publique ou MCP.",
      billing:
        "Enregistrements d'abonnement et de facturation. Les paiements sont traités par Stripe. Nous ne stockons pas les numéros complets de carte, les identifiants officiels ni des données de santé.",
      analytics:
        "Données d'usage et de mesure, décrites dans Mesure d'audience.",
      tokens:
        "Autorisations OAuth et jetons d'accès personnels que vous créez pour que des applications tierces accèdent à votre compte.",
    },
    use: {
      title: "3. Comment nous utilisons vos informations",
      lead: "Nous utilisons les informations collectées notamment pour :",
      service: "Fournir et maintenir notre service, y compris votre journal, vos comptes et vos analyses de performance",
      notify: "Vous informer des changements de notre service",
      features: "Vous permettre d'utiliser les fonctionnalités interactives",
      support: "Fournir un support",
      billing: "Traiter les abonnements et envoyer les e-mails transactionnels",
      connectors:
        "Vous permettre de connecter des applications et clients MCP autorisés à vos propres données, dans la limite des scopes que vous accordez",
      improve: "Analyser l'usage pour améliorer le service",
      monitor: "Suivre l'utilisation du service",
      security: "Détecter, prévenir et traiter les problèmes techniques",
    },
    processors: {
      title: "4. Destinataires et sous-traitants",
      lead: "Nous partageons des données personnelles avec les prestataires suivants, chacun pour une finalité limitée :",
      supabase: "Supabase : authentification et hébergement de la base de données.",
      stripe: "Stripe : traitement des paiements et facturation des abonnements.",
      posthog:
        "PostHog : mesure d'audience et d'usage produit, hébergé dans l'Union européenne. Les requêtes passent par deltalytix.app.",
      resend:
        "Resend : e-mails transactionnels (bienvenue, récapitulatif hebdomadaire, réponses support).",
      authorizedApps:
        "Lorsque vous autorisez une application tierce, elle ne reçoit que les données couvertes par les scopes que vous accordez. Cela inclut les plugins et applications ChatGPT, les connecteurs Claude, Cursor, Grok, et tout autre client OAuth, API ou MCP que vous connectez.",
      noSale:
        "Nous ne vendons pas vos données personnelles. Nous ne les partageons qu'avec les sous-traitants nommés ici, les applications que vous autorisez, ou lorsque la loi l'exige.",
    },
    storage: {
      title: "5. Stockage et sécurité des données",
      content:
        "Nous utilisons Supabase, un service conforme SOC 2, pour stocker vos données. Nous mettons en œuvre des pratiques de collecte, de stockage et de traitement ainsi que des mesures de sécurité pour protéger vos informations personnelles contre l'accès, la modification, la divulgation ou la destruction non autorisés.",
    },
    retention: {
      title: "6. Conservation des données",
      content:
        "Les trades et les données de journal restent tant que votre compte existe. Lorsque vous supprimez votre compte depuis les Paramètres, nous supprimons vos trades, données de journal, connexions et informations de compte. Nous annulons aussi les abonnements Stripe actifs et supprimons le client Stripe lié à votre e-mail. La conservation et le refus de la mesure d'audience sont décrits dans Mesure d'audience.",
    },
    connectors: {
      title: "7. Applications connectées, API et MCP",
      lead: "Vous pouvez connecter des clients tiers qui utilisent l'API publique Deltalytix ou le serveur MCP à l'adresse https://www.deltalytix.app/api/mcp. Cela inclut les plugins et applications ChatGPT, les connecteurs Claude, Cursor, Grok, et tout autre client OAuth ou à jeton personnel. Nous ne recevons pas vos conversations avec ces clients. Nous ne recevons que les requêtes API ou MCP authentifiées qu'ils font en votre nom.",
      scopes:
        "L'accès est limité aux scopes OAuth ou de jeton personnel que vous accordez, par exemple profile:read, accounts:read, trades:read, metrics:read et connections:read. L'API publique accepte aussi des scopes d'écriture (trades:write, connections:write, imports:write) uniquement si vous les accordez.",
      toolsLead:
        "Les outils MCP sont en lecture seule. Ils appellent les mêmes fonctions serveur que les routes GET /api/v1 correspondantes et n'acceptent jamais d'identifiant utilisateur :",
      toolProfile: "get_profile — profile:read",
      toolAccounts: "list_accounts — accounts:read",
      toolTrades: "list_trades — trades:read",
      toolMetrics: "get_metrics_summary — metrics:read",
      toolAccountMetrics: "get_account_metrics — metrics:read",
      toolEquity: "get_equity_curve — metrics:read",
      toolDailyPnl: "get_daily_pnl — metrics:read",
      toolConnections: "list_connections — connections:read",
      access:
        "Les outils et les requêtes API n'accèdent qu'aux données de l'utilisateur connecté. Il n'y a pas d'accès inter-utilisateurs. Un jeton ne peut pas lire un autre compte.",
      secrets:
        "Les jetons et secrets courtier ne sont jamais renvoyés par l'API ni par list_connections.",
      revoke:
        "Vous pouvez révoquer les applications connectées et les jetons d'accès personnels à tout moment dans Paramètres → Connexions. Un jeton révoqué est refusé dès la requête suivante.",
    },
    cookies: {
      title: "8. Cookies",
      content:
        "Nous utilisons des « cookies » pour collecter des informations. Les cookies sont de petits fichiers stockés sur votre disque par un site. Nous pouvons utiliser des cookies de session (qui expirent à la fermeture du navigateur) et des cookies persistants (qui restent jusqu'à ce que vous les supprimiez) pour offrir une expérience plus personnelle. Les cookies nécessaires vous maintiennent connecté et protègent le service. Les cookies facultatifs d'usage produit et de publicité sont décrits dans Mesure d'audience.",
    },
    analytics: {
      title: "9. Mesure d'audience",
      provider:
        "Nous utilisons PostHog, hébergé dans l'Union européenne, pour comprendre comment le site est utilisé et si le paiement fonctionne. Les requêtes passent par deltalytix.app : votre navigateur nous parle, pas directement à PostHog.",
      beforeConsent:
        "Si vous venez de l'EEE, du Royaume-Uni ou de Suisse — ou si nous ne pouvons pas déterminer votre pays — nous affichons une bannière de consentement. Tant que vous n'acceptez pas, nous ne collectons qu'une mesure anonyme et sans cookie : pages vues et comptages de tunnel, sans cookies, sans localStorage, sans identifiant stocké et sans replay de session.",
      afterConsent:
        "Si vous acceptez l'usage produit, nous pouvons utiliser des cookies pour reconnaître votre compte et enregistrer un replay de session. Les champs de formulaire et de carte restent masqués dans chaque replay.",
      otherRegions:
        "Si vous venez d'ailleurs (par exemple des États-Unis), nous mesurons l'usage par défaut. Vous pouvez vous y opposer à tout moment via le lien « Refuser la mesure d'audience » dans le pied de page ou sur cette page. Ce choix est mémorisé dans un cookie.",
      conversions:
        "La création de compte, le début de paiement et un abonnement conclu sont enregistrés sur nos serveurs avec un identifiant utilisateur pseudonyme, pour qu'une vente ne soit pas perdue si un navigateur bloque les scripts. Pour les visiteurs de l'EEE, du Royaume-Uni ou de Suisse, nous n'attachons pas votre e-mail à ces événements.",
      optOut: "Refuser la mesure d'audience",
      optedOut: "Mesure d'audience refusée",
    },
    thirdParty: {
      title: "10. Services tiers",
      content:
        "Outre les sous-traitants nommés ci-dessus (Supabase, Stripe, PostHog et Resend), notre service peut contenir des liens vers d'autres sites que nous n'exploitons pas. Nous vous conseillons de lire la politique de confidentialité de chaque site visité.",
    },
    rights: {
      title: "11. Vos droits et contrôles",
      lead: "Vous pouvez accéder à vos informations personnelles, les mettre à jour et les supprimer, et contrôler la mesure d'audience et les applications connectées :",
      access:
        "Consultez et mettez à jour votre compte, vos trades et votre journal dans le tableau de bord. Vous pouvez aussi nous écrire pour obtenir une copie de vos données.",
      delete:
        "Supprimez votre compte dans les Paramètres. Cela retire définitivement vos trades, données de journal, connexions et facturation.",
      analytics:
        "Refusez la mesure d'audience via le lien de cette page ou du pied de page. Dans les Paramètres, vous pouvez aussi modifier le consentement cookies.",
      revoke:
        "Révoquez les applications connectées et les jetons d'accès personnels dans Paramètres → Connexions.",
      gdpr:
        "Nous respectons le Règlement général sur la protection des données (RGPD). Pour exercer ces droits, contactez-nous à l'adresse ci-dessous.",
    },
    changes: {
      title: "12. Modifications de cette politique",
      content:
        "Nous pouvons mettre à jour cette politique. Nous vous en informerons en publiant la nouvelle version sur cette page et en actualisant la date de « Dernière mise à jour ».",
    },
    contact: {
      title: "13. Nous contacter",
      content:
        "Pour toute question sur cette politique de confidentialité, écrivez-nous à :",
      email: "privacy@deltalytix.app",
    },
  },
} as const;
