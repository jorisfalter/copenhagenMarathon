import { EmailMessage } from "cloudflare:email";

const PREVIOUS_PAGE_KEY = "previous_page_content";

export default {
  async scheduled(event, env, ctx) {
    console.log("Cron job triggered at: " + new Date().toISOString());

    const currentContent = await fetchWebsiteContent();
    const previousContent = await env.copenhagenMarathon.get(PREVIOUS_PAGE_KEY);

    if (previousContent !== currentContent) {
      console.log("Website content has changed!");

      // Update the stored content in KV
      await env.copenhagenMarathon.put(PREVIOUS_PAGE_KEY, currentContent);

      // Send email notification about the change
      await sendPushoverNotification(
        "https://secure.onreg.com/onreg2/bibexchange/?eventid=6591&language=us"
      ); // sending the link as the message
      await sendEmailNotification(env, currentContent);
    } else {
      console.log("No changes detected.");
      //   await sendEmailNotification(env, "not changed");
    }
  },
};

// Function to fetch the website content
async function fetchWebsiteContent() {
  // const response = await fetch(
  //   "https://secure.onreg.com/onreg2/bibexchange/?eventid=6591&language=us"
  // );
  // for testing purposes, using my bridgeopen script
  const response = await fetch(
    "https://bridgeopen-0fd60d885493.herokuapp.com/ledstatus"
  );
  return await response.text();
}

// Function to send a notification (using Pushover or other services)
async function sendPushoverNotification(message) {
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: env.PUSHOVER_TOKEN,
      user: env.PUSHOVER_USER,
      message: message,
    }),
  });

  if (!response.ok) {
    console.error("Failed to send push notification:", await response.text());
  }
}

// Function to send email notification
async function sendEmailNotification(env, content) {
  const senderEmail = "hooray@marjonjoris.it"; // Your sender email (must be configured in Cloudflare Email Routing)
  const recipientEmail = "marjonjoris2021@gmail.com"; // The recipient email

  // Construct the raw email content with subject and body
  const emailContent = `From: ${senderEmail}
To: ${recipientEmail}
Subject: Content Changed Notification

The content on the monitored website has changed. New content:
${content}`;

  // Use Cloudflare's EmailMessage API to create and send the email
  const message = new EmailMessage(senderEmail, recipientEmail, emailContent);

  try {
    await env.SEB.send(message);
    console.log("Email sent successfully!");
  } catch (e) {
    console.error("Failed to send email:", e.message);
  }
}
