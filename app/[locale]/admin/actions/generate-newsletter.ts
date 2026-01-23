'use server'

import { generateText, Output } from "ai"
import { z } from 'zod';

const newsletterSchema = z.object({
  subject: z.string().describe("Un titre accrocheur en français de maximum 4 mots"),
  introMessage: z.string().describe("Un message d'introduction court et amical en français"),
  features: z.array(z.string()).describe("Une liste de points clés techniques en français"),
})

export type NewsletterContent = z.infer<typeof newsletterSchema>

interface GenerateNewsletterProps {
  youtubeUrl: string
  description: string
}

export async function generateNewsletterContent({ youtubeUrl, description }: GenerateNewsletterProps) {
  try {
    const { output } = await generateText({
      model: 'openai/gpt-5-mini',
      output: Output.object({ schema: newsletterSchema }),
      prompt: `Bonjour, tu vas écrire la newsletter technique pour Deltalytix sur notre dernière mise à jour : ${description}.

Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.

Voici les consignes pour la newsletter :

1. Le sujet doit être court, 2 à 4 mots, accrocheur et minimaliste, avec un ton moderne et direct. Par exemple, "Deltalytix - Mise à jour".

2. L’introduction doit être de deux phrases courtes, amicales et professionnelles, présentant la nouveauté et encourageant à regarder la vidéo. Pas besoin de salutations.

3. Pour les fonctionnalités, jusqu'à trois points basés sur ${description}, chaque point commençant par un emoji pertinent, suivi d'une description technique accessible et d'un avantage concret pour le day trader.

Instructions générales :

- Sois factuel et précis.

- Ne pas extrapoler au-delà de ${description}.

- Ton : professionnel mais approachable.

- Utilise "tu".

- Phrases courtes et directes.

- Terminologie spécifique au trading de futures.

Merci de respecter ces consignes.`,
      temperature: 0.7,
    })


    console.log(output)
    return {
      success: true,
      content: output
    }
  } catch (error) {
    console.error("Error generating newsletter content:", error)
    return {
      success: false,
      error: "Failed to generate newsletter content"
    }
  }
} 