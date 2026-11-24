import { Modal } from '../../components/overview/AlertModals'

/** Confirmation for a destructive step, on the shared alert modal (focus trap, Esc, portal) */
export function ConfirmModal({ title, text, confirm, onConfirm, onCancel }: { title: string; text: string; confirm: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal
      title={title}
      subtitle=""
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="abtn abtn--danger" onClick={onConfirm}>
            {confirm}
          </button>
          <button type="button" className="abtn abtn--ghost" onClick={onCancel}>
            انصراف
          </button>
        </>
      }
    >
      <p className="amodal__q">{text}</p>
    </Modal>
  )
}
