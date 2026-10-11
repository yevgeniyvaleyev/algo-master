import { MarkdownView } from '@/components/MarkdownView';
import { Placeholder } from '@/components/Placeholder';
import { useAlgoContent } from '@/hooks/use-algo-content';

export default function DescriptionTab() {
  const content = useAlgoContent();
  if (!content?.descriptionRuMd) return <Placeholder text="Контент для этого алгоритма ещё не добавлен" />;
  return <MarkdownView>{content.descriptionRuMd}</MarkdownView>;
}
