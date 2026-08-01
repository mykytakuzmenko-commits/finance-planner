import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

export function TransactionsPage() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <div className="page">
      <EmptyState
        icon="transactions"
        title="Ще немає операцій"
        description="Додавання доходів, витрат і переказів зʼявиться на наступному етапі (Milestone 2). Кнопка нижче демонструє базове модальне вікно."
        action={
          <Button onClick={() => setDemoOpen(true)}>Показати приклад форми</Button>
        }
      />

      <Modal
        open={demoOpen}
        title="Демонстрація модального вікна"
        onClose={() => setDemoOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDemoOpen(false)}>
              Закрити
            </Button>
            <Button onClick={() => setDemoOpen(false)}>Зрозуміло</Button>
          </>
        }
      >
        <p>
          Це базовий компонент модального вікна з UI-фундаменту. У Milestone 2
          тут буде повноцінна форма додавання транзакції.
        </p>
      </Modal>
    </div>
  )
}
