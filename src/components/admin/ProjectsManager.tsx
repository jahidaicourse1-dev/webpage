import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { ProjectItem } from '../../types/portfolio';
import { apiJson, apiUpload } from '../../utils/api';

interface ProjectsManagerProps {
  initialProjects: ProjectItem[];
  onChanged: (projects: ProjectItem[]) => void;
}

interface ProjectDraft {
  id: number | null;
  title: string;
  description: string;
  tagsText: string;
  imageUrl: string;
  liveLink: string;
  published: boolean;
}

const EMPTY_DRAFT: ProjectDraft = {
  id: null,
  title: '',
  description: '',
  tagsText: '',
  imageUrl: '',
  liveLink: '',
  published: true,
};

export default function ProjectsManager({ initialProjects, onChanged }: ProjectsManagerProps) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function syncProjects(next: ProjectItem[]) {
    setProjects(next);
    onChanged(next);
  }

  function startEdit(p: ProjectItem) {
    setNotice(null);
    setDraft({
      id: p.id,
      title: p.title,
      description: p.description,
      tagsText: p.tags.join(', '),
      imageUrl: p.imageUrl,
      liveLink: p.liveLink,
      published: p.published,
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    const res = await apiUpload('/api/admin/upload/image', file);
    setUploading(false);
    if (!res.ok || !res.url) {
      setNotice({ type: 'error', text: res.error || 'Image upload failed.' });
      return;
    }
    setDraft({ ...draft, imageUrl: res.url });
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setNotice(null);

    const payload = {
      title: draft.title,
      description: draft.description,
      tags: draft.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl: draft.imageUrl,
      liveLink: draft.liveLink,
      published: draft.published,
    };

    try {
      if (draft.id === null) {
        const res = await apiJson<{ ok: boolean; project?: ProjectItem; error?: string }>(
          '/api/admin/projects',
          { method: 'POST', requireCsrf: true, body: payload },
        );
        if (!res.ok || !res.data.project) {
          setNotice({ type: 'error', text: res.data.error || 'Unable to add project.' });
          return;
        }
        syncProjects([...projects, res.data.project]);
        setDraft(null);
        setNotice({ type: 'success', text: 'Project added.' });
      } else {
        const res = await apiJson<{ ok: boolean; project?: ProjectItem; error?: string }>(
          `/api/admin/projects/${draft.id}`,
          { method: 'PUT', requireCsrf: true, body: payload },
        );
        if (!res.ok || !res.data.project) {
          setNotice({ type: 'error', text: res.data.error || 'Unable to update project.' });
          return;
        }
        syncProjects(projects.map((p) => (p.id === draft.id ? res.data.project! : p)));
        setDraft(null);
        setNotice({ type: 'success', text: 'Project updated.' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(p: ProjectItem) {
    const res = await apiJson<{ ok: boolean; project?: ProjectItem }>(`/api/admin/projects/${p.id}`, {
      method: 'PUT',
      requireCsrf: true,
      body: {
        title: p.title,
        description: p.description,
        tags: p.tags,
        imageUrl: p.imageUrl,
        liveLink: p.liveLink,
        published: !p.published,
      },
    });
    if (res.ok && res.data.project) {
      syncProjects(projects.map((item) => (item.id === p.id ? res.data.project! : item)));
    }
  }

  async function handleDelete(id: number) {
    const res = await apiJson<{ ok: boolean }>(`/api/admin/projects/${id}`, {
      method: 'DELETE',
      requireCsrf: true,
    });
    if (res.ok) {
      syncProjects(projects.filter((p) => p.id !== id));
      setNotice({ type: 'success', text: 'Project deleted.' });
    }
  }

  async function moveProject(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const reordered = [...projects];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    syncProjects(reordered);

    await apiJson('/api/admin/projects/reorder', {
      method: 'POST',
      requireCsrf: true,
      body: { orderedIds: reordered.map((p) => p.id) },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#141413]">Projects</h2>
          <p className="text-xs text-[#57554F]">Add, edit, reorder, and publish or unpublish portfolio projects.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setDraft({ ...EMPTY_DRAFT });
          }}
          className="inline-flex items-center gap-1.5 bg-[#141413] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E40AF]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New project
        </button>
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

      {draft && (
        <form onSubmit={handleSaveDraft} className="border border-[#141413] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-3">
            <h3 className="font-display text-base font-semibold text-[#141413]">
              {draft.id === null ? 'Add New Project' : 'Edit Project'}
            </h3>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-xs text-[#57554F] hover:text-[#141413]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="proj-title" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1">
                Project Title
              </label>
              <input
                id="proj-title"
                type="text"
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="proj-tags" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1">
                Technology Tags (comma separated)
              </label>
              <input
                id="proj-tags"
                type="text"
                value={draft.tagsText}
                onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })}
                placeholder="n8n, Gemini API, Google Sheets"
                className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proj-desc" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1">
              Description
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              required
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="proj-link" className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1">
                Live Link (optional https:// URL)
              </label>
              <input
                id="proj-link"
                type="url"
                value={draft.liveLink}
                onChange={(e) => setDraft({ ...draft, liveLink: e.target.value })}
                placeholder="https://..."
                className="w-full border border-[#D6D2C9] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wider text-[#57554F] mb-1">
                Project Image (optional)
              </span>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 border border-[#D6D2C9] bg-[#F8F7F4] px-3 py-2 text-xs font-medium hover:border-[#141413]">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                </label>
                {draft.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, imageUrl: '' })}
                    className="text-xs text-[#B91C1C] hover:underline"
                  >
                    Clear image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-[#141413]">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Published on public portfolio
            </label>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#141413] px-5 py-2 text-xs font-medium text-white hover:bg-[#1E40AF] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save project'}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="border border-[#E4E1DA] bg-white p-8 text-center text-sm text-[#57554F]">
          No projects yet. Click "New project" to add one.
        </div>
      ) : (
        <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] bg-white">
          {projects.map((project, idx) => (
            <div key={project.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs text-[#57554F]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#141413]">
                    {project.title}
                  </h3>
                  <span
                    className={`font-mono-tabular text-xs ${
                      project.published ? 'text-[#166534]' : 'text-[#57554F]'
                    }`}
                  >
                    {project.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-[#57554F] max-w-2xl">{project.description}</p>
                {project.tags.length > 0 && (
                  <p className="text-xs text-[#57554F]">{project.tags.join(' · ')}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label={`Move ${project.title} up`}
                  disabled={idx === 0}
                  onClick={() => moveProject(idx, -1)}
                  className="border border-[#E4E1DA] p-2 text-[#141413] disabled:opacity-30 hover:bg-[#F8F7F4]"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${project.title} down`}
                  disabled={idx === projects.length - 1}
                  onClick={() => moveProject(idx, 1)}
                  className="border border-[#E4E1DA] p-2 text-[#141413] disabled:opacity-30 hover:bg-[#F8F7F4]"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePublish(project)}
                  className="border border-[#E4E1DA] px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
                >
                  {project.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(project)}
                  className="border border-[#E4E1DA] px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${project.title}`}
                  onClick={() => handleDelete(project.id)}
                  className="border border-[#E4E1DA] p-2 text-[#B91C1C] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
