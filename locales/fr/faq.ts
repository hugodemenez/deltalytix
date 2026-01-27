export default {
    faq: {
        heading: 'Questions fréquemment posées',
        question1: 'Deltalytix trade-t-il pour moi ?',
        answer1: 'Non, Deltalytix n\'est pas un courtier. Vous exécutez vos trades chez votre courtier, puis transférez les données dans Deltalytix pour suivre et analyser vos performances de trading.',
        question2: 'Quelle est la sécurité de Deltalytix ?',
        answer2: 'La sécurité de vos données est notre priorité absolue. Deltalytix ne vend pas et ne fait pas de publicité avec vos données, et nous utilisons des mesures de sécurité standard de l\'industrie pour protéger vos informations.',
        question3: 'Comment Deltalytix synchronise mon historique de trading ?',
        answer3: 'Nous avons développé nos propres services de synchronisation avec Rithmic, Tradovate et le copieur Thor. Ils fonctionnent tous différemment. Rithmic par exemple, n\'autorise pas OAuth, et pour des raisons de sécurité, nous ne stockons pas vos identifiants. Ils sont stockés en toute sécurité sur votre ordinateur et accessibles depuis le moteur de synchronisation de deltalytix uniquement lorsque vous êtes connecté. Tradovate en revanche permet le flux OAuth, ce qui permet à Deltalytix de demander un accès en lecture à votre historique de trading et de sauvegarder vos trades quotidiennement même si vous ne vous connectez pas à Deltalytix. Enfin, Thor fonctionne en sauvegardant toutes vos données de trading sur leur serveur et vous décidez quand télécharger vos données vers deltalytix en utilisant leur logiciel.',
        question4: 'Comment mettre à jour vers la dernière version ?',
        answer4: 'Deltalytix fonctionne comme une application web qui permet aux mises à jour de se refléter instantanément dans votre navigateur. Vous n\'avez pas besoin d\'exécuter de mises à jour.',
        question5: 'Est-il possible d\'exécuter Deltalytix localement ?',
        answer5: 'Deltalytix n\'est pas disponible pour un déploiement local car vous ne pourrez pas utiliser les services de synchronisation (qui nécessitent la conformité), mais nous travaillons sur une version locale avec un support complet pour les imports .csv et .pdf',
        question6: 'Pourquoi le plan Plus ne propose-t-il pas de période d\'essai ?',
        answer6: 'Deltalytix offre une version gratuite (sans limite de temps) contrairement aux autres journaux de trading. Vous pouvez continuer à utiliser cette version, tandis que le stockage de données n\'est fourni que pour 14 jours glissants. Vous perdrez l\'accès à votre historique de trading. Cette version gratuite vous offre largement assez de temps pour essayer différentes fonctionnalités.',
    },
} as const;
