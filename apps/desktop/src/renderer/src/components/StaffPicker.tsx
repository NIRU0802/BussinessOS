export interface StaffMember {
  id: string
  firstName: string
  lastName: string
  roles: string[]
  hasPassword: boolean
  hasPin: boolean
}

interface StaffPickerProps {
  staff: StaffMember[]
  onSelect: (member: StaffMember) => void
  onRefresh: () => void
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export default function StaffPicker({ staff, onSelect, onRefresh }: StaffPickerProps) {
  return (
    <div className="staff-picker-page">
      <div className="staff-picker-inner">
        <div className="staff-picker-header">
          <h1 className="page-heading" style={{ marginTop: 0 }}>
            Who's working?
          </h1>
          <button onClick={onRefresh} className="ui-button">
            Refresh
          </button>
        </div>

        <div className="staff-grid">
          {staff.map((member) => (
            <button key={member.id} onClick={() => onSelect(member)} className="staff-tile">
              <div className="staff-avatar">{initials(member.firstName, member.lastName)}</div>
              <span className="staff-name">
                {member.firstName} {member.lastName}
              </span>
              <span className="staff-role-badge">{member.roles[0]}</span>
            </button>
          ))}
        </div>

        {staff.length === 0 && <p className="page-description">No staff configured yet.</p>}
      </div>
    </div>
  )
}
