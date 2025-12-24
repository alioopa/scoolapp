import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    process?: any;
  }
}

export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!(window.process?.env?.API_KEY);
};

export const requestApiKey = async (): Promise<void> => {
  if (window.aistudio) {
    await window.aistudio.openSelectKey();
  }
};

/**
 * المعلم العراقي الذكي - نسخة محسنة
 */
export const generateStudyHelp = async (query: string, subjectContext: string, imageBase64?: string): Promise<string> => {
  try {
    const apiKey = window.process?.env?.API_KEY;
    if (!apiKey) return "API_KEY_MISSING";

    const ai = new GoogleGenAI({ apiKey });
    
    // استخدام نموذج قوي للتحليل
    const modelId = "gemini-3-flash-preview"; 
    
    const systemInstruction = `
      أنت مدرس خصوصي عراقي محترف جداً لمادة ${subjectContext} للصف الثالث المتوسط.
      
      أسلوبك:
      1. لهجتك عراقية بيضاء (مفهومة ومحببة) مع استخدام مصطلحات مثل (حبيبي، يا بطل، شوف، ركز وياي).
      2. شرحك مفصل ودقيق، لا تعطي إجابات قصيرة جداً. اشرح الموضوع وكأنك تشرحه لطالب جالس أمامك.
      
      الهيكل المطلوب للإجابة (مهم جداً):
      1. 🌟 **مقدمة:** ترحيب بسيط وتشجيع.
      2. 📖 **الشرح التفصيلي:** شرح الموضوع أو الصورة بشكل مبسط ومترابط.
      3. 🔥 **المرشحات الوزارية (مهم جداً):** 
         - استخرج "التعاريف" المهمة الواردة في النص.
         - استخرج "التعاليل" (علل ما يأتي) مع أجوبتها النموذجية.
         - أشر إلى السنوات التي تكرر فيها السؤال وزارياً (مثال: هذا جاي وزاري 2018 و 2021).
      4. 💡 **الخلاصة:** نصيحة سريعة للحفظ.

      ملاحظة: إذا كانت الصورة غير واضحة، اطلب من الطالب إعادة تصويرها بأسلوب لطيف.
    `;

    const parts: any[] = [];
    
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Data }
      });
      // تحسين الأمر عند وجود صورة لاستخراج كل شيء
      parts.push({ text: query || "اشرح لي هذه الصفحة بالتفصيل الممل، واستخرج منها كل التعاريف والتعاليل والمرشحات الوزارية." });
    } else {
      parts.push({ text: query });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts }],
      config: { 
        systemInstruction,
        temperature: 0.4, // حرارة منخفضة لإجابات دقيقة علمياً
        maxOutputTokens: 6000 // زيادة مساحة الإجابة
      }
    });

    return response.text || "آسف حبيبي، ما كدرت أفهم، ممكن تعيد السؤال؟";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const msg = error.message || "";
    if (msg.includes("Requested entity was not found") || msg.includes("API key")) {
      return "API_KEY_ERROR";
    }
    return "صار خطأ بالاتصال، تأكد من النت وحاول مرة ثانية.";
  }
};

export const generateQuiz = async (subject: string): Promise<QuizQuestion[]> => {
    try {
      const apiKey = window.process?.env?.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");
  
      const ai = new GoogleGenAI({ apiKey });
      const modelId = "gemini-3-flash-preview";
      
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text: `أنشئ 5 أسئلة خيارات متعددة لمادة ${subject} منهج العراق الثالث متوسط، ركز على الأسئلة الوزارية المكررة.` }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswer"]
            }
          }
        }
      });
  
      const resultText = response.text;
      return resultText ? JSON.parse(resultText) : [];
    } catch (error: any) {
      console.error("Quiz Error:", error);
      const msg = error.message || "";
      if (msg.includes("Requested entity was not found") || msg.includes("API key") || msg.includes("fetch")) {
          throw new Error("API_KEY_ERROR");
      }
      return [];
    }
  };