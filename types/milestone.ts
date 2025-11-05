import { TranslationKeys } from "@/app/[locale]/(landing)/types/translations";

export type Milestone = {
  id: number;
  titleKey: keyof TranslationKeys;
  descriptionKey: keyof TranslationKeys;
  image?: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  estimatedDate?: keyof TranslationKeys;
  completedDate?: string;
}