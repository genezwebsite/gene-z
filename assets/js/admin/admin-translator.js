// assets/js/admin/admin-translator.js

import { showToast } from "./admin-core.js";

/**
 * دالة الترجمة باستخدام Netlify Serverless Functions (Gemini API)
 */
async function smartTranslate(text, targetLang) {
  try {
    const response = await fetch('/.netlify/functions/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, targetLang })
    });

    if (!response.ok) {
      throw new Error('فشل الاتصال بخدمة الترجمة');
    }

    const data = await response.json();
    return data.translatedText || text; // إرجاع النص الأصلي في حال عدم وجود ترجمة
  } catch (error) {
    console.error("Translation Error:", error);
    throw new Error('فشل الاتصال بخدمة الترجمة');
  }
}

export function initSmartTranslator() {
  const translateButtons = document.querySelectorAll('.ai-translate-btn');
  
  translateButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;
      
      const icon = btn.querySelector('.btn-icon');
      const spinner = btn.querySelector('.loading-spinner');
      
      // بدء حالة التحميل
      icon.classList.add('hidden');
      spinner.classList.remove('hidden');
      btn.disabled = true;
      
      try {
        await processTranslation(target);
      } catch (error) {
        console.error("Translation error:", error);
        showToast(error.message || "حدث خطأ أثناء الترجمة", "error");
      } finally {
        // إيقاف حالة التحميل
        icon.classList.remove('hidden');
        spinner.classList.add('hidden');
        btn.disabled = false;
      }
    });
  });
}

async function processTranslation(target) {
  let fields = {};
  
  if (target === 'update') {
    fields = {
      ar: { title: document.getElementById('update-title'), content: document.getElementById('update-content') },
      en: { title: document.getElementById('update-title-en'), content: document.getElementById('update-content-en') }
    };
  } else if (target === 'course') {
    fields = {
      ar: { title: document.getElementById('course-name-ar') },
      en: { title: document.getElementById('course-name-en') }
    };
  } else if (target === 'news') {
    fields = {
      ar: { title: document.getElementById('news-title-ar'), content: document.getElementById('news-content-ar') },
      en: { title: document.getElementById('news-title-en'), content: document.getElementById('news-content-en') }
    };
  } else if (target === 'life') {
    fields = {
      ar: { title: document.getElementById('life-title-ar'), content: document.getElementById('life-content-ar') },
      en: { title: document.getElementById('life-title-en'), content: document.getElementById('life-content-en') }
    };
  } else if (target === 'extra') {
    fields = {
      ar: { title: document.getElementById('extra-title-ar'), content: document.getElementById('extra-content-ar') },
      en: { title: document.getElementById('extra-title-en'), content: document.getElementById('extra-content-en') }
    };
  } else {
    return;
  }
  
  const isArFilled = fields.ar.title.value.trim() !== '' && (!fields.ar.content || fields.ar.content.value.trim() !== '');
  const isEnFilled = fields.en.title.value.trim() !== '' && (!fields.en.content || fields.en.content.value.trim() !== '');
  
  const isArEmpty = fields.ar.title.value.trim() === '' && (!fields.ar.content || fields.ar.content.value.trim() === '');
  const isEnEmpty = fields.en.title.value.trim() === '' && (!fields.en.content || fields.en.content.value.trim() === '');
  
  if (isArFilled && isEnEmpty) {
    // ترجمة من عربي إلى إنجليزي
    showToast("جاري الترجمة إلى الإنجليزية ✨...", "info");
    fields.en.title.value = await smartTranslate(fields.ar.title.value, 'en');
    if (fields.ar.content && fields.en.content) {
      fields.en.content.value = await smartTranslate(fields.ar.content.value, 'en');
    }
    showToast("تمت الترجمة بنجاح ✅");
  } else if (isEnFilled && isArEmpty) {
    // ترجمة من إنجليزي إلى عربي
    showToast("جاري الترجمة إلى العربية ✨...", "info");
    fields.ar.title.value = await smartTranslate(fields.en.title.value, 'ar');
    if (fields.en.content && fields.ar.content) {
      fields.ar.content.value = await smartTranslate(fields.en.content.value, 'ar');
    }
    showToast("تمت الترجمة بنجاح ✅");
  } else {
    // حالة غير صالحة للترجمة التلقائية
    showToast("يرجى ملء حقول لغة واحدة فقط بالكامل للترجمة العكسية", "error");
  }
}
