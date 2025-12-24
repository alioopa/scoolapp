import { Subject } from './types';

// ملاحظة: تم إفراغ المواد ليتم إضافتها يدوياً من لوحة التحكم
export const SUBJECTS: Subject[] = [
  {
    id: 'islamic',
    title: 'التربية الإسلامية',
    icon: 'BookOpen',
    color: 'bg-emerald-500',
    materials: []
  },
  {
    id: 'arabic',
    title: 'اللغة العربية',
    icon: 'ScrollText',
    color: 'bg-amber-500',
    materials: []
  },
  {
    id: 'english',
    title: 'اللغة الإنجليزية',
    icon: 'Languages',
    color: 'bg-blue-500',
    materials: []
  },
  {
    id: 'math',
    title: 'الرياضيات',
    icon: 'Calculator',
    color: 'bg-indigo-500',
    materials: []
  },
  {
    id: 'biology',
    title: 'الأحياء',
    icon: 'Dna',
    color: 'bg-green-600',
    materials: []
  },
  {
    id: 'chemistry',
    title: 'الكيمياء',
    icon: 'FlaskConical',
    color: 'bg-teal-500',
    materials: []
  },
  {
    id: 'physics',
    title: 'الفيزياء',
    icon: 'Atom',
    color: 'bg-purple-600',
    materials: []
  },
  {
    id: 'social',
    title: 'الاجتماعيات',
    icon: 'Globe',
    color: 'bg-orange-500',
    materials: []
  }
];