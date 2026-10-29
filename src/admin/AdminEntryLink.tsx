import './admin.css'

export function AdminEntryLink({ onClick }: { onClick: () => void }) {
  return <div className="admin-entry-link">
    <a href="/admin" onClick={(event) => { event.preventDefault(); onClick() }}>담당자 데모</a>
  </div>
}
