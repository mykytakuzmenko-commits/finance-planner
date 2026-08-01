import type { CurrencyCode } from '../../types/settings'
import { formatMoney } from '../../utils/money'

interface CashFlowBarProps {
  actualIncome: number
  upcomingIncome: number
  actualExpense: number
  upcomingExpense: number
  currency: CurrencyCode
}

/** Two horizontal bars comparing inflow vs outflow, each split actual / upcoming. */
export function CashFlowBar({
  actualIncome,
  upcomingIncome,
  actualExpense,
  upcomingExpense,
  currency,
}: CashFlowBarProps) {
  const incomeTotal = actualIncome + upcomingIncome
  const expenseTotal = actualExpense + upcomingExpense
  const max = Math.max(incomeTotal, expenseTotal, 1)
  const pct = (v: number) => `${(v / max) * 100}%`

  return (
    <div className="cashflow">
      <div className="cashflow__row">
        <div className="cashflow__head">
          <span>Доходи</span>
          <span className="cashflow__total">{formatMoney(incomeTotal, currency)}</span>
        </div>
        <div className="cashflow__track">
          <div
            className="cashflow__seg cashflow__seg--income"
            style={{ width: pct(actualIncome) }}
            title="Фактичні"
          />
          <div
            className="cashflow__seg cashflow__seg--income-soft"
            style={{ width: pct(upcomingIncome) }}
            title="Майбутні"
          />
        </div>
      </div>

      <div className="cashflow__row">
        <div className="cashflow__head">
          <span>Витрати</span>
          <span className="cashflow__total">{formatMoney(expenseTotal, currency)}</span>
        </div>
        <div className="cashflow__track">
          <div
            className="cashflow__seg cashflow__seg--expense"
            style={{ width: pct(actualExpense) }}
            title="Фактичні"
          />
          <div
            className="cashflow__seg cashflow__seg--expense-soft"
            style={{ width: pct(upcomingExpense) }}
            title="Майбутні"
          />
        </div>
      </div>

      <div className="cashflow__legend">
        <span><i className="dot dot--solid" /> фактичні</span>
        <span><i className="dot dot--soft" /> майбутні (за планом)</span>
      </div>
    </div>
  )
}
