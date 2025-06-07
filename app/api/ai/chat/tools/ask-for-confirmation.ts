import { tool } from "ai";
import { z } from "zod";

export const askForConfirmation = tool({
    description: 'Ask the user for confirmation to perform specific actions explaining your thoughts.',
    parameters: z.object({
        message: z.string().describe('The message to ask for confirmation. Explaining what next actions are'),
    }),
    execute: async ({ message }: { message: string }) => {
        console.log(`[askForConfirmation] message: ${message}`)
        return {
            message: message,
            state: 'call'
        };
    },
})