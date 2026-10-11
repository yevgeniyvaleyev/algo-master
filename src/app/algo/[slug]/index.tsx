import { MarkdownView } from '@/components/MarkdownView';
import { Placeholder } from '@/components/Placeholder';
import { useAlgoContent } from '@/hooks/use-algo-content';

export default function ConditionTab() {
  const content = useAlgoContent();
  if (!content) return <Placeholder text="Контент для этого алгоритма ещё не добавлен" />;
  return <MarkdownView>{content.conditionMd}</MarkdownView>;
}
