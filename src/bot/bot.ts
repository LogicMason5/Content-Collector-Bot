// bot/bot.ts
import { Context, Markup, Telegraf } from "telegraf";
import axios from "axios";
import { socialMediaController } from "../controller/socialMediaController";
import { sendFile } from "../utils";
import { isValidUrl } from "../regex";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing in environment variables");
}

const bot = new Telegraf(BOT_TOKEN);

/**
 * Utility: Safe reply
 */
const safeReply = async (ctx: Context, message: string) => {
  try {
    await ctx.reply(message);
  } catch (err) {
    console.error("Reply error:", err);
  }
};

/**
 * Utility: Fetch joke (non-blocking fallback)
 */
const fetchJoke = async (): Promise<string> => {
  try {
    const { data } = await axios.get(
      "https://v2.jokeapi.dev/joke/Dark",
      {
        params: {
          blacklistFlags: "religious,racist,sexist",
          type: "single",
        },
        timeout: 5000,
      }
    );

    return data?.joke || "Working on your request... 😄";
  } catch (error) {
    console.error("Joke API failed:", error);
    return "Working on your request... 😄";
  }
};

/**
 * Start Command
 */
bot.start(async (ctx) => {
  const firstName = ctx?.message?.from?.first_name || "there";

  await safeReply(
    ctx,
    `Hi ${firstName} 👋\n\n` +
      `I can download files from:\n` +
      `• Terabox\n• Facebook\n• Instagram\n• YouTube\n\n` +
      `Send me a link to get started 🚀`
  );

  await ctx.reply(
    "Quick links:",
    Markup.inlineKeyboard([
      [Markup.button.url("👤 Owner", "https://t.me/rishi171099")],
      [Markup.button.url("🐞 Report Bug", "https://t.me/Tamoghna17")],
    ])
  );
});

/**
 * Main Text Handler
 */
bot.on("text", async (ctx: Context) => {
  try {
    const messageText = (ctx.message as any)?.text?.trim();

    if (!messageText) {
      return safeReply(ctx, "No message text found.");
    }

    // Simple greeting
    if (/^hi|hello$/i.test(messageText)) {
      return safeReply(ctx, "Hey there 👋");
    }

    // Validate URL
    if (!isValidUrl(messageText)) {
      return safeReply(ctx, "❌ Please send a valid URL.");
    }

    await safeReply(ctx, "⏳ Processing your request...");

    // Run joke + processing in parallel
    const [joke, details] = await Promise.all([
      fetchJoke(),
      socialMediaController(messageText),
    ]);

    await safeReply(
      ctx,
      `😄 While you wait:\n\n${joke}`
    );

    if (!details) {
      return safeReply(ctx, "❌ Failed to fetch media details.");
    }

    await safeReply(ctx, "📤 Sending files... Please wait.");

    await sendFile(details, ctx);

    await safeReply(ctx, "✅ Done!");
  } catch (error) {
    console.error("Processing error:", error);
    await safeReply(
      ctx,
      "❌ Something went wrong. Please try again later."
    );
  }
});

/**
 * Sticker Handler
 */
bot.on("sticker", (ctx) => ctx.reply("👍"));

/**
 * Launch Bot
 */
export const launchBot = async () => {
  try {
    await bot.launch();
    console.log("✅ Bot launched successfully");

    // Graceful shutdown
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (error) {
    console.error("❌ Error launching bot:", error);
  }
};
