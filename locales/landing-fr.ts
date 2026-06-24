import shared from "./fr/shared";
import landing from "./fr/landing";
import pricing from "./fr/pricing";
import faq from "./fr/faq";
import terms from "./fr/terms";
import referral from "./fr/referral";
import featurePreview from "./fr/feature-preview";

export default {
  ...shared,
  ...landing,
  ...pricing,
  ...faq,
  ...terms,
  ...referral,
  ...featurePreview,
  "footer.heading": "Pied de page",
  "footer.description": "Analyses avancées pour les traders modernes.",
  "footer.product.title": "Produit",
  "footer.product.features": "Fonctionnalités",
  "footer.product.pricing": "Tarification",
  "footer.product.propfirms": "Catalogue des Prop Firms",
  "footer.product.teams": "Équipes",
  "footer.product.support": "Support",
  "footer.company.title": "Équipe",
  "footer.company.about": "À propos",
  "footer.legal.title": "Mentions légales",
  "footer.legal.privacy": "Politique de confidentialité",
  "footer.legal.terms": "Conditions d'utilisation",
  "footer.legal.disclaimers": "Avertissements",
  "footer.copyright": "© {year} Deltalytix. Tous droits réservés.",
  "disclaimer.risk.title": "Avertissement relatif aux risques",
  "disclaimer.risk.content":
    "Les opérations sur les marchés à terme et les marchés des changes comportent des risques importants et ne conviennent pas à tous les investisseurs. Un investisseur peut potentiellement perdre la totalité ou une partie de son investissement initial. Le capital-risque est l'argent que l'on peut perdre sans mettre en péril sa sécurité financière ou son style de vie. Seul le capital-risque doit être utilisé pour la négociation et seules les personnes disposant d'un capital-risque suffisant doivent envisager de négocier. Les performances passées ne sont pas nécessairement indicatives des résultats futurs.",
  "disclaimer.hypothetical.title":
    "Avertissement relatif aux performances hypothétiques",
  "disclaimer.hypothetical.content":
    "Les résultats des performances hypothétiques ont de nombreuses limitations inhérentes, dont certaines sont décrites ci-dessous. Aucune déclaration n'est faite selon laquelle un compte réalisera ou est susceptible de réaliser des profits ou des pertes similaires à ceux indiqués ; en fait, il existe souvent des différences marquées entre les résultats de performance hypothétiques et les résultats réels obtenus par la suite par un programme de trading particulier. L'une des limites des résultats de performance hypothétiques est qu'ils sont généralement préparés avec le bénéfice du recul. De plus, la négociation hypothétique n'implique pas de risque financier, et aucun résultat de négociation hypothétique ne peut complètement rendre compte de l'impact du risque financier de la négociation réelle. Par exemple, la capacité à supporter les pertes ou à adhérer à un programme de négociation particulier malgré les pertes de négociation sont des points importants qui peuvent également affecter négativement les résultats de négociation réels. Il existe de nombreux autres facteurs liés aux marchés en général ou à la mise en œuvre d'un programme de trading spécifique qui ne peuvent pas être entièrement pris en compte dans la préparation de résultats de performance hypothétiques et qui peuvent tous avoir un impact négatif sur les résultats de trading.",
  success: "Succès",
  error: "Erreur",
  common: {
    copy: "Copier",
    retry: "Réessayer",
  },
  support: {
    greeting:
      "Bienvenue dans l'Assistant Support Deltalytix ! Je suis là pour vous aider à rassembler tous les détails nécessaires concernant votre problème ou votre question. Mon objectif est de collecter le bon contexte pour que votre message puisse être transmis efficacement à notre équipe de support client, qui vous recontactera par email.",
    inputPlaceholder: "Décrivez votre problème ou votre question ici...",
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
    tool: {
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
