import { PageHeader } from '@/components/PageHeader'
import { Placeholder } from '@/components/Placeholder'

export function WritingPage() {
  return (
    <>
      <PageHeader title="Écriture" subtitle="Tracer les kana trait par trait." />
      <Placeholder glyph="か" text="L'écriture guidée arrive bientôt." />
    </>
  )
}
