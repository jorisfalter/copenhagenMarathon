import { EmailMessage } from "cloudflare:email";

const PREVIOUS_PAGE_KEY = "previous_page_content";

// Function to log differences between previous and current content
function logDifferences(previous, current) {
  const previousLines = previous.split("\n");
  const currentLines = current.split("\n");
  const differences = [];

  previousLines.forEach((line, index) => {
    // Skip logging changes for specific patterns
    if (
      line !== currentLines[index] &&
      !line.includes("wordfence") &&
      !line.includes("email-protection")
    ) {
      differences.push(
        `Line ${index + 1} changed: "${line}" to "${
          currentLines[index] || "undefined"
        }"`
      );
    }
  });

  if (differences.length > 0) {
    console.log("Differences found:\n" + differences.join("\n"));
  } else {
    console.log("No specific differences found, but content has changed.");
  }
}

export default {
  async scheduled(event, env, ctx) {
    console.log("Cron job triggered at: " + new Date().toISOString());

    const currentContent = await fetchWebsiteContent();
    const previousContent = await env.copenhagenMarathon.get(PREVIOUS_PAGE_KEY);
    const logDiff = logDifferences(previousContent, currentContent);

    // if (previousContent !== currentContent) {
    if (logDiff) {
      console.log("Website content has changed!");

      // Update the stored content in KV
      await env.copenhagenMarathon.put(PREVIOUS_PAGE_KEY, currentContent);

      // // send push notificaiton
      // await sendPushoverNotification(
      //   env,
      //   "https://secure.onreg.com/onreg2/bibexchange/?eventid=6591&language=us"
      // ); // sending the link as the message

      // Send email notification about the change
      await sendEmailNotification(
        env,
        "https://www.isa.nl/employment/vacancies/",
        logDiff
      );
    } else {
      console.log("No changes detected.");
      //   await sendEmailNotification(env, "not changed");
    }
  },
};

// Function to fetch the website content
async function fetchWebsiteContent() {
  // for testing purposes, using my bridgeopen script
  const response = await fetch(
    "https://www.isa.nl/employment/vacancies/"
    // "https://bridgeopen-0fd60d885493.herokuapp.com/ledstatus"
  );

  // return
  return await response.text();
}

// Function to send a notification (using Pushover or other services)
// async function sendPushoverNotification(env, message) {
//   console.log("sending push");
//   const response = await fetch("https://api.pushover.net/1/messages.json", {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body: new URLSearchParams({
//       token: env.PUSHOVER_TOKEN,
//       user: env.PUSHOVER_USER,
//       message: message,
//     }),
//   });
//   if (!response.ok) {
//     console.error("Failed to send push notification:", await response.text());
//   }
// }

// Function to send email notification
async function sendEmailNotification(env, content) {
  // const senderEmail = "hooray@marjonjoris.it"; // Your sender email (must be configured in Cloudflare Email Routing)
  const senderEmail = "talktome@airtraveltechjobs.com";
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
