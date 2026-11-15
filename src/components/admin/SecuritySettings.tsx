import { useState } from 'react';
import { apiJson } from '../../utils/api';
import { validatePasswordStrength } from '../../utils/validation';

interface SecuritySettingsProps {
  username: string;
}

export default function SecuritySettings({ username }: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setNotice({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setNotice({ type: 'error', text: strengthError });
      return;
    }

    setSaving(true);
    try {
      const res = await apiJson<{ ok: boolean; message?: string; error?: string }>(
        '/api/admin/change-password',
        {
          method: 'POST',
          requireCsrf: true,
          body: { currentPassword, newPassword },
        },
      );
      if (!res.ok || !res.data.ok) {
        setNotice({ type: 'error', text: res.data.error || 'Could not update password.' });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', text: res.data.message || 'Password updated.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg border border-[#E4E1DA] bg-white p-6 space-y-6">
      <div className="border-b border-[#E4E1DA] pb-3">
        <h2 className="font-display text-lg font-semibold text-[#141413]">Account Security</h2>
        <p className="text-xs text-[#57554F] mt-1">Signed in as {username}</p>
      </div>

      {notice && (
        <div
          role="status"
          className={`border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-[#166534]/30 bg-[#F0FDF4] text-[#166534]'
              : 'border-[#B91C1C]/30 bg-[#FEF2F2] text-[#B91C1C]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sec-current" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            Current Password
          </label>
          <input
            id="sec-current"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sec-new" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            New Password (min 10 chars, upper/lower/number)
          </label>
          <input
            id="sec-new"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sec-confirm" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            Confirm New Password
          </label>
          <input
            id="sec-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-[#141413] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#1E40AF] disabled:opacity-60"
        >
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
