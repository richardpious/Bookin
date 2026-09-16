export const getFriendlyErrorMessage = (rawError) => {
  const raw = rawError || 'Unknown error';
  let display = `Error: ${raw}`;
  if (/rate.?limit|too many requests|429/i.test(raw)) {
    display = '⚠️ Rate limit reached. Please wait a moment and try again.';
  } else if (/context.?length|too many tokens|token.?limit|context_window/i.test(raw)) {
    display = '⚠️ Message too long — the context window is full. Try starting a new session.';
  } else if (/timeout|etimedout/i.test(raw)) {
    display = '⚠️ The request timed out. Please try again.';
  } else if (/billing|payment|quota/i.test(raw)) {
    display = '⚠️ Billing or quota issue with the AI provider. Check your account.';
  } else if (/overloaded|503|service.?unavailable/i.test(raw)) {
    display = '⚠️ The AI service is temporarily overloaded. Please try again in a moment.';
  } else if (/auth|unauthorized|401|403/i.test(raw)) {
    display = '⚠️ Authentication failed. Check provider credentials.';
  }
  return display;
};
