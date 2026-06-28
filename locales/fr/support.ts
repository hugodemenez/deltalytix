export default {
  support: {
    greeting:
      "Bienvenue dans l'Assistant Support Deltalytix ! Je suis là pour vous aider à rassembler tous les détails nécessaires concernant votre problème ou votre question. Mon objectif est de collecter le bon contexte pour que votre message puisse être transmis efficacement à notre équipe de support client, qui vous recontactera par email.",
    inputPlaceholder: "Décrivez votre problème ici…",
    search: "Rechercher",
    retry: "Réessayer",
    copied: "Copié dans le presse-papiers",
    description:
      "Faites-nous savoir quel problème vous rencontrez ou avec quoi vous avez besoin d'aide dans votre journal de trading. Je vous aiderai à collecter les informations nécessaires pour notre équipe de support.",
    requestHumanSupport: "Demander une assistance humaine",
    contactInformation: "Informations de contact",
    contactInformationDescription:
      "Veuillez fournir vos informations de contact pour que notre équipe de support puisse vous recontacter par email.",
    emailSent:
      "Votre message a été envoyé à notre équipe de support. Ils vous recontacteront bientôt par email.",
    emailError:
      "Il y a eu un problème lors de l'envoi de votre demande. Veuillez réessayer plus tard.",
    emailConfirmation:
      "Merci, {name}. J'ai rassemblé vos informations et envoyé votre demande de support à notre équipe. Ils examineront votre cas et vous recontacteront à l'adresse {email} dès que possible. Y a-t-il autre chose avec quoi je peux vous aider ?",
    form: {
      name: "Nom",
      email: "Email",
      additionalInfo: "Informations supplémentaires",
      additionalInfoPlaceholder:
        "Ajoutez des détails supplémentaires qui pourraient aider notre équipe de support à comprendre votre problème...",
      submit: "Envoyer",
      cancel: "Annuler",
      summary: "Résumé",
      sending: "Envoi en cours...",
    },
    evaluatingSupport:
      "Examen de votre message pour déterminer la meilleure façon de vous aider...",
    evaluationError:
      "Il y a eu une erreur lors de l'évaluation de vos besoins de support.",
    preparingEmail:
      "Préparation de votre demande de support pour notre équipe...",
    emailPreparationError:
      "Il y a eu une erreur lors de la préparation de votre demande de support.",
    joinDiscord: "Rejoindre la Communauté Discord",
    discordDescription:
      "Obtenez une aide instantanée de notre communauté de traders et développeurs.",
    pageTitle: "Assistant Support",
    generating: "Génération de la réponse…",
    suggestionImport: "Aide pour importer des trades",
    suggestionBilling: "Question sur la facturation ou l'abonnement",
    suggestionBug: "Signaler un bug ou un problème",
    suggestionHuman: "Parler à un humain",
    tool: {
      searchingDocs:
        "Recherche dans la documentation produit...",
      preparingRequest:
        "Préparation de votre demande de support pour notre équipe...",
      requestError:
        "Il y a eu une erreur lors de la préparation de votre demande de support.",
      requestErrorDetails: "Détails de l'erreur : {error}",
    },
    errors: {
      rateLimit:
        "Nous connaissons actuellement une forte demande. Veuillez réessayer dans quelques minutes ou contactez directement le support.",
      serviceUnavailable:
        "Notre service IA est temporairement indisponible. Veuillez réessayer plus tard ou contactez directement le support.",
      internalError:
        "Une erreur inattendue s'est produite. Veuillez réessayer plus tard ou contacter le support.",
      generic:
        "Désolé, quelque chose s'est mal passé. Veuillez réessayer ou contacter le support si le problème persiste.",
    },
  },
} as const;
