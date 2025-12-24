import { Telegraf, Markup } from 'telegraf';

// ⚠️ تأكد من إضافة المتغيرات في إعدادات Vercel
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://scoolapp.vercel.app';
const CHANNEL_USERNAME = '@Tleker';
const CHANNEL_URL = 'https://t.me/Tleker';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set');
}

const bot = new Telegraf(BOT_TOKEN);

const checkSubscription = async (ctx: any, userId: number) => {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
    } catch (e) {
        console.log("Check sub error (make sure bot is admin):", e);
        return false;
    }
};

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const isSubscribed = await checkSubscription(ctx, userId);

    if (!isSubscribed) {
        return ctx.reply(
            `⚠️ عذراً، يجب عليك الاشتراك في القناة الرسمية لاستخدام التطبيق.\n👇`,
            Markup.inlineKeyboard([
                [Markup.button.url('📢 اشتراك في القناة', CHANNEL_URL)],
                [Markup.button.callback('✅ تم الاشتراك', 'check_sub')]
            ])
        );
    }

    ctx.reply(
        `أهلاً بك في حقيبة الثالث متوسط! 🎒\nاضغط لفتح التطبيق 👇`,
        Markup.inlineKeyboard([
            Markup.button.webApp('🚀 فتح الحقيبة', WEB_APP_URL)
        ])
    );
});

bot.action('check_sub', async (ctx) => {
    const userId = ctx.from?.id;
    if(!userId) return;
    
    const isSubscribed = await checkSubscription(ctx, userId);
    if (isSubscribed) {
        await ctx.deleteMessage();
        await ctx.reply(
            `✅ تم التحقق!`,
            Markup.inlineKeyboard([
                Markup.button.webApp('🚀 فتح الحقيبة', WEB_APP_URL)
            ])
        );
    } else {
        await ctx.answerCbQuery('❌ لم تشترك بعد!', { show_alert: true });
    }
});

export default async function handler(request: any, response: any) {
    try {
        if (request.body && request.body.update_id) {
            await bot.handleUpdate(request.body);
            response.status(200).json({ ok: true });
        } else {
            response.status(200).json({ message: "Bot active" });
        }
    } catch (e: any) {
        console.error("Error:", e);
        response.status(500).json({ error: e.message });
    }
}