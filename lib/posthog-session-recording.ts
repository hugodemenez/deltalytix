/**
 * Session replay follows analytics consent. The SDK is initialized without a
 * hard `disable_session_recording: true` so recordings can start; these helpers
 * start or stop the recorder when the banner grants or withdraws analytics.
 */

export type PostHogReplayClient = {
  startSessionRecording: () => void;
  stopSessionRecording: () => void;
};

export function syncPostHogSessionRecording(
  client: PostHogReplayClient,
  analyticsEnabled: boolean,
) {
  if (analyticsEnabled) {
    client.startSessionRecording();
    return;
  }

  client.stopSessionRecording();
}
