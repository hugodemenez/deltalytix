export default {
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 13 novembre 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix, exploité par Hugo Demenez (« nous »), s'engage à protéger votre vie privée. Cette politique décrit les catégories de données personnelles collectées, les finalités, les destinataires et sous-traitants, la durée de conservation par catégorie, les contrôles dont vous disposez, et la façon dont les applications d'IA et les outils Model Context Protocol (MCP) utilisent vos données. Elle s'applique à deltalytix.app, à l'API publique et au serveur MCP à l'adresse https://www.deltalytix.app/api/mcp.",
      controller:
        "Responsable du traitement : Deltalytix, exploité par Hugo Demenez. Contact : contact@deltalytix.app.",
    },
    collect: {
      title: "2. Données collectées",
      lead: "Nous collectons uniquement les données nécessaires au journal, à l'analyse, à la facturation, à l'IA intégrée, à la newsletter marketing et aux applications connectées. Les catégories sont :",
      account:
        "Informations de compte : adresse e-mail, nom, langue, et URL de la photo de profil si vous vous connectez via Google ou Discord.",
      trades:
        "Les trades que vous importez ou saisissez, notamment instruments, prix, dates, quantités, PnL, commissions, commentaires, tags et captures d'écran jointes.",
      journal:
        "Les entrées de journal et de mindset que vous rédigez, y compris les notes d'humeur et le contenu associé.",
      connections:
        "Métadonnées de connexion courtier : service, environnement, dernière synchronisation et numéros de comptes liés. Les mots de passe, clés API et autres secrets courtier sont stockés uniquement pour synchroniser vos comptes et ne sont jamais renvoyés via l'API publique ou MCP.",
      billing:
        "Enregistrements d'abonnement et de facturation. Les paiements sont traités par Stripe. Nous ne stockons pas les numéros complets de carte, les identifiants officiels ni des données de santé.",
      analytics:
        "Données d'usage et de mesure, décrites dans Mesure d'audience, y compris l'adresse IP et l'user agent traités par nos prestataires d'hébergement et d'analytics.",
      tokens:
        "Autorisations OAuth et jetons d'accès personnels que vous créez pour que des applications tierces accèdent à votre compte. Nous conservons un horodatage de dernière utilisation par jeton, pas les arguments d'outils ni les corps de réponse.",
      aiChat:
        "Conversations d'IA intégrée : messages envoyés à l'assistant du tableau de bord et à l'assistant support, y compris les images jointes dans le chat support. Le chat du tableau de bord est enregistré automatiquement avec l'entrée journal/humeur du jour et conservé jusqu'à ce que vous supprimiez cette entrée du jour ou votre compte. Réinitialiser le chat n'efface que l'affichage à l'écran ; cela ne supprime pas le chat enregistré pour ce jour.",
      aiFeatures:
        "Données envoyées aux fournisseurs de modèles pour les fonctions d'IA : texte de journal à expliquer ou développer ; lignes CSV complètes pour le mapping et le formatage d'import IA (jusqu'à 500 lignes, par lots de 50 — pas seulement les en-têtes et échantillons) ; requêtes de recherche de dates en langage naturel ; audio téléversé pour la transcription ; agrégats de performance hebdomadaires pour le récapitulatif ; questions FAQ publiques sur la page d'accueil ; e-mails d'abonnés à la newsletter pour le formatage du nom ; et, pour le chat du tableau de bord et les outils d'analyse, trades, entrées de journal, conversations passées et résumés de semaine renvoyés au modèle comme résultats d'outils.",
      community:
        "Contenu communautaire que vous publiez : posts, commentaires et votes.",
      shares:
        "Liens de tableaux de bord partagés que vous créez. Les liens de partage sont publics par défaut jusqu'à ce que vous changiez ce réglage ou qu'ils expirent.",
      teams:
        "Appartenance à une équipe ou une entreprise : lorsque vous rejoignez une équipe ou une entreprise, les managers peuvent consulter et exporter les trades des traders dans le cadre de cette fonctionnalité.",
      newsletter:
        "Abonnement à la newsletter marketing : adresse e-mail si vous vous abonnez, jusqu'au désabonnement ou à la suppression du compte.",
      technical:
        "Journaux techniques nécessaires au fonctionnement du service, y compris les métadonnées de requêtes API/MCP décrites dans Applications d'IA et outils MCP, et l'adresse IP / user agent via l'hébergement et l'analytics.",
    },
    use: {
      title: "3. Finalités",
      lead: "Nous utilisons les informations collectées notamment pour :",
      service:
        "Fournir et maintenir notre service, y compris votre journal, vos comptes et vos analyses de performance",
      notify:
        "Vous informer des changements de notre service et des modifications importantes de cette politique de confidentialité",
      features: "Vous permettre d'utiliser les fonctionnalités interactives",
      support: "Fournir un support client et produit, y compris l'assistant support intégré",
      billing: "Traiter les abonnements et envoyer les e-mails transactionnels",
      newsletter:
        "Envoyer la newsletter marketing aux abonnés qui ont consenti (désabonnement via le lien de chaque newsletter)",
      ai:
        "Alimenter les fonctions d'IA intégrées (chat du tableau de bord, assistant support, IA journal, aides d'import CSV, analyses, transcription, brouillon de récapitulatif hebdomadaire, formatage de nom pour la newsletter)",
      connectors:
        "Vous permettre de connecter des applications et clients MCP autorisés à vos propres données, dans la limite des scopes que vous accordez",
      improve: "Analyser l'usage pour améliorer le service",
      monitor: "Suivre l'utilisation du service",
      advertising:
        "Mesurer la publicité et les conversions (Google Ads / GA4) lorsque les paramètres de consentement le permettent",
      security: "Détecter, prévenir et traiter les problèmes techniques et les abus",
    },
    processors: {
      title: "4. Destinataires et sous-traitants",
      lead: "Nous partageons des données personnelles avec les destinataires suivants, chacun pour une finalité limitée :",
      supabase:
        "Supabase : authentification, hébergement de la base de données et stockage de fichiers pour les captures d'écran de trades et images de journal.",
      stripe: "Stripe : traitement des paiements et facturation des abonnements.",
      posthog:
        "PostHog : mesure d'audience et d'usage produit, hébergé dans l'Union européenne. Les requêtes passent par deltalytix.app. Les événements peuvent inclure pages vues, événements produit et (avec consentement) replay de session. Les événements d'analytics sont conservés jusqu'à la rétention configurée dans notre projet PostHog Cloud EU (actuellement jusqu'à 7 ans).",
      resend:
        "Resend : e-mails transactionnels (bienvenue, récapitulatif hebdomadaire, réponses support) et newsletter marketing.",
      vercel:
        "Vercel : hébergement de l'application, exécution serverless, Web Analytics, Speed Insights, journaux d'exécution et (le cas échéant) la Vercel AI Gateway qui achemine certaines requêtes de modèles. Vercel Web Analytics est agrégé et sans cookie (le hash visiteur est réinitialisé chaque jour) ; les fenêtres de reporting suivent la rétention documentée de Vercel (jusqu'à 12 mois sur Pro, jusqu'à 24 mois avec Web Analytics Plus / Enterprise). Speed Insights reçoit des métriques de performance. La rétention des journaux d'exécution suit les défauts Vercel (jusqu'à 1 jour sur Pro, jusqu'à 30 jours avec Observability Plus).",
      google:
        "Google : Google Analytics 4 (GA4) et conversions Google Ads en production. La balise Google se charge avec le Consent Mode ; hors EEE/Royaume-Uni/Suisse, le consentement ads peut être accordé par défaut jusqu'à votre refus. Avec le consentement ads hors du flux de bannière EEE, nous pouvons envoyer des événements de conversion (valeur, devise, identifiant de transaction), des identifiants de clic (par exemple gclid) et des conversions améliorées avec un e-mail haché SHA-256. Accepter la publicité dans la bannière de consentement EEE/Royaume-Uni/Suisse n'active pas les conversions améliorées avec e-mail haché. Lorsque le consentement est refusé, Google peut encore recevoir des pings Consent Mode sans cookie utilisés pour la modélisation des conversions. La rétention des données Google Analytics et Ads suit les défauts des produits Google (données utilisateur GA4 en général jusqu'à 14 mois sauf configuration contraire).",
      googleSignIn:
        "Connexion Google (et Discord) : fournisseurs d'identité lorsque vous choisissez ces modes de connexion.",
      aiProviders:
        "Fournisseurs de modèles d'IA (actuellement OpenAI, directement via notre clé API OpenAI et parfois via la Vercel AI Gateway, et Perplexity pour la fonction « explain » du journal via l'AI Gateway). Des variables d'environnement peuvent réacheminer certaines tâches d'IA vers d'autres fournisseurs. Les fournisseurs traitent les prompts et le contexte d'outils selon leurs conditions d'API ; les conditions d'API d'OpenAI prévoient que les entrées API ne sont pas utilisées pour entraîner des modèles par défaut. Nous envoyons les prompts et le contexte de compte nécessaires à la fonction que vous avez utilisée, comme décrit dans Données collectées.",
      brokers:
        "API courtiers et données de marché que vous connectez : Tradovate / NinjaTrader, Rithmic, Interactive Brokers, IG et dxFeed — pour synchroniser comptes, fills et données de marché demandées. Les identifiants DxFeed sont aussi envoyés aux hôtes historiques prop firm / Volumetrica renvoyés par cette connexion (par exemple Hyperticks ou d'autres hôtes spécifiques à une firme).",
      databento:
        "Databento : symboles d'instruments et fenêtres temporelles utilisés pour calculer le MAE/MFE et les analyses de trades associées.",
      calcom:
        "Cal.com : embed de prise de rendez-vous sur la page équipes (et liens de réservation associés) ; Cal.com reçoit les données nécessaires pour afficher l'embed et finaliser une réservation.",
      teams:
        "Managers d'équipe ou d'entreprise que vous rejoignez : ils peuvent voir et exporter les trades des traders au sein de cette équipe ou entreprise.",
      publicShares:
        "Toute personne disposant d'un lien de partage public : vues de tableaux de bord que vous publiez (publics par défaut).",
      community:
        "Autres utilisateurs des fonctionnalités communautaires : posts, commentaires et votes que vous y publiez.",
      authorizedApps:
        "Applications d'IA et autres clients que vous autorisez : ChatGPT / OpenAI, Claude / Anthropic, Cursor, Grok, et tout autre client OAuth, jeton personnel, API ou MCP. Ces applications ne reçoivent que les données couvertes par les scopes et outils que vous accordez. Une fois les sorties d'outils sorties de Deltalytix, la politique de confidentialité de l'application connectée s'applique à ces données.",
      noSale:
        "Nous ne vendons pas vos données personnelles. Nous ne les partageons qu'avec les destinataires nommés dans cette politique, les applications que vous autorisez, ou lorsque la loi l'exige.",
    },
    retention: {
      title: "5. Conservation des données",
      lead: "Nous conservons chaque catégorie uniquement aussi longtemps que nécessaire aux finalités ci-dessus :",
      tradesJournal:
        "Les trades et les données de journal restent tant que votre compte existe. Lorsque vous supprimez votre compte depuis les Paramètres, nous supprimons vos trades (y compris les analyses de trades associées et les fills du protocole Rithmic), données de journal, connexions et informations de compte, et nous supprimons vos captures d'écran et images de journal du stockage de fichiers dans le cadre de la suppression du compte. Nous tentons d'annuler les abonnements Stripe actifs et de supprimer le client Stripe lié à votre e-mail ; si le nettoyage Stripe ou le stockage échoue, l'échec est journalisé et la suppression peut se terminer avec un avertissement de nettoyage partiel. Stripe, et non Deltalytix, conserve les factures et enregistrements de paiement autant que la loi l'exige selon la rétention Stripe.",
      tokens:
        "Les autorisations OAuth et jetons d'accès personnels restent jusqu'à révocation dans Paramètres → Connexions ou suppression du compte. Après révocation, la requête API ou MCP suivante est refusée.",
      billing:
        "Dans notre application, nous supprimons les lignes Subscription lors de la suppression du compte. Stripe conserve les factures et enregistrements de facturation associés autant que la loi l'exige. Nous ne constituons pas une archive de facturation séparée à long terme au-delà de ce que Stripe conserve.",
      analytics:
        "Analytics produit PostHog : conservés jusqu'à la rétention configurée dans notre projet PostHog Cloud EU (actuellement jusqu'à 7 ans). Google Analytics 4 / Ads : jusqu'aux défauts des produits Google (données utilisateur GA4 en général jusqu'à 14 mois). Vercel Web Analytics est agrégé et sans cookie, avec la fenêtre de reporting documentée par Vercel (jusqu'à 12 mois sur Pro, jusqu'à 24 mois avec Web Analytics Plus / Enterprise). Vous pouvez refuser la mesure d'audience navigateur et la publicité facultatives comme indiqué dans Mesure d'audience.",
      aiChat:
        "Le chat d'IA du tableau de bord est enregistré automatiquement avec l'entrée journal/humeur du jour et conservé jusqu'à ce que vous supprimiez cette entrée du jour ou votre compte. Réinitialiser l'interface du chat ne supprime pas la conversation enregistrée. Les messages du chat support sont traités pour vous répondre et ne sont pas conservés comme archive séparée à long terme au-delà des journaux serveur ordinaires.",
      logs:
        "Nous ne conservons pas les arguments ni les réponses d'outils MCP, ni les corps de requête/réponse de l'API publique, dans les journaux ou l'analytics. Les données que vous écrivez via l'API (par exemple POST /api/v1/trades, /imports ou /connections) sont enregistrées dans votre compte comme les données saisies dans l'application. Nous émettons une ligne de journal structurée par requête HTTP API publique / OAuth / MCP (méthode, route, statut, latence, type de jeton, id application/client, identifiant utilisateur haché, code d'erreur optionnel) vers les journaux d'exécution Vercel. Ces lignes n'incluent jamais les en-têtes Authorization, les jetons bearer, ni les arguments/réponses d'outils. La rétention des journaux d'exécution Vercel est jusqu'à 1 jour sur Pro par défaut, et jusqu'à 30 jours avec Observability Plus.",
    },
    aiApps: {
      title: "6. Applications d'IA et outils MCP",
      lead: "Vous pouvez connecter des applications d'IA et d'autres clients qui utilisent l'API publique Deltalytix ou le serveur MCP à l'adresse https://www.deltalytix.app/api/mcp. Cela inclut les plugins et applications ChatGPT (OpenAI), les connecteurs Claude (Anthropic), Cursor, Grok, et tout autre client OAuth ou à jeton personnel. Nous ne recevons pas vos conversations avec ces clients. Nous ne recevons que les requêtes API ou MCP authentifiées qu'ils font en votre nom.",
      scopes:
        "L'accès est limité aux scopes OAuth ou de jeton personnel que vous accordez, par exemple profile:read, accounts:read, trades:read, metrics:read et connections:read. L'API publique accepte aussi des scopes d'écriture (trades:write, connections:write, imports:write) uniquement si vous les accordez. Les outils MCP sont en lecture seule et n'exposent pas d'opérations d'écriture.",
      tableLead:
        "Le tableau suivant liste chaque outil MCP actuellement enregistré sur le serveur MCP authentifié. Chaque outil appelle les mêmes fonctions serveur que la route GET /api/v1 correspondante, sauf get_daily_pnl, qui est une projection de GET /api/v1/metrics/equity (et non une route dédiée).",
      tableTool: "Outil",
      tableInputs: "Entrées",
      tableOutputs: "Données renvoyées",
      tableScope: "Scope OAuth",
      access:
        "Les outils et les requêtes API n'accèdent qu'aux données de l'utilisateur connecté. Il n'y a pas d'accès inter-utilisateurs. Un jeton ne peut pas lire un autre compte. Les outils n'acceptent jamais d'identifiant utilisateur en argument.",
      secrets:
        "Les identifiants courtier, mots de passe, clés API et jetons ne sont jamais renvoyés par l'API ni par les outils MCP (y compris list_connections).",
      recipient:
        "Les sorties d'outils sont envoyées à l'application d'IA ou au client que vous avez connecté (par exemple ChatGPT / OpenAI, Claude / Anthropic, Cursor ou Grok). La politique de confidentialité de cette application régit ensuite l'usage des données reçues.",
      logging:
        "Nous ne stockons pas les entrées ni les sorties d'outils MCP dans notre base de données, et nous n'envoyons pas les charges utiles MCP à PostHog. Nous ne conservons que les métadonnées de requête structurées décrites dans Conservation des données (journaux), plus un horodatage de dernière utilisation sur le jeton d'accès.",
      revoke:
        "Vous pouvez révoquer les applications connectées et les jetons d'accès personnels à tout moment dans Paramètres → Connexions. Un jeton révoqué est refusé dès la requête suivante.",
      webmcp:
        "Par ailleurs, le site peut enregistrer des aides WebMCP navigateur (deltalytix.discover_resources et deltalytix.navigate) qui ne renvoient que des URL de découverte publiques ou naviguent vers des pages publiques. Elles ne lisent pas vos données de trading et n'utilisent pas vos scopes OAuth.",
      inAppAi:
        "Les fonctions d'IA intégrées (chat du tableau de bord, assistant support, IA journal, aides CSV y compris l'import IA de lots de lignes complets, outils d'analyse qui renvoient trades/journal/conversations passées/résumés de semaine au modèle, transcription, récapitulatif hebdomadaire et formatage de nom pour la newsletter) envoient les prompts et le contexte de compte aux fournisseurs actuellement configurés (OpenAI et, pour l'explication de journal, Perplexity via la Vercel AI Gateway ; des variables d'environnement peuvent réacheminer les tâches). Les fournisseurs traitent ces données selon leurs conditions d'API ; les conditions d'API d'OpenAI prévoient que les entrées API ne sont pas utilisées pour entraîner des modèles par défaut. Ces fonctions sont distinctes des plugins ChatGPT ; elles s'exécutent dans Deltalytix lorsque vous les utilisez. Les applications tierces avec imports:write peuvent aussi déclencher l'import IA via POST /api/v1/imports avec type=ai.",
    },
    cookies: {
      title: "7. Cookies",
      content:
        "Nous utilisons des « cookies » pour collecter des informations. Les cookies sont de petits fichiers stockés sur votre disque par un site. Nous pouvons utiliser des cookies de session (qui expirent à la fermeture du navigateur) et des cookies persistants (qui restent jusqu'à ce que vous les supprimiez) pour offrir une expérience plus personnelle. Les cookies nécessaires vous maintiennent connecté et protègent le service. Les cookies facultatifs d'usage produit (PostHog), de publicité (Google Ads / GA4) et les signaux Consent Mode associés sont décrits dans Mesure d'audience.",
    },
    analytics: {
      title: "8. Mesure d'audience",
      provider:
        "Nous utilisons PostHog (analytics produit hébergé dans l'UE), Vercel Web Analytics et Speed Insights (métriques de page et de performance sur notre hébergement), et — sur les hôtes de production — Google Analytics 4 et les conversions Google Ads. Les requêtes PostHog passent par deltalytix.app : votre navigateur nous parle, pas directement à PostHog.",
      beforeConsent:
        "Si vous venez de l'EEE, du Royaume-Uni ou de Suisse — ou si nous ne pouvons pas déterminer votre pays — nous affichons une bannière de consentement. Tant que vous n'acceptez pas, nous ne collectons qu'une mesure anonyme et sans cookie : pages vues et comptages de tunnel, sans cookies, sans localStorage, sans identifiant stocké et sans replay de session. Le Consent Mode Google peut encore envoyer des pings sans cookie pour la modélisation des conversions lorsque le consentement ads est refusé. Vercel Web Analytics et Speed Insights ne sont pas chargés tant que l'usage produit / analytics n'est pas autorisé.",
      afterConsent:
        "Si vous acceptez l'usage produit, nous pouvons utiliser des cookies pour reconnaître votre compte et enregistrer un replay de session PostHog, et nous chargeons Vercel Web Analytics et Speed Insights. Les champs de formulaire et de carte restent masqués dans chaque replay. Si vous acceptez la publicité hors des règles d'e-mail haché de la bannière EEE, Google peut stocker des cookies publicitaires et recevoir des données de conversion, y compris un e-mail haché pour les conversions améliorées, des identifiants de clic, la valeur, la devise et l'identifiant de transaction. Accepter la publicité dans la bannière EEE/Royaume-Uni/Suisse n'envoie pas d'e-mail haché.",
      otherRegions:
        "Si vous venez d'ailleurs (par exemple des États-Unis), nous mesurons l'usage par défaut, et le consentement ads peut être accordé par défaut. Vous pouvez vous y opposer à tout moment via le lien « Refuser la mesure d'audience » dans le pied de page ou sur cette page. Ce refus arrête les signaux d'analytics et de publicité du navigateur : il désactive la capture PostHog, démonte Vercel Web Analytics et Speed Insights, et refuse le stockage publicitaire Google, les données utilisateur publicitaires et la personnalisation publicitaire (ainsi que le stockage analytics). Les enregistrements serveur d'inscription, de début de paiement et d'achat (pseudonymes ; sans e-mail pour les visiteurs EEE/Royaume-Uni/Suisse) et les pings Consent Mode Google sans cookie peuvent continuer. Ce choix est mémorisé dans un cookie.",
      conversions:
        "La création de compte, le début de paiement et un abonnement conclu sont enregistrés sur nos serveurs avec un identifiant utilisateur pseudonyme, pour qu'une vente ne soit pas perdue si un navigateur bloque les scripts. Pour les visiteurs de l'EEE, du Royaume-Uni ou de Suisse, nous n'attachons pas votre e-mail à ces événements serveur. Ces enregistrements de conversion côté serveur ne sont pas arrêtés par le refus d'analytics navigateur. Les conversions Google Ads d'achat/inscription (lorsque le consentement ads permet l'e-mail haché hors des règles de la bannière EEE) peuvent inclure un e-mail haché SHA-256, la valeur, la devise et l'identifiant de transaction.",
      vercel:
        "Vercel Web Analytics est agrégé et sans cookie ; Speed Insights mesure la performance. Les deux ne se chargent que lorsque l'usage produit / analytics est autorisé, et cessent de se charger lorsque vous refusez. La rétention suit les fenêtres de reporting documentées par Vercel (jusqu'à 12 mois sur Pro, jusqu'à 24 mois avec Web Analytics Plus / Enterprise).",
      optOut: "Refuser la mesure d'audience",
      optedOut: "Mesure d'audience refusée",
    },
    security: {
      title: "9. Sécurité des données",
      content:
        "Nous hébergeons les données applicatives chez Supabase (base de données, authentification et stockage de fichiers pour les captures d'écran) et l'application sur Vercel. Le trafic est chiffré en transit (HTTPS/TLS). Les identifiants de connexion courtier sont chiffrés au repos avec AES-256-GCM lorsqu'une clé de chiffrement est configurée. L'accès aux systèmes de production est limité aux opérateurs qui en ont besoin pour faire fonctionner le service. Aucune méthode de transmission ou de stockage n'est totalement sûre ; nous protégeons vos données avec des contrôles conformes aux pratiques de l'industrie.",
    },
    legal: {
      title: "10. Base légale et transferts internationaux",
      basis:
        "Lorsque le RGPD s'applique, nous traitons les données personnelles sur ces bases : exécution de notre contrat avec vous (journal, API, facturation, applications connectées) ; votre consentement (cookies d'audience et de publicité facultatifs dans l'EEE/Royaume-Uni/Suisse, autorisation d'applications tierces, et newsletter marketing — désabonnement à tout moment) ; intérêts légitimes (sécurité du service, prévention des abus, fiabilité, mesure d'usage hors régions de consentement lorsque c'est permis) ; et obligations légales. Stripe, et non Deltalytix, conserve les registres fiscaux et comptables des paiements autant que la loi l'exige.",
      transfers:
        "Nous et nos sous-traitants pouvons traiter des données dans l'Union européenne et dans d'autres pays, y compris les États-Unis (par exemple hébergement Vercel, OpenAI, Stripe, Google et infrastructures associées). Lorsque c'est requis, nous nous appuyons sur des mécanismes de transfert appropriés tels que les clauses contractuelles types des sous-traitants ou des garanties équivalentes.",
    },
    children: {
      title: "11. Mineurs",
      content:
        "Deltalytix ne s'adresse pas aux personnes de moins de 16 ans. Nous ne collectons pas sciemment de données personnelles auprès de personnes de moins de 16 ans. Si vous pensez qu'un mineur nous a fourni des données personnelles, contactez-nous et nous les supprimerons.",
    },
    rights: {
      title: "12. Contrôles utilisateur",
      lead: "Vous pouvez accéder à vos informations personnelles, les corriger, les exporter et les supprimer, et contrôler la mesure d'audience et les applications connectées :",
      access:
        "Consultez et mettez à jour votre compte, vos trades et votre journal dans le tableau de bord.",
      export:
        "Exportez vos trades en CSV depuis la gestion des données, et vos entrées de journal/mindset en PDF ou Word depuis les outils mindset. Pour une copie plus large de vos données personnelles, écrivez à contact@deltalytix.app.",
      delete:
        "Supprimez votre compte dans les Paramètres. Cela retire définitivement vos trades, données de journal, images en stockage, connexions et enregistrements de compte associés, comme décrit dans Conservation des données.",
      analytics:
        "Refusez la mesure d'audience navigateur et la publicité via le lien de cette page ou du pied de page. Cela arrête la capture PostHog, démonte Vercel Web Analytics et Speed Insights, et refuse le stockage publicitaire Google, les données utilisateur publicitaires et la personnalisation publicitaire. Les enregistrements serveur d'inscription/paiement/achat et les pings Consent Mode Google sans cookie peuvent continuer. Dans les Paramètres, vous pouvez aussi modifier le consentement cookies.",
      revoke:
        "Révoquez les applications connectées et les jetons d'accès personnels dans Paramètres → Connexions.",
      contact:
        "Pour exercer ces droits, ou pour toute question, contactez contact@deltalytix.app. Nous respectons le RGPD et les autres lois applicables sur la protection des données.",
    },
    changes: {
      title: "13. Modifications de cette politique",
      content:
        "Nous pouvons mettre à jour cette politique. Pour les modifications importantes, nous en informerons les utilisateurs enregistrés par e-mail, et nous publierons la nouvelle version sur cette page en actualisant la date de « Dernière mise à jour ».",
    },
    contact: {
      title: "14. Nous contacter",
      content:
        "Pour toute question sur cette politique de confidentialité, écrivez-nous à :",
      email: "contact@deltalytix.app",
    },
  },
} as const;
