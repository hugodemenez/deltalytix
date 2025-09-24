import { tool } from "ai";
import { z } from 'zod/v3';

export const askForLocation = tool({
    description:
        'Get the user location. Always ask for confirmation before using this tool.',
    inputSchema: z.object({}),
})