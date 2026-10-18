import { MarkdownView } from '@/components/MarkdownView';
import { Placeholder } from '@/components/Placeholder';
import { useAlgoContent } from '@/hooks/use-algo-content';

export default function ExplanationTab() {
  const content = useAlgoContent();
  if (!content?.explanationRuMd) return <Placeholder text="Подробный разбор для этого алгоритма ещё не добавлен" />;
  return <MarkdownView>{content.explanationRuMd}</MarkdownView>;
}
