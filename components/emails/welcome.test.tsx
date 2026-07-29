import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";
import WelcomeEmail, { renderWelcomeEmailText } from "./welcome";

const videoId = "4AXxk8LId8Y";

describe("WelcomeEmail", () => {
  test.each([
    ["en", "Hello", "/en/dashboard", "Watch the video"],
    ["fr", "Bonjour", "/fr/dashboard", "Voir la dernière vidéo"],
  ])("renders the %s locale with accessible, first-party media", async (language, greeting, route, videoCta) => {
    const html = await render(
      WelcomeEmail({
        firstName: "Hugo",
        email: "hugo@example.com",
        language,
        youtubeId: videoId,
      })
    );

    expect(html).toContain(greeting);
    expect(html).toContain("Hugo");
    expect(html).toContain(route);
    expect(html).toContain("utm_campaign=welcome");
    expect(html).toContain(`/api/email/thumbnail/${videoId}/maxresdefault`);
    expect(html).toContain('width="636"');
    expect(html).toContain('height="358"');
    expect(html).toContain(videoCta);
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("[data-ogsc] .dm-bg");
  });

  test("renders a localized plain-text alternative", () => {
    const text = renderWelcomeEmailText({
      firstName: "Hugo",
      email: "hugo@example.com",
      language: "fr",
      youtubeId: videoId,
    });

    expect(text).toContain("Bonjour Hugo,");
    expect(text).toContain("Ouvrir mon dashboard: https://deltalytix.app/fr/dashboard");
    expect(text).toContain(`Voir la dernière vidéo: https://youtu.be/${videoId}`);
    expect(text).toContain("Se désabonner: https://deltalytix.app/api/email/unsubscribe");
    expect(text).toContain("Politique de confidentialité: https://deltalytix.app/fr/privacy");
  });
});
