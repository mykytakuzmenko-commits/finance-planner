import type { Subscription, SubCadence } from '../../calculations/subscriptions'
import type { CurrencyCode } from '../../types/settings'
import { formatMoney } from '../../utils/money'
import { formatDayMonth } from '../../utils/date'

const CADENCE_LABEL: Record<SubCadence, string> = {
  monthly: 'щомісяця',
  quarterly: 'щокварталу',
  yearly: 'щороку',
}

interface Props {
  subscriptions: Subscription[]
  currency: CurrencyCode
}

/** Detected recurring payments (subscriptions) with an estimated monthly total. */
export function SubscriptionsCard({ subscriptions, currency }: Props) {
  if (subscriptions.length === 0) return null
  const totalMonthly = subscriptions.reduce((s, x) => s + x.monthlyEquivalent, 0)

  return (
    <section className="section-card subs">
      <div className="subs__head">
        <h2 className="section__title">Підписки та регулярні платежі</h2>
        <span className="subs__total">≈ {formatMoney(totalMonthly, currency)}/міс</span>
      </div>
      <ul className="subs__list">
        {subscriptions.map((s) => (
          <li key={s.id} className="subs__item">
            <div className="subs__info">
              <span className="subs__label">{s.label}</span>
              <span className="subs__meta">
                {CADENCE_LABEL[s.cadence]} · наступне ~{formatDayMonth(s.nextDate)}
                {s.confidence === 'medium' && ' · імовірно'}
              </span>
            </div>
            <span className="subs__amount">{formatMoney(s.amount, currency)}</span>
          </li>
        ))}
      </ul>
      <p className="subs__note">
        Знайдено за схожими регулярними списаннями — це орієнтир, а не точний список.
      </p>
    </section>
  )
}
