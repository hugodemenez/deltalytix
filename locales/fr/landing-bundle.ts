import landing from "./landing";
import pricing from "./pricing";
import faq from "./faq";
import terms from "./terms";
import referral from "./referral";
import support from "./support";
import landingPreview from "./landing-preview";

/** Slim locale entry for marketing/landing client components (lazy-loaded separately from fr.ts). */
export default {
  ...landing,
  ...pricing,
  ...faq,
  ...terms,
  ...referral,
  ...landingPreview,
  ...support,
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
} as const;
