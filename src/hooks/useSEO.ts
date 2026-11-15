import { useEffect } from 'react';
import type { ProjectItem, SiteContent } from '../types/portfolio';
import { resolveDynamicSeo } from '../utils/seo';

function setMetaTag(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function useSEO(
  content: SiteContent | null | undefined,
  activeSection: string,
  selectedProject: ProjectItem | null,
) {
  useEffect(() => {
    if (!content) return;

    const { title, description } = resolveDynamicSeo(content, activeSection, selectedProject);
    document.title = title;

    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  }, [content, activeSection, selectedProject]);
}
