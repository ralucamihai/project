export const environment = {
  production: false,
  apiUrl: `http://${window.location.hostname}:8000/api`,
  apiUrlIP: `http://${window.location.hostname}:8000/api`, 
  wsUrl: `ws://${window.location.hostname}:8000/api/ws`,
  accessTokenKey: 'access_token',
  usernameKey: 'username',
  version: '1.4',
  buildDate: '2026-16-09'
};