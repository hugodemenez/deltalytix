const VERIFIED_SEND_DOMAIN = "eu.updates.deltalytix.app";

function formatFromAddress(displayName: string, email: string) {
  return `${displayName} <${email}>`;
}

/** Resend-verified sender for support emails (see welcome/cron routes). */
export function getSupportFromAddress() {
  const configured = process.env.SUPPORT_EMAIL?.trim();

  if (configured && configured.includes(VERIFIED_SEND_DOMAIN)) {
    if (configured.includes("<")) {
      return configured;
    }
    return formatFromAddress("Deltalytix Support", configured);
  }

  return formatFromAddress("Deltalytix Support", `support@${VERIFIED_SEND_DOMAIN}`);
}

export function getSupportEmailConfig() {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false as const, error: "RESEND_API_KEY is not configured" };
  }

  const to = process.env.SUPPORT_TEAM_EMAIL?.trim();
  if (!to) {
    return { ok: false as const, error: "SUPPORT_TEAM_EMAIL is not configured" };
  }

  return {
    ok: true as const,
    from: getSupportFromAddress(),
    to,
  };
}
