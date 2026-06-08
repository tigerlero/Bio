export interface Position {
  x: number;
  y: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  link: string;
  image?: string;
  position: Position;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  period: string;
  highlights: string[];
  position: Position;
}

export interface SkillSet {
  [category: string]: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  year: number;
  description?: string;
  position: Position;
}

export interface BioData {
  name: string;
  title: string;
  projects: Project[];
  jobs: Job[];
  skills: SkillSet;
  education: Education[];
}
