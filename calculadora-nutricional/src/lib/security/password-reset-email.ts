import { getCanonicalAppOrigin } from "@/lib/security/app-origin";

export async function sendPasswordResetEmail(email: string, rawToken: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL;
  const appOrigin = getCanonicalAppOrigin();
  if (!apiKey || !from || !appOrigin) return false;

  const resetUrl = new URL("/reset-password", appOrigin);
  resetUrl.searchParams.set("token", rawToken);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Redefinição de senha - SoIZI",
        text: `Use este link para redefinir sua senha. Ele expira em 1 hora e só pode ser usado uma vez:\n\n${resetUrl.toString()}`,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
