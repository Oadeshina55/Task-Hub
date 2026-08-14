const API_BASE = '/api';

export type Role = 'super_admin' | 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'blocked';
export type Status = 'backlog' | 'todo' | 'progress' | 'blocked' | 'review' | 'done' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type User = {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  profilePicture?: string;
  department?: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

export type Comment = {
  id: string;
  text: string;
  author: {
    id: string;
    fullName: string;
    email: string;
  };
  targetType: 'task' | 'project';
  targetId: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  projectCode?: string;
  description: string;
  client?: string;
  department?: string;
  status?: string;
  priority?: Priority;
  budget?: number;
  startDate?: string;
  endDate?: string;
  color: string;
  manager?: string;
  members?: string[];
  comments?: Comment[];
};

export type Task = {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId?: string;
  taskType?: string;
  status: Status;
  priority: Priority;
  assignedTo?: string;
  assignedToId?: string;
  reviewer?: string;
  reviewerId?: string;
  startDate?: string;
  dueDate: string;
  estimatedHours?: number;
  dependencies?: string[];
  progress?: number;
  score?: number;
  attachments?: string[];
  comments?: Comment[];
  label: string;
  verifiedCompletion?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Department = {
  id: string;
  name: string;
  description: string;
  head?: string;
  members?: string[];
};

export type AuditLog = {
  id: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
  };
  action: string;
  targetType: string;
  targetId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  createdAt: string;
};

export type Voucher = {
  id: string;
  requesterId: string;
  requesterName: string;
  department?: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'approved' | 'declined' | 'questioned';
  approverId?: string;
  approverName?: string;
  comments?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type RequestOptions = RequestInit & { token?: string };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {}),
    },
  });
  // Try to parse JSON body; fall back to text when parsing fails
  let parsedBody: any = null;
  try {
    parsedBody = await response.json();
  } catch (e) {
    try {
      parsedBody = await response.text();
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    const errMsg = parsedBody && typeof parsedBody === 'object' && parsedBody.error
      ? parsedBody.error
      : typeof parsedBody === 'string' && parsedBody.length > 0
        ? parsedBody
        : `${response.status} ${response.statusText}`;
    throw new Error(errMsg || 'Something went wrong');
  }

  return parsedBody as T;
}

export const api = {
  register: (email: string, password: string, fullName?: string, role?: Role) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName, role }) }),
  login: (email: string, password: string) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  users: (token: string) => request<User[]>('/users', { token }),
  createUser: (token: string, data: { email: string; password: string; fullName: string; role: Role; department?: string; profilePicture?: string }) => request<User>('/users', { method: 'POST', token, body: JSON.stringify(data) }),
  updateUser: (token: string, id: string, data: Partial<Pick<User, 'fullName' | 'role' | 'status' | 'profilePicture' | 'department'>>) => request<User>(`/users/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  getProfile: (token: string) => request<User>('/users/me', { token }),
  updateProfile: (token: string, data: { fullName?: string; profilePicture?: string }) => request<User>('/users/me', { method: 'PATCH', token, body: JSON.stringify(data) }),
  changePassword: (token: string, currentPassword: string, newPassword: string) => request<{ success: boolean; user: User }>('/users/me/password', { method: 'PATCH', token, body: JSON.stringify({ currentPassword, newPassword }) }),
  projects: (token: string) => request<Project[]>('/projects', { token }),
  createProject: (token: string, data: Partial<Project> & { name: string }) => request<Project>('/projects', { method: 'POST', token, body: JSON.stringify(data) }),
  updateProject: (token: string, id: string, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  addProjectComment: (token: string, projectId: string, text: string) => request<Comment>(`/projects/${projectId}/comments`, { method: 'POST', token, body: JSON.stringify({ text }) }),
  project: (token: string, projectId: string) => request<Project>(`/projects/${projectId}`, { token }),
  projectComments: (token: string, projectId: string) => request<Comment[]>(`/projects/${projectId}/comments`, { token }),
  tasks: (token: string) => request<Task[]>('/tasks', { token }),
  leaves: (token: string) => request<any[]>('/leaves', { token }),
  createLeave: (token: string, data: { startDate: string; endDate: string; reason?: string }) => request<any>('/leaves', { method: 'POST', token, body: JSON.stringify(data) }),
  updateLeave: (token: string, id: string, data: { status: 'approved' | 'rejected' }) => request<any>(`/leaves/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  createTask: (token: string, data: Partial<Task> & { title: string }) => request<Task>('/tasks', { method: 'POST', token, body: JSON.stringify(data) }),
  updateTask: (token: string, id: string, data: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  addTaskComment: (token: string, taskId: string, text: string) => request<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', token, body: JSON.stringify({ text }) }),
  taskComments: (token: string, taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`, { token }),
  departments: (token: string) => request<Department[]>('/departments', { token }),
  createDepartment: (token: string, data: Partial<Department> & { name: string }) => request<Department>('/departments', { method: 'POST', token, body: JSON.stringify(data) }),
  auditLogs: (token: string) => request<AuditLog[]>('/audit', { token }),
  vouchers: (token: string) => request<Voucher[]>('/vouchers', { token }),
  createVoucher: (token: string, data: { amount: number; reason?: string }) => request<Voucher>('/vouchers', { method: 'POST', token, body: JSON.stringify(data) }),
  updateVoucher: (token: string, id: string, data: { status?: string; comment?: string }) => request<Voucher>(`/vouchers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
  getVoucher: (token: string, id: string) => request<Voucher>(`/vouchers/${id}`, { token }),
  exportResource: async (token: string, resource: string) => {
    const resp = await fetch(`${API_BASE}/export/${resource}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || 'Export failed');
    }
    const blob = await resp.blob();
    return blob;
  },
};
