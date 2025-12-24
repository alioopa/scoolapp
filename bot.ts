import { Telegraf, Markup, Context } from 'telegraf';

// ⚠️ استبدل هذا الرمز بالتوكن الذي حصلت عليه من BotFather
// يفضل استخدام process.env.BOT_TOKEN في المشاريع الحقيقية
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'; 

// ⚠️ استبدل هذا الرابط برابط تطبيق الويب الخاص بك
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://YOUR_APP_URL.com';

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('⚠️ تحذير: لم تقم بوضع توكن البوت الخاص بك في ملف bot.ts');
}

const bot = new Telegraf(BOT_TOKEN);

// رسالة الترحيب عند الضغط على Start
bot.start((ctx: Context) => {
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

bot.launch().then(() => {
    console.log('✅ البوت يعمل بنجاح (TypeScript)...');
}).catch((err) => {
    console.error('❌ حدث خطأ أثناء تشغيل البوت:', err);
});

// إيقاف البوت بشكل آمن
(process as any).once('SIGINT', () => bot.stop('SIGINT'));
(process as any).once('SIGTERM', () => bot.stop('SIGTERM'));
