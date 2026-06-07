module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module-resolver',
        {
          root: ['./mobile'],
          alias: {
            '@': './mobile',
          },
        },
      ],
    ],
  };
};