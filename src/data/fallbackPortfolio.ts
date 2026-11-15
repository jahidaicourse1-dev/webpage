import type { PublicPortfolioPayload } from '../types/portfolio';

export const FALLBACK_PUBLIC_PORTFOLIO: PublicPortfolioPayload = {
  content: {
    name: 'Jahid Hasan',
    title: 'AI Automation & Digital Solutions',
    heroHeadline: 'AI Automation & Digital Solutions',
    heroSubheadline:
      'Hands-on n8n workflow automation, AI agent development, Gemini API integration, web development, and Google Sheets automation — shaped by three years of corporate planning at RFL.',
    about:
      'AI Automation and Digital Solutions enthusiast with hands-on project experience in n8n workflow automation, AI agent development, Gemini API integration, web development and Google Sheets automation.',
    email: 'jahidaicourse1@gmail.com',
    phone: '01707676202',
    location: 'Gaibandha, Bangladesh',
    skills: [
      'AI Automation & n8n',
      'AI Agent Development',
      'Gemini API Integration',
      'Google Sheets Automation',
      'Web Development',
      'Prompt Engineering',
      'Canva Design',
      'SEO & Content Writing',
      'AI Image & Video Creation',
    ],
    services: [],
    experience: [
      {
        id: 'exp-rfl',
        role: 'Planning Floor Officer',
        department: 'Planning Department',
        company: 'RFL',
        duration: '3 years',
        highlights: [
          'Coordinated daily floor production schedules, operational targets and resource tracking in a fast-paced manufacturing environment.',
          'Collaborated across production and management teams to maintain accurate reporting records and support timely workflow execution.',
        ],
      },
    ],
    education: [
      {
        id: 'edu-hsc',
        title: 'Higher Secondary Certificate (HSC)',
        category: 'Academic Qualification',
        statusOrDuration: 'Completed',
      },
      {
        id: 'edu-office',
        title: 'Basic Computer & Microsoft Office Works',
        category: 'Technical Training',
        statusOrDuration: '6-month training',
      },
    ],
    languages: [
      { id: 'lang-bn', name: 'Bengali', proficiency: 'Native' },
      { id: 'lang-en', name: 'English', proficiency: 'Working Proficiency' },
    ],
    profilePhotoUrl: '/assets/jahid-hasan-portrait.png',
    cvFileUrl: '/assets/aistudio/CV_-_Jahid_Hasan__1__54bfb6ac.pdf',
    seoTitle: 'Jahid Hasan — AI Automation & Digital Solutions',
    seoDescription:
      'Portfolio of Jahid Hasan, an AI Automation & Digital Solutions Specialist from Gaibandha, Bangladesh. n8n workflows, AI agents, Gemini API, and web development.',
  },
  projects: [
    {
      id: 1,
      title: 'EduGenius AI',
      description:
        'An AI-supported educational platform for streamlining study workflows and structured content generation.',
      tags: ['Gemini API', 'Web Development', 'Study Workflows'],
      imageUrl: '',
      liveLink: '',
      sortOrder: 0,
      published: true,
    },
    {
      id: 2,
      title: 'Telegram AI Agent',
      description:
        'A conversational AI agent on Telegram that handles user inquiries and prompt-driven tasks.',
      tags: ['AI Agent', 'Telegram', 'Prompt Engineering'],
      imageUrl: '',
      liveLink: '',
      sortOrder: 1,
      published: true,
    },
    {
      id: 3,
      title: 'Google Sheets Email Automation',
      description:
        'A workflow connecting Google Sheets records with trigger-based email notifications.',
      tags: ['Google Sheets', 'n8n', 'Workflow Automation'],
      imageUrl: '',
      liveLink: '',
      sortOrder: 2,
      published: true,
    },
  ],
};
