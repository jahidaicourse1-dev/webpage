export interface ExperienceItem {
  id: string;
  role: string;
  department: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  title: string;
  category: string;
  statusOrDuration: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  proficiency: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
}

export interface SiteContent {
  name: string;
  title: string;
  heroHeadline: string;
  heroSubheadline: string;
  about: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  services: ServiceItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  languages: LanguageItem[];
  profilePhotoUrl: string;
  cvFileUrl: string;
  seoTitle: string;
  seoDescription: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  liveLink: string;
  sortOrder: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicPortfolioPayload {
  content: SiteContent;
  projects: ProjectItem[];
}

export interface ContactMessageItem {
  id: number;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
