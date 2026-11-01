import { MarkdownView } from '@/components/MarkdownView';
import { Placeholder } from '@/components/Placeholder';
import { displayTitle } from '@/content/format';
import { useAlgoContent } from '@/hooks/use-algo-content';

export default function DescriptionTab() {
  const content = useAlgoContent();
  if (!content?.descriptionRuMd) return <Placeholder text="Контент для этого алгоритма ещё не добавлен" />;
  // The translation starts with the condition itself, so the tab heads it with "88. Merge Sorted Array".
  return <MarkdownView>{`## ${displayTitle(content)}\n\n${content.descriptionRuMd}`}</MarkdownView>;
}
