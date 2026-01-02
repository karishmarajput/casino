// Admin authentication utilities

export const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

export const setAdminToken = (token) => {
  localStorage.setItem('adminToken', token);
};

export const removeAdminToken = () => {
  localStorage.removeItem('adminToken');
};

export const isAdminAuthenticated = () => {
  return !!getAdminToken();
};

export const requireAdminAuth = () => {
  if (!isAdminAuthenticated()) {
    window.location.href = '/admin/login';
    return false;
  }
  return true;
};

