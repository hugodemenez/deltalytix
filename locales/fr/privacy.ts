export default {
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : 26 septembre 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (« nous ») s'engage à protéger votre vie privée. Cette politique explique comment nous collectons, utilisons, divulguons et protégeons vos informations lorsque vous utilisez notre service.",
    },
    collect: {
      title: "2. Informations que nous collectons",
      lead: "Nous collectons des informations lorsque vous créez un compte, notamment :",
      email: "Adresse e-mail",
      name: "Nom",
      discord:
        "URL de la photo de profil Discord (si vous vous inscrivez via Discord OAuth)",
      trades:
        "Nous collectons et stockons également les données de trades que vous nous fournissez à des fins d'analyse.",
    },
    use: {
      title: "3. Comment nous utilisons vos informations",
      lead: "Nous utilisons les informations collectées notamment pour :",
      service: "Fournir et maintenir notre service",
      notify: "Vous informer des changements de notre service",
      features: "Vous permettre d'utiliser les fonctionnalités interactives",
      support: "Fournir un support",
      improve: "Analyser l'usage pour améliorer le service",
      monitor: "Suivre l'utilisation du service",
      security: "Détecter, prévenir et traiter les problèmes techniques",
    },
    storage: {
      title: "4. Stockage et sécurité des données",
      content:
        "Nous utilisons Supabase, un service conforme SOC 2, pour stocker vos données. Nous mettons en œuvre des pratiques de collecte, de stockage et de traitement ainsi que des mesures de sécurité pour protéger vos informations personnelles contre l'accès, la modification, la divulgation ou la destruction non autorisés.",
    },
    cookies: {
      title: "5. Cookies",
      content:
        "Nous utilisons des « cookies » pour collecter des informations. Les cookies sont de petits fichiers stockés sur votre disque par un site. Nous pouvons utiliser des cookies de session (qui expirent à la fermeture du navigateur) et des cookies persistants (qui restent jusqu'à ce que vous les supprimiez) pour offrir une expérience plus personnelle. Les cookies nécessaires vous maintiennent connecté et protègent le service. Les cookies facultatifs d'usage produit et de publicité sont décrits dans Mesure d'audience.",
    },
    analytics: {
      title: "6. Mesure d'audience",
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
      title: "7. Services tiers",
      content:
        "Outre PostHog (mesure d'audience) et les sous-traitants nommés dans cette politique (Supabase, Stripe), notre service peut contenir des liens vers d'autres sites que nous n'exploitons pas. Nous vous conseillons de lire la politique de confidentialité de chaque site visité.",
    },
    gdpr: {
      title: "8. Conformité RGPD",
      content:
        "Nous respectons le Règlement général sur la protection des données (RGPD). Vous avez le droit d'accéder à vos informations personnelles, de les mettre à jour ou de les supprimer. Contactez-nous pour exercer ces droits.",
    },
    changes: {
      title: "9. Modifications de cette politique",
      content:
        "Nous pouvons mettre à jour cette politique. Nous vous en informerons en publiant la nouvelle version sur cette page et en actualisant la date de « Dernière mise à jour ».",
    },
    contact: {
      title: "10. Nous contacter",
      content:
        "Pour toute question sur cette politique de confidentialité, écrivez-nous à :",
    },
  },
} as const;
