import { Bookmark, Material, Subject, AppConfig } from '../types';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants';

const BOOKMARKS_KEY = 'haqiba_bookmarks';
const THEME_KEY = 'haqiba_theme';
const CUSTOM_MATERIALS_KEY = 'haqiba_custom_materials';
const HIDDEN_MATERIALS_KEY = 'haqiba_hidden_materials'; 
const CONFIG_KEY = 'haqiba_config';

// --- Bookmarks Logic ---
export const getBookmarks = (): Bookmark[] => {
  try {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    if (!data) return [];
    const bookmarksMap: Record<string, Bookmark> = JSON.parse(data);
    return Object.values(bookmarksMap).sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    return [];
  }
};

export const getBookmark = (materialId: string): number => {
  try {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    if (!data) return 1;
    const bookmarks: Record<string, Bookmark> = JSON.parse(data);
    return bookmarks[materialId]?.page || 1;
  } catch (e) {
    return 1;
  }
};

export const saveBookmark = (materialId: string, page: number, title?: string, subjectId?: string) => {
  try {
    const data = localStorage.getItem(BOOKMARKS_KEY);
    const bookmarks: Record<string, Bookmark> = data ? JSON.parse(data) : {};
    
    bookmarks[materialId] = {
      materialId,
      page,
      timestamp: Date.now(),
      materialTitle: title || bookmarks[materialId]?.materialTitle,
      subjectId: subjectId || bookmarks[materialId]?.subjectId
    };
    
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save bookmark', e);
  }
};

export const clearData = () => {
    localStorage.removeItem(BOOKMARKS_KEY);
}

// --- Theme Logic ---
export const getTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
};

export const saveTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// --- Admin & Config Logic ---

const getCustomMaterials = (): Record<string, Material[]> => {
    try {
        const data = localStorage.getItem(CUSTOM_MATERIALS_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

const getHiddenMaterials = (): string[] => {
    try {
        const data = localStorage.getItem(HIDDEN_MATERIALS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export const saveCustomMaterial = (subjectId: string, material: Material) => {
    const custom = getCustomMaterials();
    if (!custom[subjectId]) custom[subjectId] = [];
    custom[subjectId].push(material);
    localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(custom));
}

export const deleteCustomMaterial = (subjectId: string, materialId: string) => {
    const custom = getCustomMaterials();
    let found = false;
    if (custom[subjectId]) {
        const initialLen = custom[subjectId].length;
        custom[subjectId] = custom[subjectId].filter(m => m.id !== materialId);
        if (custom[subjectId].length !== initialLen) found = true;
    }
    if (!found) {
        Object.keys(custom).forEach(key => {
            custom[key] = custom[key].filter(m => m.id !== materialId);
        });
    }
    localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(custom));
}

export const hideDefaultMaterial = (materialId: string) => {
    const hidden = getHiddenMaterials();
    if (!hidden.includes(materialId)) {
        hidden.push(materialId);
        localStorage.setItem(HIDDEN_MATERIALS_KEY, JSON.stringify(hidden));
    }
}

// Config (Channels & Settings)
export const getAppConfig = (): AppConfig => {
    try {
        const data = localStorage.getItem(CONFIG_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {}
    
    // Default Config Updated with User's Channel
    return {
        requiredChannels: [
            { id: "my_channel", name: "قناة الثالث متوسط الرسمية", url: "https://t.me/Tleker" }
        ],
        adminIds: [123456],
        isMaintenance: false
    };
};

export const saveAppConfig = (config: AppConfig) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const getAllSubjects = (): Subject[] => {
    const custom = getCustomMaterials();
    const hidden = getHiddenMaterials();

    return DEFAULT_SUBJECTS.map(sub => {
        const customForSub = custom[sub.id] || [];
        const allMaterials = [...sub.materials, ...customForSub];
        const visibleMaterials = allMaterials.filter(m => !hidden.includes(m.id));

        return {
            ...sub,
            materials: visibleMaterials
        };
    });
}