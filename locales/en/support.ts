export default {
  support: {
    greeting:
      "Welcome to the Deltalytix Support Assistant! I'm here to help you gather all the necessary details about your issue or question. My goal is to collect the right context so your message can be efficiently forwarded to our customer support team, who will follow up with you by email.",
    inputPlaceholder: "Describe your issue here…",
    search: "Search",
    retry: "Retry",
    copied: "Copied to clipboard",
    description:
      "Let us know what problem you’re experiencing or what you need help with in your trading journal. I’ll help collect the information needed for our support team.",
    fillSupportRequest: "Fill out a support request through the form",
    contactInformation: "Contact Information",
    contactInformationDescription:
      "Please provide your contact details so our support team can reach you by email.",
    emailSent:
      "Your message has been sent to our support team. They will contact you soon via email.",
    emailError:
      "There was a problem sending your request. Please try again later.",
    emailConfirmation:
      "Thank you, {name}. I've gathered your information and sent your support request to our team. They will review your case and reach out to you at {email} as soon as possible. Is there anything else I can assist you with?",
    form: {
      email: "Email",
      additionalInfo: "Additional Information",
      additionalInfoPlaceholder:
        "Add any extra details that might help our support team understand your issue...",
      submit: "Submit",
      cancel: "Cancel",
      sending: "Sending...",
    },
    openContactForm: "Open contact form",
    editingNotice: "Editing — replies after this message will be removed.",
    thinking: "Thinking…",
    thoughtProcess: "Thought process",
    evaluatingSupport:
      "Reviewing your message to determine the best way to help...",
    evaluationError: "There was an error while evaluating your support needs.",
    preparingEmail: "Preparing your support request for our team...",
    emailPreparationError: "There was an error preparing your support request.",
    joinDiscordInline: "join our Discord community",
    pageTitle: "Support Assistant",
    pageDescription:
      "Get quick answers from our AI assistant, built on our open knowledge base.",
    discordPrompt: "Can't find what you need?",
    generating: "Generating response…",
    tool: {
      searchingDocs: "Searching product documentation...",
      grepping: "Searching the codebase...",
      readingFile: "Reading documentation...",
      preparingRequest: "Preparing your support request for our team...",
      requestReady: "Your support request is ready to send to our team.",
      requestError: "There was an error while preparing your support request.",
      requestErrorDetails: "Error details: {error}",
    },
    errors: {
      rateLimit:
        "We're experiencing high demand right now. Please try again in a few minutes or contact support directly.",
      serviceUnavailable:
        "Our AI support service is temporarily unavailable. Please try again later or contact support directly.",
      internalError:
        "An unexpected error occurred. Please try again later or contact support.",
      generic:
        "Sorry, something went wrong. Please try again or contact support if the issue persists.",
    },
  },
} as const;
