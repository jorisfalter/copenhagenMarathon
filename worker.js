import { EmailMessage } from "cloudflare:email";

// Function to log differences between previous and current content
function logDifferences(previous, current) {
  const previousLines = previous.split("\n");
  const currentLines = current.split("\n");
  const differences = [];

  previousLines.forEach((line, index) => {
    if (
      line !== currentLines[index] &&
      !line.includes("wordfence") &&
      !line.includes("email-protection") &&
      !line.includes('"csrf.token"') && // Ignore CSRF token lines
      !line.includes('"joomla-script-options"') // Ignore joomla script options
    ) {
      differences.push(
        `Line ${index + 1} changed: "${line}" to "${
          currentLines[index] || "undefined"
        }"`
      );
    }
  });

  return differences.length > 0 ? differences.join("\n") : null;
}

function preprocessContent(content) {
  return (
    content
      // Remove nonce values
      .replace(/"nonce":"[a-f0-9]+"/g, '"nonce":"[FILTERED]"')
      .replace(/nonce: '[a-f0-9]+',/g, "nonce: '[FILTERED]',")
      // Normalize dynamic script data
      .replace(/<script[^>]*>.*?<\/script>/g, (match) => {
        if (match.includes("omapi_data") || match.includes("cookie_notice")) {
          return ""; // Remove specific script blocks with dynamic data
        }
        return match; // Keep other scripts
      })
      // Remove unnecessary white space or line breaks for consistency
      .replace(/\s+/g, " ")
      .trim()
  );
}

export default {
  async scheduled(event, env, ctx) {
    console.log("Cron job triggered at: " + new Date().toISOString());

    const websites = [
      { url: "https://www.isa.nl/employment/vacancies/", key: "isa" },
      {
        url: "https://www.amityschool.nl/about/vacancies",
        key: "amity",
      },
      { url: "https://www.ishilversum.nl/employment", key: "hilversum" },
      { url: "https://www.isutrecht.nl/vacancies", key: "utrecht" },
    ];

    for (const { url, key } of websites) {
      console.log(`Checking website: ${url}`);

      const currentContent = await fetchWebsiteContent(url);
      const previousContent = await env.copenhagenMarathon.get(key);

      const processedPrevious = preprocessContent(previousContent || "");
      const processedCurrent = preprocessContent(currentContent);
      const logDiff = logDifferences(processedPrevious, processedCurrent);

      if (logDiff) {
        console.log(`Website content has changed for: ${url}`);

        // Update the stored content in KV
        await env.copenhagenMarathon.put(key, currentContent);

        // Send email notification about the change
        await sendEmailNotification(env, url, logDiff);
      } else {
        console.log(`No changes detected for: ${url}`);
      }
    }
  },
};

// Function to fetch the website content
async function fetchWebsiteContent(url) {
  const response = await fetch(url);
  return await response.text();
}

// Function to send email notification
async function sendEmailNotification(env, url, changes) {
  const senderEmail = "talktome@airtraveltechjobs.com";
  const recipientEmail = "marjonjoris2021@gmail.com";

  const emailContent = `From: ${senderEmail}
To: ${recipientEmail}
Subject: Content Changed Notification for ${url}

The content on the monitored website has changed:
${changes}`;

  const message = new EmailMessage(senderEmail, recipientEmail, emailContent);

  try {
    await env.SEB.send(message);
    console.log(`Email sent successfully for ${url}!`);
  } catch (e) {
    console.error(`Failed to send email for ${url}:`, e.message);
  }
}
