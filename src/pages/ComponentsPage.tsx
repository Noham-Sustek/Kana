import { useState, type ReactNode } from 'react'
import { Banner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Choice } from '@/components/Choice'
import { Dialog } from '@/components/Dialog'
import { EmptyState } from '@/components/EmptyState'
import { Feedback } from '@/components/Feedback'
import { IconButton } from '@/components/IconButton'
import { KanaTile } from '@/components/KanaTile'
import { MasterySteps } from '@/components/MasterySteps'
import { ProgressBar } from '@/components/ProgressBar'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SessionProgress } from '@/components/SessionProgress'
import { Sheet } from '@/components/Sheet'
import { Switch } from '@/components/Switch'
import { TextField } from '@/components/TextField'
import { TimerBar } from '@/components/TimerBar'
import { WeekStrip } from '@/components/WeekStrip'
import { WordTile } from '@/components/WordTile'
import { haptic } from '@/lib/haptic'
import { useSettingsStore, type Theme } from '@/stores/settingsStore'

/** Galerie des composants du design system (`#/dev/composants`, serveur de dev seulement). */
export function ComponentsPage() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [seg, setSeg] = useState(10)
  const [sw, setSw] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [field, setField] = useState('')

  return (
    <div className="pb-8">
      <h1 className="font-serif text-2xl font-medium">Composants</h1>
      <div className="mt-3">
        <SegmentedControl<Theme>
          label="Thème"
          options={[
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
            { value: 'system', label: 'Système' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </div>

      <Section title="Bouton">
        <Button detail="12 questions · environ 3 min" icon="arrow">
          Session du jour
        </Button>
        <Button>Commencer</Button>
        <Button disabled>Commencer</Button>
        <Button variant="ink" icon="arrow">
          Suivant
        </Button>
        <Button variant="line">Réessayer</Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="line" size="sm" icon="list" iconPosition="start">
            En faire une liste
          </Button>
          <Button variant="text">Session libre</Button>
          <Button variant="quiet" icon="eye" iconPosition="start">
            Afficher la réponse
          </Button>
          <IconButton icon="settings" label="Réglages" />
        </div>
      </Section>

      <Section title="Réponse à choix">
        <div className="grid grid-cols-2 gap-2.5">
          <Choice onClick={() => haptic('correct')}>nu</Choice>
          <Choice state="correct">nu</Choice>
          <Choice state="wrong">me</Choice>
          <Choice state="revealed">nu</Choice>
          <Choice state="dim">re</Choice>
          <Choice jp>ぬ</Choice>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Choice compact>shi</Choice>
          <Choice compact state="wrong">tsu</Choice>
        </div>
      </Section>

      <Section title="Contrôle segmenté · interrupteur">
        <SegmentedControl
          label="Questions"
          options={[
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 50, label: '50' },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <Switch
          label="Réessayer après une erreur"
          description="Sinon, la bonne réponse est affichée tout de suite."
          checked={sw}
          onChange={setSw}
        />
      </Section>

      <Section title="Puce">
        <div className="flex flex-wrap gap-2">
          <Chip glyph="か" detail="ka" />
          <Chip state="on" glyph="あ" detail="a" />
          <Chip state="partial" glyph="さ" detail="sa · 3/5" />
          <Chip state="on" detail={8}>
            Mes kana difficiles
          </Chip>
          <Chip glyph="きゃ" detail="kya" disabled />
        </div>
      </Section>

      <Section title="Case de kana">
        <div className="grid grid-cols-5 gap-2">
          <KanaTile kana="あ" romaji="a" />
          <KanaTile kana="い" romaji="i" selected onClick={() => {}} />
          <KanaTile kana="か" variant="done" />
          <KanaTile kana="た" variant="current" fill={0.6} />
          <KanaTile kana="な" variant="locked" />
          <KanaTile kana="ぬ" heat={0} />
          <KanaTile kana="ぬ" heat={1} />
          <KanaTile kana="ぬ" heat={2} />
          <KanaTile kana="ぬ" heat={3} />
          <KanaTile kana="ぬ" heat={4} />
          <KanaTile kana="さ" writing={0} />
          <KanaTile kana="さ" writing={1} />
          <KanaTile kana="さ" writing={2} />
        </div>
      </Section>

      <Section title="Progression">
        <SessionProgress ticks={['done', 'done', 'missed', 'done', 'current', 'todo', 'todo', 'todo']} />
        <ProgressBar value={0.46} label="Kana acquis" />
        <button type="button" className="text-left text-sm text-ink-muted" onClick={() => setTimerKey((k) => k + 1)}>
          Chrono 5 s (toucher pour relancer)
          <TimerBar durationMs={5000} runKey={timerKey} className="mt-1" />
        </button>
        <div className="flex items-center gap-4">
          <MasterySteps level={0} />
          <MasterySteps level={1} />
          <MasterySteps level={2} />
          <MasterySteps level={3} />
        </div>
        <WeekStrip days={['on', 'on', 'on', 'today', 'off', 'off', 'off']} />
      </Section>

      <Section title="Champ">
        <TextField placeholder="Tapez le romaji" value={field} onChange={(e) => setField(e.target.value)} />
        <TextField state="correct" value="nu" readOnly />
        <TextField state="wrong" value="mu" readOnly />
        <TextField variant="ui" placeholder="Nom de la liste" />
      </Section>

      <Section title="Étiquette de mot">
        <div className="flex flex-wrap gap-2">
          <WordTile>わたし</WordTile>
          <WordTile state="gone">は</WordTile>
          <WordTile state="correct">がくせい</WordTile>
          <WordTile state="wrong">でず</WordTile>
        </div>
      </Section>

      <Section title="Retour de réponse">
        <Feedback signal="correct" title="Juste">
          <span className="font-jp">いぬ</span> · inu — chien
        </Feedback>
        <Feedback signal="wrong" title="Pas encore">
          « me » s’écrit <span className="font-jp">め</span>. Choisissez une autre réponse.
        </Feedback>
        <Feedback signal="revealed" title="La réponse : nu">
          À ne pas confondre avec <span className="font-jp">め</span> (me).
        </Feedback>
      </Section>

      <Section title="Bandeau · état vide">
        <Banner icon="download" actionLabel="Exporter maintenant" onAction={() => {}} onDismiss={() => {}}>
          <b className="font-semibold">Dernière sauvegarde il y a 34 jours.</b>
        </Banner>
        <EmptyState
          icon="list"
          title="Aucune liste pour l’instant"
          action={
            <Button variant="line" size="sm">
              Créer une liste
            </Button>
          }
        >
          Regroupez les kana qui vous résistent pour les travailler ensemble.
        </EmptyState>
      </Section>

      <Section title="Feuille · dialogue">
        <div className="flex gap-2">
          <Button variant="line" size="sm" onClick={() => setSheet(true)}>
            Ouvrir une feuille
          </Button>
          <Button variant="line" size="sm" onClick={() => setDialog(true)}>
            Ouvrir un dialogue
          </Button>
        </div>
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Qui apprend ?">
        <p className="text-sm text-ink-muted">Tirez la poignée vers le bas, touchez le voile ou faites Retour.</p>
        <div className="mt-3">
          <Button onClick={() => setSheet(false)}>Fermer</Button>
        </div>
      </Sheet>
      <Dialog
        open={dialog}
        title="Quitter la session ?"
        safeLabel="Continuer"
        onSafe={() => setDialog(false)}
        riskyLabel="Quitter"
        onRisky={() => setDialog(false)}
      >
        Vos 4 réponses sont enregistrées.
      </Dialog>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-hairline pt-4">
      <h2 className="mb-3 text-[11px] leading-[14px] font-bold tracking-[0.12em] text-ink-muted uppercase">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
