import { AGENT_RESOURCES, notFoundMarkdown } from "@/lib/agent-discovery/metadata";

/**
 * Server-rendered pointers on the 404 page.
 *
 * An agent that probes a missing path gets a real `404` status plus, in the
 * body, the machine-readable entry points it should have used — as links for
 * people and as a collapsed markdown block for crawlers that only read text.
 */
export function AgentNotFoundResources({ pathname }: { pathname?: string }) {
  return (
    <section
      aria-labelledby="agent-resources-heading"
      className="mt-12 w-full max-w-md border-t border-border pt-6"
    >
      <h2
        id="agent-resources-heading"
        className="text-sm font-semibold text-foreground"
      >
        For AI agents and crawlers
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        This path does not exist and this response carries HTTP status 404. Start
        from one of these machine-readable entry points instead.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs">
        {AGENT_RESOURCES.map((resource) => (
          <li key={resource.path}>
            <a
              href={resource.path}
              className="text-foreground underline underline-offset-4 hover:no-underline"
            >
              {resource.title}
            </a>
            <span className="text-muted-foreground"> — {resource.description}</span>
          </li>
        ))}
      </ul>
      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">
          Markdown version
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
          {notFoundMarkdown(pathname)}
        </pre>
      </details>
    </section>
  );
}
