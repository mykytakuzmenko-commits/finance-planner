import type { Account } from '../../types/finance'
import { formatMoney } from '../../utils/money'
import { getCurrency } from '../../constants/currencies'
import { Icon } from '../ui/Icon'

const GRADIENTS = [
  'linear-gradient(135deg, #1f6f4a, #0f1220)',
  'linear-gradient(135deg, #2b4c8c, #0f1220)',
  'linear-gradient(135deg, #6d3f9e, #0f1220)',
  'linear-gradient(135deg, #8c5a2b, #0f1220)',
]

interface Props {
  accounts: Account[]
  balances: Map<string, number>
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
}

/** Real accounts shown as premium card tiles — no fabricated card numbers. */
export function AccountCards({ accounts, balances, onEdit, onDelete }: Props) {
  return (
    <div className="acct-cards">
      {accounts.map((a, i) => (
        <div
          key={a.id}
          className="acct-card"
          style={{ background: GRADIENTS[i % GRADIENTS.length] }}
        >
          <div className="acct-card__top">
            <span className="acct-card__chip" aria-hidden="true" />
            <span className="acct-card__actions">
              <span className="acct-card__cur">{getCurrency(a.currency).symbol} {a.currency}</span>
              <button
                type="button"
                className="acct-card__btn"
                aria-label={`Редагувати ${a.name}`}
                onClick={() => onEdit(a)}
              >
                <Icon name="settings" size={15} />
              </button>
              <button
                type="button"
                className="acct-card__btn"
                aria-label={`Видалити ${a.name}`}
                onClick={() => onDelete(a)}
              >
                <Icon name="close" size={15} />
              </button>
            </span>
          </div>
          <span className="acct-card__balance">
            {formatMoney(balances.get(a.id) ?? 0, a.currency)}
          </span>
          <div className="acct-card__foot">
            <span className="acct-card__name">{a.name}</span>
            {a.isSavings && <span className="acct-card__tag">Ощадний</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
