export default {
  async rewrites() {
    return ['/','/login','/register','/dashboard','/profile','/discover','/sessions']
      .map(source => ({ source, destination: '/sw/index.html' }));
  },
};

