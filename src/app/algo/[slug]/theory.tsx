import { MarkdownView } from '@/components/MarkdownView';
import { Placeholder } from '@/components/Placeholder';
import { getTheory } from '@/content';
import { useAlgoContent } from '@/hooks/use-algo-content';

export default function TheoryTab() {
  const content = useAlgoContent();
  const theory = content?.theory ? getTheory(content.theory.topicKey) : null;
  if (!theory) return <Placeholder text="Теория для этой темы ещё не добавлена" />;
  return <MarkdownView>{theory.bodyMd}</MarkdownView>;
}
