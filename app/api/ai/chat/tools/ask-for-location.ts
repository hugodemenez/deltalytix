import { tool } from "ai";
import { z } from "zod";

export const askForLocation = tool({
    description:
        'Get the user location. Always ask for confirmation before using this tool.',
    parameters: z.object({}),
})