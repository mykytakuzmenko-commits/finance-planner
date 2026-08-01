import { useMacro } from '../state/MacroContext'
import { useSettings } from '../state/SettingsContext'
import { ratesFromMacro } from '../services/macro'
import { formatDate } from '../utils/date'
import { Button } from '../components/ui/Button'

function Freshness({ live }: { live: boolean }) {
  return (
    <span className={`status-badge ${live ? 'status-badge--on-track' : 'status-badge--warning'}`}>
      {live ? 'Актуально' : 'Останні відомі'}
    </span>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function MacroPage() {
  const { loading, data, fromCache, refresh } = useMacro()
  const { settings, updateSettings } = useSettings()

  if (loading && !data) return <div className="page__loading">Завантаження…</div>
  if (!data) return <div className="page__loading">Немає даних.</div>

  const applyRates = () => {
    updateSettings({ exchangeRates: ratesFromMacro(data, settings.baseCurrency) })
  }

  return (
    <div className="page">
      <div className="macro-head">
        <p className="section__hint">
          Публічні макродані. Ваші фінансові дані нікуди не передаються — тягнуться лише курси,
          інфляція та ставки.
          {fromCache && ' Показано збережену копію (немає зʼєднання з джерелом).'}
        </p>
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Оновлення…' : 'Оновити'}
        </Button>
      </div>

      {/* Currency rates */}
      <section className="macro-card">
        <div className="macro-card__head">
          <h2 className="section__title">Курси валют</h2>
          <Freshness live={data.rates.live} />
        </div>
        <div className="macro-rates">
          <div className="macro-rate">
            <span className="macro-rate__pair">1 USD</span>
            <span className="macro-rate__val">{data.rates.USD.toFixed(2)} ₴</span>
          </div>
          <div className="macro-rate">
            <span className="macro-rate__pair">1 EUR</span>
            <span className="macro-rate__val">{data.rates.EUR.toFixed(2)} ₴</span>
          </div>
        </div>
        <div className="macro-card__foot">
          <span>
            {data.rates.source} · {formatDate(data.rates.date)}
          </span>
          <Button onClick={applyRates}>Застосувати ці курси</Button>
        </div>
      </section>

      {/* Key rate */}
      <section className="macro-card">
        <div className="macro-card__head">
          <h2 className="section__title">Ключова ставка</h2>
          <Freshness live={data.keyRate.live} />
        </div>
        <p className="macro-big">{data.keyRate.value.toFixed(2)}%</p>
        <div className="macro-card__foot">
          <span>
            {data.keyRate.source} · {formatDate(data.keyRate.date)}
          </span>
        </div>
      </section>

      {/* Inflation */}
      <section className="macro-card">
        <div className="macro-card__head">
          <h2 className="section__title">Інфляція</h2>
          <Freshness live={data.inflation.live} />
        </div>
        <p className="macro-big">{data.inflation.value.toFixed(1)}%</p>
        <div className="macro-card__foot">
          <span>
            {data.inflation.source} · {data.inflation.period} · {formatDate(data.inflation.date)}
          </span>
        </div>
      </section>

      <p className="section__hint">Оновлено: {formatDateTime(data.fetchedAt)}</p>
    </div>
  )
}
