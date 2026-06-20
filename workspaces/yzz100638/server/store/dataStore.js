const fs = require('fs');
const path = require('path');

class DataStore {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.files = {
      cases: path.join(this.dataDir, 'cases.json'),
      training: path.join(this.dataDir, 'training-cases.json'),
      users: path.join(this.dataDir, 'users.json')
    };
    this._ensureDataDir();
    this._initFiles();
  }

  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  _initFiles() {
    for (const [key, filePath] of Object.entries(this.files)) {
      if (!fs.existsSync(filePath)) {
        const initialData = key === 'users' ? this._getInitialUsers() : [];
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
      }
    }
  }

  _getInitialUsers() {
    return [
      {
        id: 'user-001',
        username: 'surveyor1',
        name: '张查勘',
        role: 'surveyor',
        phone: '13800138001',
        avatar: '👨‍🔧',
        createdAt: '2024-01-01'
      },
      {
        id: 'user-002',
        username: 'surveyor2',
        name: '李查勘',
        role: 'surveyor',
        phone: '13800138002',
        avatar: '👩‍🔧',
        createdAt: '2024-01-01'
      },
      {
        id: 'user-003',
        username: 'leader1',
        name: '王组长',
        role: 'leader',
        phone: '13800138003',
        avatar: '👨‍💼',
        createdAt: '2024-01-01'
      }
    ];
  }

  _readFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
      return [];
    }
  }

  _writeFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
      return false;
    }
  }

  async createCase(caseData) {
    const cases = this._readFile(this.files.cases);
    const newCase = {
      id: `CASE-${Date.now()}`,
      ...caseData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    cases.unshift(newCase);
    this._writeFile(this.files.cases, cases);
    return newCase;
  }

  async getCase(caseId) {
    const cases = this._readFile(this.files.cases);
    return cases.find(c => c.id === caseId) || null;
  }

  async updateCase(caseId, updates) {
    const cases = this._readFile(this.files.cases);
    const index = cases.findIndex(c => c.id === caseId);
    if (index === -1) return null;
    
    cases[index] = {
      ...cases[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._writeFile(this.files.cases, cases);
    return cases[index];
  }

  async listCases(filters = {}) {
    let cases = this._readFile(this.files.cases);
    
    if (filters.surveyorId) {
      cases = cases.filter(c => c.surveyorId === filters.surveyorId);
    }
    if (filters.status) {
      cases = cases.filter(c => c.status === filters.status);
    }
    if (filters.lowConfidenceOnly) {
      cases = cases.filter(c => c.confidenceScore < 0.7);
    }
    if (filters.startDate) {
      cases = cases.filter(c => c.createdAt >= filters.startDate);
    }
    if (filters.endDate) {
      cases = cases.filter(c => c.createdAt <= filters.endDate);
    }

    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      cases.sort((a, b) => {
        if (filters.sortBy === 'confidence') {
          return (a.confidenceScore - b.confidenceScore) * sortOrder;
        }
        if (filters.sortBy === 'date') {
          return (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrder;
        }
        return 0;
      });
    }

    if (filters.limit) {
      cases = cases.slice(0, filters.limit);
    }

    return cases;
  }

  async confirmCase(caseId, confirmedData) {
    return this.updateCase(caseId, {
      ...confirmedData,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });
  }

  async updateReshoot(caseId, reshootId, updates) {
    const caseData = await this.getCase(caseId);
    if (!caseData || !caseData.reshootList) return null;

    const reshootIndex = caseData.reshootList.findIndex(r => r.id === reshootId);
    if (reshootIndex === -1) return null;

    caseData.reshootList[reshootIndex] = {
      ...caseData.reshootList[reshootIndex],
      ...updates,
      completedAt: updates.isCompleted ? new Date().toISOString() : null
    };

    const allCompleted = caseData.reshootList.every(r => r.isCompleted);
    if (allCompleted) {
      caseData.status = 'reshoot-completed';
      caseData.reshootCompletedAt = new Date().toISOString();
    }

    return this.updateCase(caseId, { reshootList: caseData.reshootList, status: caseData.status });
  }

  async getReshootStats(caseId) {
    const caseData = await this.getCase(caseId);
    if (!caseData || !caseData.reshootList) return null;

    const total = caseData.reshootList.length;
    const completed = caseData.reshootList.filter(r => r.isCompleted).length;

    return {
      total,
      completed,
      pending: total - completed,
      isAllCompleted: total > 0 && completed === total
    };
  }

  async getLowConfidenceCases(limit = 10) {
    const cases = this._readFile(this.files.cases);
    return cases
      .filter(c => c.confidenceScore < 0.7 && c.status === 'confirmed')
      .sort((a, b) => a.confidenceScore - b.confidenceScore)
      .slice(0, limit);
  }

  async getTrainingCases() {
    return this._readFile(this.files.training);
  }

  async addTrainingCase(trainingData) {
    const trainingCases = this._readFile(this.files.training);
    const newTraining = {
      id: `TRAIN-${Date.now()}`,
      ...trainingData,
      createdAt: new Date().toISOString()
    };
    trainingCases.unshift(newTraining);
    this._writeFile(this.files.training, trainingCases);
    return newTraining;
  }

  async getTrainingCase(id) {
    const trainingCases = this._readFile(this.files.training);
    return trainingCases.find(t => t.id === id) || null;
  }

  async updateTrainingCase(id, updates) {
    const trainingCases = this._readFile(this.files.training);
    const index = trainingCases.findIndex(t => t.id === id);
    if (index === -1) return null;
    trainingCases[index] = { ...trainingCases[index], ...updates, updatedAt: new Date().toISOString() };
    this._writeFile(this.files.training, trainingCases);
    return trainingCases[index];
  }

  async deleteTrainingCase(id) {
    const trainingCases = this._readFile(this.files.training);
    const index = trainingCases.findIndex(t => t.id === id);
    if (index === -1) return false;
    trainingCases.splice(index, 1);
    this._writeFile(this.files.training, trainingCases);
    return true;
  }

  async getStats() {
    const cases = this._readFile(this.files.cases);
    const trainingCases = this._readFile(this.files.training);

    const statusCounts = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const lowConfidenceCount = cases.filter(c => c.confidenceScore < 0.7).length;
    const highConfidenceCount = cases.filter(c => c.confidenceScore >= 0.7).length;
    const avgConfidence = cases.length > 0 
      ? cases.reduce((sum, c) => sum + c.confidenceScore, 0) / cases.length 
      : 0;

    return {
      totalCases: cases.length,
      statusCounts,
      lowConfidenceCount,
      highConfidenceCount,
      avgConfidence: parseFloat(avgConfidence.toFixed(2)),
      trainingCasesCount: trainingCases.length
    };
  }

  async getUser(userId) {
    const users = this._readFile(this.files.users);
    return users.find(u => u.id === userId) || null;
  }

  async getUserByUsername(username) {
    const users = this._readFile(this.files.users);
    return users.find(u => u.username === username) || null;
  }

  async getLeaderboard(startDate, endDate) {
    const cases = this._readFile(this.files.cases);
    const users = this._readFile(this.files.users);

    let filteredCases = cases;
    if (startDate) {
      filteredCases = filteredCases.filter(c => c.createdAt >= startDate);
    }
    if (endDate) {
      filteredCases = filteredCases.filter(c => c.createdAt <= endDate);
    }

    const userStats = {};
    for (const c of filteredCases) {
      if (!userStats[c.surveyorId]) {
        const user = users.find(u => u.id === c.surveyorId);
        userStats[c.surveyorId] = {
          userId: c.surveyorId,
          userName: user ? user.name : '未知查勘员',
          avatar: user ? user.avatar : '👤',
          totalCases: 0,
          highConfidenceCases: 0,
          avgConfidence: 0,
          totalConfidence: 0
        };
      }
      userStats[c.surveyorId].totalCases++;
      userStats[c.surveyorId].totalConfidence += c.confidenceScore;
      if (c.confidenceScore >= 0.7) {
        userStats[c.surveyorId].highConfidenceCases++;
      }
    }

    return Object.values(userStats)
      .map(s => ({
        ...s,
        avgConfidence: s.totalCases > 0 ? parseFloat((s.totalConfidence / s.totalCases).toFixed(2)) : 0
      }))
      .sort((a, b) => b.avgConfidence - a.avgConfidence);
  }
}

module.exports = DataStore;
