module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./packages/mobile'],
          alias: {
            '@': './packages/mobile',
          },
        },
      ],
    ],
  };
};