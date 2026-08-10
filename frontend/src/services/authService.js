import api from './api';

export const login = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const getProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('project_monitor_token');
};

export const saveUserSession = ({ token, ...user }) => {
  localStorage.setItem('project_monitor_token', token);
  return user;
};
