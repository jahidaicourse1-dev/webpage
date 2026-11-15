import { Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { SiteContent } from '../../types/portfolio';
import { apiJson, apiUpload } from '../../utils/api';
import { resolveAssetUrl } from '../../utils/url';

interface ContentEditorProps {
  initialContent: SiteContent;
  onSaved: (updated: SiteContent) => void;
}

export default function ContentEditor({ initialContent, onSaved }: ContentEditorProps) {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const res = await apiJson<{ ok: boolean; content?: SiteContent; error?: string }>('/api/admin/content', {
        method: 'PUT',
        requireCsrf: true,
        body: content,
      });
      if (!res.ok || !res.data.ok || !res.data.content) {
        setNotice({ type: 'error', text: res.data.error || 'Failed to save changes.' });
        return;
      }
      setContent(res.data.content);
      onSaved(res.data.content);
      setNotice({ type: 'success', text: 'Site content saved.' });
    } catch {
      setNotice({ type: 'error', text: 'Network error while saving content.' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setNotice(null);
    const res = await apiUpload('/api/admin/upload/image', file);
    setUploadingPhoto(false);
    if (!res.ok || !res.url) {
      setNotice({ type: 'error', text: res.error || 'Photo upload failed.' });
      return;
    }
    setContent((prev) => ({ ...prev, profilePhotoUrl: res.url! }));
    setNotice({ type: 'success', text: 'Profile photo uploaded. Click "Save all changes" to publish.' });
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    setNotice(null);
    const res = await apiUpload('/api/admin/upload/cv', file);
    setUploadingCv(false);
    if (!res.ok || !res.url) {
      setNotice({ type: 'error', text: res.error || 'CV upload failed.' });
      return;
    }
    setContent((prev) => ({ ...prev, cvFileUrl: res.url! }));
    setNotice({ type: 'success', text: 'CV PDF uploaded. Click "Save all changes" to publish.' });
  }

  function addSkill() {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    setContent((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setNewSkill('');
  }

  return (
    <form onSubmit={handleSave} className="space-y-10">
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

      {/* Hero & Identity */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-[#141413] border-b border-[#E4E1DA] pb-3">
          Hero &amp; Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="admin-name" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
              Full Name
            </label>
            <input
              id="admin-name"
              type="text"
              value={content.name}
              onChange={(e) => setContent({ ...content, name: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="admin-title" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
              Professional Title
            </label>
            <input
              id="admin-title"
              type="text"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="admin-hero-sub" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            Hero Lead Summary
          </label>
          <textarea
            id="admin-hero-sub"
            rows={2}
            value={content.heroSubheadline}
            onChange={(e) => setContent({ ...content, heroSubheadline: e.target.value })}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="admin-about" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            About Biography
          </label>
          <textarea
            id="admin-about"
            rows={4}
            value={content.about}
            onChange={(e) => setContent({ ...content, about: e.target.value })}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
      </section>

      {/* Contact & Media Files */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-[#141413] border-b border-[#E4E1DA] pb-3">
          Contact Details, Profile Photo &amp; CV
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={content.email}
              onChange={(e) => setContent({ ...content, email: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="admin-phone" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
              Phone
            </label>
            <input
              id="admin-phone"
              type="text"
              value={content.phone}
              onChange={(e) => setContent({ ...content, phone: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="admin-location" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
              Location
            </label>
            <input
              id="admin-location"
              type="text"
              value={content.location}
              onChange={(e) => setContent({ ...content, location: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="border border-[#E4E1DA] bg-[#F8F7F4] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#57554F]">Profile Photo</span>
              {content.profilePhotoUrl && (
                <button
                  type="button"
                  onClick={() => setContent({ ...content, profilePhotoUrl: '' })}
                  className="text-xs text-[#B91C1C] hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
            {content.profilePhotoUrl && (
              <img
                src={resolveAssetUrl(content.profilePhotoUrl)}
                alt="Profile preview"
                className="h-20 w-20 object-cover border border-[#E4E1DA]"
              />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 border border-[#D6D2C9] bg-white px-3.5 py-2 text-xs font-medium text-[#141413] hover:border-[#141413]">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {uploadingPhoto ? 'Uploading...' : 'Upload JPG/PNG/WebP'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="border border-[#E4E1DA] bg-[#F8F7F4] p-4 space-y-3">
            <span className="block text-xs font-medium uppercase tracking-wider text-[#57554F]">CV Document (PDF)</span>
            <p className="text-xs text-[#57554F] break-all">{content.cvFileUrl || 'No CV file attached'}</p>
            <label className="inline-flex cursor-pointer items-center gap-2 border border-[#D6D2C9] bg-white px-3.5 py-2 text-xs font-medium text-[#141413] hover:border-[#141413]">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {uploadingCv ? 'Uploading...' : 'Upload PDF'}
              <input type="file" accept="application/pdf" onChange={handleCvUpload} className="hidden" />
            </label>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-[#141413] border-b border-[#E4E1DA] pb-3">
          Skills
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill..."
            aria-label="New skill name"
            className="flex-1 border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSkill}
            className="inline-flex items-center gap-1.5 bg-[#141413] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E40AF]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add skill
          </button>
        </div>
        <ul className="divide-y divide-[#E4E1DA] border-t border-[#E4E1DA]">
          {content.skills.map((skill, idx) => (
            <li key={`${skill}-${idx}`} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-sm text-[#141413]">{skill}</span>
              <button
                type="button"
                aria-label={`Remove skill ${skill}`}
                onClick={() =>
                  setContent({
                    ...content,
                    skills: content.skills.filter((_, i) => i !== idx),
                  })
                }
                className="text-xs text-[#B91C1C] hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Services (Optional) */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#141413]">Services (Optional)</h2>
            <p className="text-xs text-[#57554F]">Hidden on the public site when empty.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setContent({
                ...content,
                services: [
                  ...content.services,
                  { id: `srv-${Date.now()}`, title: '', description: '' },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 border border-[#141413] px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add service
          </button>
        </div>
        {content.services.length === 0 ? (
          <p className="text-xs text-[#57554F]">No services added. The Services section is hidden publicly.</p>
        ) : (
          <div className="space-y-4">
            {content.services.map((srv, idx) => (
              <div key={srv.id} className="border border-[#E4E1DA] bg-[#F8F7F4] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Service title"
                    value={srv.title}
                    onChange={(e) => {
                      const next = [...content.services];
                      next[idx] = { ...srv, title: e.target.value };
                      setContent({ ...content, services: next });
                    }}
                    className="flex-1 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    aria-label="Delete service"
                    onClick={() =>
                      setContent({
                        ...content,
                        services: content.services.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-2 text-[#B91C1C] hover:bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Service description"
                  value={srv.description}
                  onChange={(e) => {
                    const next = [...content.services];
                    next[idx] = { ...srv, description: e.target.value };
                    setContent({ ...content, services: next });
                  }}
                  className="w-full border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Experience */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-3">
          <h2 className="font-display text-lg font-semibold text-[#141413]">Work Experience</h2>
          <button
            type="button"
            onClick={() =>
              setContent({
                ...content,
                experience: [
                  ...content.experience,
                  { id: `exp-${Date.now()}`, role: '', department: '', company: '', duration: '', highlights: [''] },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 border border-[#141413] px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add experience
          </button>
        </div>
        <div className="space-y-4">
          {content.experience.map((exp, idx) => (
            <div key={exp.id} className="border border-[#E4E1DA] bg-[#F8F7F4] p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Role"
                  value={exp.role}
                  onChange={(e) => {
                    const next = [...content.experience];
                    next[idx] = { ...exp, role: e.target.value };
                    setContent({ ...content, experience: next });
                  }}
                  className="border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={exp.department}
                  onChange={(e) => {
                    const next = [...content.experience];
                    next[idx] = { ...exp, department: e.target.value };
                    setContent({ ...content, experience: next });
                  }}
                  className="border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={exp.company}
                  onChange={(e) => {
                    const next = [...content.experience];
                    next[idx] = { ...exp, company: e.target.value };
                    setContent({ ...content, experience: next });
                  }}
                  className="border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Duration"
                    value={exp.duration}
                    onChange={(e) => {
                      const next = [...content.experience];
                      next[idx] = { ...exp, duration: e.target.value };
                      setContent({ ...content, experience: next });
                    }}
                    className="flex-1 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    aria-label="Remove experience"
                    onClick={() =>
                      setContent({
                        ...content,
                        experience: content.experience.filter((_, i) => i !== idx),
                      })
                    }
                    className="px-2 text-[#B91C1C]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#57554F] mb-1">Highlights (one per line)</label>
                <textarea
                  rows={3}
                  value={exp.highlights.join('\n')}
                  onChange={(e) => {
                    const next = [...content.experience];
                    next[idx] = { ...exp, highlights: e.target.value.split('\n') };
                    setContent({ ...content, experience: next });
                  }}
                  className="w-full border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Education & Languages */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-3">
          <h2 className="font-display text-lg font-semibold text-[#141413]">Education &amp; Training</h2>
          <button
            type="button"
            onClick={() =>
              setContent({
                ...content,
                education: [
                  ...content.education,
                  { id: `edu-${Date.now()}`, title: '', category: '', statusOrDuration: '' },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 border border-[#141413] px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add education
          </button>
        </div>
        <div className="space-y-3">
          {content.education.map((edu, idx) => (
            <div key={edu.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#F8F7F4] border border-[#E4E1DA] p-3">
              <input
                type="text"
                placeholder="Qualification / Training"
                value={edu.title}
                onChange={(e) => {
                  const next = [...content.education];
                  next[idx] = { ...edu, title: e.target.value };
                  setContent({ ...content, education: next });
                }}
                className="md:col-span-5 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Category"
                value={edu.category}
                onChange={(e) => {
                  const next = [...content.education];
                  next[idx] = { ...edu, category: e.target.value };
                  setContent({ ...content, education: next });
                }}
                className="md:col-span-4 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Status / Duration"
                value={edu.statusOrDuration}
                onChange={(e) => {
                  const next = [...content.education];
                  next[idx] = { ...edu, statusOrDuration: e.target.value };
                  setContent({ ...content, education: next });
                }}
                className="md:col-span-2 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                aria-label="Remove education item"
                onClick={() =>
                  setContent({
                    ...content,
                    education: content.education.filter((_, i) => i !== idx),
                  })
                }
                className="md:col-span-1 flex items-center justify-center text-[#B91C1C]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-3 pt-4">
          <h3 className="font-display text-base font-semibold text-[#141413]">Languages</h3>
          <button
            type="button"
            onClick={() =>
              setContent({
                ...content,
                languages: [...content.languages, { id: `lang-${Date.now()}`, name: '', proficiency: '' }],
              })
            }
            className="inline-flex items-center gap-1.5 border border-[#141413] px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add language
          </button>
        </div>
        <div className="space-y-3">
          {content.languages.map((lang, idx) => (
            <div key={lang.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#F8F7F4] border border-[#E4E1DA] p-3">
              <input
                type="text"
                placeholder="Language"
                value={lang.name}
                onChange={(e) => {
                  const next = [...content.languages];
                  next[idx] = { ...lang, name: e.target.value };
                  setContent({ ...content, languages: next });
                }}
                className="sm:col-span-5 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Proficiency"
                value={lang.proficiency}
                onChange={(e) => {
                  const next = [...content.languages];
                  next[idx] = { ...lang, proficiency: e.target.value };
                  setContent({ ...content, languages: next });
                }}
                className="sm:col-span-6 border border-[#D6D2C9] bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                aria-label="Remove language"
                onClick={() =>
                  setContent({
                    ...content,
                    languages: content.languages.filter((_, i) => i !== idx),
                  })
                }
                className="sm:col-span-1 flex items-center justify-center text-[#B91C1C]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SEO Metadata */}
      <section className="border border-[#E4E1DA] bg-white p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-[#141413] border-b border-[#E4E1DA] pb-3">
          SEO Metadata
        </h2>
        <div>
          <label htmlFor="admin-seo-title" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            SEO Page Title
          </label>
          <input
            id="admin-seo-title"
            type="text"
            value={content.seoTitle}
            onChange={(e) => setContent({ ...content, seoTitle: e.target.value })}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="admin-seo-desc" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1.5">
            SEO Meta Description
          </label>
          <textarea
            id="admin-seo-desc"
            rows={2}
            value={content.seoDescription}
            onChange={(e) => setContent({ ...content, seoDescription: e.target.value })}
            className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#141413] px-6 py-3 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save all changes'}
        </button>
      </div>
    </form>
  );
}
