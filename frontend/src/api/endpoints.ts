import api from './client';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { teamName: string; student1Name: string; student2Name: string; student1Rollno: string; student2Rollno: string; phoneNumber: string; password: string; }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { teamName: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};

// ─── Competitions ─────────────────────────────────────────────────────────────
export const competitionApi = {
  list: () => api.get('/competitions').then(r => r.data),
  get: (id: number) => api.get(`/competitions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/competitions', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/competitions/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/competitions/${id}`),
  join: (id: number) => api.post(`/competitions/${id}/join`),
  startAttempt: (id: number) => api.post(`/competitions/${id}/start-attempt`),
  endAttempt: (id: number) => api.post(`/competitions/${id}/end-attempt`),
  exportParticipants: (id: number) => api.get(`/competitions/${id}/participants/export`, { responseType: 'blob' }),
};

// ─── Problems ─────────────────────────────────────────────────────────────────
export const problemApi = {
  listByCompetition: (competitionId: number) =>
    api.get(`/competitions/${competitionId}/problems`).then(r => r.data),
  get: (id: number) => api.get(`/problems/${id}`).then(r => r.data),
  create: (competitionId: number, data: any) =>
    api.post(`/competitions/${competitionId}/problems`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/problems/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/problems/${id}`),
  addTestCase: (problemId: number, data: any) =>
    api.post(`/problems/${problemId}/test-cases`, data).then(r => r.data),
  deleteTestCase: (testCaseId: number) => api.delete(`/test-cases/${testCaseId}`),
};

// ─── Submissions ──────────────────────────────────────────────────────────────
export const submissionApi = {
  submit: (problemId: number, data: { language: string; sourceCode: string }) =>
    api.post(`/problems/${problemId}/submit`, data).then(r => r.data),
  run: (problemId: number, data: { language: string; sourceCode: string; input: string }) =>
    api.post(`/problems/${problemId}/run`, data).then(r => r.data),
  mySubmissions: () => api.get('/submissions').then(r => r.data),
  get: (id: number) => api.get(`/submissions/${id}`).then(r => r.data),
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: (competitionId: number) =>
    api.get(`/competitions/${competitionId}/leaderboard`).then(r => r.data),
  exportCsv: (competitionId: number) =>
    api.get(`/admin/competitions/${competitionId}/leaderboard/export`, { responseType: 'blob' }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getSubmissions: (params: any) =>
    api.get('/admin/submissions', { params }).then(r => r.data),
  exportSubmissionsCsv: (competitionId: number) =>
    api.get(`/admin/competitions/${competitionId}/submissions/export`, { responseType: 'blob' }),
};
