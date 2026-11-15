import type { ProjectItem, SiteContent } from '../types/portfolio';

export interface ResolvedSeo {
  title: string;
  description: string;
}

const SECTION_LABELS: Record<string, { label: string; description: string }> = {
  '#about': {
    label: 'About',
    description: 'Background in AI automation, n8n workflows, Gemini API integration, and three years of corporate planning at RFL.',
  },
  '#skills': {
    label: 'Skills & Capabilities',
    description: 'Core skills across n8n workflow automation, AI agent development, Gemini API, Google Sheets automation, and web development.',
  },
  '#projects': {
    label: 'Projects',
    description: 'Selected workflow automation and AI systems including EduGenius AI, Telegram AI Agent, and Google Sheets Email Automation.',
  },
  '#experience': {
    label: 'Experience & Education',
    description: 'Corporate planning experience at RFL, technical training, education, and language proficiency.',
  },
  '#services': {
    label: 'Services',
    description: 'AI workflow automation, Gemini API integration, and practical digital execution services.',
  },
  '#contact': {
    label: 'Contact',
    description: 'Get in touch with Jahid Hasan for AI workflow automation, AI agents, or web development projects.',
  },
};

export function resolveDynamicSeo(
  content: SiteContent | null | undefined,
  activeSection: string,
  selectedProject: ProjectItem | null,
): ResolvedSeo {
  const baseName = content?.name || 'Jahid Hasan';
  const baseTitle = content?.seoTitle || `${baseName} — ${content?.title || 'AI Automation & Digital Solutions'}`;
  const baseDescription =
    content?.seoDescription ||
    `Portfolio of ${baseName}, AI Automation & Digital Solutions Specialist from Gaibandha, Bangladesh.`;

  if (selectedProject) {
    return {
      title: `${selectedProject.title} — ${baseName}`,
      description: selectedProject.description || baseDescription,
    };
  }

  const sectionInfo = activeSection ? SECTION_LABELS[activeSection] : undefined;
  if (sectionInfo) {
    return {
      title: `${sectionInfo.label} — ${baseName}`,
      description: sectionInfo.description,
    };
  }

  return {
    title: baseTitle,
    description: baseDescription,
  };
}
