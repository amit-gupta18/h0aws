'use client'

import { useState } from 'react'
import { useActiveRole, useAuthStore } from '@/store/authStore'
import { useMembers, useAddMember, useRemoveMember } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Trash2, UserPlus } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ACCOUNTANT: 'Accountant',
  VIEWER: 'Viewer',
}

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export default function TeamPage() {
  const role = useActiveRole()
  const currentUserId = useAuthStore((s) => s.userId)

  const { data, isLoading, error } = useMembers()
  const addMember = useAddMember()
  const removeMember = useRemoveMember()

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberRole, setMemberRole] = useState<'ACCOUNTANT' | 'VIEWER'>('ACCOUNTANT')
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  if (role !== 'OWNER') {
    return <div className="text-muted-foreground">Only the owner can manage the team.</div>
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await addMember.mutateAsync({ email, password, role: memberRole })
    setCreated({ email, password })
    setEmail('')
    setPassword('')
    setMemberRole('ACCOUNTANT')
    setShowForm(false)
  }

  const members = data?.members ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground text-sm">
            Add accountants and viewers, then hand them their login.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setCreated(null) }}>
            <UserPlus size={16} /> Add member
          </Button>
        )}
      </div>

      {created && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium">Member created — share these credentials:</p>
          <p className="mt-1 font-mono">Email: {created.email}</p>
          <p className="font-mono">Password: {created.password}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            They can log in directly at the sign-in page.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="accountant@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="At least 8 characters"
            />
            <p className="text-muted-foreground text-xs">
              You set this and share it with them. Minimum 8 characters.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="role">Role</label>
            <select
              id="role"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as 'ACCOUNTANT' | 'VIEWER')}
              className={inputClass}
            >
              <option value="ACCOUNTANT">Accountant — create &amp; view invoices</option>
              <option value="VIEWER">Viewer — view only</option>
            </select>
          </div>

          {addMember.error && (
            <p className="text-danger bg-danger-subtle border-danger/20 rounded-md border px-3 py-2 text-sm">
              {addMember.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding…' : 'Add member'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="text-muted-foreground p-4 text-sm">Loading team…</div>
        ) : error ? (
          <div className="text-destructive p-4 text-sm">{error.message}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {m.email}
                    {m.userId === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[m.role] ?? m.role}</td>
                  <td className="px-4 py-3 text-right">
                    {m.role !== 'OWNER' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removeMember.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${m.email} from this business?`)) {
                            removeMember.mutate(m.id)
                          }
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
