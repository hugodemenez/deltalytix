export default {
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 13 novembre 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (« nous ») s'engage à protéger votre vie privée. Cette politique décrit les catégories de données personnelles collectées, les finalités, les destinataires et sous-traitants, la durée de conservation par catégorie, les contrôles dont vous disposez, et la façon dont les applications d'IA et les outils Model Context Protocol (MCP) utilisent vos données. Elle s'applique à deltalytix.app, à l'API publique et au serveur MCP à l'adresse https://www.deltalytix.app/api/mcp.",
    },
    collect: {
      title: "2. Données collectées",
      lead: "Nous collectons uniquement les données nécessaires au journal, à l'analyse, à la facturation, à l'IA intégrée et aux applications connectées. Les catégories sont :",
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
        "Autorisations OAuth et jetons d'accès personnels que vous créez pour que des applications tierces accèdent à votre compte. Nous conservons un horodatage de dernière utilisation par jeton, pas les arguments d'outils ni les corps de réponse.",
      aiChat:
        "Conversations d'IA intégrée : messages envoyés à l'assistant du tableau de bord et à l'assistant support, y compris les images jointes dans le chat support.",
      aiFeatures:
        "Données envoyées aux fournisseurs de modèles pour les fonctions d'IA : texte de journal à expliquer ou développer ; en-têtes CSV et lignes d'exemple pour le mapping et le formatage d'import ; requêtes de recherche de dates en langage naturel ; audio téléversé pour la transcription ; agrégats de performance hebdomadaires pour le récapitulatif ; questions FAQ publiques sur la page d'accueil.",
      technical:
        "Journaux techniques nécessaires au fonctionnement du service, y compris les métadonnées de requêtes API/MCP décrites dans Applications d'IA et outils MCP.",
    },
    use: {
      title: "3. Finalités",
      lead: "Nous utilisons les informations collectées notamment pour :",
      service:
        "Fournir et maintenir notre service, y compris votre journal, vos comptes et vos analyses de performance",
      notify: "Vous informer des changements de notre service",
      features: "Vous permettre d'utiliser les fonctionnalités interactives",
      support: "Fournir un support client et produit, y compris l'assistant support intégré",
      billing: "Traiter les abonnements et envoyer les e-mails transactionnels",
      ai:
        "Alimenter les fonctions d'IA intégrées (chat du tableau de bord, assistant support, IA journal, aides d'import CSV, analyses, transcription, brouillon de récapitulatif hebdomadaire)",
      connectors:
        "Vous permettre de connecter des applications et clients MCP autorisés à vos propres données, dans la limite des scopes que vous accordez",
      improve: "Analyser l'usage pour améliorer le service",
      monitor: "Suivre l'utilisation du service",
      security: "Détecter, prévenir et traiter les problèmes techniques et les abus",
    },
    processors: {
      title: "4. Destinataires et sous-traitants",
      lead: "Nous partageons des données personnelles avec les destinataires suivants, chacun pour une finalité limitée :",
      supabase: "Supabase : authentification et hébergement de la base de données.",
      stripe: "Stripe : traitement des paiements et facturation des abonnements.",
      posthog:
        "PostHog : mesure d'audience et d'usage produit, hébergé dans l'Union européenne. Les requêtes passent par deltalytix.app.",
      resend:
        "Resend : e-mails transactionnels (bienvenue, récapitulatif hebdomadaire, réponses support).",
      vercel:
        "Vercel : hébergement de l'application, exécution serverless et (le cas échéant) la Vercel AI Gateway qui achemine certaines requêtes de modèles.",
      aiProviders:
        "Fournisseurs de modèles d'IA : OpenAI (directement via notre clé API OpenAI, et parfois via la Vercel AI Gateway) et Perplexity (fonction « explain » du journal via l'AI Gateway). Nous n'envoyons que les prompts et le contexte d'outils nécessaires à la fonction que vous avez utilisée.",
      authorizedApps:
        "Applications d'IA et autres clients que vous autorisez : ChatGPT / OpenAI, Claude / Anthropic, Cursor, Grok, et tout autre client OAuth, jeton personnel, API ou MCP. Ces applications ne reçoivent que les données couvertes par les scopes et outils que vous accordez. Une fois les sorties d'outils sorties de Deltalytix, la politique de confidentialité de l'application connectée s'applique à ces données.",
      noSale:
        "Nous ne vendons pas vos données personnelles. Nous ne les partageons qu'avec les destinataires nommés ici, les applications que vous autorisez, ou lorsque la loi l'exige.",
    },
    retention: {
      title: "5. Conservation des données",
      lead: "Nous conservons chaque catégorie uniquement aussi longtemps que nécessaire aux finalités ci-dessus :",
      tradesJournal:
        "Les trades et les données de journal restent tant que votre compte existe. Lorsque vous supprimez votre compte depuis les Paramètres, nous supprimons vos trades, données de journal, connexions et informations de compte, et nous annulons les abonnements Stripe actifs et le client Stripe lié à votre e-mail.",
      tokens:
        "Les autorisations OAuth et jetons d'accès personnels restent jusqu'à révocation dans Paramètres → Connexions ou suppression du compte. Après révocation, la requête API ou MCP suivante est refusée.",
      billing:
        "Les enregistrements de facturation et d'abonnement peuvent être conservés aussi longtemps que la loi l'exige pour la fiscalité, la comptabilité et les litiges, y compris après suppression du compte lorsque l'obligation légale s'applique.",
      analytics:
        "La conservation de la mesure d'audience suit la section Mesure d'audience et le traitement PostHog des événements que nous envoyons. Vous pouvez refuser la mesure facultative comme indiqué dans cette section.",
      aiChat:
        "Les messages d'IA intégrée (chat et support) sont traités pour vous répondre. Nous ne constituons pas une archive séparée à long terme de chaque prompt au-delà de ce qui est stocké dans vos fonctionnalités de compte (par exemple le contenu de journal que vous enregistrez) et des journaux serveur ordinaires.",
      logs:
        "Nous ne stockons pas les entrées ni les sorties d'outils MCP ou de l'API publique dans notre base de données. Nous émettons une ligne de journal structurée par requête HTTP API publique / OAuth / MCP (méthode, route, statut, latence, type de jeton, id application/client, identifiant utilisateur haché, code d'erreur optionnel) vers les journaux de notre plateforme d'hébergement (Vercel). Ces lignes n'incluent jamais les en-têtes Authorization, les jetons bearer, ni les arguments/réponses d'outils. Le code applicatif ne fixe pas de durée de conservation personnalisée ; la rétention suit celle des journaux Vercel du projet.",
    },
    aiApps: {
      title: "6. Applications d'IA et outils MCP",
      lead: "Vous pouvez connecter des applications d'IA et d'autres clients qui utilisent l'API publique Deltalytix ou le serveur MCP à l'adresse https://www.deltalytix.app/api/mcp. Cela inclut les plugins et applications ChatGPT (OpenAI), les connecteurs Claude (Anthropic), Cursor, Grok, et tout autre client OAuth ou à jeton personnel. Nous ne recevons pas vos conversations avec ces clients. Nous ne recevons que les requêtes API ou MCP authentifiées qu'ils font en votre nom.",
      scopes:
        "L'accès est limité aux scopes OAuth ou de jeton personnel que vous accordez, par exemple profile:read, accounts:read, trades:read, metrics:read et connections:read. L'API publique accepte aussi des scopes d'écriture (trades:write, connections:write, imports:write) uniquement si vous les accordez. Les outils MCP sont en lecture seule et n'exposent pas d'opérations d'écriture.",
      tableLead:
        "Le tableau suivant liste chaque outil MCP actuellement enregistré sur le serveur MCP authentifié. Chaque outil appelle les mêmes fonctions serveur que la route GET /api/v1 correspondante.",
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
        "Les fonctions d'IA intégrées (chat du tableau de bord, assistant support, IA journal, aides CSV, analyses, transcription, récapitulatif hebdomadaire) envoient les prompts et le contexte de compte décrits dans Données collectées à OpenAI et, pour l'explication de journal, à Perplexity via la Vercel AI Gateway. Ces fonctions sont distinctes des plugins ChatGPT ; elles s'exécutent dans Deltalytix lorsque vous les utilisez.",
    },
    cookies: {
      title: "7. Cookies",
      content:
        "Nous utilisons des « cookies » pour collecter des informations. Les cookies sont de petits fichiers stockés sur votre disque par un site. Nous pouvons utiliser des cookies de session (qui expirent à la fermeture du navigateur) et des cookies persistants (qui restent jusqu'à ce que vous les supprimiez) pour offrir une expérience plus personnelle. Les cookies nécessaires vous maintiennent connecté et protègent le service. Les cookies facultatifs d'usage produit et de publicité sont décrits dans Mesure d'audience.",
    },
    analytics: {
      title: "8. Mesure d'audience",
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
    legal: {
      title: "9. Base légale et transferts internationaux",
      basis:
        "Lorsque le RGPD s'applique, nous traitons les données personnelles sur ces bases : exécution de notre contrat avec vous (journal, API, facturation, applications connectées) ; votre consentement (cookies d'audience facultatifs dans l'EEE/Royaume-Uni/Suisse, et autorisation d'applications tierces) ; intérêts légitimes (sécurité du service, prévention des abus, fiabilité) ; et obligations légales (records fiscaux et comptables).",
      transfers:
        "Nous et nos sous-traitants pouvons traiter des données dans l'Union européenne et dans d'autres pays, y compris les États-Unis (par exemple hébergement Vercel, OpenAI, Stripe et infrastructures associées). Lorsque c'est requis, nous nous appuyons sur des mécanismes de transfert appropriés tels que les clauses contractuelles types des sous-traitants ou des garanties équivalentes.",
    },
    rights: {
      title: "10. Contrôles utilisateur",
      lead: "Vous pouvez accéder à vos informations personnelles, les corriger, les exporter et les supprimer, et contrôler la mesure d'audience et les applications connectées :",
      access:
        "Consultez et mettez à jour votre compte, vos trades et votre journal dans le tableau de bord.",
      export:
        "Exportez vos trades en CSV depuis la gestion des données, et vos entrées de journal/mindset en PDF ou Word depuis les outils mindset. Pour une copie plus large de vos données personnelles, écrivez à privacy@deltalytix.app.",
      delete:
        "Supprimez votre compte dans les Paramètres. Cela retire définitivement vos trades, données de journal, connexions et enregistrements de compte associés, comme décrit dans Conservation des données.",
      analytics:
        "Refusez la mesure d'audience via le lien de cette page ou du pied de page. Dans les Paramètres, vous pouvez aussi modifier le consentement cookies.",
      revoke:
        "Révoquez les applications connectées et les jetons d'accès personnels dans Paramètres → Connexions.",
      contact:
        "Pour exercer ces droits, ou pour toute question, contactez privacy@deltalytix.app. Nous respectons le RGPD et les autres lois applicables sur la protection des données.",
    },
    changes: {
      title: "11. Modifications de cette politique",
      content:
        "Nous pouvons mettre à jour cette politique. Nous vous en informerons en publiant la nouvelle version sur cette page et en actualisant la date de « Dernière mise à jour ».",
    },
    contact: {
      title: "12. Nous contacter",
      content:
        "Pour toute question sur cette politique de confidentialité, écrivez-nous à :",
      email: "privacy@deltalytix.app",
    },
  },
} as const;
