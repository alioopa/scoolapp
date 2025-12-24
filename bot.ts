import { Telegraf, Markup, Context } from 'telegraf';

// ⚠️ استبدل هذا الرمز بالتوكن الذي حصلت عليه من BotFather
const BOT_TOKEN = process.env.BOT_TOKEN || '7576678018:AAEe1kLeGoFd252O5AQzXyIk6DuVvlrVVE0'; 

// ⚠️ استبدل هذا الرابط برابط تطبيق الويب الخاص بك
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://scoolapp.vercel.app';

// ⚠️ معلومات القناة للاشتراك الإجباري
const CHANNEL_USERNAME = '@Tleker'; // معرف القناة
const CHANNEL_URL = 'https://t.me/Tleker'; // رابط القناة

if (BOT_TOKEN === '7576678018:AAEe1kLeGoFd252O5AQzXyIk6DuVvlrVVE0') {
    console.warn('⚠️ تحذير: لم تقم بوضع توكن البوت الخاص بك في ملف bot.ts');
}

const bot = new Telegraf(BOT_TOKEN);

// دالة التحقق من الاشتراك
const checkSubscription = async (ctx: Context, userId: number): Promise<boolean> => {
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
    } catch (error) {
        console.error('Error checking subscription:', error);
        // في حالة حدوث خطأ (مثل أن البوت ليس مشرفاً)، نسمح بالدخول لتجنب توقف البوت
        return false; 
    }
};

// أمر البداية /start
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'يا بطل';

    // 1. تحقق من الاشتراك
    const isSubscribed = await checkSubscription(ctx, userId);

    if (!isSubscribed) {
        return ctx.reply(
            `⛔️ عذراً ${firstName}، لا يمكنك استخدام البوت.\n\n` +
            `⚠️ يجب عليك الاشتراك في قناة الثالث متوسط الرسمية أولاً لفتح الحقيبة.\n\n` +
            `👇 اشترك ثم اضغط على "تحقق من الاشتراك":`,
            Markup.inlineKeyboard([
                [Markup.button.url('📢 اشتراك في القناة', CHANNEL_URL)],
                [Markup.button.callback('✅ تم الاشتراك (تحقق)', 'check_sub')]
            ])
        );
    }

    // 2. إذا كان مشتركاً، اعرض زر التطبيق
    ctx.reply(
        `أهلاً بك ${firstName} في حقيبة الثالث متوسط! 🎒\n\n` +
        `📚 هنا ستجد كل ما تحتاجه من كتب، ملازم، وملخصات.\n` +
        `🤖 مع مساعد ذكي للإجابة على أسئلتك.\n\n` +
        `👇 اضغط بالأسفل لفتح الحقيبة:`,
        Markup.inlineKeyboard([
            Markup.button.webApp('🚀 فتح الحقيبة المدرسية', WEB_APP_URL)
        ])
    );
});

// التعامل مع زر "تحقق من الاشتراك"
bot.action('check_sub', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const isSubscribed = await checkSubscription(ctx, userId);

    if (isSubscribed) {
        await ctx.deleteMessage(); // حذف رسالة التحذير
        await ctx.reply(
            `✅ شكراً لك! تم التحقق من اشتراكك.\n\n` +
            `👇 يمكنك الآن استخدام التطبيق:`,
            Markup.inlineKeyboard([
                Markup.button.webApp('🚀 فتح الحقيبة المدرسية', WEB_APP_URL)
            ])
        );
    } else {
        await ctx.answerCbQuery('❌ لسه ما اشتركت! اشترك وحاول مرة ثانية.', { show_alert: true });
    }
});

bot.launch().then(() => {
    console.log('✅ البوت يعمل بنجاح (TypeScript)...');
}).catch((err) => {
    console.error('❌ حدث خطأ أثناء تشغيل البوت:', err);
});

// إيقاف البوت بشكل آمن
(process as any).once('SIGINT', () => bot.stop('SIGINT'));
(process as any).once('SIGTERM', () => bot.stop('SIGTERM'));