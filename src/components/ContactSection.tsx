import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { apiJson } from '../utils/api';
import { splitTextToWords } from '../utils/animations';
import { validateContactInput } from '../utils/validation';

interface ContactSectionProps {
  email: string;
  phone: string;
  location: string;
  sectionNumber?: string;
  surfaceVariant?: 'bg' | 'surface';
}

export default function ContactSection({
  email,
  phone,
  location,
  sectionNumber = '05',
  surfaceVariant = 'surface',
}: ContactSectionProps) {
  const [fullName, setFullName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headingText = 'Start a conversation about workflow automation.';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage(null);

    const check = validateContactInput({
      fullName,
      email: senderEmail,
      subject,
      message,
      website,
    });

    if (!check.ok) {
      setFieldErrors(check.errors);
      setStatusMessage({
        type: 'error',
        text: 'Please review the highlighted fields before sending.',
      });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await apiJson<{ ok: boolean; message?: string; error?: string; errors?: Record<string, string> }>(
        '/api/contact',
        {
          method: 'POST',
          requireCsrf: true,
          body: {
            fullName,
            email: senderEmail,
            subject,
            message,
            website,
          },
        },
      );

      if (!res.ok || !res.data.ok) {
        if (res.data.errors) setFieldErrors(res.data.errors);
        setStatusMessage({
          type: 'error',
          text: res.data.error || 'Unable to save your message. Please try again.',
        });
        return;
      }

      setFullName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
      setStatusMessage({
        type: 'success',
        text: res.data.message || 'Your message has been saved and delivered.',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error while sending your message. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const bgClass = surfaceVariant === 'surface' ? 'bg-[var(--surface)]' : 'bg-[var(--bg)]';
  const cardBgClass = surfaceVariant === 'surface' ? 'bg-[var(--bg)]' : 'bg-[var(--surface)]';

  return (
    <section id="contact" className={`reveal-section border-t border-[var(--border)] ${bgClass} py-20 md:py-28`}>
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="h-[1.5px] w-6 bg-[var(--accent)]" aria-hidden="true" />
              <span className="font-mono-tabular text-xs font-medium text-[var(--text)]">
                {sectionNumber}
              </span>
              <p className="font-mono-tabular text-xs uppercase tracking-wider text-[var(--muted)]">
                Get In Touch
              </p>
            </div>

            <h2
              aria-label={headingText}
              className="reveal-heading mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight text-[var(--text)] text-balance"
            >
              <span className="sr-only">{headingText}</span>
              <span aria-hidden="true">
                {splitTextToWords(headingText).map((word, idx) => (
                  <span key={idx} className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0">
                    <span className="reveal-word inline-block will-change-transform">{word}</span>
                  </span>
                ))}
              </span>
            </h2>

            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Send a message with details about your workflow, automation idea, or digital project. Submissions are saved directly and reviewed promptly.
            </p>

            <dl className="mt-10 border-t border-[var(--border)] divide-y divide-[var(--border)]">
              {email && (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Email</dt>
                  <dd className="text-sm font-medium text-[var(--text)]">
                    <a
                      href={`mailto:${email}`}
                      className="underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:decoration-[var(--accent)]"
                    >
                      {email}
                    </a>
                  </dd>
                </div>
              )}
              {phone && (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Phone</dt>
                  <dd className="font-mono-tabular text-sm font-medium text-[var(--text)]">
                    <a
                      href={`tel:${phone}`}
                      className="transition-colors duration-200 hover:text-[var(--muted)]"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
              )}
              {location && (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Location</dt>
                  <dd className="text-sm font-medium text-[var(--text)]">{location}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              noValidate
              className={`border border-[var(--border)] ${cardBgClass} p-6 md:p-8 space-y-5`}
            >
              {/* Honeypot field hidden from human visitors */}
              <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="floating-field">
                  <input
                    id="contact-fullname"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder=" "
                    className="floating-input"
                  />
                  <label htmlFor="contact-fullname" className="floating-label">
                    Full Name
                  </label>
                  {fieldErrors.fullName && (
                    <p role="alert" className="mt-1.5 text-xs text-[var(--status-error-text)]">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="floating-field">
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder=" "
                    className="floating-input"
                  />
                  <label htmlFor="contact-email" className="floating-label">
                    Email
                  </label>
                  {fieldErrors.email && (
                    <p role="alert" className="mt-1.5 text-xs text-[var(--status-error-text)]">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="floating-field">
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder=" "
                  className="floating-input"
                />
                <label htmlFor="contact-subject" className="floating-label">
                  Subject
                </label>
                {fieldErrors.subject && (
                  <p role="alert" className="mt-1.5 text-xs text-[var(--status-error-text)]">
                    {fieldErrors.subject}
                  </p>
                )}
              </div>

              <div className="floating-field">
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder=" "
                  className="floating-input resize-y"
                />
                <label htmlFor="contact-message" className="floating-label">
                  Message
                </label>
                {fieldErrors.message && (
                  <p role="alert" className="mt-1.5 text-xs text-[var(--status-error-text)]">
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              {statusMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="animate-status-in border px-4 py-3 text-sm"
                  style={
                    statusMessage.type === 'success'
                      ? {
                          borderColor: 'var(--status-success-border)',
                          backgroundColor: 'var(--status-success-bg)',
                          color: 'var(--status-success-text)',
                        }
                      : {
                          borderColor: 'var(--status-error-border)',
                          backgroundColor: 'var(--status-error-bg)',
                          color: 'var(--status-error-text)',
                        }
                  }
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <span className="text-xs text-[var(--muted)]">
                  All fields required.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-wipe inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  <span>{submitting ? 'Sending...' : 'Send message'}</span>
                  <ArrowRight className="btn-arrow h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
