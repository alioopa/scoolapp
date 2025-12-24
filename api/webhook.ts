import { Telegraf, Markup } from 'telegraf';

// هذا الملف مخصص للعمل على Vercel كـ Serverless Function
// Vercel يبحث تلقائياً في مجلد /api

// ⚠️ تأكد من إضافة BOT_TOKEN في إعدادات Environment Variables في Vercel
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://scoolapp.vercel.app';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(BOT_TOKEN);

// إعداد رسالة الترحيب
bot.start((ctx) => {
  const userName = ctx.from?.first_name || 'يا بطل';
  
  ctx.reply(
      `أهلاً بك ${userName} في حقيبة الثالث متوسط! 🎒\n\n` +
      `📚 هنا ستجد كل ما تحتاجه من كتب، ملازم، وملخصات.\n` +
      `🤖 مع مساعد ذكي للإجابة على أسئلتك.\n\n` +
      `👇 اضغط بالأسفل لفتح الحقيبة:`,
      Markup.inlineKeyboard([
          Markup.button.webApp('🚀 فتح الحقيبة المدرسية', WEB_APP_URL)
      ])
  );
});

// هذا هو الجزء الذي يتعامل مع طلبات الويب (Webhook)
export default async function handler(request: any, response: any) {
    try {
        // التحقق من أن الطلب وصل من تيليجرام
        if (request.body && request.body.update_id) {
            await bot.handleUpdate(request.body);
            response.status(200).json({ ok: true });
        } else {
            response.status(200).json({ message: "Bot is active! Set webhook to this URL." });
        }
    } catch (e: any) {
        console.error("Bot Error:", e);
        response.status(500).json({ error: e.message });
    }
}