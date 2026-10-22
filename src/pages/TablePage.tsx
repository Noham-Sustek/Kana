import { PageHeader } from '@/components/PageHeader'
import { Placeholder } from '@/components/Placeholder'

export function TablePage() {
  return (
    <>
      <PageHeader title="Tableau" subtitle="Tous les hiragana et katakana." />
      <Placeholder glyph="ア" text="Le tableau des kana arrive bientôt." />
    </>
  )
}
