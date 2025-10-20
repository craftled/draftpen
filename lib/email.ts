import { Resend } from "resend";
import SearchCompletedEmail from "@/components/emails/lookout-completed";
import { serverEnv } from "@/env/server";

const resend = new Resend(serverEnv.RESEND_API_KEY);

type SendLookoutCompletionEmailParams = {
  to: string;
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
};

export async function sendLookoutCompletionEmail({
  to,
  chatTitle,
  assistantResponse,
  chatId,
}: SendLookoutCompletionEmailParams) {
  try {
    const data = await resend.emails.send({
      from: "Scira AI <noreply@scira.ai>",
      to: [to],
      subject: `Lookout Complete: ${chatTitle}`,
      react: SearchCompletedEmail({
        chatTitle,
        assistantResponse,
        chatId,
      }),
    });
    return { success: true, id: data.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
