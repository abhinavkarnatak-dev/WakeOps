/**
 * Content models for everything under /src/data.
 * To update the site, edit the data files — components never hard-code content.
 */

export type ProjectStatus = "shipped" | "building";

export interface ProjectLink {
  label: "Live" | "GitHub";
  href: string;
}

export interface HardProblem {
  title: string;
  body: string[];
}

export interface StackGroup {
  group: string;
  items: string[];
}

export interface CaseStudy {
  /** Paragraphs. */
  problem: string[];
  built: string[];
  architecture: {
    description: string[];
    /** Drop an image into /public and reference it here to fill the diagram slot. */
    diagram?: { src: string; alt: string; width: number; height: number };
  };
  hardProblems: HardProblem[];
  /** Bullet list. */
  results: string[];
  stack: StackGroup[];
}

export interface Project {
  /** URL segment: /projects/[slug] */
  slug: string;
  name: string;
  /** One-line value statement shown on the card and under the case-study title. */
  oneLiner: string;
  /** Meta description for the case-study page (~150 chars). */
  description: string;
  status: ProjectStatus;
  /** 3–5 tech tags shown on the card. */
  tags: string[];
  links: ProjectLink[];
  caseStudy: CaseStudy;
}

export interface SkillGroup {
  label: string;
  skills: string[];
}

export interface ExperienceItem {
  org: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  period: string;
  detail?: string;
}
