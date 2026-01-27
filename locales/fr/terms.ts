export default {
    terms: {
        title: "Conditions d'utilisation",
        sections: {
            companyInfo: {
                title: "1. Informations sur l'entreprise",
                content: "Deltalytix est détenu et exploité par Hugo DEMENEZ, opérant en tant qu'entreprise individuelle.",
                contact: "Contact : "
            },
            services: {
                title: "2. Services",
                content: "Deltalytix fournit l'accès à un tableau de bord de plateforme offrant des services d'analyse avancée pour les traders modernes. Nous hébergeons les données des transactions via Supabase, un service conforme SOC 2."
            },
            userAccounts: {
                title: "3. Comptes utilisateur et données",
                content: "Les utilisateurs peuvent créer un compte via Discord OAuth ou par email. Nous collectons et stockons des informations incluant l'URL de l'image de profil Discord, l'adresse email et le nom dans notre base de données Supabase. Nous utilisons un cookie pour maintenir les connexions utilisateur."
            },
            subscriptionPayments: {
                title: "4. Abonnement et paiements",
                content: "Nous proposons des plans payants sur une base mensuelle, trimestrielle, annuelle et à vie. Le paiement est traité via Stripe. Les remboursements ne sont généralement pas fournis après la période d'abonnement, mais peuvent être considérés au cas par cas. Tout remboursement peut être soumis aux frais de traitement facturés par notre fournisseur de services de paiement.",
                storageClarification: "Le stockage illimité prévu dans le plan à vie couvre les textes, images et documents standards liés aux trades. L'enregistrement ou le stockage de fichiers vidéo n'est pas pris en charge.",
                fairUse: "Le terme \"illimité\" s'entend dans le cadre d'un usage normal et non abusif du service. Nous nous réservons le droit de limiter ou restreindre l'usage en cas d'utilisation excessive ou contraire à la finalité de la plateforme.",
                lifetimePlan: {
                    title: "Conditions du plan à vie",
                    description: "Le plan \"À vie\" fournit l'accès au service Deltalytix pour la durée de vie opérationnelle du service, sous réserve des conditions suivantes :",
                    condition1: "Le plan à vie garantit l'accès pour une période minimale d'un (1) an à compter de la date d'achat.",
                    condition2: "\"À vie\" fait référence à la durée de vie opérationnelle du service Deltalytix, pas à la durée de vie de l'utilisateur.",
                    condition3: "Nous nous réservons le droit de cesser le service avec un préavis écrit de 90 jours aux détenteurs de plan à vie.",
                    condition4: "En cas de cessation du service avant la période minimale d'un an, les détenteurs de plan à vie recevront un remboursement au prorata pour la période garantie restante.",
                    condition5: "Le plan à vie ne garantit pas de fonctionnalités, mises à jour ou niveaux de support spécifiques au-delà de ce qui est offert aux abonnés actifs au moment de la cessation.",
                    condition6: "L'accès au plan à vie peut être résilié pour violation de ces Conditions d'utilisation, comme tout autre abonnement."
                }
            },
            intellectualProperty: {
                title: "5. Propriété intellectuelle",
                content: "Deltalytix possède tous les droits de propriété intellectuelle liés à notre service. Les utilisateurs ne sont pas autorisés à copier ou reproduire notre service. Notre code est sous licence selon les termes spécifiés dans notre fichier LICENSE, qui est la Licence Publique Générale GNU Affero version 3."
            },
            dataProtection: {
                title: "6. Protection des données et confidentialité",
                content: "Nous nous conformons au Règlement Général sur la Protection des Données (RGPD) et aux autres lois applicables sur la protection des données. Nous protégeons les données utilisateur en utilisant Supabase, qui est conforme SOC 2, et en anonymisant les données dans notre base de données. Nous n'utilisons pas de services d'analyse tiers. Pour plus d'informations, veuillez consulter notre Politique de confidentialité.",
                dataExport: "Les utilisateurs peuvent, à tout moment, demander une copie de leurs données dans un format lisible (CSV, JSON)."
            },
            liability: {
                title: "7. Limitation de responsabilité",
                content: "Dans toute la mesure permise par la loi applicable, Deltalytix ne sera pas responsable de tout dommage indirect, accessoire, spécial, consécutif ou punitif, ou de toute perte de profits ou de revenus, qu'elle soit subie directement ou indirectement, ou de toute perte de données, d'utilisation, de clientèle ou d'autres pertes intangibles résultant de (a) votre utilisation ou incapacité à utiliser le service ; (b) tout accès non autorisé à ou utilisation de nos serveurs et/ou de toute information personnelle qui y est stockée."
            },
            termination: {
                title: "8. Résiliation",
                content: "Nous nous réservons le droit de suspendre ou de résilier votre accès au service à tout moment pour toute raison, y compris mais sans s'y limiter à une violation de ces Conditions. Vous pouvez résilier votre compte à tout moment directement depuis l'interface du service ou en nous contactant. Cette résiliation prendra effet immédiatement ou à la fin de votre période d'abonnement."
            },
            serviceAvailability: {
                title: "9. Disponibilité et continuité du service",
                description: "Bien que nous nous efforcions de maintenir un fonctionnement continu du service, nous ne pouvons garantir une disponibilité perpétuelle. Nous nous réservons le droit de :",
                condition1: "Modifier, suspendre ou interrompre toute partie du service avec un préavis approprié.",
                condition2: "Effectuer une maintenance qui peut temporairement interrompre la disponibilité du service.",
                condition3: "Cesser les opérations en raison de raisons commerciales, techniques ou légales indépendantes de notre contrôle raisonnable.",
                notice: "Les utilisateurs seront informés de toute interruption ou cessation de service planifiée aussi longtemps à l'avance que raisonnablement possible."
            },
            governingLaw: {
                title: "10. Droit applicable",
                content: "Ces Conditions d'utilisation sont régies par les lois de la France. Tout litige sera soumis à la juridiction exclusive des tribunaux de France."
            },
            changesTerms: {
                title: "11. Modifications des conditions",
                content: "Nous nous réservons le droit de modifier ces Conditions d'utilisation à tout moment. Nous informerons les utilisateurs de tout changement significatif."
            }
        },
        lastUpdated: "Dernière mise à jour : ",
        pricing: {
            disclaimer: "En procédant au paiement, vous acceptez nos ",
            freePlanDisclaimer: "En créant votre compte, vous acceptez nos ",
            termsOfService: "Conditions d'utilisation"
        }
    }
} as const;
