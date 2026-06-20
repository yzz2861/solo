import Dexie, { type Table } from 'dexie';
import type { Project, Response, Risk, TeamMember } from '@/types';

class RiskMinerDB extends Dexie {
  projects!: Table<Project, string>;
  responses!: Table<Response, string>;
  risks!: Table<Risk, string>;
  teamMembers!: Table<TeamMember, string>;

  constructor() {
    super('RiskMinerDB');
    this.version(1).stores({
      projects: 'id, name, createdAt',
      responses: 'id, projectId, respondentId',
      risks: 'id, projectId, responseId, riskCategory, severity, status, assignee, createdAt',
      teamMembers: 'id, projectId, role',
    });
  }
}

export const db = new RiskMinerDB();
