export class MailpitHelper {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getLatestMessageForEmail(email: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages`);
    const data = await response.json();

    const message = data.messages?.find((msg: any) =>
      msg.To?.some((recipient: any) => recipient.Address === email)
    );

    if (!message) {
      return null;
    }

    const messageResponse = await fetch(`${this.baseUrl}/api/v1/message/${message.ID}`);
    return messageResponse.json();
  }

  extractInvitationLink(content: string): string | null {
    const linkMatch = content.match(/https?:\/\/[^\s"]*keycloak[^\s"]*/);
    if (linkMatch) {
      return linkMatch[0].replace(/\\u0026/g, '&');
    }
    return null;
  }

  async deleteAllMessages(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, { method: 'DELETE' });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [messageId] })
    });
  }

  async waitForInvitationEmail(email: string, maxAttempts = 30, intervalMs = 2000): Promise<{ link: string; messageId: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const message = await this.getLatestMessageForEmail(email);
      if (message?.HTML) {
        const link = this.extractInvitationLink(message.HTML);
        if (link) {
          return { link, messageId: message.ID };
        }
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Failed to receive invitation email for ${email} after ${maxAttempts} attempts`);
  }
}
